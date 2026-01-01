import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ExpensePayment, ExpensePaymentInput, PaymentAllocation } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all expense payments
export function useExpensePayments() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['expense_payments', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('expense_payments')
        .select('*, vendor:vendors(*), bank_account:bank_accounts(*), project:projects(*), allocations:payment_allocations(*, expense:expenses(*, project:projects(*, customer:customers(*))))')
        .eq('org_id', orgId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as ExpensePayment[]
    },
    enabled: !!orgId,
  })
}

// Create payment
export function useCreateExpensePayment() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ payment, allocations }: { payment: ExpensePaymentInput, allocations?: { expense_id: string, amount: number }[] }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      // 1. Create Payment
      const { data: paymentData, error: paymentError } = await supabase
        .from('expense_payments')
        .insert([{ ...payment, org_id: orgId }])
        .select()
        .single()

      if (paymentError) throw paymentError

      // 2. Create Allocations (if any)
      if (allocations && allocations.length > 0) {
        const allocationRecords = allocations.map(a => ({
          payment_id: paymentData.id,
          expense_id: a.expense_id,
          amount: a.amount
        }))

        const { error: allocError } = await supabase
          .from('payment_allocations')
          .insert(allocationRecords)

        if (allocError) throw allocError
      }

      return paymentData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_payments', orgId] })
      queryClient.invalidateQueries({ queryKey: ['expenses', orgId] }) // Refresh expenses to show paid status if we ever implement that
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to record payment', error.message)
    },
  })
}

// Update payment
export function useUpdateExpensePayment() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string, input: Partial<ExpensePaymentInput> }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('expense_payments')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_payments', orgId] })
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Payment updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update payment', error.message)
    },
  })
}

// Delete payment
export function useDeleteExpensePayment() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { error } = await supabase
        .from('expense_payments')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_payments', orgId] })
      queryClient.invalidateQueries({ queryKey: ['bank_accounts', orgId] })
      toast.success('Payment deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete payment', error.message)
    },
  })
}

// Create allocations
export function useCreatePaymentAllocations() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (allocations: { payment_id: string, expense_id: string, amount: number }[]) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('payment_allocations')
        .insert(allocations)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      const paymentIds = [...new Set(variables.map(v => v.payment_id))]
      paymentIds.forEach(id => {
         queryClient.invalidateQueries({ queryKey: ['payment_allocations', id] })
      })
      
      queryClient.invalidateQueries({ queryKey: ['expense_payments', orgId] })
      queryClient.invalidateQueries({ queryKey: ['expenses', orgId] })
      toast.success('Allocations saved successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to save allocations', error.message)
    },
  })
}

// Delete allocation (Unlink)
export function useDeletePaymentAllocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_allocations')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['payment_allocations'] })
       queryClient.invalidateQueries({ queryKey: ['expense_payments'] })
       queryClient.invalidateQueries({ queryKey: ['expenses'] })
       toast.success('Link removed successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to remove link', error.message)
    },
  })
}

// Update allocations (Replace all for a payment)
export function useUpdatePaymentAllocations() {
   const queryClient = useQueryClient()
   const { profile } = useAuth()
   const orgId = profile?.org_id
 
   return useMutation({
     mutationFn: async ({ paymentId, allocations }: { paymentId: string, allocations: { payment_id: string, expense_id: string, amount: number }[] }) => {
       if (!orgId) throw new Error('Organization ID is required')
       
       // 1. Delete all existing allocations for this payment
       const { error: deleteError } = await supabase
         .from('payment_allocations')
         .delete()
         .eq('payment_id', paymentId)
 
       if (deleteError) throw deleteError
 
       // 2. Insert new allocations
       if (allocations.length > 0) {
         const { error: insertError } = await supabase
           .from('payment_allocations')
           .insert(allocations)
         
         if (insertError) throw insertError
       }
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['payment_allocations', variables.paymentId] })
       queryClient.invalidateQueries({ queryKey: ['expense_payments', orgId] })
       queryClient.invalidateQueries({ queryKey: ['expenses', orgId] })
       toast.success('Allocations updated successfully')
     },
     onError: (error: Error) => {
       toast.error('Failed to update allocations', error.message)
     },
   })
 }

// Fetch allocations for a payment
export function usePaymentAllocations(paymentId: string | undefined) {
  return useQuery({
    queryKey: ['payment_allocations', paymentId],
    queryFn: async () => {
      if (!paymentId) return []
      
      const { data, error } = await supabase
        .from('payment_allocations')
        .select('*, expense:expenses(*)')
        .eq('payment_id', paymentId)

      if (error) throw error
      return data as PaymentAllocation[]
    },
    enabled: !!paymentId,
  })
}
