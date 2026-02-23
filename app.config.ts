import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  name: "Track Analyzer Pro",
  slug: "track-analyzer-pro",

  ios: {
    ...config.ios,
    bundleIdentifier: "com.cfreeman4798.trackanalyzerpro",
    supportsTablet: true,
    isTabletOnly: false,
  },

  // ✅ EAS Update config
  updates: {
    ...config.updates,
    fallbackToCacheTimeout: 0,
  },

  // ✅ Ensures update compatibility with the installed binary
  runtimeVersion: {
    policy: "appVersion",
  },

  extra: {
    ...config.extra,
    eas: {
      ...(config.extra as any)?.eas,
      projectId: "053aacf8-9bb9-41d9-af12-a10076022eba",
    },
  },
});
