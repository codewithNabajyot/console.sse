import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BankAccount, BankAccountInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all bank accounts (excluding soft-deleted)
export function useBankAccounts() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['bank-accounts', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as BankAccount[]
    },
    enabled: !!orgId,
  })
}

// Get single bank account by ID
export function useBankAccount(id: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['bank-accounts', orgId, id],
    queryFn: async () => {
      if (!id) throw new Error('Bank account ID is required')
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as BankAccount
    },
    enabled: !!id && !!orgId,
  })
}

// Create bank account mutation
export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: BankAccountInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as BankAccount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', orgId] })
      toast.success('Bank account created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create bank account', error.message)
    },
  })
}

// Update bank account mutation
export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<BankAccountInput>; successMessage?: string }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as BankAccount
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', orgId] })
      toast.success(variables.successMessage || 'Bank account updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update bank account', error.message)
    },
  })
}

// Soft delete bank account mutation
export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as BankAccount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', orgId] })
      toast.success('Bank account deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete bank account', error.message)
    },
  })
}
