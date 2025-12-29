import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useIncomeById, useCreateIncome, useUpdateIncome } from '@/hooks/useIncome'
import { useProjects } from '@/hooks/useProjects'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useMasterConfigsByType } from '@/hooks/useMasterConfigs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { IncomeInput } from '@/lib/types'

type FormData = {
  project_id: string
  bank_account_id: string
  date: string
  received_from: string
  category: string
  payment_mode: string
  amount: number
}

export default function IncomeForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const { data: income, isLoading: isIncomeLoading } = useIncomeById(id)
  const { data: projects, isLoading: isProjectsLoading } = useProjects()
  const { data: bankAccounts, isLoading: isBanksLoading } = useBankAccounts()
  const { data: categories, isLoading: isCategoriesLoading } = useMasterConfigsByType('INCOME_CATEGORY')
  const { data: paymentModes, isLoading: isModesLoading } = useMasterConfigsByType('PAYMENT_MODE')
  
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      project_id: '',
      bank_account_id: '',
      date: new Date().toISOString().split('T')[0],
      received_from: '',
      category: '',
      payment_mode: '',
      amount: 0,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (income) {
      reset({
        project_id: income.project_id || '',
        bank_account_id: income.bank_account_id || '',
        date: income.date,
        received_from: income.received_from || '',
        category: income.category || '',
        payment_mode: income.payment_mode || '',
        amount: income.amount,
      })
    }
  }, [income, reset])

  const onSubmit = async (data: FormData) => {
    const input: IncomeInput = {
      project_id: data.project_id || null,
      bank_account_id: data.bank_account_id || null,
      date: data.date,
      received_from: data.received_from || null,
      category: data.category || null,
      payment_mode: data.payment_mode || null,
      amount: Number(data.amount),
    }

    try {
      if (isEditMode && id) {
        await updateIncome.mutateAsync({ id, input })
      } else {
        await createIncome.mutateAsync(input)
      }
      navigate(`/${orgSlug}/income`)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/income`)
  }

  const isLoading = isIncomeLoading || isProjectsLoading || isBanksLoading || isCategoriesLoading || isModesLoading

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading income record...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Income' : 'Record Income'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update income information' : 'Record a new incoming payment'}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project_id">Project (Optional)</Label>
              <select
                id="project_id"
                {...register('project_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Common / No Project</option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_id_code} - {project.customer?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
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

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register('amount', { 
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank Account */}
              <div className="space-y-2">
                <Label htmlFor="bank_account_id">
                  Bank Account <span className="text-destructive">*</span>
                </Label>
                <select
                  id="bank_account_id"
                  {...register('bank_account_id', { required: 'Bank account is required' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts?.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.account_name} ({bank.bank_name})
                    </option>
                  ))}
                </select>
                {errors.bank_account_id && (
                  <p className="text-sm text-destructive">{errors.bank_account_id.message}</p>
                )}
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode</Label>
                <select
                  id="payment_mode"
                  {...register('payment_mode')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Payment Mode</option>
                  {paymentModes?.map((mode) => (
                    <option key={mode.id} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Received From */}
            <div className="space-y-2">
              <Label htmlFor="received_from">Received From</Label>
              <Input
                id="received_from"
                {...register('received_from')}
                placeholder="Name of the person or entity"
              />
            </div>

            {/* Category */}
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
                disabled={createIncome.isPending || updateIncome.isPending}
                className="w-full sm:w-auto"
              >
                {createIncome.isPending || updateIncome.isPending
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Income'
                  : 'Record Income'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
