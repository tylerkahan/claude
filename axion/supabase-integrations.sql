-- ============================================================
-- INTEGRATIONS TABLES
-- Run this in your Supabase SQL editor
-- ============================================================

-- Connected accounts (Plaid items, manual crypto, manual real estate)
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type TEXT NOT NULL, -- 'plaid' | 'crypto' | 'real_estate'
  institution_name TEXT NOT NULL,
  category TEXT, -- 'banking' | 'investment' | 'crypto' | 'real_estate'
  plaid_item_id TEXT,
  plaid_access_token TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own connected accounts" ON connected_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Individual account balances (synced from Plaid or manual)
CREATE TABLE IF NOT EXISTS account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE NOT NULL,
  plaid_account_id TEXT,
  account_name TEXT NOT NULL,
  account_type TEXT, -- 'checking' | 'savings' | 'brokerage' | 'crypto' | 'real_estate' | '401k' | 'ira'
  current_balance NUMERIC DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own balances" ON account_balances
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
