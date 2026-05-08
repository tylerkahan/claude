-- ============================================================
-- AXION FULL TEST DATA SEED
-- Run migration.sql FIRST, then paste this into Supabase SQL
-- Editor. Automatically finds your user by email.
-- ============================================================

DO $$
DECLARE
  uid uuid;
BEGIN
  -- Get the user ID from auth.users by email
  SELECT id INTO uid FROM auth.users WHERE email = 'tyler@nahak.us' LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found. Check email in auth.users.';
  END IF;

  -- ── 1. PROFILE ──────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, phone, date_of_birth, address, city, state, zip, country, marital_status, updated_at)
  VALUES (
    uid,
    'Tyler Kahan',
    '+1 (512) 555-0182',
    '1988-04-14',
    '4821 Barton Creek Blvd',
    'Austin',
    'TX',
    '78735',
    'USA',
    'Married',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name      = EXCLUDED.full_name,
    phone          = EXCLUDED.phone,
    date_of_birth  = EXCLUDED.date_of_birth,
    address        = EXCLUDED.address,
    city           = EXCLUDED.city,
    state          = EXCLUDED.state,
    zip            = EXCLUDED.zip,
    country        = EXCLUDED.country,
    marital_status = EXCLUDED.marital_status,
    updated_at     = now();

  -- ── 2. ENTITIES ─────────────────────────────────────────────
  INSERT INTO entities (user_id, name, type, state, ein, created_at) VALUES
    (uid, 'Kahan Family Trust',      'Revocable Trust',    'TX', NULL,          now()),
    (uid, 'Kahan Holdings LLC',      'LLC',                'TX', '87-2341190',  now()),
    (uid, 'Oak Creek Capital LP',    'Limited Partnership','DE', '46-7812003',  now()),
    (uid, 'Nahak Ventures LLC',      'LLC',                'DE', '82-1094567',  now())
  ON CONFLICT DO NOTHING;

  -- ── 3. ASSETS ───────────────────────────────────────────────
  -- Real Estate
  INSERT INTO assets (user_id, name, category, value, institution, mortgage, metadata, created_at) VALUES
    (uid, '4821 Barton Creek Blvd (Primary)', 'Real Estate', 3200000, 'Chase', 1480000,
      '{"address":"4821 Barton Creek Blvd, Austin TX 78735","purchase_price":1950000,"mortgage_rate":3.125,"mortgage_term":30,"monthly_payment":8340,"held_in_trust":true,"entity_name":"Kahan Family Trust"}'::jsonb, now()),

    (uid, '210 Lago Vista Drive (Lake House)', 'Real Estate', 1850000, 'Wells Fargo', 620000,
      '{"address":"210 Lago Vista Drive, Lago Vista TX 78645","purchase_price":1100000,"mortgage_rate":4.25,"mortgage_term":30,"monthly_payment":3050,"held_in_trust":false,"entity_name":"Kahan Holdings LLC"}'::jsonb, now()),

    (uid, '1440 E 6th St Unit 8 (Investment)', 'Real Estate', 780000, 'Texas Capital Bank', 390000,
      '{"address":"1440 E 6th St Unit 8, Austin TX 78702","purchase_price":540000,"mortgage_rate":5.5,"mortgage_term":30,"monthly_payment":2215,"held_in_trust":false,"entity_name":"Kahan Holdings LLC"}'::jsonb, now()),

  -- Investment Accounts
    (uid, 'Fidelity Brokerage', 'Investment Account', 2400000, 'Fidelity', 0,
      '{"ticker":"MSFT","shares":3200,"cost_basis":1650000,"entity_name":"Oak Creek Capital LP"}'::jsonb, now()),

    (uid, 'Roth IRA', 'Investment Account', 410000, 'Fidelity', 0,
      '{"ticker":"VOO","shares":820,"cost_basis":290000,"entity_name":""}'::jsonb, now()),

    (uid, '401(k) — Nahak Inc', 'Investment Account', 680000, 'Vanguard', 0,
      '{"ticker":"VTSAX","shares":4100,"cost_basis":520000,"entity_name":""}'::jsonb, now()),

  -- Private Equity
    (uid, 'Sequoia Capital Fund XV', 'Private Equity', 850000, 'Sequoia Capital', 0,
      '{"fund_type":"Venture","vintage_year":2021,"committed_amount":500000,"called_pct":72,"tvpi":1.94,"valuation_date":"Q1 2026","entity_name":"Oak Creek Capital LP"}'::jsonb, now()),

    (uid, 'Austin Opportunity Fund III', 'Private Equity', 320000, 'AO Capital', 0,
      '{"fund_type":"Buyout","vintage_year":2022,"committed_amount":250000,"called_pct":60,"tvpi":1.28,"valuation_date":"Q4 2025","entity_name":"Nahak Ventures LLC"}'::jsonb, now()),

  -- Bank Accounts
    (uid, 'Chase Private Client Checking', 'Bank Account', 185000, 'Chase', 0,
      '{"account_last4":"4821","apy":0,"entity_name":""}'::jsonb, now()),

    (uid, 'Marcus HYSA', 'Bank Account', 240000, 'Goldman Sachs', 0,
      '{"account_last4":"9103","apy":4.85,"entity_name":""}'::jsonb, now()),

    (uid, 'Kahan Holdings Business Checking', 'Bank Account', 92000, 'Frost Bank', 0,
      '{"account_last4":"3377","apy":0,"entity_name":"Kahan Holdings LLC"}'::jsonb, now()),

  -- Business
    (uid, 'Nahak Inc (SaaS)', 'Business', 4200000, 'Private — no broker', 0,
      '{"entity_name":"Nahak Ventures LLC"}'::jsonb, now()),

  -- Life Insurance
    (uid, 'Northwestern Mutual — Whole Life', 'Life Insurance', 2500000, 'Northwestern Mutual', 0,
      '{"entity_name":"Kahan Family Trust"}'::jsonb, now()),

  -- Other
    (uid, 'Art Collection (Koons, Hirst)', 'Other', 310000, 'Christie''s Appraisal', 0,
      '{"entity_name":"Kahan Family Trust"}'::jsonb, now()),

    (uid, 'Wine Collection', 'Other', 48000, 'Vinfolio', 0,
      '{"entity_name":""}'::jsonb, now()),

  -- Crypto (manual)
    (uid, '12.4 Bitcoin (Cold Storage)', 'Crypto', 1240000, 'Self-custody — Ledger', 0,
      '{"entity_name":"Kahan Holdings LLC"}'::jsonb, now())

  ON CONFLICT DO NOTHING;

  -- ── 4. CONNECTED ACCOUNTS (simulate Plaid) ──────────────────
  INSERT INTO connected_accounts
    (user_id, integration_type, institution_name, category, plaid_item_id, plaid_access_token, entity_name, last_synced_at, status, created_at)
  VALUES
    (uid, 'plaid', 'Charles Schwab', 'investment', 'item_schwab_test', 'access_schwab_test', 'Oak Creek Capital LP', now(), 'active', now()),
    (uid, 'plaid', 'Chase Bank',     'banking',    'item_chase_test',  'access_chase_test',  NULL,                  now(), 'active', now()),
    (uid, 'plaid', 'Coinbase',       'crypto',     'item_coinbase_test','access_coinbase_test','Kahan Holdings LLC', now(), 'active', now())
  ON CONFLICT DO NOTHING;

  -- Balances for Schwab
  INSERT INTO account_balances
    (user_id, connected_account_id, plaid_account_id, account_name, account_type, current_balance, currency_code, last_updated)
  SELECT uid, ca.id, 'plaid_schwab_brokerage', 'Schwab Individual Brokerage', 'brokerage', 1820000, 'USD', now()
  FROM connected_accounts ca WHERE ca.user_id = uid AND ca.institution_name = 'Charles Schwab'
  ON CONFLICT DO NOTHING;

  INSERT INTO account_balances
    (user_id, connected_account_id, plaid_account_id, account_name, account_type, current_balance, currency_code, last_updated)
  SELECT uid, ca.id, 'plaid_schwab_checking', 'Schwab Bank Investor Checking', 'checking', 43000, 'USD', now()
  FROM connected_accounts ca WHERE ca.user_id = uid AND ca.institution_name = 'Charles Schwab'
  ON CONFLICT DO NOTHING;

  -- Balances for Chase
  INSERT INTO account_balances
    (user_id, connected_account_id, plaid_account_id, account_name, account_type, current_balance, currency_code, last_updated)
  SELECT uid, ca.id, 'plaid_chase_checking', 'Chase Total Checking', 'checking', 38200, 'USD', now()
  FROM connected_accounts ca WHERE ca.user_id = uid AND ca.institution_name = 'Chase Bank'
  ON CONFLICT DO NOTHING;

  INSERT INTO account_balances
    (user_id, connected_account_id, plaid_account_id, account_name, account_type, current_balance, currency_code, last_updated)
  SELECT uid, ca.id, 'plaid_chase_savings', 'Chase Premier Savings', 'savings', 75000, 'USD', now()
  FROM connected_accounts ca WHERE ca.user_id = uid AND ca.institution_name = 'Chase Bank'
  ON CONFLICT DO NOTHING;

  INSERT INTO account_balances
    (user_id, connected_account_id, plaid_account_id, account_name, account_type, current_balance, currency_code, last_updated)
  SELECT uid, ca.id, 'plaid_chase_credit', 'Chase Sapphire Reserve', 'credit card', 8400, 'USD', now()
  FROM connected_accounts ca WHERE ca.user_id = uid AND ca.institution_name = 'Chase Bank'
  ON CONFLICT DO NOTHING;

  -- Balances for Coinbase
  INSERT INTO account_balances
    (user_id, connected_account_id, plaid_account_id, account_name, account_type, current_balance, currency_code, last_updated)
  SELECT uid, ca.id, 'plaid_coinbase_eth', 'Ethereum Wallet', 'crypto', 128000, 'USD', now()
  FROM connected_accounts ca WHERE ca.user_id = uid AND ca.institution_name = 'Coinbase'
  ON CONFLICT DO NOTHING;

  INSERT INTO account_balances
    (user_id, connected_account_id, plaid_account_id, account_name, account_type, current_balance, currency_code, last_updated)
  SELECT uid, ca.id, 'plaid_coinbase_sol', 'Solana Wallet', 'crypto', 31000, 'USD', now()
  FROM connected_accounts ca WHERE ca.user_id = uid AND ca.institution_name = 'Coinbase'
  ON CONFLICT DO NOTHING;

  -- ── 5. BENEFICIARIES ────────────────────────────────────────
  INSERT INTO beneficiaries (user_id, full_name, relationship, role, percentage, date_of_birth, email, phone, notes, created_at) VALUES
    (uid, 'Sarah Kahan',   'Spouse',  'Primary Beneficiary',    50, '1990-07-22', 'sarah@nahak.us',    '+1 (512) 555-0191', 'Spouse — all accounts',                    now()),
    (uid, 'Ethan Kahan',   'Child',   'Secondary Beneficiary',  25, '2016-03-08', NULL,                NULL,                'Minor — per stirpes',                      now()),
    (uid, 'Olivia Kahan',  'Child',   'Secondary Beneficiary',  25, '2019-11-14', NULL,                NULL,                'Minor — per stirpes',                      now()),
    (uid, 'Michael Kahan', 'Parent',  'Contingent Beneficiary',  0, '1958-09-03', 'michael@gmail.com', '+1 (512) 555-0104', 'Only if spouse and children predecease',   now())
  ON CONFLICT DO NOTHING;

  -- ── 6. FAMILY MEMBERS ───────────────────────────────────────
  -- NOTE: table column is "name" not "full_name"
  INSERT INTO family_members (user_id, name, relationship, date_of_birth, email, phone, is_dependent, access_level, notes, created_at) VALUES
    (uid, 'Sarah Kahan',   'Spouse',   '1990-07-22', 'sarah@nahak.us',    '+1 (512) 555-0191', false, 'Full Access',      'Co-owner on primary residence',       now()),
    (uid, 'Ethan Kahan',   'Son',      '2016-03-08', NULL,                NULL,                true,  'Emergency Only',   'Minor child — UTMA account at Fidelity', now()),
    (uid, 'Olivia Kahan',  'Daughter', '2019-11-14', NULL,                NULL,                true,  'Emergency Only',   'Minor child',                          now()),
    (uid, 'Michael Kahan', 'Father',   '1958-09-03', 'michael@gmail.com', '+1 (512) 555-0104', false, 'View Only',        NULL,                                   now()),
    (uid, 'Linda Kahan',   'Mother',   '1961-02-17', 'linda@gmail.com',   '+1 (512) 555-0105', false, 'View Only',        NULL,                                   now()),
    (uid, 'Jordan Kahan',  'Sibling',  '1992-06-29', 'jordan@gmail.com',  '+1 (512) 555-0198', false, 'View Only',        NULL,                                   now())
  ON CONFLICT DO NOTHING;

  -- ── 7. DOCUMENTS ────────────────────────────────────────────
  -- NOTE: column is "file_path" (not "file_url")
  INSERT INTO documents (user_id, name, category, file_path, file_size, notes, created_at) VALUES
    (uid, 'Kahan Family Revocable Trust Agreement',   'Trust',             'trust.pdf',          204800, 'Executed 2022 — Austin TX',                  now() - interval '14 days'),
    (uid, 'Last Will & Testament — Tyler Kahan',      'Will',              'will.pdf',           153600, 'Notarized copy on file',                     now() - interval '30 days'),
    (uid, 'Durable Power of Attorney',                'Power of Attorney', 'poa.pdf',            102400, 'Sarah Kahan as agent',                       now() - interval '30 days'),
    (uid, 'Healthcare Directive / Living Will',       'Healthcare',        'hcd.pdf',             81920, 'Do-not-resuscitate provisions included',      now() - interval '45 days'),
    (uid, 'Kahan Holdings LLC — Operating Agreement', 'Business',          'llc_ops.pdf',        307200, 'Amended 2024 — added Sarah as co-member',    now() - interval '60 days'),
    (uid, 'Oak Creek Capital LP — Partnership Agmt',  'Business',          'lp_agmt.pdf',        256000, 'Original formation documents',               now() - interval '90 days'),
    (uid, 'Life Insurance Policy — NW Mutual',        'Insurance',         'life_ins.pdf',       179200, '$2.5M death benefit — trust as beneficiary', now() - interval '7 days'),
    (uid, '2024 Federal Tax Return',                  'Tax',               'taxes_2024.pdf',     512000, 'Filed April 2025',                           now() - interval '20 days')
  ON CONFLICT DO NOTHING;

  -- ── 8. DIGITAL ASSETS ───────────────────────────────────────
  -- NOTE: table columns are "platform" and "type" (not "name"/"category")
  INSERT INTO digital_assets (user_id, platform, type, username, estimated_value, notes, created_at) VALUES
    (uid, 'Bitcoin — Ledger Nano X',     'Crypto Wallet',   NULL,              1240000, '12.4 BTC — seed phrase in safe deposit box',     now()),
    (uid, 'Ethereum — Trezor Model T',   'Crypto Wallet',   NULL,               210000, '45 ETH — backup seed at attorney office',         now()),
    (uid, 'Coinbase',                    'Exchange Account','tyler@nahak.us',   159000, 'Live-synced — see Integrations',                  now()),
    (uid, 'nahak.us — Cloudflare',       'Domain',          'tyler@nahak.us',    8500, 'Primary company domain — auto-renew on',           now()),
    (uid, 'axionwealth.com — GoDaddy',   'Domain',          'tyler@nahak.us',    4200, 'Product domain',                                   now()),
    (uid, 'Twitter / X @tylerkahan',     'Social Media',    '@tylerkahan',          0, 'Verified account — transfer instructions in vault', now()),
    (uid, 'GitHub — tylerkahan',         'Software / IP',   'tylerkahan',       50000, '12 repos including Axion source code',             now()),
    (uid, 'Google Workspace',            'Email Account',   'tyler@nahak.us',       0, 'Primary email — backup codes in vault',            now()),
    (uid, 'Apple iCloud',                'Email Account',   'tyler@nahak.us',       0, 'Recovery contact: sarah@nahak.us',                 now()),
    (uid, 'Amazon AWS',                  'Software / IP',   'tyler@nahak.us',   12000, 'Production infrastructure — $800/mo spend',        now())
  ON CONFLICT DO NOTHING;

  -- ── 9. COMPLIANCE CHECKLIST ──────────────────────────────────
  -- NOTE: table column is "check_id" (not "item_key"); no title/notes columns
  DELETE FROM compliance_checks WHERE user_id = uid;

  INSERT INTO compliance_checks (user_id, check_id, completed, updated_at) VALUES
    (uid, 'will',             true,  now()),
    (uid, 'trust',            true,  now()),
    (uid, 'poa',              true,  now()),
    (uid, 'healthcare',       true,  now()),
    (uid, 'beneficiaries',    true,  now()),
    (uid, 'life_insurance',   true,  now()),
    (uid, 'digital_assets',   true,  now()),
    (uid, 'documents_stored', true,  now()),
    (uid, 'entity_structure', true,  now()),
    (uid, 'tax_planning',     false, now()),
    (uid, 'disability_ins',   false, now()),
    (uid, 'guardian',         false, now());

  RAISE NOTICE 'Seed complete for user: %', uid;
END $$;
