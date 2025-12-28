import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BankAccount, BankAccountInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

const ORG_ID = '00000000-0000-0000-0000-000000000000' // Placeholder - will be replaced with actual org context

// Fetch all bank accounts (excluding soft-deleted)
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('org_id', ORG_ID)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as BankAccount[]
    },
  })
}

// Get single bank account by ID
export function useBankAccount(id: string | undefined) {
  return useQuery({
    queryKey: ['bank-accounts', id],
    queryFn: async () => {
      if (!id) throw new Error('Bank account ID is required')
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as BankAccount
    },
    enabled: !!id,
  })
}

// Create bank account mutation
export function useCreateBankAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BankAccountInput) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert([{ ...input, org_id: ORG_ID }])
        .select()
        .single()

      if (error) throw error
      return data as BankAccount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
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

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<BankAccountInput> }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(input)
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .select()
        .single()

      if (error) throw error
      return data as BankAccount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success('Bank account updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update bank account', error.message)
    },
  })
}

// Soft delete bank account mutation
export function useDeleteBankAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .select()
        .single()

      if (error) throw error
      return data as BankAccount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success('Bank account deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete bank account', error.message)
    },
  })
}
