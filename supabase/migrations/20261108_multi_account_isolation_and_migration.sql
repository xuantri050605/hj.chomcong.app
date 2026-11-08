-- ==============================================================================
-- HOJEONG SYSTEM - MULTI-ACCOUNT ISOLATION & LEGACY MIGRATION SCHEMA (PHASE 3)
-- ==============================================================================

-- 1. Employees Table (Per-Account Isolated Workforce)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT DEFAULT '',
  position TEXT DEFAULT '',
  base_salary NUMERIC DEFAULT 0,
  seniority_allowance NUMERIC DEFAULT 0,
  living_allowance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  join_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- 2. Enhance Attendance Records for Complete SQLite Field Fidelity
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS leave_type TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS leave_code TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS original_time_source TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- 3. Legacy Migrations Table (Tracking Idempotent Migration Snapshots)
CREATE TABLE IF NOT EXISTS legacy_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'SQLITE' | 'LOCAL_STORAGE' | 'HYBRID'
  status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  record_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fingerprint)
);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies (auth.uid() = user_id with CHECK constraint)
DROP POLICY IF EXISTS "Users can only access own employees" ON employees;
CREATE POLICY "Users can only access own employees" ON employees
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access own legacy_migrations" ON legacy_migrations;
CREATE POLICY "Users can only access own legacy_migrations" ON legacy_migrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hardened Policies with WITH CHECK for complete isolation
DROP POLICY IF EXISTS "Users can only access own profile" ON profiles;
CREATE POLICY "Users can only access own profile" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can only access own salary_config" ON salary_configs;
CREATE POLICY "Users can only access own salary_config" ON salary_configs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access own attendance" ON attendance_records;
CREATE POLICY "Users can only access own attendance" ON attendance_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access own payroll" ON payroll_history;
CREATE POLICY "Users can only access own payroll" ON payroll_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access own sync_events" ON sync_events;
CREATE POLICY "Users can only access own sync_events" ON sync_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
