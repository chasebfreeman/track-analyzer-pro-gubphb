import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Track Analyzer Pro",
  slug: "track-analyzer",

  ios: {
    bundleIdentifier: "com.cfreeman4798.trackanalyzerpro"
  },

  extra: {
    eas: {
      projectId: "576ab141-f770-4852-bc5b-40e273d22fe0",
    },
  },

  plugins: [
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Track Analyzer to access your photos to attach lane pictures.",
        cameraPermission:
          "Allow Track Analyzer to use your camera to take lane pictures.",
      },
    ],
  ],
};

export default config;
