import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Income, IncomeInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all income records
export function useIncome(includeDeleted = false) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['income', orgId, includeDeleted],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      let query = supabase
        .from('income')
        .select('*, project:projects(*, customer:customers(*), income(amount)), bank_account:bank_accounts(*), invoice:invoices(*, income(amount)), customer:customers(*)')
        .eq('org_id', orgId)
        .is('project.income.deleted_at', null)
        .is('invoice.income.deleted_at', null)
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error
      return data as Income[]
    },
    enabled: !!orgId,
  })
}

// Get single income by ID
export function useIncomeById(id: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['income', orgId, id],
    queryFn: async () => {
      if (!id) throw new Error('Income ID is required')
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('income')
        .select('*, project:projects(*, customer:customers(*)), bank_account:bank_accounts(*), invoice:invoices(*), customer:customers(*)')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Income
    },
    enabled: !!id && !!orgId,
  })
}

// Create income mutation
export function useCreateIncome() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: IncomeInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('income')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as Income
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', orgId] })
      // Also invalidate bank accounts as balance changes via trigger
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Income recorded successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to record income', error.message)
    },
  })
}

// Update income mutation
export function useUpdateIncome() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<IncomeInput> }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('income')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Income
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', orgId] })
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Income updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update income', error.message)
    },
  })
}

// Soft delete income mutation
export function useDeleteIncome() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('income')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Income
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', orgId] })
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Income deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete income', error.message)
    },
  })
}
