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
