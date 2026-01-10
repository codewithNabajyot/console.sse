import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useInvoiceById, useCreateInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects } from '@/hooks/useProjects'
import { useCustomers } from '@/hooks/useCustomers'
import { useMasterConfigsByType } from '@/hooks/useMasterConfigs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { InvoiceInput, Attachment } from '@/lib/types'
import { FileUpload } from '@/components/FileUpload'
import { useState } from 'react'
import { ExternalLink, FileText, Trash2 } from 'lucide-react'
import { useDeleteAttachment } from '@/hooks/useAttachments'

type FormData = {
  project_id: string
  customer_id: string
  date: string
  invoice_number: string
  total_amount: number
  gst_percentage: number
}

export default function InvoiceForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const { data: invoice, isLoading: isInvoiceLoading } = useInvoiceById(id)
  const { data: projects, isLoading: isProjectsLoading } = useProjects(false, false)
  const { data: customers, isLoading: isCustomersLoading } = useCustomers()
  
  const { profile } = useAuth()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  
  const [generatedId] = useState(() => id || crypto.randomUUID())
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const deleteAttachment = useDeleteAttachment()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      project_id: '',
      customer_id: '',
      date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      total_amount: 0,
      gst_percentage: 5,
    },
  })

  const { data: initialsConfigs } = useMasterConfigsByType('COMPANY_INITIALS')
  const companyInitials = initialsConfigs?.[0]?.value || 'INV'
  const invoiceDate = watch('date')

  const getFinancialYear = (dateStr: string) => {
    if (!dateStr) return 'XXXX'
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    if (month < 4) {
      const start = (year - 1).toString().slice(-2)
      const end = year.toString().slice(-2)
      return `${start}${end}`
    } else {
      const start = year.toString().slice(-2)
      const end = (year + 1).toString().slice(-2)
      return `${start}${end}`
    }
  }

  const fy = getFinancialYear(invoiceDate)
  const prefix = `${companyInitials}/${fy}/`



  // Populate form when editing
  useEffect(() => {
    if (invoice) {
      let invNum = invoice.invoice_number
      // If the number starts with the current prefix, we might want to strip it for the input
      // However, it's safer to just show the input and let the user decide if they want to override
      // But since we are adding a visual prefix, it might be double.
      // Let's check if the invoice number already has the prefix format
      const prefixPattern = /^[A-Z]+\/\d{4}\//
      if (prefixPattern.test(invNum)) {
        invNum = invNum.replace(prefixPattern, '')
      }

      reset({
        project_id: invoice.project_id || '',
        customer_id: invoice.customer_id || '',
        date: invoice.date,
        invoice_number: invNum,
        total_amount: invoice.total_amount,
        gst_percentage: invoice.gst_percentage,
      })
      if (invoice.attachments) {
        setAttachments(invoice.attachments)
      }
    }
  }, [invoice, reset])

  const selectedProjectId = watch('project_id')

  // Auto-fill customer if project is selected
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects?.find(p => p.id === selectedProjectId)
      if (project?.customer_id) {
        setValue('customer_id', project.customer_id)
      }
    }
  }, [selectedProjectId, projects, setValue])

  const onSubmit = async (data: FormData) => {
    const totalAmount = Number(data.total_amount)
    const gstPct = Number(data.gst_percentage)
    
    // Calculate GST_AMOUNT and TAXABLE_VALUE
    // Formula: gst_amount = total_amount * (gst_percentage / (100 + gst_percentage))
    // taxable_value = total_amount - gst_amount
    const gstAmount = totalAmount * (gstPct / (100 + gstPct))
    const taxableValue = totalAmount - gstAmount

    // Prepend prefix if it's not already a full number
    let finalInvoiceNumber = data.invoice_number
    if (!/^[A-Z]+\/\d{4}\//.test(finalInvoiceNumber)) {
      finalInvoiceNumber = `${prefix}${finalInvoiceNumber}`
    }

    const input: InvoiceInput = {
      project_id: data.project_id || null,
      customer_id: data.customer_id || null,
      date: data.date,
      invoice_number: finalInvoiceNumber,
      total_amount: totalAmount,
      gst_percentage: gstPct,
      gst_amount: Number(gstAmount.toFixed(2)),
      taxable_value: Number(taxableValue.toFixed(2)),
    }

    try {
      if (isEditMode && id) {
        await updateInvoice.mutateAsync({ id, input })
      } else {
        // Use pre-generated ID for creation
        const { error } = await supabase
          .from('invoices')
          .insert([{ ...input, id: generatedId, org_id: profile?.org_id }])
        
        if (error) throw error
      }
      navigate(`/${orgSlug}/invoices`)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/invoices`)
  }

  const isLoading = isInvoiceLoading || isProjectsLoading || isCustomersLoading

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading invoice...</div>
      </div>
    )
  }

  const totalAmount = watch('total_amount')
  const gstPercentage = watch('gst_percentage')

  // Calculate tax values for display
  const calculateTaxValues = (total: number, gst: number) => {
    if (!total) return { taxableValue: 0, gstAmount: 0 }
    const gstAmount = total * (gst / (100 + gst))
    const taxableValue = total - gstAmount
    return {
      taxableValue: Number(taxableValue.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2))
    }
  }

  const { taxableValue, gstAmount } = calculateTaxValues(Number(totalAmount || 0), Number(gstPercentage || 0))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={isEditMode ? 'Edit Invoice' : 'Create Invoice'}
        description={isEditMode ? 'Update invoice information' : 'Create a new sales invoice'}
        startAdornment={
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection (Full Width) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_id">Project (Optional)</Label>
                <select
                  id="project_id"
                  {...register('project_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">No Project</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_id_code} - {project.customer?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_id">
                  Customer <span className="text-destructive">*</span>
                </Label>
                <select
                  id="customer_id"
                  {...register('customer_id', { required: 'Customer is required' })}
                  disabled={!!selectedProjectId}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Customer</option>
                  {customers?.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {errors.customer_id && (
                  <p className="text-sm text-destructive">{errors.customer_id.message}</p>
                )}
              </div>
            </div>

            {/* Date and Invoice Number (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_number">
                  Invoice Number <span className="text-destructive">*</span>
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm font-medium">
                    {prefix}
                  </span>
                  <Input
                    id="invoice_number"
                    {...register('invoice_number', { required: 'Invoice number is required' })}
                    placeholder="e.g. 001"
                    className="rounded-l-none"
                  />
                </div>
                {errors.invoice_number && (
                  <p className="text-sm text-destructive">{errors.invoice_number.message}</p>
                )}
              </div>
            </div>

            {/* Total Amount and GST % (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">
                  Total Amount (Incl. GST) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  {...register('total_amount', { 
                    required: 'Total amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  placeholder="0.00"
                />
                {errors.total_amount && (
                  <p className="text-sm text-destructive">{errors.total_amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_percentage">GST %</Label>
                <select
                  id="gst_percentage"
                  {...register('gst_percentage')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>

            {/* GST Amount and Taxable Value (Calculated Display) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label>GST Amount</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                  ₹{gstAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taxable Value</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                  ₹{taxableValue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Invoice Attachment (New) */}
            <div className="space-y-4 pt-4 border-t">
              <Label>Invoice Document (Google Drive)</Label>
              
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-background flex items-center justify-center border">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium truncate max-w-[200px]">{att.file_name}</p>
                          <p className="text-xs text-muted-foreground">Uploaded to Google Drive</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" /> View
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this attachment from Google Drive?')) {
                              deleteAttachment.mutate({
                                attachmentId: att.id,
                                fileUrl: att.file_url,
                                entityId: generatedId,
                                entityType: 'invoice'
                              })
                              setAttachments(prev => prev.filter(a => a.id !== att.id))
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {attachments.length === 0 && (
                <FileUpload 
                  entityType="invoice"
                  entityId={generatedId}
                  onUploadComplete={(att) => setAttachments(prev => [...prev, att])}
                  metadata={{
                    invoiceNumber: watch('invoice_number'),
                    customerName: customers?.find(c => c.id === watch('customer_id'))?.name,
                    projectCode: projects?.find(p => p.id === watch('project_id'))?.project_id_code
                  }}
                />
              )}
            </div>


            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInvoice.isPending || updateInvoice.isPending}
                className="w-full sm:w-auto"
              >
                {createInvoice.isPending || updateInvoice.isPending
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Invoice'
                  : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
