-- SOLAR BUSINESS PERFORMANCE DASHBOARD - SUPABASE SCHEMA MIGRATION
-- DESIGNED FOR MULTI-TENANCY, SCALABILITY, AND AUDITING

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- ORGANIZATIONS
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    gst_number TEXT,
    address TEXT,
    phone TEXT,
    notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ROLES
CREATE TABLE org_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (Users linked to Auth users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID REFERENCES org_roles(id),
    full_name TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MASTER CONFIGS (Dropdowns)
CREATE TABLE master_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL, -- PROJECT_STATUS, PAYMENT_MODE, etc.
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    gst_number TEXT,
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VENDORS
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT, -- Link to master_configs later if needed
    gst_number TEXT,
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BANK ACCOUNTS
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    current_balance NUMERIC(15, 2) DEFAULT 0, -- Cached real-time balance
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. REAL-TIME BALANCE TRACKING TRIGGERS

-- Function for Income
CREATE OR REPLACE FUNCTION update_bank_balance_income()
RETURNS TRIGGER AS $$
DECLARE
    v_bank_id UUID;
    v_amount NUMERIC;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_bank_id := NEW.bank_account_id;
        v_amount := NEW.amount;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.bank_account_id != NEW.bank_account_id) THEN
            -- Deduct from old bank
            UPDATE bank_accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.bank_account_id;
            -- Add to new bank
            v_bank_id := NEW.bank_account_id;
            v_amount := NEW.amount;
        ELSE
            v_bank_id := NEW.bank_account_id;
            v_amount := NEW.amount - OLD.amount;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_bank_id := OLD.bank_account_id;
        v_amount := -OLD.amount;
    END IF;

    IF v_bank_id IS NOT NULL THEN
        UPDATE bank_accounts SET current_balance = current_balance + v_amount WHERE id = v_bank_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function for Expenses
CREATE OR REPLACE FUNCTION update_bank_balance_expense()
RETURNS TRIGGER AS $$
DECLARE
    v_bank_id UUID;
    v_amount NUMERIC;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_bank_id := NEW.bank_account_id;
        v_amount := -NEW.total_paid;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.bank_account_id != NEW.bank_account_id) THEN
            -- Add back to old bank (it was a deduction)
            UPDATE bank_accounts SET current_balance = current_balance + OLD.total_paid WHERE id = OLD.bank_account_id;
            -- Deduct from new bank
            v_bank_id := NEW.bank_account_id;
            v_amount := -NEW.total_paid;
        ELSE
            v_bank_id := NEW.bank_account_id;
            v_amount := -(NEW.total_paid - OLD.total_paid);
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_bank_id := OLD.bank_account_id;
        v_amount := OLD.total_paid;
    END IF;

    IF v_bank_id IS NOT NULL THEN
        UPDATE bank_accounts SET current_balance = current_balance + v_amount WHERE id = v_bank_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach balance triggers
DROP TRIGGER IF EXISTS trg_income_balance ON income;
CREATE TRIGGER trg_income_balance AFTER INSERT OR UPDATE OR DELETE ON income FOR EACH ROW EXECUTE FUNCTION update_bank_balance_income();

DROP TRIGGER IF EXISTS trg_expense_balance ON expenses;
CREATE TRIGGER trg_expense_balance AFTER INSERT OR UPDATE OR DELETE ON expenses FOR EACH ROW EXECUTE FUNCTION update_bank_balance_expense();

-- PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    project_id_code TEXT NOT NULL, -- The readable code like S-001
    deal_value NUMERIC(15, 2) DEFAULT 0,
    funding_type TEXT, -- Link to master_configs
    status TEXT, -- Link to master_configs
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES (Sales)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    customer_id UUID REFERENCES customers(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number TEXT NOT NULL,
    taxable_value NUMERIC(15, 2) DEFAULT 0, -- Header summary
    gst_percentage NUMERIC(5, 2) DEFAULT 0,
    gst_amount NUMERIC(15, 2) DEFAULT 0, -- Header summary
    total_amount NUMERIC(15, 2) DEFAULT 0, -- Header summary
    invoice_link TEXT, -- Fallback link
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INCOME (Inward Payments)
CREATE TABLE income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    customer_id UUID REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_from TEXT,
    category TEXT, -- Link to master_configs
    payment_mode TEXT, -- Link to master_configs
    amount NUMERIC(15, 2) DEFAULT 0,
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSES (Outward Payments)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    vendor_id UUID REFERENCES vendors(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    category TEXT, -- Link to master_configs
    total_paid NUMERIC(15, 2) DEFAULT 0, -- Header summary
    gst_percentage NUMERIC(5, 2) DEFAULT 0,
    gst_amount NUMERIC(15, 2) DEFAULT 0, -- Header summary
    taxable_value NUMERIC(15, 2) DEFAULT 0, -- Header summary
    vendor_invoice_number TEXT,
    notes JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ATTACHMENTS (Google Drive Links)
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- project, invoice, income, expense, customer, vendor
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES FOR PERFORMANCE
-- Index all org_id columns
CREATE INDEX idx_roles_org ON org_roles(org_id);
CREATE INDEX idx_profiles_org ON profiles(org_id);
CREATE INDEX idx_configs_org ON master_configs(org_id);
CREATE INDEX idx_customers_org ON customers(org_id);
CREATE INDEX idx_vendors_org ON vendors(org_id);
CREATE INDEX idx_bank_accounts_org ON bank_accounts(org_id);
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_invoices_org ON invoices(org_id);
CREATE INDEX idx_income_org ON income(org_id);
CREATE INDEX idx_expenses_org ON expenses(org_id);
CREATE INDEX idx_attachments_org ON attachments(org_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id);

-- Index foreign keys
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_income_project ON income(project_id);
CREATE INDEX idx_income_customer ON income(customer_id);
CREATE INDEX idx_income_invoice ON income(invoice_id);
CREATE INDEX idx_income_bank ON income(bank_account_id);
CREATE INDEX idx_expenses_project ON expenses(project_id);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_expenses_bank ON expenses(bank_account_id);
CREATE INDEX idx_attachments_entity ON attachments(entity_id);

-- Index for soft deletes
CREATE INDEX idx_soft_delete ON projects(deleted_at) WHERE deleted_at IS NULL;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at to all relevant tables
CREATE TRIGGER update_orgs_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_invoices_updated BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_income_updated BEFORE UPDATE ON income FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_vendors_updated BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_banks_updated BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. SEED DATA - DEFAULT ORGANIZATION AND ROLES
-- Moved to seed.sql


-- 7. AUTO-CREATE USER PROFILE TRIGGER

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_org_id UUID;
  read_only_role_id UUID;
  provided_slug TEXT;
BEGIN
  -- Get the slug from user metadata
  provided_slug := COALESCE(NEW.raw_user_meta_data->>'org_slug', 'suryasathi');
  
  -- Look up the organization by slug
  SELECT id INTO target_org_id 
  FROM public.organizations 
  WHERE slug = provided_slug 
  LIMIT 1;

  -- Fallback to default if not found
  IF target_org_id IS NULL THEN
    SELECT id INTO target_org_id 
    FROM public.organizations 
    WHERE slug = 'suryasathi' 
    LIMIT 1;
  END IF;

  -- Get the Read Only role ID for this organization
  SELECT id INTO read_only_role_id 
  FROM public.org_roles 
  WHERE org_id = target_org_id AND name = 'Read Only' 
  LIMIT 1;

  -- Create profile for the new user
  INSERT INTO public.profiles (id, org_id, role_id, full_name)
  VALUES (
    NEW.id,
    target_org_id,
    read_only_role_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. ROW LEVEL SECURITY POLICIES

-- Helper to get user org id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Organizations: Public read access
CREATE POLICY "Allow public read organizations" ON organizations FOR SELECT TO authenticated, anon USING (true);

-- Profiles: Own record access
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Org Roles: Org-specific access
CREATE POLICY "Users can read org roles" ON org_roles FOR SELECT TO authenticated USING (org_id = get_user_org_id());

-- Master Configs: Org-specific access
CREATE POLICY "Users can manage master configs" ON master_configs FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());

-- Entity Data Policies (Org-specific)
CREATE POLICY "Users can manage projects" ON projects FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can manage customers" ON customers FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can manage vendors" ON vendors FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can manage bank accounts" ON bank_accounts FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can manage invoices" ON invoices FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can manage income" ON income FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can manage expenses" ON expenses FOR ALL TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());

-- 9. COMMENTS FOR DOCUMENTATION

COMMENT ON TABLE organizations IS 'Multi-tenant organizations. Default: Suryasathi Solar';
COMMENT ON TABLE org_roles IS 'Role-based access control. Default roles: Admin, Read Only';
COMMENT ON TABLE profiles IS 'User profiles linked to auth.users. Auto-created on signup with Read Only role';
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a profile for new users and assigns them to the default organization with Read Only role';
COMMENT ON COLUMN bank_accounts.current_balance IS 'Cached real-time balance maintained by triggers on income/expenses tables';
