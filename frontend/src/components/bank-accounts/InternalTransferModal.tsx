import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useCreateBankTransfer } from '@/hooks/useBankTransfers'
import type { BankTransferInput } from '@/lib/types'

interface InternalTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

type FormData = {
  from_account_id: string
  to_account_id: string
  amount: number
  date: string
  notes: string
}

export function InternalTransferModal({ isOpen, onClose }: InternalTransferModalProps) {
  const { data: bankAccounts } = useBankAccounts()
  const createTransfer = useCreateBankTransfer()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      from_account_id: '',
      to_account_id: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  const selectedFromAccount = watch('from_account_id')
  const selectedToAccount = watch('to_account_id')

  const onSubmit = async (data: FormData) => {
    const input: BankTransferInput = {
      from_account_id: data.from_account_id,
      to_account_id: data.to_account_id,
      amount: Number(data.amount),
      date: data.date,
      notes: data.notes || null,
    }

    try {
      await createTransfer.mutateAsync(input)
      reset()
      onClose()
    } catch (error) {
      console.error('Transfer error:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Internal Money Transfer</DialogTitle>
          <DialogDescription>
            Move money between your bank accounts. This will not affect your profit and loss.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            {/* From Account */}
            <div className="space-y-2">
              <Label htmlFor="from_account_id">From Account</Label>
              <select
                id="from_account_id"
                {...register('from_account_id', { required: 'Source account is required' })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select source account</option>
                {bankAccounts?.map((acc) => (
                  <option 
                    key={acc.id} 
                    value={acc.id}
                    disabled={acc.id === selectedToAccount}
                  >
                    {acc.account_name} (₹{acc.current_balance?.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
              {errors.from_account_id && (
                <p className="text-sm text-destructive">{errors.from_account_id.message}</p>
              )}
            </div>

            {/* To Account */}
            <div className="space-y-2">
              <Label htmlFor="to_account_id">To Account</Label>
              <select
                id="to_account_id"
                {...register('to_account_id', { required: 'Destination account is required' })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select destination account</option>
                {bankAccounts?.map((acc) => (
                  <option 
                    key={acc.id} 
                    value={acc.id}
                    disabled={acc.id === selectedFromAccount}
                  >
                    {acc.account_name} (₹{acc.current_balance?.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
              {errors.to_account_id && (
                <p className="text-sm text-destructive">{errors.to_account_id.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than zero' }
                })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Transfer Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date', { required: 'Date is required' })}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                {...register('notes')}
                placeholder="e.g., Transfer for payroll, Cash deposit"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransfer.isPending}>
              {createTransfer.isPending ? 'Transferring...' : 'Transfer Money'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
