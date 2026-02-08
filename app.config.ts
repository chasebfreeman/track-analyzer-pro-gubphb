import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Track Analyzer Pro",
  slug: "track-analyzer-pro",

  ios: {
    bundleIdentifier: "com.cfreeman4798.trackanalyzerpro",
  },

  extra: {
    eas: {
      projectId: "053aacf8-9bb9-41d9-af12-a10076022eba",
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
