// components/SafeImage.tsx
import React from "react";
import { View, Text, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { safeHttpUri } from "@/utils/safeUri";

type Props = {
  uri: unknown;
  style: any; // keep flexible for RN styles
  contentFit?: "cover" | "contain" | "fill" | "scale-down";
  fallbackText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function SafeImage({
  uri,
  style,
  contentFit = "cover",
  fallbackText = "No photo",
  containerStyle,
}: Props) {
  const safe = safeHttpUri(uri);

  if (!safe) {
    return (
      <View style={containerStyle}>
        <Text style={{ opacity: 0.6 }}>{fallbackText}</Text>
      </View>
    );
  }

  return <Image source={{ uri: safe }} style={style} contentFit={contentFit} />;
}