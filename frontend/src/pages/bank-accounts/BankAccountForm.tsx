import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useBankAccount, useCreateBankAccount, useUpdateBankAccount } from '@/hooks/useBankAccounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { BankAccountInput } from '@/lib/types'

type FormData = {
  account_name: string
  bank_name: string
  account_number: string
}

export default function BankAccountForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const { data: bankAccount, isLoading } = useBankAccount(id)
  const createBankAccount = useCreateBankAccount()
  const updateBankAccount = useUpdateBankAccount()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      account_name: '',
      bank_name: '',
      account_number: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (bankAccount) {
      reset({
        account_name: bankAccount.account_name,
        bank_name: bankAccount.bank_name || '',
        account_number: bankAccount.account_number || '',
      })
    }
  }, [bankAccount, reset])

  const onSubmit = async (data: FormData) => {
    const input: BankAccountInput = {
      account_name: data.account_name,
      bank_name: data.bank_name || null,
      account_number: data.account_number || null,
    }

    try {
      if (isEditMode && id) {
        await updateBankAccount.mutateAsync({ id, input })
      } else {
        await createBankAccount.mutateAsync(input)
      }
      navigate(`/${orgSlug}/bank-accounts`)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/bank-accounts`)
  }

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading bank account...</div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Bank Account' : 'New Bank Account'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update bank account information' : 'Add a new bank account to track'}
          </p>
        </div>
      </div>

      {/* Current Balance Display (Edit Mode Only) */}
      {isEditMode && bankAccount && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(bankAccount.current_balance)}
                </p>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                <p>Balance is automatically calculated</p>
                <p>from income and expense transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="account_name">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account_name"
                {...register('account_name', { required: 'Account name is required' })}
                placeholder="e.g., Main Business Account, Savings"
              />
              {errors.account_name && (
                <p className="text-sm text-destructive">{errors.account_name.message}</p>
              )}
            </div>

            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                {...register('bank_name')}
                placeholder="e.g., HDFC Bank, State Bank of India"
              />
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                {...register('account_number')}
                placeholder="Enter account number"
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
                disabled={createBankAccount.isPending || updateBankAccount.isPending}
                className="w-full sm:w-auto"
              >
                {createBankAccount.isPending || updateBankAccount.isPending
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Bank Account'
                  : 'Create Bank Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
