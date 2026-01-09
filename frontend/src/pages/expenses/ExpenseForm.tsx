import { useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
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
  const location = useLocation()
  const isEditMode = !!id

  // Get category from query param if available
  const queryParams = new URLSearchParams(location.search)
  const preSelectedCategory = queryParams.get('category')

  const { data: expense, isLoading: isExpenseLoading } = useExpenseById(id)
  const { data: projects, isLoading: isProjectsLoading } = useProjects(false, false)
  const { data: vendors, isLoading: isVendorsLoading } = useVendors()
  const { data: bankAccounts, isLoading: isBanksLoading } = useBankAccounts()
  
  // Load both category types
  const { data: projectCategories } = useMasterConfigsByType('PROJECT_EXPENSE_CATEGORY')
  const { data: commonCategories } = useMasterConfigsByType('COMMON_EXPENSE_CATEGORY')
  
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<FormData>({
    defaultValues: {
      project_id: '',
      vendor_id: '',
      bank_account_id: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: preSelectedCategory || '',
      total_paid: 0,
      gst_percentage: 0,
      vendor_invoice_number: '',
    },
  })

  // Set category if it comes from query params (e.g. from GST Summary)
  useEffect(() => {
    if (preSelectedCategory) {
      setValue('category', preSelectedCategory)
      setValue('gst_percentage', 0)
    }
  }, [preSelectedCategory, setValue])

  const selectedCategory = watch('category')

  // Auto-set GST to 0 if category is for tax payment
  useEffect(() => {
    if (selectedCategory === 'STATUTORY_GST_PAYMENT') {
      setValue('gst_percentage', 0)
    }
  }, [selectedCategory, setValue])

  const selectedProjectId = watch('project_id')
  const categories = selectedProjectId ? projectCategories : commonCategories

  // Populate form when editing
  useEffect(() => {
    if (expense) {
      reset({
        project_id: expense.project_id || '',
        vendor_id: expense.vendor_id || '',
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
      project_id: data.project_id || null,
      vendor_id: data.vendor_id || null,
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
              <select
                id="project_id"
                {...register('project_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Common / Non-Project Expense</option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_id_code} - {project.customer?.name}
                  </option>
                ))}
              </select>
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
                  disabled={selectedCategory === 'STATUTORY_GST_PAYMENT'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
                {selectedCategory === 'STATUTORY_GST_PAYMENT' && (
                  <p className="text-[10px] text-primary font-bold mt-1">Forced to 0% for tax payments</p>
                )}
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
                <select
                  id="vendor_id"
                  {...register('vendor_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Vendor</option>
                  {vendors?.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
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
                  Paid From
                </Label>
                <select
                  id="bank_account_id"
                  {...register('bank_account_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Bank Account (Leave empty if Unpaid)</option>
                  {bankAccounts?.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.account_name} ({bank.bank_name})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Select for direct payment. Leave empty for credit/unpaid bill.
                </p>
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
