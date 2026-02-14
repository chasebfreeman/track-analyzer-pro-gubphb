import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config, // <-- this is the merge

  name: "Track Analyzer Pro",
  slug: "track-analyzer-pro",

  ios: {
    ...config.ios,
    bundleIdentifier: "com.cfreeman4798.trackanalyzerpro",
    supportsTablet: true,
    isTabletOnly: false,
  },

  extra: {
    ...config.extra,
    eas: {
      ...(config.extra as any)?.eas,
      projectId: "053aacf8-9bb9-41d9-af12-a10076022eba",
    },
  },
});
