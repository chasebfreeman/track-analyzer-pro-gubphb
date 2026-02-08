import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Track Analyzer',
  slug: 'track-analyzer',
  plugins: [
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Track Analyzer to access your photos to attach lane pictures.',
        cameraPermission: 'Allow Track Analyzer to use your camera to take lane pictures.',
      },
    ],
  ],
};

export default {
  expo: {
    name: "Track Analyzer Pro",
    slug: "track-analyzer-pro",
    extra: {
      eas: {
        projectId: "576ab141-f770-4852-bc5b-40e273d22fe0"
      }
    }
  }
};


