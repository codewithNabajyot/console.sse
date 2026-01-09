import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ attachmentId, fileUrl }: { 
      attachmentId: string; 
      fileUrl: string;
      entityType: string;
      entityId: string;
    }) => {
      // 1. Extract File ID from Google Drive URL
      // Format: https://drive.google.com/file/d/FILE_ID/view
      const fileIdMatch = fileUrl.match(/\/d\/(.+?)\//)
      const fileId = fileIdMatch ? fileIdMatch[1] : null

      if (fileId) {
        // 2. Call delete-from-drive Edge Function
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-from-drive`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.warn('Failed to delete from Drive:', error)
          // We continue to delete from DB even if Drive delete fails (it might be already gone)
        }
      }

      // 3. Soft delete from Supabase
      const { error } = await supabase
        .from('attachments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', attachmentId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [variables.entityType + 's'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] }) // Most common case
      toast.success('Attachment removed from record and Google Drive')
    },
    onError: (error: Error) => {
      toast.error('Failed to remove attachment', error.message)
    },
  })
}
