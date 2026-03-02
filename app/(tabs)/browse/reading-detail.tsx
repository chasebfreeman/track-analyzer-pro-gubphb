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
import { IconSymbol } from "@/components/IconSymbol";
import { safeHttpUri } from "@/utils/safeUri";

import { SupabaseStorageService } from "@/utils/supabaseStorage";
import { Track, TrackReading } from "@/types/TrackData";

// -------------------------
// tiny helpers
// -------------------------
const isNil = (v: any) => v === null || v === undefined;

const pickFirst = <T,>(...vals: T[]): T | null => {
  for (const v of vals) {
    if (!isNil(v) && v !== "") return v;
  }
  return null;
};

const fmtNum = (v: any, decimals = 0) => {
  if (isNil(v) || v === "") return "N/A";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "N/A";
  return n.toFixed(decimals);
};

const fmtMaybe = (v: any) => {
  if (isNil(v) || v === "") return "N/A";
  return String(v);
};

function formatTimeInTimeZone(ms: number, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

export default function ReadingDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ trackId?: string; readingId?: string }>();

  const colors = useThemeColors();

  const [reading, setReading] = useState<TrackReading | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

  // lane image urls (storage public urls)
  const [leftImageUrl, setLeftImageUrl] = useState<string | null>(null);
  const [rightImageUrl, setRightImageUrl] = useState<string | null>(null);

  const readingId = useMemo(() => {
    if (typeof params.readingId === "string") return params.readingId;
    return null;
  }, [params.readingId]);

  const trackId = useMemo(() => {
    if (typeof params.trackId === "string") return params.trackId;
    return null;
  }, [params.trackId]);

  // -------------------------
  // load reading + track
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!trackId || !readingId) {
          setReading(null);
          setTrack(null);
          return;
        }

        // Track + reading are usually coming from SupabaseStorageService
        // (matches your existing project pattern)
        const t = await SupabaseStorageService.getTrack(trackId);
        const r = await SupabaseStorageService.getReadingById(trackId, readingId);

        if (cancelled) return;

        setTrack(t ?? null);
        setReading(r ?? null);
      } catch (e: any) {
        console.log("reading-detail load error:", e?.message ?? e);
        if (!cancelled) {
          setReading(null);
          setTrack(null);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [trackId, readingId]);

  // -------------------------
  // resolve image URLs (if any)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      try {
        if (!reading) return;

        const leftPath =
          (reading.leftLane as any)?.imagePath ??
          (reading.leftLane as any)?.image_path ??
          null;
        const rightPath =
          (reading.rightLane as any)?.imagePath ??
          (reading.rightLane as any)?.image_path ??
          null;

        const leftUrl = leftPath
          ? SupabaseStorageService.getPublicUrl(leftPath)
          : null;
        const rightUrl = rightPath
          ? SupabaseStorageService.getPublicUrl(rightPath)
          : null;

        if (cancelled) return;
        setLeftImageUrl(leftUrl);
        setRightImageUrl(rightUrl);
      } catch (e) {
        console.log("loadImages error:", e);
      }
    }

    loadImages();
    return () => {
      cancelled = true;
    };
  }, [reading]);

  const handleDelete = useCallback(() => {
    if (!reading || !trackId) return;

    Alert.alert("Delete reading?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await SupabaseStorageService.deleteReading(trackId, reading.id);
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Failed to delete reading");
          }
        },
      },
    ]);
  }, [reading, trackId, router]);

  const handleEdit = useCallback(() => {
    if (!reading) return;

    router.push({
      pathname: "/(tabs)/record",
      params: {
        editReadingId: reading.id,
        trackId: reading.trackId,
      },
    });
  }, [reading, router]);

  // -------------------------
  // display helpers (top card)
  // -------------------------
  const getDisplayDate = (r: TrackReading) =>
    (r as any).trackDate || (r as any).date || "—";

  const getDisplayTime = (r: TrackReading) => {
    const tz = (r as any).timeZone;
    const ts = (r as any).timestamp;
    if (tz && ts) return formatTimeInTimeZone(ts, tz);
    return (r as any).time || "—";
  };

  // -------------------------
  // Weather Snapshot (card)
  // -------------------------
  const hasWeather = (r: TrackReading) => {
    const anyR: any = r as any;
    return (
      !isNil(anyR.temp_f) ||
      !isNil(anyR.humidity_pct) ||
      !isNil(anyR.baro_inhg) ||
      !isNil(anyR.adr) ||
      !isNil(anyR.correction) ||
      !isNil(anyR.weather_ts) ||
      !isNil(anyR.uv_index) ||
      !isNil(anyR.uvIndex)
    );
  };

  const renderWeatherSnapshot = (r: TrackReading) => {
    if (!hasWeather(r)) return null;

    const anyR: any = r as any;
    const uv = pickFirst(anyR.uv_index, anyR.uvIndex);
    const weatherTs = anyR.weather_ts;

    const snapshotTime =
      typeof weatherTs === "number"
        ? new Date(weatherTs).toLocaleString()
        : fmtMaybe(weatherTs);

    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>Weather Snapshot</Text>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Temp (°F)</Text>
            <Text style={styles.dataValue}>{fmtNum(anyR.temp_f, 1)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Humidity (%)</Text>
            <Text style={styles.dataValue}>{fmtNum(anyR.humidity_pct, 0)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Barometer (inHg)</Text>
            <Text style={styles.dataValue}>{fmtNum(anyR.baro_inhg, 3)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>UV Index</Text>
            <Text style={styles.dataValue}>{fmtNum(uv, 1)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>ADR</Text>
            <Text style={styles.dataValue}>{fmtNum(anyR.adr, 2)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Correction</Text>
            <Text style={styles.dataValue}>{fmtNum(anyR.correction, 4)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItemFull}>
            <Text style={styles.dataLabel}>Snapshot Time</Text>
            <Text style={styles.dataValue}>{snapshotTime}</Text>
          </View>
        </View>
      </View>
    );
  };

  // -------------------------
  // Lane card (FULL fields)
  // -------------------------
  const laneGet = (lane: any, ...keys: string[]) => {
    if (!lane) return null;
    for (const k of keys) {
      const v = lane[k];
      if (!isNil(v) && v !== "") return v;
    }
    return null;
  };

  const renderLaneData = (lane: any, title: string) => {
    const safeLeftUri = safeHttpUri(leftImageUrl);
    const safeRightUri = safeHttpUri(rightImageUrl);

    const fallbackUri = safeHttpUri(lane?.imageUri || lane?.image_url || lane?.imageUrl);

    const displayUri =
      title === "Left Lane"
        ? pickFirst(safeLeftUri, fallbackUri)
        : pickFirst(safeRightUri, fallbackUri);

    const trackTemp = laneGet(lane, "trackTemp", "track_temp", "track_temperature");
    const uvIndex = laneGet(lane, "uvIndex", "uv_index", "uv");

    const kegSl = laneGet(lane, "kegSl", "keg_sl", "kegSL");
    const kegOut = laneGet(lane, "kegOut", "keg_out", "kegOUT");

    const grippoSl = laneGet(lane, "grippoSl", "grippo_sl", "grippoSL");
    const grippoOut = laneGet(lane, "grippoOut", "grippo_out", "grippoOUT");

    const shine = laneGet(lane, "shine", "trackShine", "track_shine");
    const notes = laneGet(lane, "notes", "laneNotes", "lane_notes");

    return (
      <View style={styles.laneSection}>
        <Text style={styles.laneTitle}>{title}</Text>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Track Temp</Text>
            <Text style={styles.dataValue}>{fmtNum(trackTemp, 0)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>UV Index</Text>
            <Text style={styles.dataValue}>{fmtNum(uvIndex, 1)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Keg SL</Text>
            <Text style={styles.dataValue}>{fmtNum(kegSl, 0)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Keg Out</Text>
            <Text style={styles.dataValue}>{fmtNum(kegOut, 0)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Grippo SL</Text>
            <Text style={styles.dataValue}>{fmtNum(grippoSl, 0)}</Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Grippo Out</Text>
            <Text style={styles.dataValue}>{fmtNum(grippoOut, 0)}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          <View style={styles.dataItemFull}>
            <Text style={styles.dataLabel}>Shine</Text>
            <Text style={styles.dataValue}>{fmtMaybe(shine)}</Text>
          </View>
        </View>

        {notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.dataLabel}>Notes</Text>
            <Text style={styles.notesText}>{String(notes)}</Text>
          </View>
        ) : null}

        {displayUri ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: "/(modals)/photo-viewer",
                params: { url: encodeURIComponent(displayUri) },
              })
            }
          >
            <Image source={{ uri: displayUri }} style={styles.laneImage} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const styles = getStyles(colors);

  if (!reading || !track) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reading Details</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
            <IconSymbol
              ios_icon_name="pencil"
              android_material_icon_name="edit"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={24}
              color="#FF3B30"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Top info card (matches build 33 vibe) */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="flag.checkered"
              android_material_icon_name="sports-score"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>{track.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>{getDisplayDate(reading)}</Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="access-time"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>{getDisplayTime(reading)}</Text>
          </View>

          {(reading as any).session ? (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="list"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoText}>Session: {(reading as any).session}</Text>
            </View>
          ) : null}

          {(reading as any).pair ? (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="person.2"
                android_material_icon_name="group"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoText}>Pair: {(reading as any).pair}</Text>
            </View>
          ) : null}
        </View>

        {/* Weather snapshot (you want this back) */}
        {renderWeatherSnapshot(reading)}

        {/* Full lane cards */}
        {renderLaneData((reading as any).leftLane, "Left Lane")}
        {renderLaneData((reading as any).rightLane, "Right Lane")}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      marginRight: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 140,
    },

    // Top info card
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    infoText: {
      fontSize: 18,
      color: colors.text,
      fontWeight: "500",
    },

    // Cards (Weather + Lanes)
    laneSection: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },
    laneTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },

    dataRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 12,
    },
    dataItem: {
      flex: 1,
    },
    dataItemFull: {
      flex: 1,
    },
    dataLabel: {
      fontSize: 14,
      color: colors.textSecondary ?? "#777",
      marginBottom: 6,
    },
    dataValue: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.text,
    },

    notesSection: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border ?? "rgba(0,0,0,0.12)",
    },
    notesText: {
      fontSize: 16,
      color: colors.text,
      marginTop: 6,
      lineHeight: 22,
    },

    laneImage: {
      width: "100%",
      height: 220,
      borderRadius: 12,
      marginTop: 12,
      backgroundColor: "rgba(0,0,0,0.06)",
    },
  });
}
