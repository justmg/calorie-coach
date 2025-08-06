-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
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
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_scheduled_at ON call_logs(scheduled_at);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_calorie_entries_user_id ON calorie_entries(user_id);
CREATE INDEX idx_calorie_entries_date ON calorie_entries(date);
CREATE INDEX idx_errors_workflow ON errors(workflow);
CREATE INDEX idx_errors_created_at ON errors(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calorie_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Create RLS policies for call_logs table
CREATE POLICY "Users can view own call logs" ON call_logs
  FOR SELECT USING (user_id::text = auth.uid()::text);

-- Create RLS policies for calorie_entries table
CREATE POLICY "Users can view own calorie entries" ON calorie_entries
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own calorie entries" ON calorie_entries
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own calorie entries" ON calorie_entries
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own calorie entries" ON calorie_entries
  FOR DELETE USING (user_id::text = auth.uid()::text);

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