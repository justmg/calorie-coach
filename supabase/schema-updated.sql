-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS errors CASCADE;
DROP TABLE IF EXISTS calorie_entries CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with TDEE fields
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Using TEXT to match Clerk user ID
  clerk_user_id TEXT UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  pin VARCHAR(6) NOT NULL,
  
  -- Call preferences
  call_window_start TIME NOT NULL DEFAULT '09:00:00',
  call_window_end TIME NOT NULL DEFAULT '10:00:00',
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
  max_retries INT DEFAULT 2,
  
  -- TDEE calculation fields
  age INT,
  gender VARCHAR(10), -- 'male', 'female', 'other'
  height_cm DECIMAL(5,2), -- Height in centimeters
  weight_kg DECIMAL(5,2), -- Weight in kilograms
  activity_level VARCHAR(20), -- 'sedentary', 'light', 'moderate', 'active', 'very_active'
  
  -- Calculated TDEE values
  bmr DECIMAL(8,2), -- Basal Metabolic Rate
  tdee DECIMAL(8,2), -- Total Daily Energy Expenditure
  target_calories INT, -- Daily calorie target
  goal_type VARCHAR(20), -- 'maintain', 'lose', 'gain'
  weekly_goal_kg DECIMAL(3,2), -- Weekly weight change goal in kg
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_logs table
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- Array of {name: string, calories: number, quantity: number}
  total_calories INT NOT NULL DEFAULT 0,
  
  -- Daily tracking
  calorie_deficit INT, -- Calculated as target_calories - total_calories
  adherence_percentage DECIMAL(5,2), -- Percentage of target achieved
  
  transcript_text TEXT,
  call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create weekly_summaries table for tracking progress
CREATE TABLE weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  avg_daily_calories DECIMAL(8,2),
  total_deficit INT,
  projected_weight_change_kg DECIMAL(3,2), -- Based on 7700 kcal = 1kg
  adherence_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
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
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_scheduled_at ON call_logs(scheduled_at);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_calorie_entries_user_id ON calorie_entries(user_id);
CREATE INDEX idx_calorie_entries_date ON calorie_entries(date);
CREATE INDEX idx_calorie_entries_user_date ON calorie_entries(user_id, date);
CREATE INDEX idx_weekly_summaries_user_id ON weekly_summaries(user_id);
CREATE INDEX idx_weekly_summaries_week_start ON weekly_summaries(week_start);
CREATE INDEX idx_errors_workflow ON errors(workflow);
CREATE INDEX idx_errors_created_at ON errors(created_at);

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

-- Function to calculate BMR using Mifflin-St Jeor Equation
CREATE OR REPLACE FUNCTION calculate_bmr(
  p_weight_kg DECIMAL,
  p_height_cm DECIMAL,
  p_age INT,
  p_gender VARCHAR
) RETURNS DECIMAL AS $$
BEGIN
  IF p_gender = 'male' THEN
    RETURN (10 * p_weight_kg) + (6.25 * p_height_cm) - (5 * p_age) + 5;
  ELSIF p_gender = 'female' THEN
    RETURN (10 * p_weight_kg) + (6.25 * p_height_cm) - (5 * p_age) - 161;
  ELSE
    -- Use average of male and female for 'other'
    RETURN (10 * p_weight_kg) + (6.25 * p_height_cm) - (5 * p_age) - 78;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate TDEE based on activity level
CREATE OR REPLACE FUNCTION calculate_tdee(
  p_bmr DECIMAL,
  p_activity_level VARCHAR
) RETURNS DECIMAL AS $$
BEGIN
  CASE p_activity_level
    WHEN 'sedentary' THEN RETURN p_bmr * 1.2;
    WHEN 'light' THEN RETURN p_bmr * 1.375;
    WHEN 'moderate' THEN RETURN p_bmr * 1.55;
    WHEN 'active' THEN RETURN p_bmr * 1.725;
    WHEN 'very_active' THEN RETURN p_bmr * 1.9;
    ELSE RETURN p_bmr * 1.2; -- Default to sedentary
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate target calories based on goal
CREATE OR REPLACE FUNCTION calculate_target_calories(
  p_tdee DECIMAL,
  p_goal_type VARCHAR,
  p_weekly_goal_kg DECIMAL
) RETURNS INT AS $$
DECLARE
  daily_deficit DECIMAL;
BEGIN
  -- 7700 kcal = 1kg of body weight
  -- Convert weekly goal to daily calorie adjustment
  daily_deficit := (p_weekly_goal_kg * 7700) / 7;
  
  CASE p_goal_type
    WHEN 'lose' THEN RETURN GREATEST(1200, p_tdee - daily_deficit); -- Min 1200 kcal for safety
    WHEN 'gain' THEN RETURN p_tdee + daily_deficit;
    ELSE RETURN p_tdee; -- maintain
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate BMR, TDEE, and target calories
CREATE OR REPLACE FUNCTION update_tdee_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate BMR if we have all required fields
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL 
     AND NEW.age IS NOT NULL AND NEW.gender IS NOT NULL THEN
    NEW.bmr := calculate_bmr(NEW.weight_kg, NEW.height_cm, NEW.age, NEW.gender);
    
    -- Calculate TDEE if we have activity level
    IF NEW.activity_level IS NOT NULL THEN
      NEW.tdee := calculate_tdee(NEW.bmr, NEW.activity_level);
      
      -- Calculate target calories if we have goal info
      IF NEW.goal_type IS NOT NULL THEN
        NEW.target_calories := calculate_target_calories(
          NEW.tdee, 
          NEW.goal_type, 
          COALESCE(NEW.weekly_goal_kg, 0)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_tdee_on_insert_update
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_tdee_calculations();

-- Function to update calorie deficit and adherence
CREATE OR REPLACE FUNCTION update_calorie_tracking()
RETURNS TRIGGER AS $$
DECLARE
  user_target INT;
BEGIN
  -- Get user's target calories
  SELECT target_calories INTO user_target
  FROM users WHERE id = NEW.user_id;
  
  IF user_target IS NOT NULL THEN
    NEW.calorie_deficit := user_target - NEW.total_calories;
    NEW.adherence_percentage := (NEW.total_calories::DECIMAL / user_target) * 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calorie_tracking_on_change
BEFORE INSERT OR UPDATE ON calorie_entries
FOR EACH ROW EXECUTE FUNCTION update_calorie_tracking();