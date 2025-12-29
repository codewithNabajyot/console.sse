import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useExpenseById, useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { useProjects } from '@/hooks/useProjects'
import { useVendors } from '@/hooks/useVendors'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useMasterConfigsByType } from '@/hooks/useMasterConfigs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { SelectWithRefresh } from '@/components/SelectWithRefresh'
import type { ExpenseInput } from '@/lib/types'

type FormData = {
  project_id: string
  vendor_id: string
  bank_account_id: string
  date: string
  description: string
  category: string
  total_paid: number
  gst_percentage: number
  vendor_invoice_number: string
}

export default function ExpenseForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const { data: expense, isLoading: isExpenseLoading } = useExpenseById(id)
  const { data: projects, isLoading: isProjectsLoading, refetch: refetchProjects } = useProjects()
  const { data: vendors, isLoading: isVendorsLoading, refetch: refetchVendors } = useVendors()
  const { data: bankAccounts, isLoading: isBanksLoading, refetch: refetchBankAccounts } = useBankAccounts()

  const [isRefreshingProjects, setIsRefreshingProjects] = useState(false)
  const [isRefreshingVendors, setIsRefreshingVendors] = useState(false)
  const [isRefreshingBanks, setIsRefreshingBanks] = useState(false)
  
  // Load both category types
  const { data: projectCategories } = useMasterConfigsByType('PROJECT_EXPENSE_CATEGORY')
  const { data: commonCategories } = useMasterConfigsByType('COMMON_EXPENSE_CATEGORY')
  
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      project_id: '',
      vendor_id: '',
      bank_account_id: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: '',
      total_paid: 0,
      gst_percentage: 0,
      vendor_invoice_number: '',
    },
  })

  const selectedProjectId = watch('project_id')
  const categories = selectedProjectId ? projectCategories : commonCategories

  const handleRefreshProjects = async () => {
    setIsRefreshingProjects(true)
    await refetchProjects()
    setIsRefreshingProjects(false)
  }

  const handleRefreshVendors = async () => {
    setIsRefreshingVendors(true)
    await refetchVendors()
    setIsRefreshingVendors(false)
  }

  const handleRefreshBanks = async () => {
    setIsRefreshingBanks(true)
    await refetchBankAccounts()
    setIsRefreshingBanks(false)
  }

  // Populate form when editing
  useEffect(() => {
    if (expense) {
      reset({
        project_id: expense.project_id || '__none__',
        vendor_id: expense.vendor_id || '__none__',
        bank_account_id: expense.bank_account_id || '',
        date: expense.date,
        description: expense.description || '',
        category: expense.category || '',
        total_paid: expense.total_paid,
        gst_percentage: expense.gst_percentage,
        vendor_invoice_number: expense.vendor_invoice_number || '',
      })
    }
  }, [expense, reset])

  const onSubmit = async (data: FormData) => {
    const totalPaid = Number(data.total_paid)
    const gstPct = Number(data.gst_percentage)
    
    // Calculate TAXABLE_VALUE and GST_AMOUNT
    // Formula: Total = Taxable * (1 + GST/100) => Taxable = Total / (1 + GST/100)
    const taxableValue = totalPaid / (1 + gstPct / 100)
    const gstAmount = totalPaid - taxableValue

    const input: ExpenseInput = {
      project_id: (data.project_id === '__none__' || !data.project_id) ? null : data.project_id,
      vendor_id: (data.vendor_id === '__none__' || !data.vendor_id) ? null : data.vendor_id,
      bank_account_id: data.bank_account_id || null,
      date: data.date,
      description: data.description || null,
      category: data.category || null,
      total_paid: totalPaid,
      gst_percentage: gstPct,
      gst_amount: Number(gstAmount.toFixed(2)),
      taxable_value: Number(taxableValue.toFixed(2)),
      vendor_invoice_number: data.vendor_invoice_number || null,
    }

    try {
      if (isEditMode && id) {
        await updateExpense.mutateAsync({ id, input })
      } else {
        await createExpense.mutateAsync(input)
      }
      navigate(`/${orgSlug}/expenses`)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/expenses`)
  }

  const isLoading = isExpenseLoading || isProjectsLoading || isVendorsLoading || isBanksLoading

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading expense record...</div>
      </div>
    )
  }

  const totalPaid = watch('total_paid')
  const gstPercentage = watch('gst_percentage')

  // Calculate generic tax values for display
  const calculateTaxValues = (total: number, gst: number) => {
    if (!total) return { taxable: 0, gstAmount: 0 }
    const taxable = total / (1 + gst / 100)
    const gstAmount = total - taxable
    return {
      taxable: Number(taxable.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2))
    }
  }

  const { taxable, gstAmount } = calculateTaxValues(Number(totalPaid || 0), Number(gstPercentage || 0))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Expense' : 'Record Expense'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update expense information' : 'Record a new outgoing payment'}
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
                      { value: '__none__', label: 'Common / Non-Project Expense' },
                      ...(projects?.map(p => ({ 
                        value: p.id, 
                        label: `${p.project_id_code} - ${p.customer?.name}` 
                      })) || [])
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

            {/* Date and Category (2 Columns) */}
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
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  {...register('category')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Category</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {selectedProjectId 
                    ? "Showing project categories" 
                    : "Showing common categories"}
                </p>
              </div>
            </div>

            {/* Total Paid and GST % (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_paid">
                  Total Paid (Incl. GST) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="total_paid"
                  type="number"
                  step="0.01"
                  {...register('total_paid', { 
                    required: 'Total paid is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  placeholder="0.00"
                />
                {errors.total_paid && (
                  <p className="text-sm text-destructive">{errors.total_paid.message}</p>
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

            {/* GST Amount and Taxable Amount (Calculated Display) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label>GST Amount</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                  ₹{gstAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taxable Amount</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
                  ₹{taxable.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Vendor and Vendor Invoice # (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_id">Vendor</Label>
                <Controller
                  name="vendor_id"
                  control={control}
                  render={({ field }) => (
                    <SelectWithRefresh
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: '__none__', label: 'No Vendor' },
                        ...(vendors?.map(v => ({ value: v.id, label: v.name })) || [])
                      ]}
                      placeholder="Select Vendor"
                      disabled={isVendorsLoading}
                      isRefreshing={isRefreshingVendors}
                      onRefresh={handleRefreshVendors}
                      quickAddType="vendor"
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_invoice_number">Vendor Invoice #</Label>
                <Input
                  id="vendor_invoice_number"
                  {...register('vendor_invoice_number')}
                  placeholder="Invoice number"
                />
              </div>
            </div>

            {/* Paid From (Bank Account) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_account_id">
                  Paid From <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="bank_account_id"
                  control={control}
                  rules={{ required: 'Bank account is required' }}
                  render={({ field }) => (
                    <SelectWithRefresh
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        ...(bankAccounts?.map(b => ({ 
                          value: b.id, 
                          label: `${b.account_name}${b.bank_name ? ` (${b.bank_name})` : ''}` 
                        })) || [])
                      ]}
                      placeholder="Select Bank Account"
                      disabled={isBanksLoading}
                      isRefreshing={isRefreshingBanks}
                      onRefresh={handleRefreshBanks}
                      quickAddType="bank_account"
                    />
                  )}
                />
                {errors.bank_account_id && (
                  <p className="text-sm text-destructive">{errors.bank_account_id.message}</p>
                )}
              </div>
              {/* Spacer/Placeholder for potential Payment Mode */}
              <div className="hidden sm:block"></div>
            </div>

            {/* Description (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Details about the expense..."
                rows={3}
              />
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
                disabled={createExpense.isPending || updateExpense.isPending}
                className="w-full sm:w-auto"
              >
                {createExpense.isPending || updateExpense.isPending
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Expense'
                  : 'Record Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
