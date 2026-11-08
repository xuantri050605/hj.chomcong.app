-- ==============================================================================
-- HOJEONG ATTENDANCE & PAYROLL SYSTEM - INITIAL SCHEMA & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Salary Configurations Table
CREATE TABLE IF NOT EXISTS salary_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  basic_salary NUMERIC NOT NULL,
  standard_hours NUMERIC NOT NULL DEFAULT 208,
  seniority_allowance NUMERIC DEFAULT 0,
  living_allowance NUMERIC DEFAULT 0,
  attendance_allowance NUMERIC DEFAULT 0,
  other_allowance NUMERIC DEFAULT 0,
  insurance_rate NUMERIC DEFAULT 0.105,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_of_week INT NOT NULL,
  day_type TEXT NOT NULL,
  shift_start TEXT,
  shift_end TEXT,
  time_source TEXT DEFAULT 'DEVICE',
  gps_metadata JSONB,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 4. Payroll History Table
CREATE TABLE IF NOT EXISTS payroll_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  gross_salary NUMERIC NOT NULL,
  total_deductions NUMERIC NOT NULL,
  net_salary NUMERIC NOT NULL,
  breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- 5. Sync Events Table (Offline Synchronization & Audit Log)
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR MULTI-TENANT ISOLATION
-- ==============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES (Users can strictly access and modify only their own records)
-- ==============================================================================

CREATE POLICY "Users can only access own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access own salary_config" ON salary_configs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own attendance" ON attendance_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own payroll" ON payroll_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own sync_events" ON sync_events
  FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTO-TRIGGER: Create Profile on New User Registration
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
