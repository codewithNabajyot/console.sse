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
