-- Database migration for actual road path recording
-- Run this in your Supabase SQL editor

-- Main route tracking table
CREATE TABLE IF NOT EXISTS user_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_start_id UUID REFERENCES locations(id),
  assignment_end_id UUID REFERENCES locations(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  total_distance FLOAT, -- meters
  total_duration INTEGER, -- seconds
  route_status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual GPS points along the actual road
CREATE TABLE IF NOT EXISTS user_location_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES user_routes(id) ON DELETE CASCADE,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  accuracy FLOAT, -- GPS accuracy in meters
  speed FLOAT, -- speed in m/s
  heading FLOAT, -- direction in degrees 0-360
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  journey_sequence INTEGER NOT NULL -- order within route
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_location_points_user_time ON user_location_points(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_location_points_route_sequence ON user_location_points(route_id, journey_sequence);
CREATE INDEX IF NOT EXISTS idx_user_routes_user_start_time ON user_routes(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_location_points_user_route ON user_location_points(user_id, route_id);

-- Row Level Security (RLS) policies
ALTER TABLE user_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_points ENABLE ROW LEVEL SECURITY;

-- Users can only see their own routes
CREATE POLICY "Users can view own routes" ON user_routes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routes" ON user_routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes" ON user_routes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own location points
CREATE POLICY "Users can view own location points" ON user_location_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location points" ON user_location_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can view all routes and location points
CREATE POLICY "Admins can view all routes" ON user_routes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "Admins can view all location points" ON user_location_points
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ));