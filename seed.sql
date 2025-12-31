-- 6. SEED DATA - DEFAULT ORGANIZATION AND ROLES

-- Create default organization
INSERT INTO organizations (name, slug, notes)
VALUES ('Suryasathi Solar', 'suryasathi', '[]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Create default roles
INSERT INTO org_roles (org_id, name, permissions)
SELECT 
  o.id,
  'Admin',
  '{
    "projects": {"create": true, "read": true, "update": true, "delete": true},
    "invoices": {"create": true, "read": true, "update": true, "delete": true},
    "income": {"create": true, "read": true, "update": true, "delete": true},
    "expenses": {"create": true, "read": true, "update": true, "delete": true},
    "customers": {"create": true, "read": true, "update": true, "delete": true},
    "vendors": {"create": true, "read": true, "update": true, "delete": true},
    "bank_accounts": {"create": true, "read": true, "update": true, "delete": true}
  }'::jsonb
FROM organizations o
WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;

INSERT INTO org_roles (org_id, name, permissions)
SELECT 
  o.id,
  'Read Only',
  '{
    "projects": {"create": false, "read": true, "update": false, "delete": false},
    "invoices": {"create": false, "read": true, "update": false, "delete": false},
    "income": {"create": false, "read": true, "update": false, "delete": false},
    "expenses": {"create": false, "read": true, "update": false, "delete": false},
    "customers": {"create": false, "read": true, "update": false, "delete": false},
    "vendors": {"create": false, "read": true, "update": false, "delete": false},
    "bank_accounts": {"create": false, "read": true, "update": false, "delete": false}
  }'::jsonb
FROM organizations o
WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;

-- Seed Master Configs (Project Statuses)
INSERT INTO master_configs (org_id, config_type, label, value, is_active, sort_order)
SELECT 
  o.id,
  'PROJECT_STATUS',
  status,
  status,
  true,
  t.sort_order
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Booked', 1),
    ('MNRE Submitted', 2),
    ('Loan Applied', 3),
    ('Loan Approved', 4),
    ('Installed', 5),
    ('Net Metering Completed', 6),
    ('Central Subsidy Received', 7),
    ('State Subsidy Received', 8),
    ('Completed', 9)
) AS t(status, sort_order)
WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;

-- Seed Master Configs (Funding Types)
INSERT INTO master_configs (org_id, config_type, label, value, is_active, sort_order)
SELECT 
  o.id,
  'FUNDING_TYPE',
  ftype,
  ftype,
  true,
  t.sort_order
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Cash', 1),
    ('Loan', 2)
) AS t(ftype, sort_order)

WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;

-- Seed Master Configs (Income Payment Modes)
INSERT INTO master_configs (org_id, config_type, label, value, is_active, sort_order)
SELECT 
  o.id,
  'PAYMENT_MODE',
  mode,
  mode,
  true,
  t.sort_order
FROM organizations o
CROSS JOIN (
  VALUES 
    ('UPI', 2),
    ('Bank Transfer', 4),
    ('Cash', 1),
    ('Cheque', 3)
) AS t(mode, sort_order)
WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;

-- Seed Master Configs (Income Categories)
INSERT INTO master_configs (org_id, config_type, label, value, is_active, sort_order)
SELECT 
  o.id,
  'INCOME_CATEGORY',
  cat,
  cat,
  true,
  t.sort_order
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Booking Advance', 1),
    ('Bank Loan (Part)', 2),
    ('Bank Loan (Final)', 3),
    ('Part Payment (Customer)', 4),
    ('Final Settlement (Customer)', 5),
    ('Net Metering Fee', 6)
) AS t(cat, sort_order)
WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;

-- Seed Master Configs (Project Expense Categories)
INSERT INTO master_configs (org_id, config_type, label, value, is_active, sort_order)
SELECT 
  o.id,
  'PROJECT_EXPENSE_CATEGORY',
  cat,
  cat,
  true,
  t.sort_order
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Solar Kit', 1),
    ('Structure & Mounting', 2),
    ('Raw Material', 3),
    ('Transportation', 4),
    ('Labour - Installation', 5),
    ('Net Metering Fees', 6),
    ('Project - Others', 7)
) AS t(cat, sort_order)
WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;

-- Seed Master Configs (Common Expense Categories)
INSERT INTO master_configs (org_id, config_type, label, value, is_active, sort_order)
SELECT 
  o.id,
  'COMMON_EXPENSE_CATEGORY',
  cat,
  cat,
  true,
  t.sort_order
FROM organizations o
CROSS JOIN (
  VALUES 
    ('Office Rent', 1),
    ('Office Expenses', 2),
    ('Salary', 3),
    ('Tools & Equipment', 4),
    ('Travel & Petrol', 5),
    ('Stationery', 6),
    ('Professional Fees', 7),
    ('GST Payment', 8),
    ('Bank Charges', 9),
    ('Misc', 10)
) AS t(cat, sort_order)
WHERE o.slug = 'suryasathi'
ON CONFLICT DO NOTHING;
