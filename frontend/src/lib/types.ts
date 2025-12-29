// Database types matching the Supabase schema

export interface Customer {
  id: string
  org_id: string
  name: string
  email: string | null
  phone: string | null
  gst_number: string | null
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  org_id: string
  name: string
  category: string | null
  gst_number: string | null
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  org_id: string
  account_name: string
  bank_name: string | null
  account_number: string | null
  current_balance: number
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  content: string
  user_id: string
  user_name: string
  created_at: string
}

// Form input types (without generated fields)
export type CustomerInput = Omit<Customer, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'notes'> & { notes?: Note[] }

export type VendorInput = Omit<Vendor, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'notes'> & { notes?: Note[] }

export type BankAccountInput = Omit<BankAccount, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'current_balance' | 'notes'> & { notes?: Note[] }

export interface MasterConfig {
  id: string
  org_id: string
  config_type: string
  label: string
  value: string
  is_active: boolean
  sort_order: number
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  org_id: string
  customer_id: string
  customer?: Customer // For joined queries
  project_id_code: string
  deal_value: number
  funding_type: string | null
  status: string | null
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type MasterConfigInput = Omit<MasterConfig, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'notes'> & { notes?: Note[] }

export type ProjectInput = Omit<Project, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'notes' | 'customer'> & { notes?: Note[] }

export interface Income {
  id: string
  org_id: string
  project_id: string | null
  project?: Project
  bank_account_id: string | null
  bank_account?: BankAccount
  date: string
  received_from: string | null
  category: string | null
  payment_mode: string | null
  amount: number
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type IncomeInput = Omit<Income, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'notes' | 'project' | 'bank_account'> & { notes?: Note[] }

export interface Expense {
  id: string
  org_id: string
  project_id: string | null
  project?: Project
  vendor_id: string | null
  vendor?: Vendor
  bank_account_id: string | null
  bank_account?: BankAccount
  date: string
  description: string | null
  category: string | null
  total_paid: number
  gst_percentage: number
  gst_amount: number
  taxable_value: number
  vendor_invoice_number: string | null
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ExpenseInput = Omit<Expense, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'notes' | 'project' | 'vendor' | 'bank_account'> & { notes?: Note[] }

export interface Invoice {
  id: string
  org_id: string
  project_id: string | null
  project?: Project
  date: string
  invoice_number: string
  taxable_value: number
  gst_percentage: number
  gst_amount: number
  total_amount: number
  invoice_link: string | null
  notes: Note[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type InvoiceInput = Omit<Invoice, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'notes' | 'project'> & { notes?: Note[] }
