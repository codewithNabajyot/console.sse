import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Vendor, VendorInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all vendors (excluding soft-deleted)
export function useVendors() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['vendors', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Vendor[]
    },
    enabled: !!orgId,
  })
}

// Get single vendor by ID
export function useVendor(id: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['vendors', orgId, id],
    queryFn: async () => {
      if (!id) throw new Error('Vendor ID is required')
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Vendor
    },
    enabled: !!id && !!orgId,
  })
}

// Create vendor mutation
export function useCreateVendor() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: VendorInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('vendors')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as Vendor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors', orgId] })
      toast.success('Vendor created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create vendor', error.message)
    },
  })
}

// Update vendor mutation
export function useUpdateVendor() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<VendorInput>; successMessage?: string }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('vendors')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Vendor
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors', orgId] })
      toast.success(variables.successMessage || 'Vendor updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update vendor', error.message)
    },
  })
}

// Soft delete vendor mutation
export function useDeleteVendor() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('vendors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Vendor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors', orgId] })
      toast.success('Vendor deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete vendor', error.message)
    },
  })
}
// Fetch ledger for a vendor (Expenses + Payments)
export function useVendorLedger(vendorId: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['vendor_ledger', orgId, vendorId],
    queryFn: async () => {
      if (!vendorId) return { transactions: [], totalBilled: 0, totalPaid: 0, balance: 0 }
      if (!orgId) throw new Error('Organization ID is required')
      
      // Fetch Expenses
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*, project:projects(*, customer:customers(*))')
        .eq('vendor_id', vendorId)
        .eq('org_id', orgId)
        .is('deleted_at', null)

      if (expError) throw expError

      // Fetch Payments
      const { data: payments, error: payError } = await supabase
        .from('expense_payments')
        .select('*, bank_account:bank_accounts(*), project:projects(*, customer:customers(*))')
        .eq('vendor_id', vendorId)
        .eq('org_id', orgId)
        .is('deleted_at', null)

      if (payError) throw payError

      // Combine and Sort
      const transactions = [
        ...(expenses || []).map(exp => ({
          id: exp.id,
          date: exp.date,
          number: exp.expense_number || 'EXP-???',
          type: 'Bill' as const,
          description: exp.description,
          project: exp.project, // Full project object
          debit: exp.total_paid, // Increases what we owe
          credit: 0
        })),
        ...(payments || []).map(pay => ({
          id: pay.id,
          date: pay.date,
          number: pay.payment_number || 'VPAY-???',
          type: 'Payment' as const,
          description: `Payment via ${pay.payment_mode || 'Bank'}`,
          project: pay.project, // Full project object if linked
          bank_account: pay.bank_account,
          payment_mode: pay.payment_mode,
          debit: 0,
          credit: pay.amount // Decreases what we owe
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calculate Running Balance and Totals
      let runningBalance = 0
      let totalBilled = 0
      let totalPaid = 0
      
      const ledgerTransactions = transactions.map(t => {
        runningBalance += (t.debit - t.credit)
        totalBilled += t.debit
        totalPaid += t.credit
        return { ...t, balance: runningBalance }
      })

      return {
        transactions: ledgerTransactions.reverse(), // Show newest first in UI but calculation was chronological
        totalBilled,
        totalPaid,
        balance: runningBalance
      }
    },
    enabled: !!vendorId && !!orgId,
  })
}
