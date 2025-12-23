
# Supabase Cloud Sync Setup Guide

This guide will help you set up cloud syncing for your Track Analyzer Pro app to enable collaboration among 6-10 team members.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Access to the Natively app with Supabase integration

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Track Analyzer Pro
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your team
5. Click "Create new project"
6. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Connect Supabase to Natively

1. In the Natively app, press the **Supabase button**
2. Enter your Supabase project credentials:
   - **Project URL**: Found in Project Settings > API
   - **Anon Key**: Found in Project Settings > API
3. Save the configuration

## Step 3: Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-setup.sql` file
4. Paste it into the SQL Editor
5. Click "Run" to execute the setup script

This will create:
- **tracks** table for storing race tracks
- **readings** table for storing track readings
- **team_members** table for managing team access
- Row Level Security (RLS) policies for team collaboration
- Indexes for optimal performance
- Real-time syncing capabilities

## Step 4: Configure Authentication

1. In Supabase dashboard, go to **Authentication > Providers**
2. Enable **Email** provider (should be enabled by default)
3. Configure email templates (optional):
   - Go to **Authentication > Email Templates**
   - Customize confirmation and password reset emails

## Step 5: Add Team Members

### First User (Admin)
1. Open the Track Analyzer Pro app
2. Sign up with your email and password
3. You will automatically become the admin

### Additional Team Members
1. Each team member opens the app
2. They sign up with their email and password
3. They are automatically added as team members
4. Admins can manage roles in the Supabase dashboard if needed

## Step 6: Sync Existing Data (Optional)

If you have existing local data:

1. Open the app and sign in
2. Go to **Settings** tab
3. Tap "Sync Local Data to Cloud"
4. Wait for the sync to complete
5. All your existing tracks and readings will be uploaded

## Features Enabled

✅ **Real-time Syncing**: Changes sync instantly across all devices
✅ **Team Collaboration**: 6-10 users can work together
✅ **Secure Access**: Row Level Security ensures data privacy
✅ **Automatic Backups**: Supabase handles backups automatically
✅ **Offline Support**: App works offline, syncs when online

## Team Member Permissions

All team members can:
- View all tracks and readings
- Create new tracks and readings
- Edit existing tracks and readings
- Delete tracks and readings
- See real-time updates from other team members

## Troubleshooting

### "Supabase Not Configured" Error
- Make sure you've pressed the Supabase button in Natively
- Verify your Project URL and Anon Key are correct
- Restart the app after configuration

### "Authentication Failed" Error
- Check your email and password
- Verify email confirmation (check spam folder)
- Try password reset if needed

### Data Not Syncing
- Check your internet connection
- Verify you're signed in
- Check Supabase dashboard for any errors
- Try signing out and back in

### Can't Add More Team Members
- Verify the user signed up successfully
- Check the team_members table in Supabase dashboard
- Ensure RLS policies are set up correctly

## Database Management

### View Team Members
```sql
SELECT * FROM public.team_members;
```

### Make a User Admin
```sql
UPDATE public.team_members
SET role = 'admin'
WHERE email = 'user@example.com';
```

### View All Tracks
```sql
SELECT * FROM public.tracks ORDER BY created_at DESC;
```

### View All Readings
```sql
SELECT * FROM public.readings ORDER BY timestamp DESC;
```

## Security Best Practices

1. **Use Strong Passwords**: Require team members to use strong passwords
2. **Enable 2FA**: Enable two-factor authentication in Supabase
3. **Regular Backups**: Supabase handles this automatically
4. **Monitor Access**: Check team_members table regularly
5. **Update Policies**: Adjust RLS policies as needed

## Cost Considerations

Supabase Free Tier includes:
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- Unlimited API requests

For 6-10 users with track data, the free tier should be sufficient. Monitor usage in the Supabase dashboard.

## Support

If you encounter issues:
1. Check the Supabase dashboard for errors
2. Review the SQL setup script
3. Check app logs in the Settings screen
4. Contact Natively support

## Next Steps

After setup:
1. Invite your team members to sign up
2. Test creating and syncing data
3. Verify real-time updates work
4. Set up regular data reviews
5. Train team on the app features

---

**Note**: Keep your Supabase credentials secure and never share them publicly.
