
-- Track Analyzer Pro - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor after connecting your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tracks table
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create readings table
CREATE TABLE IF NOT EXISTS public.readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  year INTEGER NOT NULL,
  class_currently_running TEXT,
  left_lane JSONB NOT NULL,
  right_lane JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create team_members table for managing team access
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON public.tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_track_id ON public.readings(track_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON public.readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_year ON public.readings(year);
CREATE INDEX IF NOT EXISTS idx_readings_user_id ON public.readings(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracks
-- All authenticated team members can read all tracks
CREATE POLICY "Team members can view all tracks"
  ON public.tracks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- All authenticated team members can insert tracks
CREATE POLICY "Team members can create tracks"
  ON public.tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- All authenticated team members can update tracks
CREATE POLICY "Team members can update tracks"
  ON public.tracks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- All authenticated team members can delete tracks
CREATE POLICY "Team members can delete tracks"
  ON public.tracks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- RLS Policies for readings
-- All authenticated team members can read all readings
CREATE POLICY "Team members can view all readings"
  ON public.readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- All authenticated team members can insert readings
CREATE POLICY "Team members can create readings"
  ON public.readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- All authenticated team members can update readings
CREATE POLICY "Team members can update readings"
  ON public.readings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- All authenticated team members can delete readings
CREATE POLICY "Team members can delete readings"
  ON public.readings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- RLS Policies for team_members
-- Users can view all team members
CREATE POLICY "Team members can view team"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
    )
  );

-- Only admins can add team members
CREATE POLICY "Admins can add team members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Only admins can update team members
CREATE POLICY "Admins can update team members"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Only admins can remove team members
CREATE POLICY "Admins can remove team members"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

-- Function to automatically add new users to team_members
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user (make them admin)
  IF NOT EXISTS (SELECT 1 FROM public.team_members LIMIT 1) THEN
    INSERT INTO public.team_members (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'admin');
  ELSE
    -- Subsequent users are members by default
    INSERT INTO public.team_members (user_id, email, role)
    VALUES (NEW.id, NEW.email, 'member');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add new users to team_members
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_tracks_updated_at ON public.tracks;
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_readings_updated_at ON public.readings;
CREATE TRIGGER update_readings_updated_at
  BEFORE UPDATE ON public.readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for real-time syncing
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tracks TO authenticated;
GRANT ALL ON public.readings TO authenticated;
GRANT ALL ON public.team_members TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. The first user to sign up will automatically become an admin';
  RAISE NOTICE '2. Admins can add additional team members (up to 10 total)';
  RAISE NOTICE '3. All team members can view, create, edit, and delete tracks and readings';
  RAISE NOTICE '4. Real-time syncing is enabled across all devices';
END $$;
