// app/(tabs)/browse/reading-detail.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

import { useThemeColors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { SupabaseStorageService } from "@/utils/supabaseStorage";
import { TrackReading, Track } from "@/types/TrackData";

type Params = {
  readingId?: string;
  trackId?: string;
};

function isNum(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n);
}

function fmtNum(v: any, decimals = 0) {
  if (!isNum(v)) return "N/A";
  return Number(v).toFixed(decimals);
}

function pickAny(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

export default function ReadingDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const readingId = params.readingId ?? "";
  const trackId = params.trackId ?? "";

  const [reading, setReading] = useState<TrackReading | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!readingId || !trackId) return;

    setIsLoading(true);
    try {
      // Track
      const tracks = await SupabaseStorageService.getAllTracks();
      const foundTrack = tracks.find((t) => t.id === trackId) ?? null;
      setTrack(foundTrack);

      // Reading (IMPORTANT: use the service so leftLane/rightLane are included)
      const foundReading = await SupabaseStorageService.getReadingById(readingId);
      setReading(foundReading ?? null);

      if (foundReading) {
        console.log("DETAIL loaded reading:", foundReading.id);
        console.log("DETAIL WEATHER:", {
          temp_f: (foundReading as any).temp_f,
          humidity_pct: (foundReading as any).humidity_pct,
          baro_inhg: (foundReading as any).baro_inhg,
          adr: (foundReading as any).adr,
          correction: (foundReading as any).correction,
          uv_index: (foundReading as any).uv_index,
          weather_ts: (foundReading as any).weather_ts,
        });
      }
    } catch (e) {
      console.log("DETAIL load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [readingId, trackId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when coming back from Edit (DO NOT overwrite with raw DB row)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const goEdit = useCallback(() => {
    if (!readingId || !trackId) return;
    router.push({
      pathname: "/(tabs)/browse/edit-reading",
      params: { readingId, trackId },
    });
  }, [readingId, trackId, router]);

  const confirmDelete = useCallback(() => {
    if (!readingId || !trackId) return;

    Alert.alert("Delete reading?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await SupabaseStorageService.deleteReading(readingId);
            router.back();
          } catch (e) {
            Alert.alert("Error", "Failed to delete reading.");
            console.log("Delete error:", e);
          }
        },
      },
    ]);
  }, [readingId, trackId, router]);

  const headerTitle = useMemo(() => {
    return track?.name ?? "Reading Details";
  }, [track?.name]);

  // ----------------------------
  // Weather Snapshot (Davis)
  // ----------------------------
  const weather = useMemo(() => {
    if (!reading) return null;

    // Support both snake_case and camelCase just in case
    const tempF = pickAny(reading as any, ["temp_f", "tempF"]);
    const humidityPct = pickAny(reading as any, ["humidity_pct", "humidityPct"]);
    const baroInHg = pickAny(reading as any, ["baro_inhg", "absPressureInHg", "baroInHg"]);
    const adr = pickAny(reading as any, ["adr"]);
    const correction = pickAny(reading as any, ["correction"]);
    const uvIndex = pickAny(reading as any, ["uv_index", "uvIndex"]);
    const weatherTs = pickAny(reading as any, ["weather_ts", "weatherTs"]);

    const hasAnything =
      tempF !== null ||
      humidityPct !== null ||
      baroInHg !== null ||
      adr !== null ||
      correction !== null ||
      uvIndex !== null ||
      weatherTs !== null;

    if (!hasAnything) return null;

    return { tempF, humidityPct, baroInHg, adr, correction, uvIndex, weatherTs };
  }, [reading]);

  const snapshotTimeText = useMemo(() => {
    const ts = weather?.weatherTs;
    if (!ts) return "N/A";

    // weather_ts might be ms, ISO string, or date string
    let d: Date | null = null;
    if (typeof ts === "number") d = new Date(ts);
    else if (typeof ts === "string") d = new Date(ts);

    if (!d || Number.isNaN(d.getTime())) return "N/A";

    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [weather?.weatherTs]);

  const renderWeatherSnapshot = () => {
    if (!weather) return null;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weather Snapshot</Text>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Temp (°F)</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(weather.tempF, 1)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Humidity (%)</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(weather.humidityPct, 0)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Barometer (inHg)</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(weather.baroInHg, 3)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>UV Index (Davis)</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(weather.uvIndex, 1)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>ADR</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(weather.adr, 2)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Correction</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(weather.correction, 4)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Snapshot Time</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{snapshotTimeText}</Text>
          </View>
          <View style={styles.dataItem} />
        </View>
      </View>
    );
  };

  // ----------------------------
  // Lane Cards (Manual UV)
  // ----------------------------
  const renderLane = (lane: any, title: string) => {
    const trackTemp = pickAny(lane, ["trackTemp", "track_temp"]);
    const uvManual = pickAny(lane, ["uvIndex", "uv_index", "uv_manual", "uvManual"]);

    const kegSL = pickAny(lane, ["kegSL", "keg_sl", "kegSl"]);
    const kegOut = pickAny(lane, ["kegOut", "keg_out"]);
    const grippoSL = pickAny(lane, ["grippoSL", "grippo_sl", "grippoSl"]);
    const grippoOut = pickAny(lane, ["grippoOut", "grippo_out"]);

    const shine = pickAny(lane, ["shine"]);
    const notes = pickAny(lane, ["notes"]);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Track Temp</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(trackTemp, 0)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>UV Index (Manual)</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(uvManual, 1)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Keg SL</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(kegSL, 0)}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Keg Out</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(kegOut, 0)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Grippo SL</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(grippoSL, 0)}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Grippo Out</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{fmtNum(grippoOut, 0)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.subtext }]}>Shine</Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>{shine ?? "N/A"}</Text>
          </View>
          <View style={styles.dataItem} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.notesSection}>
          <Text style={[styles.dataLabel, { color: colors.subtext }]}>Notes</Text>
          <Text style={[styles.notesText, { color: colors.text }]}>{notes ?? "—"}</Text>
        </View>
      </View>
    );
  };

  // ----------------------------
  // Top info card (track/date/session/pair)
  // ----------------------------
  const info = useMemo(() => {
    if (!reading) return null;

    const trackName = track?.name ?? pickAny(reading as any, ["trackName", "track_name"]) ?? "—";
    const dateStr = pickAny(reading as any, ["date", "trackDate", "track_date"]) ?? "—";
    const timeStr = pickAny(reading as any, ["time", "trackTime", "track_time"]) ?? "—";
    const session = pickAny(reading as any, ["session"]) ?? "—";
    const pair = pickAny(reading as any, ["pair"]) ?? "—";

    return { trackName, dateStr, timeStr, session, pair };
  }, [reading, track?.name]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <IconSymbol name="chevron.left" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={goEdit} style={styles.headerIcon}>
            <IconSymbol name="pencil" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete} style={styles.headerIcon}>
            <IconSymbol name="trash" size={22} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {info && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <IconSymbol name="flag.checkered" size={20} color={colors.text} />
              <Text style={[styles.infoText, { color: colors.text }]}>{info.trackName}</Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="calendar" size={20} color={colors.text} />
              <Text style={[styles.infoText, { color: colors.text }]}>{info.dateStr}</Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="clock" size={20} color={colors.text} />
              <Text style={[styles.infoText, { color: colors.text }]}>{info.timeStr}</Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="list.bullet" size={20} color={colors.text} />
              <Text style={[styles.infoText, { color: colors.text }]}>Session: {info.session}</Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="person.2" size={20} color={colors.text} />
              <Text style={[styles.infoText, { color: colors.text }]}>Pair: {info.pair}</Text>
            </View>
          </View>
        )}

        {/* Weather snapshot (Davis) */}
        {renderWeatherSnapshot()}

        {/* Lanes */}
        {renderLane((reading as any)?.leftLane ?? {}, "Left Lane")}
        {renderLane((reading as any)?.rightLane ?? {}, "Right Lane")}

        {isLoading && (
          <Text style={{ color: colors.subtext, marginTop: 10 }}>Refreshing…</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerIcon: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center" },

  scrollContent: { padding: 14, paddingBottom: 40 },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: { fontSize: 22, fontWeight: "800", marginBottom: 12 },

  dataRow: { flexDirection: "row", gap: 14, marginBottom: 12 },
  dataItem: { flex: 1 },
  dataLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  dataValue: { fontSize: 22, fontWeight: "800" },

  divider: { height: 1, marginVertical: 12 },

  notesSection: { marginTop: 2 },
  notesText: { fontSize: 16, fontWeight: "500" },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  infoText: { fontSize: 18, fontWeight: "700" },
});