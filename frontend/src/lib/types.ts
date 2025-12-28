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
  text: string
  timestamp: string
  user?: string
}

// Form input types (without generated fields)
export type CustomerInput = Omit<Customer, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at'>

export type VendorInput = Omit<Vendor, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at'>

export type BankAccountInput = Omit<BankAccount, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'current_balance'>
