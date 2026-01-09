import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('org_id, organizations(google_drive_config)')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Profile not found')

    const orgConfig = profile.organizations.google_drive_config as { 
      folder_id?: string; 
      enabled?: boolean; 
      refresh_token?: string 
    }

    if (!orgConfig?.refresh_token) {
      throw new Error('Google Drive is not connected. Please connect it in Settings.')
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entity_type') as string
    const entityId = formData.get('entity_id') as string

    if (!file) throw new Error('No file uploaded')

    // 1. Fetch metadata for folder/file naming
    let projectCode = 'GENERAL'
    let customerName = 'UNKNOWN'
    let targetProjectId = ''

    if (entityType === 'invoice') {
      const { data: inv } = await supabaseClient
        .from('invoices')
        .select('project_id, projects(project_id_code, customers(name)), customers(name)')
        .eq('id', entityId)
        .single()
      
      if (inv) {
        targetProjectId = inv.project_id
        customerName = inv.projects?.customers?.name || inv.customers?.name || 'UNKNOWN'
        projectCode = inv.projects?.project_id_code || 'GENERAL'
      }
    } else if (entityType === 'expense') {
      const { data: exp } = await supabaseClient
        .from('expenses')
        .select('project_id, projects(project_id_code, customers(name))')
        .eq('id', entityId)
        .single()
      
      if (exp) {
        targetProjectId = exp.project_id
        customerName = exp.projects?.customers?.name || 'VENDOR'
        projectCode = exp.projects?.project_id_code || 'GENERAL'
      }
    } else if (entityType === 'project') {
      const { data: proj } = await supabaseClient
        .from('projects')
        .select('project_id_code, customers(name)')
        .eq('id', entityId)
        .single()
      
      if (proj) {
        targetProjectId = entityId
        customerName = proj.customers?.name || 'UNKNOWN'
        projectCode = proj.project_id_code || 'GENERAL'
      }
    }

    // Get Access Token from Refresh Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        refresh_token: orgConfig.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh Google token: ' + JSON.stringify(tokenData))
    }

    const accessToken = tokenData.access_token

    // 2. Manage Subfolder: "<project_id_code>_<CustomerName>"
    const folderName = `${projectCode}_${customerName}`.replace(/[/\\?%*:|"<>]/g, '-')
    const parentId = orgConfig.folder_id || 'root'
    let subfolderId = parentId

    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      )}&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const searchResult = await searchResponse.json()
    
    if (searchResult.files?.length > 0) {
      subfolderId = searchResult.files[0].id
    } else {
      // Create new folder
      const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId === 'root' ? [] : [parentId],
        }),
      })
      const newFolder = await createFolderResponse.json()
      subfolderId = newFolder.id
    }

    // 3. Custom File Naming: "INVOICE_<CustomerName>_<DateTime>.<ext>"
    const now = new Date().toISOString().replace(/[:.]/g, '-')
    const ext = file.name.split('.').pop()
    const finalFileName = entityType === 'invoice' 
      ? `INVOICE_${customerName}_${now}.${ext}`
      : file.name

    // Upload to Google Drive
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true'
    
    const metadata = {
      name: finalFileName,
      parents: subfolderId === 'root' ? [] : [subfolderId],
    }

    const boundary = 'foo_bar_baz'
    const bodyHeader = new TextEncoder().encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`
    )
    const footer = new TextEncoder().encode(`\r\n--${boundary}--`)
    const fileBuffer = new Uint8Array(await file.arrayBuffer())

    const multipartBody = new Uint8Array(bodyHeader.length + fileBuffer.length + footer.length)
    multipartBody.set(bodyHeader)
    multipartBody.set(fileBuffer, bodyHeader.length)
    multipartBody.set(footer, bodyHeader.length + fileBuffer.length)

    const driveResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    })

    const driveResult = await driveResponse.json()
    if (!driveResponse.ok) {
        throw new Error(`Google Drive API Error: ${JSON.stringify(driveResult)}`)
    }

    const fileUrl = `https://drive.google.com/file/d/${driveResult.id}/view`

    // Create attachment record
    const { data: attachment, error: attachError } = await supabaseClient
      .from('attachments')
      .insert({
        org_id: profile.org_id,
        entity_type: entityType,
        entity_id: entityId,
        file_name: finalFileName,
        file_url: fileUrl,
        file_type: file.type,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (attachError) throw attachError

    return new Response(JSON.stringify(attachment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('Function error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
