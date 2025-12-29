import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all invoices
export function useInvoices(includeDeleted = false) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['invoices', orgId, includeDeleted],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      let query = supabase
        .from('invoices')
        .select('*, project:projects(*, customer:customers(*))')
        .eq('org_id', orgId)
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error
      return data as Invoice[]
    },
    enabled: !!orgId,
  })
}

// Get single invoice by ID
export function useInvoiceById(id: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['invoices', orgId, id],
    queryFn: async () => {
      if (!id) throw new Error('Invoice ID is required')
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*, project:projects(*, customer:customers(*))')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Invoice
    },
    enabled: !!id && !!orgId,
  })
}

// Create invoice mutation
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: InvoiceInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('invoices')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as Invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', orgId] })
      toast.success('Invoice created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create invoice', error.message)
    },
  })
}

// Update invoice mutation
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<InvoiceInput> }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('invoices')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', orgId] })
      toast.success('Invoice updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update invoice', error.message)
    },
  })
}

// Soft delete invoice mutation
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Invoice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', orgId] })
      toast.success('Invoice deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete invoice', error.message)
    },
  })
}
