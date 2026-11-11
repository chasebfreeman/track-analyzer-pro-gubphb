# Push Notifications Setup

This app now supports Expo push notifications for new team reading alerts.

## What was added

- Expo client registration for push permissions and Expo push tokens
- A `push_tokens` table in Supabase for per-device notification delivery
- A `notify-reading-created` Supabase Edge Function
- A Settings screen control to enable, disable, and refresh notification status
- Automatic notification dispatch after a new reading is saved

## Deploy the backend changes

1. Apply the new database migration.
2. Deploy the new edge function:

```bash
supabase functions deploy notify-reading-created
```

3. If you enable Expo push access-token security in EAS, add the token as a Supabase secret:

```bash
supabase secrets set EXPO_ACCESS_TOKEN=your_expo_access_token
```

## Install app dependencies

The repo now expects these Expo SDK 54 packages:

- `expo-notifications`
- `expo-device`

Install dependencies with your normal package manager before building.

## iOS / Apple setup

1. Make sure the Apple Developer account used for this app has push notifications enabled for the app identifier.
2. Run `eas credentials` if you need to create or refresh the APNs key for this app.
3. Rebuild the iOS app after credentials are in place. Existing App Store binaries will not gain push support until a new build is created and installed.

## Recommended test flow

1. Install a new development or production build on a physical iPhone.
2. Log in and enable notifications from Settings.
3. Save a new reading from one device.
4. Confirm the other team device receives the notification.
5. Tap the notification and confirm it opens the saved reading detail screen.

## Notes

- Push notifications do not work on iOS simulators.
- The app currently sends notifications only for newly created readings, not edits.
- Expo recommends checking push receipts for long-term cleanup of invalid devices. This implementation handles immediate `DeviceNotRegistered` responses but does not yet run a delayed receipt reconciliation job.
