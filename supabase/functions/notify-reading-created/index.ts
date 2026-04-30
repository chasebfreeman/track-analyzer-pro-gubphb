import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function buildNotificationBody(params: {
  actorLabel: string;
  trackDate?: string | null;
  time?: string | null;
  session?: string | null;
  pair?: string | null;
}) {
  const { actorLabel, trackDate, time, session, pair } = params;

  const detailParts = [
    session ? `Session ${session}` : null,
    pair ? `Pair ${pair}` : null,
    [trackDate, time].filter(Boolean).join(" at ") || null,
  ].filter(Boolean);

  if (detailParts.length === 0) {
    return `${actorLabel} saved a new reading.`;
  }

  return `${actorLabel} saved a new reading: ${detailParts.join(" | ")}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => null);
    const readingId = typeof payload?.readingId === "string" ? payload.readingId : null;
    const actorInstallationId =
      typeof payload?.actorInstallationId === "string" ? payload.actorInstallationId : null;

    if (!readingId) {
      return jsonResponse({ error: "readingId is required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: reading, error: readingError } = await admin
      .from("readings")
      .select("id, track_id, track_date, date, time, session, pair, user_id")
      .eq("id", readingId)
      .single();

    if (readingError || !reading) {
      return jsonResponse({ error: "Reading not found" }, 404);
    }

    if (reading.user_id !== userData.user.id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const [{ data: track, error: trackError }, { data: actorMember }, { data: teamMembers, error: teamError }] =
      await Promise.all([
        admin.from("tracks").select("name").eq("id", reading.track_id).single(),
        admin.from("team_members").select("email").eq("user_id", userData.user.id).maybeSingle(),
        admin.from("team_members").select("user_id").limit(25),
      ]);

    if (trackError || !track) {
      return jsonResponse({ error: "Track not found" }, 404);
    }

    if (teamError) {
      return jsonResponse({ error: "Unable to load team members" }, 500);
    }

    const teamUserIds = (teamMembers ?? []).map((member) => member.user_id).filter(Boolean);
    if (teamUserIds.length === 0) {
      return jsonResponse({ ok: true, delivered: 0, reason: "No team members found" });
    }

    const { data: tokenRows, error: tokenError } = await admin
      .from("push_tokens")
      .select("id, expo_push_token, installation_id")
      .in("user_id", teamUserIds)
      .eq("notifications_enabled", true);

    if (tokenError) {
      return jsonResponse({ error: "Unable to load push tokens" }, 500);
    }

    const uniqueTokenRows = new Map<string, { id: string; installation_id: string | null }>();

    for (const row of tokenRows ?? []) {
      if (!row.expo_push_token) continue;
      if (actorInstallationId && row.installation_id === actorInstallationId) continue;

      uniqueTokenRows.set(row.expo_push_token, {
        id: row.id,
        installation_id: row.installation_id,
      });
    }

    const tokenEntries = Array.from(uniqueTokenRows.entries());
    if (tokenEntries.length === 0) {
      return jsonResponse({ ok: true, delivered: 0, reason: "No target devices registered" });
    }

    const actorLabel = actorMember?.email ?? userData.user.email ?? "A teammate";
    const notificationBody = buildNotificationBody({
      actorLabel,
      trackDate: reading.track_date ?? reading.date,
      time: reading.time,
      session: reading.session,
      pair: reading.pair,
    });

    const notificationUrl = `/(tabs)/browse/reading-detail?trackId=${encodeURIComponent(reading.track_id)}&readingId=${encodeURIComponent(reading.id)}`;

    const messages = tokenEntries.map(([token]) => ({
      to: token,
      title: `New reading at ${track.name}`,
      body: notificationBody,
      sound: "default",
      data: {
        type: "reading-created",
        trackId: reading.track_id,
        readingId: reading.id,
        url: notificationUrl,
      },
    }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
    });

    const expoPayload = await expoResponse.json().catch(() => null);
    if (!expoResponse.ok) {
      return jsonResponse(
        {
          error: "Expo push request failed",
          details: expoPayload,
        },
        502,
      );
    }

    const ticketData = Array.isArray(expoPayload?.data) ? expoPayload.data : [];
    const invalidTokenIds: string[] = [];

    ticketData.forEach((ticket, index) => {
      if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
        const row = tokenEntries[index]?.[1];
        if (row?.id) {
          invalidTokenIds.push(row.id);
        }
      }
    });

    if (invalidTokenIds.length > 0) {
      await admin
        .from("push_tokens")
        .update({ notifications_enabled: false })
        .in("id", invalidTokenIds);
    }

    return jsonResponse({
      ok: true,
      delivered: messages.length,
      invalidated: invalidTokenIds.length,
    });
  } catch (error) {
    console.error("notify-reading-created failed:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
});
