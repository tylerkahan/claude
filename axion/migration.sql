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
-- Add password column for storing account credentials
ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS password text;

-- ── compliance_checks ───────────────────────────────────────
-- The app uses check_id; no changes needed here.
-- (seed_test_data.sql has been updated to match this column)

-- ── beneficiary invite tracking ──────────────────────────────
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'not_invited';

-- ── legal_documents ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type                text NOT NULL,
  title               text NOT NULL,
  content             text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'draft',
  state               text,
  ai_review           jsonb,
  attorney_notes      text,
  attorney_approved_at timestamptz,
  notary_scheduled_at  timestamptz,
  notary_notes        text,
  notary_approved_at  timestamptz,
  finalized_at        timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='legal_documents' AND policyname='users manage own legal documents') THEN
    CREATE POLICY "users manage own legal documents" ON legal_documents
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz;

-- ── estate transfer / attorney contact on profiles ───────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attorney_name  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attorney_firm  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attorney_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attorney_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attorney_notes text;

-- ── audit_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  resource   text,
  details    jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='users view own audit logs') THEN
    CREATE POLICY "users view own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='service insert audit logs') THEN
    CREATE POLICY "service insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ── legal_documents: attorney submission tracking ────────────
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS submission_token  text;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS submission_target text; -- 'user_attorney' | 'axion_attorney'
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS submitted_to_email text;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS submitted_to_name  text;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS submitted_at       timestamptz;
CREATE INDEX IF NOT EXISTS legal_documents_submission_token_idx ON legal_documents (submission_token);
