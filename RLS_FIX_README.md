
# RLS Policy Fix - Infinite Recursion Error

## Problem
The app was experiencing console errors with the message:
```
Error fetching tracks: {"code":"42P17","details":null,"hint":null,"message":"infinite recursion detected in policy for relation \"team_members\""}
```

## Root Cause
The Row Level Security (RLS) policy on the `team_members` table had a circular dependency. The SELECT policy was checking the `team_members` table from within itself, causing infinite recursion:

```sql
-- ❌ OLD POLICY (caused infinite recursion)
CREATE POLICY "Team members can view team"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members  -- Circular: checking team_members from within team_members policy
      WHERE team_members.user_id = auth.uid()
    )
  );
```

## Solution Applied
A database migration has been applied to fix the RLS policies. The key change was to simplify the SELECT policy on `team_members` to avoid the circular dependency:

```sql
-- ✅ NEW POLICY (no recursion)
CREATE POLICY "Team members can view team"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);  -- Simple: all authenticated users can view team members
```

## Migration Applied
- Migration name: `fix_team_members_rls_circular_dependency`
- Status: ✅ Successfully applied
- All RLS policies have been dropped and recreated correctly

## What You Need to Do
**Please restart your app** to pick up the new database policies:

1. **For iOS/Android**: Stop the app completely and restart it
2. **For Web**: Refresh the browser page (Cmd+R or Ctrl+R)
3. **For Expo Dev**: You can also restart the Expo dev server with `r` in the terminal

## Verification
After restarting, the console errors should be gone and you should be able to:
- ✅ View all tracks
- ✅ Create new tracks
- ✅ View readings
- ✅ Create new readings
- ✅ Browse by year

## Technical Details
The fix ensures that:
1. All authenticated users can view the team members list (no recursion)
2. Only admins can add, update, or remove team members (these policies can safely check team_members because the SELECT policy is simple)
3. All team members can perform CRUD operations on tracks and readings (these policies can safely check team_members because the SELECT policy is simple)

## If Issues Persist
If you still see errors after restarting:
1. Check that you're logged in (the policies require authentication)
2. Verify your user is in the `team_members` table (first user is automatically added as admin)
3. Check the Supabase dashboard to ensure the migration was applied
4. Contact support if the issue continues
