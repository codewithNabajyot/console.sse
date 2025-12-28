import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Customer, CustomerInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all customers (excluding soft-deleted)
export function useCustomers() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['customers', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Customer[]
    },
    enabled: !!orgId,
  })
}

// Get single customer by ID
export function useCustomer(id: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['customers', orgId, id],
    queryFn: async () => {
      if (!id) throw new Error('Customer ID is required')
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Customer
    },
    enabled: !!id && !!orgId,
  })
}

// Create customer mutation
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', orgId] })
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
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CustomerInput>; successMessage?: string }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('customers')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', orgId] })
      toast.success(variables.successMessage || 'Customer updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update customer', error.message)
    },
  })
}

// Soft delete customer mutation
export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', orgId] })
      toast.success('Customer deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete customer', error.message)
    },
  })
}
