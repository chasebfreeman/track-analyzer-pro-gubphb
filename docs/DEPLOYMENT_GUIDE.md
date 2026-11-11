
# Track Analyzer Pro - Deployment Guide

## Quick Start for v1.0.0 Launch

### Step 1: Set Up EAS (Expo Application Services)

1. Install EAS CLI globally:
```bash
npm install -g eas-cli
```

2. Log in to your Expo account:
```bash
eas login
```

3. Configure your project:
```bash
eas build:configure
```

This will create an EAS project and update your `app.json` with the project ID.

### Step 2: Set Up Supabase Production Environment

1. Create a new Supabase project at https://supabase.com
2. Run the SQL from `supabase-setup.sql` in the SQL Editor
3. Update `utils/supabase.ts` with your production credentials:

```typescript
const supabaseUrl = 'YOUR_PRODUCTION_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_PRODUCTION_ANON_KEY';
```

4. Configure storage bucket for images:
   - Go to Storage in Supabase dashboard
   - Create a bucket named `track-images`
   - Set it to public or configure RLS policies

### Step 3: Update App Configuration

1. Update bundle identifiers in `app.json`:
   - iOS: `com.trackanalyzerpro.app` (or your preferred identifier)
   - Android: `com.trackanalyzerpro.app`

2. Ensure version is set to `1.0.0` in both:
   - `app.json` → `expo.version`
   - `package.json` → `version`

### Step 4: Build for iOS

1. **Prerequisites:**
   - Apple Developer account ($99/year)
   - Enrolled in Apple Developer Program

2. **Build:**
```bash
eas build --platform ios --profile production
```

3. **Submit to App Store:**
```bash
eas submit --platform ios --latest
```

4. **Alternative - Manual submission:**
   - Download the `.ipa` file from EAS dashboard
   - Upload to App Store Connect using Transporter app

### Step 5: Build for Android

1. **Build:**
```bash
eas build --platform android --profile production
```

2. **Submit to Google Play:**
```bash
eas submit --platform android --latest
```

3. **Alternative - Manual submission:**
   - Download the `.aab` file from EAS dashboard
   - Upload to Google Play Console

### Step 6: App Store Listings

#### iOS App Store Connect

1. **App Information:**
   - Name: Track Analyzer Pro
   - Subtitle: Professional Track Data Recording
   - Category: Sports or Productivity
   - Privacy Policy URL: (required)

2. **Version Information:**
   - Version: 1.0.0
   - Copyright: © 2024 Track Analyzer Pro
   - Description: (see below)

3. **Screenshots Required:**
   - 6.7" iPhone (1290 x 2796)
   - 6.5" iPhone (1242 x 2688)
   - 5.5" iPhone (1242 x 2208)
   - 12.9" iPad Pro (2048 x 2732)

#### Google Play Console

1. **Store Listing:**
   - App name: Track Analyzer Pro
   - Short description: (max 80 characters)
   - Full description: (max 4000 characters)
   - Category: Sports or Tools

2. **Graphics Required:**
   - App icon: 512 x 512 PNG
   - Feature graphic: 1024 x 500 JPG/PNG
   - Phone screenshots: At least 2 (min 320px)
   - 7" tablet screenshots: At least 2
   - 10" tablet screenshots: At least 2

### App Description Template

**Short Description (80 chars):**
Professional race track data recording and analysis for track specialists.

**Full Description:**

Track Analyzer Pro is the essential tool for race track specialists who need to record, analyze, and compare track conditions in the field.

**KEY FEATURES:**

📊 Track Management
• Create and manage multiple race tracks
• Store track names and locations
• Quick access to all your tracks

📝 Detailed Recording
• Record comprehensive lane-by-lane data
• Track temperature and UV index
• Keg SL, Keg Out, Grippo SL, Grippo Out measurements
• Shine readings and custom notes
• Upload photos for each lane

🔍 Browse & Compare
• View readings organized by track and year
• Compare conditions across different days
• Expandable day groups for easy navigation
• Detailed reading history

🔐 Team Collaboration
• Secure multi-user authentication
• Share data with your team
• Cloud-based storage with Supabase

🎨 Professional Interface
• Clean, modern design
• Dark mode support
• Optimized for iOS, Android, and Web
• Smooth animations and intuitive navigation

Perfect for track specialists, racing teams, and motorsports professionals who need reliable data recording and analysis tools in the field.

**REQUIREMENTS:**
• Internet connection for data sync
• Camera access for lane photos (optional)
• Photo library access for image uploads (optional)

**SUPPORT:**
For questions or support, contact us at support@trackanalyzerpro.com

### Step 7: Testing Before Launch

1. **Internal Testing:**
```bash
# Build preview version
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

2. **TestFlight (iOS):**
   - Invite internal testers
   - Test all features thoroughly
   - Fix any issues before production release

3. **Google Play Internal Testing:**
   - Create internal testing track
   - Invite testers
   - Verify all functionality

### Step 8: Monitor After Launch

1. **Set up monitoring:**
   - App Store Connect analytics
   - Google Play Console statistics
   - Supabase dashboard for backend metrics

2. **Respond to reviews:**
   - Monitor app store reviews
   - Respond to user feedback
   - Plan updates based on feedback

3. **Track crashes:**
   - Monitor crash reports in app store consoles
   - Fix critical issues quickly
   - Release patch updates as needed

## Troubleshooting

### Build Fails

**iOS:**
- Ensure Apple Developer account is active
- Check bundle identifier is registered
- Verify certificates are valid

**Android:**
- Check package name is unique
- Ensure all permissions are declared
- Verify signing configuration

### Submission Rejected

**Common reasons:**
- Missing privacy policy
- Incomplete app information
- Screenshots don't match app
- App crashes on launch
- Missing required permissions explanations

**Fix:**
1. Address the specific rejection reason
2. Update app information/screenshots
3. Rebuild if code changes needed
4. Resubmit

### Supabase Issues

**Connection errors:**
- Verify URL and anon key are correct
- Check RLS policies are applied
- Ensure storage bucket is configured

**Authentication issues:**
- Verify email settings in Supabase
- Check auth providers are enabled
- Test with different email addresses

## Next Steps After Launch

1. **v1.0.1 - Bug Fixes:**
   - Address any critical bugs
   - Improve performance
   - Fix user-reported issues

2. **v1.1.0 - Feature Updates:**
   - Add data export functionality
   - Implement charts and analytics
   - Add weather integration
   - Team management features

3. **Marketing:**
   - Create landing page
   - Social media presence
   - Racing community outreach
   - App Store Optimization (ASO)

## Support Resources

- **Expo Docs:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Supabase Docs:** https://supabase.com/docs
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies:** https://play.google.com/about/developer-content-policy/

---

Good luck with your launch! 🚀🏁
