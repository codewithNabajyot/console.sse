import { useState, useRef } from 'react'
import { Upload, FileUp, X, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  entityType: 'invoice' | 'expense' | 'project'
  entityId?: string
  onUploadComplete?: (attachment: any) => void
  label?: string
  className?: string
  // Optional metadata for better file naming (used when entity doesn't exist in DB yet)
  metadata?: {
    invoiceNumber?: string
    customerName?: string
    projectCode?: string
  }
}

export function FileUpload({ entityType, entityId, onUploadComplete, label, className, metadata }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filename, setFilename] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', 'Maximum size is 10MB')
      return
    }

    setFilename(file.name)
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity_type', entityType)
      if (entityId) formData.append('entity_id', entityId)
      
      // Pass metadata if provided
      if (metadata?.invoiceNumber) formData.append('invoice_number', metadata.invoiceNumber)
      if (metadata?.customerName) formData.append('customer_name', metadata.customerName)
      if (metadata?.projectCode) formData.append('project_code', metadata.projectCode)

      const { data, error } = await supabase.functions.invoke('upload-to-drive', {
        body: formData,
      })

      if (error) throw error

      setUploadProgress(100)
      toast.success('File uploaded successfully')
      
      if (onUploadComplete) {
        onUploadComplete(data)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Upload failed', error.message || 'Check if Google Drive integration is configured in Settings.')
      setFilename(null)
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setFilename(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      
      {!filename ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/25"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Click to upload invoice document</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG up to 10MB</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden" 
            accept=".pdf,.png,.jpg,.jpeg"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 border rounded-xl bg-muted/30">
          <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0 border">
            <FileUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{filename}</p>
            {isUploading ? (
              <div className="w-full bg-background rounded-full h-1 mt-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </p>
            )}
          </div>
          {!isUploading && (
            <Button variant="ghost" size="icon" onClick={clearFile} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          )}
          {isUploading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          )}
        </div>
      )}
    </div>
  )
}
