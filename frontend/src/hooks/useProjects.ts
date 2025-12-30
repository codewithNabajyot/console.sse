import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all projects (including optional soft-deleted)
export function useProjects(includeDeleted = false) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['projects', orgId, includeDeleted],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      let query = supabase
        .from('projects')
        .select('*, customer:customers(*), income(*, bank_account:bank_accounts(*)), expenses(*, vendor:vendors(*))')
        .eq('org_id', orgId)
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as Project[]
    },
    enabled: !!orgId,
  })
}

// Get single project by ID
export function useProject(id: string | undefined) {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['projects', orgId, id],
    queryFn: async () => {
      if (!id) throw new Error('Project ID is required')
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('projects')
        .select('*, customer:customers(*)')
        .eq('id', id)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return data as Project
    },
    enabled: !!id && !!orgId,
  })
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] })
      toast.success('Project created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create project', error.message)
    },
  })
}

// Update project mutation
export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ProjectInput>; successMessage?: string }) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('projects')
        .update(input)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] })
      toast.success(variables.successMessage || 'Project updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update project', error.message)
    },
  })
}

// Soft delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] })
      toast.success('Project deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete project', error.message)
    },
  })
}
