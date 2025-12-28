import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Vendor, VendorInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

const ORG_ID = '00000000-0000-0000-0000-000000000000' // Placeholder - will be replaced with actual org context

// Fetch all vendors (excluding soft-deleted)
export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('org_id', ORG_ID)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Vendor[]
    },
  })
}

// Get single vendor by ID
export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: async () => {
      if (!id) throw new Error('Vendor ID is required')
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Vendor
    },
    enabled: !!id,
  })
}

// Create vendor mutation
export function useCreateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: VendorInput) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert([{ ...input, org_id: ORG_ID }])
        .select()
        .single()

      if (error) throw error
      return data as Vendor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
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

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<VendorInput> }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update(input)
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .select()
        .single()

      if (error) throw error
      return data as Vendor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update vendor', error.message)
    },
  })
}

// Soft delete vendor mutation
export function useDeleteVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('vendors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', ORG_ID)
        .select()
        .single()

      if (error) throw error
      return data as Vendor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete vendor', error.message)
    },
  })
}
