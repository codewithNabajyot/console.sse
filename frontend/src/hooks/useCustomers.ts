import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Customer, CustomerInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

const ORG_ID = '00000000-0000-0000-0000-000000000000' // Placeholder - will be replaced with actual org context

// Fetch all customers (excluding soft-deleted)
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('org_id', ORG_ID)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Customer[]
    },
  })
}

// Get single customer by ID
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (!id) throw new Error('Customer ID is required')
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })
}

// Create customer mutation
export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...input, org_id: ORG_ID }])
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create customer', error.message)
    },
  })
}

// Update customer mutation
export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CustomerInput> }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(input)
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update customer', error.message)
    },
  })
}

// Soft delete customer mutation
export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete customer', error.message)
    },
  })
}
