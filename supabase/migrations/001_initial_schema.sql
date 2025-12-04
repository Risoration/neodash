-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_data table (stores crypto, productivity, weather, financial data)
CREATE TABLE IF NOT EXISTS user_data (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  crypto JSONB,
  productivity JSONB,
  weather JSONB,
  financial JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_config table (stores user preferences and settings)
CREATE TABLE IF NOT EXISTS user_config (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  setup_completed BOOLEAN DEFAULT FALSE,
  sections JSONB DEFAULT '{"crypto": false, "productivity": false, "weather": false, "financial": false}'::jsonb,
  productivity_goals JSONB,
  preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create focus_sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_focus_seconds INTEGER DEFAULT 0,
  total_break_seconds INTEGER DEFAULT 0,
  breaks_taken INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_break', 'completed')),
  break_ends_at TIMESTAMPTZ,
  break_started_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_user_data_updated_at BEFORE UPDATE ON user_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_config_updated_at BEFORE UPDATE ON user_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_focus_sessions_updated_at BEFORE UPDATE ON focus_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

