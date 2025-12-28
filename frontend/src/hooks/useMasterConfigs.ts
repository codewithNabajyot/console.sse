import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MasterConfig, MasterConfigInput } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Fetch all master configs and cache them
export function useMasterConfigs() {
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useQuery({
    queryKey: ['master_configs', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('master_configs')
        .select('*')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as MasterConfig[]
    },
    enabled: !!orgId,
    staleTime: Infinity, // Keep data fresh indefinitely
    gcTime: Infinity,    // Keep in cache indefinitely
  })
}

// Fetch master configs by type using the cached data from useMasterConfigs
export function useMasterConfigsByType(type: string) {
  const { data: allConfigs, isLoading, error } = useMasterConfigs()

  const configs = allConfigs?.filter(
    (config) => config.config_type === type
  )

  return {
    data: configs,
    isLoading,
    error
  }
}

// Create master config mutation
export function useCreateMasterConfig() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async (input: MasterConfigInput) => {
      if (!orgId) throw new Error('Organization ID is required')
      
      const { data, error } = await supabase
        .from('master_configs')
        .insert([{ ...input, org_id: orgId }])
        .select()
        .single()

      if (error) throw error
      return data as MasterConfig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_configs', orgId] })
      toast.success('Config created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create config', error.message)
    },
  })
}

// Seed default configs mutation
export function useSeedMasterConfigs() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const orgId = profile?.org_id

  return useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')

      // Client-side seeding is disabled in favor of SQL migration.
      // This function is kept for API compatibility but performs no operation.
      return { count: 0 }
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        queryClient.invalidateQueries({ queryKey: ['master_configs', orgId] })
        toast.success(`Added ${data.count} new configuration items`)
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to seed configs', error.message)
    },
  })
}
