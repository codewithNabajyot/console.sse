import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useInvoiceById, useCreateInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { useProjects } from '@/hooks/useProjects'
import { SelectWithRefresh } from '@/components/SelectWithRefresh'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { InvoiceInput } from '@/lib/types'

type FormData = {
  project_id: string
  date: string
  invoice_number: string
  total_amount: number
  gst_percentage: number
  invoice_link: string
}

export default function InvoiceForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const { data: invoice, isLoading: isInvoiceLoading } = useInvoiceById(id)
  const { data: projects, isLoading: isProjectsLoading, refetch: refetchProjects } = useProjects()
  const [isRefreshingProjects, setIsRefreshingProjects] = useState(false)
  
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<FormData>({
    defaultValues: {
      project_id: '',
      date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      total_amount: 0,
      gst_percentage: 5,
      invoice_link: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (invoice) {
      reset({
        project_id: invoice.project_id || '__none__',
        date: invoice.date,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        gst_percentage: invoice.gst_percentage,
        invoice_link: invoice.invoice_link || '',
      })
    }
  }, [invoice, reset])

  const onSubmit = async (data: FormData) => {
    const totalAmount = Number(data.total_amount)
    const gstPct = Number(data.gst_percentage)
    
    // Calculate GST_AMOUNT and TAXABLE_VALUE
    // Formula: gst_amount = total_amount * (gst_percentage / (100 + gst_percentage))
    // taxable_value = total_amount - gst_amount
    const gstAmount = totalAmount * (gstPct / (100 + gstPct))
    const taxableValue = totalAmount - gstAmount

    const input: InvoiceInput = {
      project_id: (data.project_id === '__none__' || !data.project_id) ? null : data.project_id,
      date: data.date,
      invoice_number: data.invoice_number,
      total_amount: totalAmount,
      gst_percentage: gstPct,
      gst_amount: Number(gstAmount.toFixed(2)),
      taxable_value: Number(taxableValue.toFixed(2)),
      invoice_link: data.invoice_link || null,
    }

    try {
      if (isEditMode && id) {
        await updateInvoice.mutateAsync({ id, input })
      } else {
        await createInvoice.mutateAsync(input)
      }
      navigate(`/${orgSlug}/invoices`)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleRefreshProjects = async () => {
    setIsRefreshingProjects(true)
    await refetchProjects()
    setIsRefreshingProjects(false)
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/invoices`)
  }

  const isLoading = isInvoiceLoading || isProjectsLoading

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update invoice information' : 'Create a new sales invoice'}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Controller
                name="project_id"
                control={control}
                render={({ field }) => (
                  <SelectWithRefresh
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: '__none__', label: 'No Project' },
                      ...(projects?.map((project) => ({
                        value: project.id,
                        label: `${project.project_id_code} - ${project.customer?.name}`,
                      })) || []),
                    ]}
                    placeholder="Select Project"
                    disabled={isProjectsLoading}
                    isRefreshing={isRefreshingProjects}
                    onRefresh={handleRefreshProjects}
                    quickAddType="project"
                  />
                )}
              />
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
                <Input
                  id="invoice_number"
                  {...register('invoice_number', { required: 'Invoice number is required' })}
                  placeholder="INV-001"
                />
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

            {/* Invoice Link (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="invoice_link">Invoice Link (Optional)</Label>
              <Input
                id="invoice_link"
                type="url"
                {...register('invoice_link')}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Link to invoice document (e.g., Google Drive, Dropbox)
              </p>
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
