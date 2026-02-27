// app/(modals)/photo-viewer.tsx
import React, { useEffect, useMemo } from "react";
import { View, Pressable, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import ZoomAnything from "react-native-zoom-anything";
import { safeHttpUri } from "@/utils/safeUri";

export default function PhotoViewerModal() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();

  // Decode (because reading-detail now encodeURIComponent's it)
  const decodedUrl = useMemo(() => {
    if (typeof url !== "string") return null;
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  }, [url]);

  const safeUrl = safeHttpUri(decodedUrl);

  // If the URL is invalid, bail immediately (prevents native crashes)
  useEffect(() => {
  if (!safeUrl) {
    if (router.canGoBack()) router.back();
  }
}, [safeUrl, router]);

  if (!safeUrl) {
    return (
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "white", opacity: 0.7 }}>No image</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <Pressable
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: 60,
          left: 18,
          zIndex: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.15)",
        }}
      >
        <Text style={{ color: "white" }}>Close</Text>
      </Pressable>

      <Image
  source={{ uri: safeUrl }}
  style={{ width: "100%", height: "100%" }}
  contentFit="contain"
/>
    </View>
  );
}