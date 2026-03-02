// app/(tabs)/browse/reading-detail.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";

import { useThemeColors } from "@/styles/commonStyles";
import { SupabaseStorageService } from "@/utils/supabaseStorage";
import { safeHttpUri } from "@/utils/safeUri";

// If you have these types, keep them. If TS complains, you can loosen them to `any`.
import { TrackReading } from "@/types/TrackData";

type AnyObj = Record<string, any>;

export default function ReadingDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const params = useLocalSearchParams<{
    trackId?: string;
    readingId?: string;
  }>();

  const trackId = params.trackId;
  const readingId = params.readingId;

  const [reading, setReading] = useState<TrackReading | null>(null);
  const [loading, setLoading] = useState(false);

  // ----------------------------
  // Helpers
  // ----------------------------
  const fmtNum = (v: any, digits = 1) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return "N/A";
    return n.toFixed(digits);
  };

  const fmtInt = (v: any) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return "N/A";
    return String(Math.round(n));
  };

  const pickFirst = (obj: AnyObj | null | undefined, keys: string[]) => {
    if (!obj) return undefined;
    for (const k of keys) {
      const v = (obj as AnyObj)[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };

  const fmtDate = (isoOrMs: any) => {
    if (!isoOrMs) return "N/A";
    const d =
      typeof isoOrMs === "number"
        ? new Date(isoOrMs)
        : new Date(String(isoOrMs));
    if (isNaN(d.getTime())) return "N/A";
    // yyyy-mm-dd
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const fmtTime = (isoOrMs: any) => {
    if (!isoOrMs) return "N/A";
    const d =
      typeof isoOrMs === "number"
        ? new Date(isoOrMs)
        : new Date(String(isoOrMs));
    if (isNaN(d.getTime())) return "N/A";
    let h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${min} ${ampm}`;
  };

  const hasWeather = (r: TrackReading) => {
    const temp = pickFirst(r as AnyObj, ["temp_f", "tempF"]);
    const hum = pickFirst(r as AnyObj, ["humidity_pct", "humidityPct"]);
    const baro = pickFirst(r as AnyObj, ["baro_inhg", "absPressureInHg", "baro"]);
    const adr = pickFirst(r as AnyObj, ["adr"]);
    const corr = pickFirst(r as AnyObj, ["correction"]);
    const ts = pickFirst(r as AnyObj, ["weather_ts", "weatherTs", "weather_timestamp"]);
    // show if we have at least temp+humidity or baro
    return (
      temp !== undefined ||
      hum !== undefined ||
      baro !== undefined ||
      adr !== undefined ||
      corr !== undefined ||
      ts !== undefined
    );
  };

  // ----------------------------
  // Load reading
  // ----------------------------
  const loadReading = useCallback(async () => {
    if (!trackId || !readingId) return;
    setLoading(true);
    try {
      // This matches how you’ve been loading from SupabaseStorageService elsewhere.
      // If your service signature differs, adjust here only.
      const list = await SupabaseStorageService.getReadingsForTrack(trackId);
      const found = list?.find((x: any) => String(x.id) === String(readingId)) ?? null;
      setReading(found);
    } catch (e: any) {
      console.error("Failed to load reading:", e);
      Alert.alert("Error", "Failed to load reading.");
      setReading(null);
    } finally {
      setLoading(false);
    }
  }, [trackId, readingId]);

  useEffect(() => {
    loadReading();
  }, [loadReading]);

  // ----------------------------
  // Delete
  // ----------------------------
  const onDelete = async () => {
    if (!reading?.id) return;

    Alert.alert("Delete reading?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await SupabaseStorageService.deleteReading(String(reading.id));
            router.back();
          } catch (e) {
            console.error("Delete failed:", e);
            Alert.alert("Error", "Failed to delete reading.");
          }
        },
      },
    ]);
  };

  // ----------------------------
  // UI blocks
  // ----------------------------
  const renderInfoCard = (r: TrackReading) => {
    const trackName =
      pickFirst(r as AnyObj, ["trackName", "track_name", "track"]) ?? "N/A";

    const created =
      pickFirst(r as AnyObj, ["created_at", "createdAt", "timestamp", "ts"]) ??
      pickFirst(r as AnyObj, ["date", "time"]);

    const session = pickFirst(r as AnyObj, ["session", "sessionName"]);
    const pair = pickFirst(r as AnyObj, ["pair", "driverPair"]);

    return (
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🏁</Text>
          <Text style={styles.infoText}>{String(trackName)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📅</Text>
          <Text style={styles.infoText}>{fmtDate(created)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🕒</Text>
          <Text style={styles.infoText}>{fmtTime(created)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🧾</Text>
          <Text style={styles.infoText}>
            Session: {session ? String(session) : "N/A"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👥</Text>
          <Text style={styles.infoText}>Pair: {pair ? String(pair) : "N/A"}</Text>
        </View>
      </View>
    );
  };

  const renderWeatherSnapshot = (r: TrackReading) => {
    if (!hasWeather(r)) return null;

    const temp = pickFirst(r as AnyObj, ["temp_f", "tempF"]);
    const hum = pickFirst(r as AnyObj, ["humidity_pct", "humidityPct"]);
    const baro = pickFirst(r as AnyObj, ["baro_inhg", "absPressureInHg", "baro"]);
    const uv = pickFirst(r as AnyObj, ["uv_index", "uvIndex"]);
    const adr = pickFirst(r as AnyObj, ["adr"]);
    const corr = pickFirst(r as AnyObj, ["correction"]);
    const ts = pickFirst(r as AnyObj, ["weather_ts", "weatherTs", "weather_timestamp"]);

    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>Weather Snapshot</Text>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Temp (°F)</Text>
            <Text style={styles.dataValue}>{fmtNum(temp, 1)}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Humidity (%)</Text>
            <Text style={styles.dataValue}>{fmtNum(hum, 0)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Barometer (inHg)</Text>
            <Text style={styles.dataValue}>{fmtNum(baro, 3)}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>UV Index</Text>
            <Text style={styles.dataValue}>
              {uv === undefined || uv === null || uv === "" ? "N/A" : fmtNum(uv, 1)}
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Correction</Text>
            <Text style={styles.dataValue}>{fmtNum(corr, 4)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>ADR</Text>
            <Text style={styles.dataValue}>{fmtNum(adr, 2)}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Snapshot Time</Text>
            <Text style={styles.dataValue}>
              {ts ? `${fmtDate(ts)},\n${fmtTime(ts)}` : "N/A"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLaneData = (lane: AnyObj, title: string) => {
    // Flexible lane keys (so you don’t get burned by naming differences)
    const trackTemp = pickFirst(lane, ["trackTemp", "track_temp"]);
    const uvIndex = pickFirst(lane, ["uvIndex", "uv_index"]);
    const kegSL = pickFirst(lane, ["kegSL", "keg_sl", "kegSl"]);
    const kegOut = pickFirst(lane, ["kegOut", "keg_out"]);
    const grippoSL = pickFirst(lane, ["grippoSL", "grippo_sl", "grippoSl"]);
    const grippoOut = pickFirst(lane, ["grippoOut", "grippo_out"]);
    const shine = pickFirst(lane, ["shine"]);
    const notes = pickFirst(lane, ["notes", "note"]);
    const img = pickFirst(lane, ["imageUrl", "image_url", "imageUri", "image_uri", "photoUrl"]);

    const safeImg = safeHttpUri(typeof img === "string" ? img : undefined);

    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>{title}</Text>

        {/* Row 1 */}
        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Track Temp</Text>
            <Text style={styles.dataValue}>
              {trackTemp === undefined || trackTemp === null || trackTemp === ""
                ? "N/A"
                : fmtInt(trackTemp)}
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>UV Index</Text>
            <Text style={styles.dataValue}>
              {uvIndex === undefined || uvIndex === null || uvIndex === ""
                ? "N/A"
                : fmtNum(uvIndex, 1)}
            </Text>
          </View>
        </View>

        {/* Row 2 */}
        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Keg SL</Text>
            <Text style={styles.dataValue}>
              {kegSL === undefined || kegSL === null || kegSL === "" ? "N/A" : fmtInt(kegSL)}
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Keg Out</Text>
            <Text style={styles.dataValue}>
              {kegOut === undefined || kegOut === null || kegOut === "" ? "N/A" : fmtInt(kegOut)}
            </Text>
          </View>
        </View>

        {/* Row 3 */}
        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Grippo SL</Text>
            <Text style={styles.dataValue}>
              {grippoSL === undefined || grippoSL === null || grippoSL === ""
                ? "N/A"
                : fmtInt(grippoSL)}
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Grippo Out</Text>
            <Text style={styles.dataValue}>
              {grippoOut === undefined || grippoOut === null || grippoOut === ""
                ? "N/A"
                : fmtInt(grippoOut)}
            </Text>
          </View>
        </View>

        {/* Shine (full width feel) */}
        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Shine</Text>
            <Text style={[styles.dataValue, { fontSize: 24 }]}>
              {shine ? String(shine) : "N/A"}
            </Text>
          </View>
          <View style={styles.dataItem} />
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.dataLabel}>Notes</Text>
          <Text style={styles.notesText}>{notes ? String(notes) : "—"}</Text>
        </View>

        {/* Optional photo (won’t mess layout if absent) */}
        {safeImg ? <Image source={{ uri: safeImg }} style={styles.laneImage} /> : null}
      </View>
    );
  };

  // ----------------------------
  // Derived
  // ----------------------------
  const leftLane = useMemo(() => {
    const r: AnyObj | null = reading as any;
    return (
      (r && (r.leftLane || r.left_lane || r.left)) ||
      {}
    );
  }, [reading]);

  const rightLane = useMemo(() => {
    const r: AnyObj | null = reading as any;
    return (
      (r && (r.rightLane || r.right_lane || r.right)) ||
      {}
    );
  }, [reading]);

  // ----------------------------
  // Render
  // ----------------------------
  if (!trackId || !readingId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>
            Missing trackId or readingId.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !reading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>
            {loading ? "Loading..." : "Reading not found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.text }]}>{"‹"}</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Reading Details</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Keep edit icon slot (won’t break anything). If you don’t want it, delete this block. */}
          <TouchableOpacity
            onPress={() => router.push(`/browse/edit-reading?trackId=${trackId}&readingId=${readingId}`)}
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: "#1e74ff" }]}>✎</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDelete} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: "#ff3b30" }]}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderInfoCard(reading)}
        {renderWeatherSnapshot(reading)}

        {renderLaneData(leftLane, "Left Lane")}
        {renderLaneData(rightLane, "Right Lane")}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  headerButtonText: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  infoIcon: { fontSize: 18 },
  infoText: { fontSize: 16 },

  laneSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  laneTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dataItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  dataLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "500",
    color: "#666",
  },
  dataValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    color: "#111",
  },
  laneImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 16,
  },
});