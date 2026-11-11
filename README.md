# Track Analyzer Pro

This app was built for racers, by racers.

Track Analyzer Pro is an Expo / React Native app that records track condition readings for both lanes (track temperature, UV, Keg and Grippo values, shine, notes, and photos) and shares them with the team through Supabase.

## Project layout

| Path | What's there |
|---|---|
| `app/` | Screens (Expo Router). The `(tabs)/` folder holds Tracks, Record, Browse, Photos, and Settings. |
| `components/` | Shared UI: charts, graph builder, tab bar, icons |
| `constants/nhraTracks.ts` | Canonical NHRA venue list used by the Add Track picker |
| `contexts/` | Auth and push-notification providers |
| `utils/supabaseStorage.ts` | All database and storage reads and writes |
| `supabase/migrations/` | Database schema changes |
| `supabase/functions/` | Edge functions: `notify-reading-created`, `delete-account` |
| `docs/` | Setup guides, App Store checklists, troubleshooting, changelog |

## Track names

Tracks use the short official NHRA venue name with no title sponsor, for example `Indianapolis Raceway Park` and `Pomona Dragstrip`. Location is the venue's real city as `City, ST`. When the Add Track form gets a nickname (`Indy`, `Thunder Valley`, `Gators`), it suggests the official venue and fills in the location. To keep a second event at the same venue separate, add a tag, which gives a name like `Pomona Dragstrip – Finals` or `Gainesville Raceway – Test`.

To add or rename a venue, edit `constants/nhraTracks.ts`.

## Development

```bash
npm install
npm run dev          # Expo dev server
npm run type-check
npm run lint
```

Builds and submission go through EAS (`npm run eas:build:ios`, `npm run eas:submit:ios`). For the full process, see `docs/DEPLOYMENT_GUIDE.md`.
