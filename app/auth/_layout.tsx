
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="setup-pin" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
