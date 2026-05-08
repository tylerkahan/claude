-- ============================================================
-- AXION MIGRATION — Run BEFORE seed_test_data.sql
-- Adds all columns required by the app and seed data.
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address        text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip            text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country        text DEFAULT 'USA';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marital_status text;

-- ── entities ────────────────────────────────────────────────
ALTER TABLE entities ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS ein   text;

-- ── family_members ──────────────────────────────────────────
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS phone        text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS is_dependent  boolean DEFAULT false;
-- Allow NULL emails (minors won't have one)
ALTER TABLE family_members ALTER COLUMN email DROP NOT NULL;

-- ── connected_accounts ──────────────────────────────────────
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS entity_name text;

-- ── beneficiaries ───────────────────────────────────────────
-- Create if it doesn't exist yet
CREATE TABLE IF NOT EXISTS beneficiaries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name     text NOT NULL,
  relationship  text,
  email         text,
  phone         text,
  role          text,
  percentage    numeric,
  date_of_birth date,
  notes         text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- RLS policy (safe to run even if policy already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'beneficiaries'
    AND policyname = 'users manage own beneficiaries'
  ) THEN
    CREATE POLICY "users manage own beneficiaries" ON beneficiaries
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add any columns that may be missing if table already existed
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS relationship  text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS email         text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS phone         text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS role          text;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS percentage    numeric;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS notes         text;

-- ── documents ───────────────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes text;

-- ── digital_assets ──────────────────────────────────────────
-- The app uses platform + type; no changes needed here.
-- (seed_test_data.sql has been updated to match these columns)

-- ── compliance_checks ───────────────────────────────────────
-- The app uses check_id; no changes needed here.
-- (seed_test_data.sql has been updated to match this column)
