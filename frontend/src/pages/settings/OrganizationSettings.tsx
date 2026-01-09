import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Settings, ExternalLink, Library, UploadCloud } from 'lucide-react'
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from '@/hooks/use-toast'

type FormData = {
  folder_id: string
  enabled: boolean
}

export default function OrganizationSettings() {
  const { orgSlug } = useParams()
  const { data: org, isLoading } = useOrganization()
  const updateOrg = useUpdateOrganization()

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      folder_id: '',
      enabled: false,
    },
  })

  useEffect(() => {
    if (org) {
      reset({
        folder_id: org.google_drive_config?.folder_id || '',
        enabled: org.google_drive_config?.enabled || false,
      })
    }
  }, [org, reset])

  const onSubmit = async (data: FormData) => {
    await updateOrg.mutateAsync({
      google_drive_config: {
        ...org?.google_drive_config,
        folder_id: data.folder_id,
        enabled: data.enabled,
      },
    })
  }

    const handleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    
    // Construct redirect URI dynamically without hardcoding project refs
    // Handles trailing slashes in VITE_SUPABASE_URL gracefully
    const baseUrl = supabaseUrl?.replace(/\/$/, '')
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI || `${baseUrl}/functions/v1/google-callback`
    
    if (!clientId) {
      toast.error('Google Client ID is not configured. Add VITE_GOOGLE_CLIENT_ID to .env')
      return
    }

    if (!baseUrl && !import.meta.env.VITE_OAUTH_REDIRECT_URI) {
      toast.error('Supabase URL is not configured. Add VITE_SUPABASE_URL to .env')
      return
    }

    const state = JSON.stringify({
      org_id: org?.id,
      return_url: window.location.href
    })

    const scope = 'https://www.googleapis.com/auth/drive.file'
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`
    
    window.location.href = authUrl
  }

  const handleDisconnect = async () => {
    await updateOrg.mutateAsync({
      google_drive_config: {
        ...org?.google_drive_config,
        refresh_token: undefined,
        enabled: false
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground animate-pulse">Loading settings...</div>
      </div>
    )
  }

  const isConnected = !!org?.google_drive_config?.refresh_token

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings {orgSlug && `- ${orgSlug}`}</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization's configuration and integrations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <UploadCloud className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Google Drive Integration</CardTitle>
                  <CardDescription>Store your invoice and expense attachments in your own Google Drive</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isConnected ? (
                <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <p className="font-medium text-green-700">Google Drive Connected</p>
                      <p className="text-xs text-green-600/80">
                        {org?.google_drive_config?.connected_email 
                          ? `Linked to ${org.google_drive_config.connected_email}`
                          : 'Files will be uploaded to your Drive'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-blue-500/10 rounded-full">
                    <UploadCloud className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Connect your Google Drive</h3>
                    <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                      Link your account to store files in your Drive. We only access files created by this app.
                    </p>
                  </div>
                  <Button onClick={handleConnect} className="w-full sm:w-auto">
                    Connect Now
                  </Button>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="folder_id">Target Folder ID (Optional)</Label>
                  <Input
                    id="folder_id"
                    {...register('folder_id')}
                    placeholder="Leave empty to use root folder"
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, all files will be stored inside this specific folder. You can find the ID in the URL of your folder.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    {...register('enabled')}
                    disabled={!isConnected}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <Label htmlFor="enabled" className={`text-sm font-medium ${!isConnected ? 'opacity-50' : ''}`}>
                    Enable Uploads
                  </Label>
                </div>

                <Button type="submit" disabled={updateOrg.isPending || !isConnected} className="w-full sm:w-auto">
                  {updateOrg.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription className="space-y-3 mt-2 text-sm">
              <p>
                By connecting your real Google account, you bypass storage quotas and keep full control of your documents.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>No complicated service account sharing is required.</li>
                <li>Files are stored directly in your personal or company Drive.</li>
                <li>You can easily find and manage these files using the Google Drive app.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Integration Help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Library className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Why use Google Drive?</p>
                  <p className="text-muted-foreground mt-1">Storing files in Drive allows you to keep documents organized outside the application while maintaining a link within your records.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-2">
                <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Secure Access</p>
                  <p className="text-muted-foreground mt-1">The application only has access to files you specifically upload or folders you share with it.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
