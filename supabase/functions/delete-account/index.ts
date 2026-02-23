import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
    }

    // 1) Verify the user making this request (JWT from client)
    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const userId = userData.user.id;

    // 2) Admin client
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 3) Delete app data owned by user (keep or replace with DB cascade later)
    await admin.from("readings").delete().eq("user_id", userId);
    await admin.from("tracks").delete().eq("user_id", userId);
    await admin.from("team_members").delete().eq("user_id", userId);
    await admin.from("user_profiles").delete().eq("id", userId);

    // 4) Delete storage objects (optional but recommended)
    // If your images are stored under readings/<readingId>/..., we can remove them by reading IDs first.
    // (If you want this, I’ll tailor it to your exact storage naming.)
    // For now you can skip or add later.

    // 5) Delete Auth user (this is what the client cannot do)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});