import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BankTransfer, BankTransferInput } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'

export function useBankTransfers() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['bank-transfers', profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transfers')
        .select(`
          *,
          from_account:bank_accounts!from_account_id(*),
          to_account:bank_accounts!to_account_id(*)
        `)
        .is('deleted_at', null)
        .order('date', { ascending: false })

      if (error) throw error
      return data as BankTransfer[]
    },
    enabled: !!profile?.org_id,
  })
}

export function useCreateBankTransfer() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: BankTransferInput) => {
      if (!profile?.org_id) throw new Error('No organization selected')

      const { data, error } = await supabase
        .from('bank_transfers')
        .insert([{ ...input, org_id: profile.org_id }])
        .select()
        .single()

      if (error) throw error
      return data as BankTransfer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] })
      toast.success('Money transferred successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to transfer money', error.message)
    },
  })
}

export function useDeleteBankTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_transfers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] })
      toast.success('Transfer deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete transfer', error.message)
    },
  })
}
