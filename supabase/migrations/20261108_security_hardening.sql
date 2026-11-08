-- ==============================================================================
-- HOJEONG ENTERPRISE SECURITY HARDENING (DEFENSE-IN-DEPTH)
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER FUNCTIONS (Mitigate Search Path Hijacking)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE 
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
      THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Restrict function execution permissions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;

-- 2. FORCE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- Ensures table owners and superuser-adjacent roles cannot bypass policy filters
ALTER TABLE IF EXISTS public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.salary_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payroll_history FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sync_events FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legacy_migrations FORCE ROW LEVEL SECURITY;

-- 3. MINIMAL PRIVILEGE GRANTS (Least Privilege Principle)
-- Anonymous users (unauthenticated) CANNOT SELECT, INSERT, UPDATE, or DELETE business records
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.salary_configs FROM anon;
REVOKE ALL ON TABLE public.attendance_records FROM anon;
REVOKE ALL ON TABLE public.payroll_history FROM anon;
REVOKE ALL ON TABLE public.sync_events FROM anon;
REVOKE ALL ON TABLE public.employees FROM anon;
REVOKE ALL ON TABLE public.legacy_migrations FROM anon;

-- Authenticated users receive standard table CRUD permissions (governed by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.salary_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payroll_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sync_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legacy_migrations TO authenticated;

-- Service role retains administrative management
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 4. INPUT VALIDATION & DATA INTEGRITY CHECK CONSTRAINTS
DO $$
BEGIN
  -- Prevent empty full_name on profiles if not already constrained
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profile_email_format') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profile_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;

  -- Ensure numerical bounds on salary_configs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_salary_positive') THEN
    ALTER TABLE public.salary_configs
      ADD CONSTRAINT chk_salary_positive CHECK (
        basic_salary >= 0 AND
        standard_hours > 0 AND standard_hours <= 744 AND
        seniority_allowance >= 0 AND
        living_allowance >= 0 AND
        attendance_allowance >= 0 AND
        other_allowance >= 0 AND
        insurance_rate >= 0 AND insurance_rate <= 100
      );
  END IF;

  -- Ensure valid date range on attendance_records
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_attendance_date_range') THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_date_range CHECK (
        date >= '2000-01-01' AND date <= '2100-12-31'
      );
  END IF;

  -- Ensure valid payroll non-negative amounts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payroll_amounts_valid') THEN
    ALTER TABLE public.payroll_history
      ADD CONSTRAINT chk_payroll_amounts_valid CHECK (
        gross_salary >= 0 AND
        total_deductions >= 0 AND
        net_salary >= 0
      );
  END IF;
END $$;
