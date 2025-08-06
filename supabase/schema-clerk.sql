-- Drop existing tables if they exist
DROP TABLE IF EXISTS calorie_entries CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS errors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (now using Clerk user ID as primary key)
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY, -- Clerk user ID
  clerk_user_id VARCHAR(50) UNIQUE NOT NULL, -- Redundant but explicit
  phone VARCHAR(20) NOT NULL,
  pin VARCHAR(6) NOT NULL,
  call_window_start TIME NOT NULL DEFAULT '09:00:00',
  call_window_end TIME NOT NULL DEFAULT '10:00:00',
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
  max_retries INT DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_logs table
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, failed
  retries INT DEFAULT 0,
  transcript_id VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calorie_entries table
CREATE TABLE calorie_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- Array of {name: string, calories: number, quantity: number}
  total_calories INT NOT NULL DEFAULT 0,
  transcript_text TEXT,
  call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create errors table
CREATE TABLE errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow VARCHAR(100) NOT NULL,
  error_type VARCHAR(100),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_scheduled_at ON call_logs(scheduled_at);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_calorie_entries_user_id ON calorie_entries(user_id);
CREATE INDEX idx_calorie_entries_date ON calorie_entries(date);
CREATE INDEX idx_errors_workflow ON errors(workflow);
CREATE INDEX idx_errors_created_at ON errors(created_at);

-- Note: Row Level Security is not needed with Clerk as authentication happens at the application level
-- However, we can still enable it for additional security if needed

-- Create functions for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at BEFORE UPDATE ON call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calorie_entries_updated_at BEFORE UPDATE ON calorie_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();