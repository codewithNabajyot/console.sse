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
      
      // Fetch invoices
      let invoicesQuery = supabase
        .from('invoices')
        .select('*, project:projects(*, customer:customers(*)), customer:customers(*), income(*, bank_account:bank_accounts(*))')
        .eq('org_id', orgId)
        .is('income.deleted_at', null)
      
      if (!includeDeleted) {
        invoicesQuery = invoicesQuery.is('deleted_at', null)
      }

      const { data: invoices, error: invError } = await invoicesQuery.order('date', { ascending: false })
      if (invError) throw invError

      // Fetch attachments for these invoices
      const invoiceIds = invoices?.map(inv => inv.id) || []
      if (invoiceIds.length > 0) {
        const { data: attachments, error: attachError } = await supabase
          .from('attachments')
          .select('*')
          .eq('entity_type', 'invoice')
          .in('entity_id', invoiceIds)
          .is('deleted_at', null)

        if (!attachError && attachments) {
          return invoices.map(inv => ({
            ...inv,
            attachments: attachments.filter(a => a.entity_id === inv.id)
          })) as Invoice[]
        }
      }

      return invoices as Invoice[]
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
      
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('*, project:projects(*, customer:customers(*)), customer:customers(*)')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (invError) throw invError

      // Fetch attachments for this invoice
      const { data: attachments, error: attachError } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', 'invoice')
        .eq('entity_id', id)
        .is('deleted_at', null)

      if (!attachError && attachments) {
        return { ...invoice, attachments } as Invoice
      }

      return invoice as Invoice
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
      
      // 1. Fetch attachments first to delete from Drive
      const { data: attachments } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', 'invoice')
        .eq('entity_id', id)
        .is('deleted_at', null)

      if (attachments && attachments.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        
        for (const attachment of attachments) {
          const fileIdMatch = attachment.file_url.match(/\/d\/(.+?)\//)
          const fileId = fileIdMatch ? fileIdMatch[1] : null

          if (fileId) {
            try {
              await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-from-drive`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileId }),
              })
            } catch (e) {
              console.warn('Failed to delete attachment from drive during invoice deletion', e)
            }
          }
        }

        // Soft delete attachments
        await supabase
          .from('attachments')
          .update({ deleted_at: new Date().toISOString() })
          .eq('entity_type', 'invoice')
          .eq('entity_id', id)
      }

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
      toast.success('Invoice and its Drive attachments deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete invoice', error.message)
    },
  })
}
