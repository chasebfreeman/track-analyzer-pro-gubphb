
# Troubleshooting Guide - iOS App Store Submission

**Common issues and how to fix them**

---

## 🔧 Build Issues

### Issue: "Build failed with exit code 1"

**Symptoms**: EAS build fails during compilation

**Solutions**:
1. Check build logs for specific error
2. Update dependencies:
   ```bash
   npm install
   npm update
   ```
3. Clear cache and rebuild:
   ```bash
   npm start -- --clear
   eas build --platform ios --profile production --clear-cache
   ```
4. Check for TypeScript errors:
   ```bash
   npm run type-check
   ```

### Issue: "Bundle identifier mismatch"

**Symptoms**: Build succeeds but can't upload to App Store Connect

**Solution**:
1. Verify bundle ID in `app.json` matches App Store Connect:
   ```json
   "ios": {
     "bundleIdentifier": "com.trackanalyzerpro.app"
   }
   ```
2. Verify bundle ID is registered in Apple Developer Portal
3. Rebuild with correct bundle ID

### Issue: "Provisioning profile error"

**Symptoms**: Build fails with provisioning or certificate errors

**Solution**:
1. Let EAS handle certificates automatically (recommended):
   ```bash
   eas build --platform ios --profile production
   ```
2. When prompted, choose "Let EAS handle it"
3. EAS will create and manage certificates for you

---

## 📱 App Store Connect Issues

### Issue: "Build not appearing in App Store Connect"

**Symptoms**: Build uploaded but doesn't show in App Store Connect

**Solutions**:
1. Wait 30-60 minutes for processing
2. Check email for processing errors from Apple
3. Verify build was uploaded successfully:
   ```bash
   eas submit:list --platform ios
   ```
4. Check App Store Connect → Activity tab for status

### Issue: "Invalid binary"

**Symptoms**: Build rejected during processing

**Common Causes & Solutions**:

**Missing app icon**:
- Ensure icon is set in `app.json`
- Icon must be 1024x1024, PNG, no transparency

**Missing required device capabilities**:
- Check `app.json` for correct iOS configuration
- Ensure all required permissions are declared

**Invalid bundle identifier**:
- Must match exactly between app.json and App Store Connect
- No spaces or special characters except dots and hyphens

### Issue: "Missing compliance"

**Symptoms**: Can't submit because export compliance not answered

**Solution**:
1. In `app.json`, ensure:
   ```json
   "ios": {
     "infoPlist": {
       "ITSAppUsesNonExemptEncryption": false
     }
   }
   ```
2. Rebuild and resubmit
3. Or answer in App Store Connect manually

---

## 🎨 Asset Issues

### Issue: "App icon has transparency"

**Symptoms**: Build rejected for icon with alpha channel

**Solution**:
1. Open icon in image editor
2. Remove alpha channel / transparency
3. Save as PNG with solid background
4. Verify no transparency:
   - Open in Preview (Mac)
   - Check file info - should show "RGB" not "RGBA"

### Issue: "Screenshots wrong size"

**Symptoms**: Can't upload screenshots to App Store Connect

**Solution**:
1. Use exact dimensions required:
   - iPhone 6.7": 1290 x 2796 pixels
   - iPhone 6.5": 1242 x 2688 pixels
2. Take screenshots from iOS Simulator, not real device
3. Use correct simulator:
   - iPhone 15 Pro Max for 6.7"
   - iPhone 11 Pro Max for 6.5"
4. Don't resize - use native simulator resolution

### Issue: "Screenshots show personal information"

**Symptoms**: Rejected for showing real user data

**Solution**:
1. Use demo account with fake data
2. Create sample tracks like:
   - "Daytona International Speedway"
   - "Indianapolis Motor Speedway"
   - "Circuit of the Americas"
3. Use generic names in notes
4. Retake screenshots with clean data

---

## 🔒 Privacy & Compliance Issues

### Issue: "Privacy policy not accessible"

**Symptoms**: Rejected because reviewer can't access privacy policy

**Solutions**:
1. Verify URL is publicly accessible (no login required)
2. Test URL in incognito/private browser window
3. Ensure URL uses HTTPS (not HTTP)
4. Check for typos in URL
5. Verify hosting service is working

**Quick Fix - Host on GitHub Pages**:
1. Create GitHub repository
2. Create `privacy-policy.html` file
3. Enable GitHub Pages in repo settings
4. Use URL: `https://yourusername.github.io/repo/privacy-policy.html`

### Issue: "Privacy policy incomplete"

**Symptoms**: Rejected for missing information in privacy policy

**Must Include**:
- What data you collect (email, photos, track data)
- How data is used (app functionality)
- Where data is stored (Supabase)
- How to delete account/data
- Contact information

**Solution**: Use template in `PRIVACY_POLICY_TEMPLATE.md`

### Issue: "App privacy details don't match app"

**Symptoms**: Rejected because privacy details in App Store Connect don't match actual app behavior

**Solution**:
1. Review what data your app actually collects
2. Update App Privacy section in App Store Connect
3. Ensure privacy policy matches App Privacy details
4. Be honest - don't hide data collection

---

## 🧪 Testing Issues

### Issue: "App crashes on launch"

**Symptoms**: Reviewer reports app crashes immediately

**Common Causes**:

**Supabase configuration**:
```typescript
// Check utils/supabase.ts has valid credentials
const supabaseUrl = 'https://your-project.supabase.co' // Must be real URL
const supabaseAnonKey = 'your-anon-key' // Must be real key
```

**Missing environment variables**:
- Ensure production Supabase credentials are in code
- Don't rely on .env files (not included in build)

**AsyncStorage issues**:
- Check for proper initialization
- Ensure safe storage adapter is working

**Solution**:
1. Test production build on real device
2. Check crash logs in App Store Connect
3. Fix crash and resubmit

### Issue: "Reviewer can't log in"

**Symptoms**: Rejected because demo account doesn't work

**Solutions**:
1. Verify demo account exists in production database
2. Test login with exact credentials provided
3. Ensure credentials are in "App Review Information"
4. Check for typos in email/password
5. Verify production Supabase is configured correctly

**Create Demo Account**:
```bash
# Test in your app:
Email: demo@trackanalyzerpro.com
Password: Demo123!

# Verify it works:
1. Open production app
2. Log in with demo credentials
3. Verify you can access all features
```

### Issue: "Features don't work as described"

**Symptoms**: Rejected because app doesn't match description

**Solutions**:
1. Test every feature mentioned in description
2. Remove features from description that don't work
3. Fix broken features and resubmit
4. Ensure demo account can access all features

---

## 📝 Metadata Issues

### Issue: "App name already taken"

**Symptoms**: Can't use "Track Analyzer Pro" as app name

**Solutions**:
1. Try variations:
   - "Track Analyzer Pro - Racing Data"
   - "TrackAnalyzer Pro"
   - "Track Analyzer: Pro Edition"
2. Check if name is available before creating app
3. Consider different name if necessary

### Issue: "Description too long"

**Symptoms**: Can't save description in App Store Connect

**Solution**:
- Maximum 4000 characters
- Count characters before pasting
- Remove unnecessary text
- Focus on key features

### Issue: "Keywords rejected"

**Symptoms**: Certain keywords not allowed

**Avoid**:
- Competitor names
- "Best", "Number 1", "#1"
- "Free" (if app is free, it's automatic)
- Irrelevant keywords
- Trademarked terms

**Use**:
- Descriptive terms: "race track", "track conditions"
- Relevant terms: "motorsports", "racing data"
- Feature terms: "track management", "data recording"

---

## 🚫 Rejection Reasons & Fixes

### Rejection: "App crashes or has bugs"

**Fix**:
1. Test thoroughly on real device
2. Fix all crashes
3. Test with demo account
4. Resubmit with explanation: "Fixed crash in [specific area]"

### Rejection: "Incomplete app information"

**Fix**:
1. Review all fields in App Store Connect
2. Ensure nothing is marked "N/A" or left blank
3. Add privacy policy URL
4. Add support URL
5. Complete age rating questionnaire

### Rejection: "Privacy policy missing or inadequate"

**Fix**:
1. Create comprehensive privacy policy
2. Host at public URL
3. Include all required sections
4. Add URL to App Store Connect
5. Resubmit

### Rejection: "Demo account doesn't work"

**Fix**:
1. Create new demo account
2. Test it yourself
3. Add sample data (tracks, readings)
4. Update credentials in App Review Information
5. Resubmit with note: "Updated demo account credentials"

### Rejection: "Misleading description"

**Fix**:
1. Review description for accuracy
2. Remove any features that don't exist
3. Don't promise future features
4. Be honest about what app does
5. Update description and resubmit

### Rejection: "Requires login but no demo account"

**Fix**:
1. Create demo account
2. Add credentials to App Review Information:
   ```
   Demo Account:
   Email: demo@trackanalyzerpro.com
   Password: Demo123!
   
   Instructions:
   1. Log in with above credentials
   2. Tap "Tracks" to view sample tracks
   3. Tap "Record" to add new reading
   4. Tap "Browse" to view history
   ```
3. Resubmit

---

## 🔍 Debugging Tools

### Check Build Logs
```bash
# List recent builds
eas build:list --platform ios

# View specific build logs
eas build:view [build-id]
```

### Check Submission Status
```bash
# List submissions
eas submit:list --platform ios
```

### Test Production Build
```bash
# Download IPA from EAS dashboard
# Install on device using:
# - Xcode (Devices and Simulators)
# - TestFlight
# - Direct install via Xcode
```

### Check Supabase Connection
```typescript
// Add to app temporarily to test
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase configured:', isSupabaseConfigured());

// Test auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'demo@trackanalyzerpro.com',
  password: 'Demo123!'
});
console.log('Auth test:', data, error);
```

---

## 📞 Getting Help

### Apple Support
- **App Store Connect Help**: Click "?" in top right
- **Developer Support**: https://developer.apple.com/contact/
- **Phone**: 1-800-633-2152 (US)

### Expo Support
- **Discord**: https://chat.expo.dev
- **Forums**: https://forums.expo.dev
- **Docs**: https://docs.expo.dev

### Supabase Support
- **Discord**: https://discord.supabase.com
- **Docs**: https://supabase.com/docs
- **GitHub**: https://github.com/supabase/supabase

---

## 💡 Prevention Tips

### Before Building
- [ ] Test all features thoroughly
- [ ] Verify Supabase production credentials
- [ ] Check all URLs are correct
- [ ] Ensure demo account works
- [ ] Test on real device

### Before Submitting
- [ ] Review all App Store Connect fields
- [ ] Test privacy policy URL
- [ ] Verify screenshots are correct size
- [ ] Double-check demo account credentials
- [ ] Read description for accuracy

### After Submission
- [ ] Monitor email for Apple updates
- [ ] Check App Store Connect daily
- [ ] Respond to questions within 24 hours
- [ ] Be patient - review takes 24-48 hours

---

## 🎯 Quick Reference

### Most Common Issues:
1. **Demo account doesn't work** → Test it yourself first
2. **Privacy policy not accessible** → Test URL in incognito mode
3. **App crashes** → Test production build on real device
4. **Screenshots wrong size** → Use iOS Simulator, not real device
5. **Build not appearing** → Wait 60 minutes for processing

### Quick Fixes:
- **Crash on launch** → Check Supabase credentials
- **Can't log in** → Verify demo account in production DB
- **Build failed** → Clear cache and rebuild
- **Privacy policy error** → Host on GitHub Pages
- **Screenshot error** → Use exact simulator dimensions

---

**Remember**: Most apps get rejected at least once. It's normal! Just fix the issues and resubmit. You've got this! 💪**

---

*Last updated: v1.0.0*
