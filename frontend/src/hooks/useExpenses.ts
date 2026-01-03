import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Expense, ExpenseInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all expenses
export function useExpenses(includeDeleted = false) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['expenses', orgId, includeDeleted],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      let query = supabase
        .from('expenses')
        .select('*, project:projects(*, customer:customers(*)), vendor:vendors(*), bank_account:bank_accounts(*), allocations:payment_allocations(*, payment:expense_payments(*, vendor:vendors(*)))')
        .eq('org_id', orgId)
        .is('allocations.payment.deleted_at', null)
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error
      return data as Expense[]
    },
    enabled: !!orgId,
  })
}

// Get single expense by ID
export function useExpenseById(id: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['expenses', orgId, id],
    queryFn: async () => {
      if (!id) throw new Error('Expense ID is required')
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*, project:projects(*, customer:customers(*)), vendor:vendors(*), bank_account:bank_accounts(*)')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Expense
    },
    enabled: !!id && !!orgId,
  })
}

// Create expense mutation
export function useCreateExpense() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', orgId] })
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Expense recorded successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to record expense', error.message)
    },
  })
}

// Update expense mutation
export function useUpdateExpense() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ExpenseInput> }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('expenses')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', orgId] })
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Expense updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update expense', error.message)
    },
  })
}

// Soft delete expense mutation
export function useDeleteExpense() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', orgId] })
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Expense deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete expense', error.message)
    },
  })
}
