import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useCreateIncome, useUpdateIncome } from '@/hooks/useIncome'
import { useMasterConfigsByType } from '@/hooks/useMasterConfigs'
import type { Income, IncomeInput, Invoice } from '@/lib/types'

interface RecordCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  incomeToEdit?: Income | null
  initialInvoice?: Invoice | null
}

export function RecordCollectionModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  incomeToEdit, 
  initialInvoice 
}: RecordCollectionModalProps) {
  const { data: bankAccounts } = useBankAccounts()
  const { data: paymentModes } = useMasterConfigsByType('PAYMENT_MODE')
  const { data: categories } = useMasterConfigsByType('INCOME_CATEGORY')
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome()

  const [formData, setFormData] = useState<Partial<IncomeInput>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    bank_account_id: '',
    payment_mode: 'Bank Transfer',
    category: 'Sales Receipt',
    notes: []
  })
  
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (incomeToEdit) {
      setFormData({
        date: incomeToEdit.date,
        amount: incomeToEdit.amount,
        bank_account_id: incomeToEdit.bank_account_id || '',
        payment_mode: incomeToEdit.payment_mode || 'Bank Transfer',
        category: incomeToEdit.category || 'Sales Receipt',
        notes: incomeToEdit.notes || []
      })
      setDescription('')
    } else if (initialInvoice) {
      const collected = initialInvoice.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
      const pending = Math.max(0, initialInvoice.total_amount - collected)

      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: pending,
        bank_account_id: '',
        payment_mode: 'Bank Transfer',
        category: 'Sales Receipt',
        notes: []
      })
      setDescription(`Collection for Invoice #${initialInvoice.invoice_number}`)
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        bank_account_id: '',
        payment_mode: 'Bank Transfer',
        category: 'Sales Receipt',
        notes: []
      })
      setDescription('')
    }
  }, [incomeToEdit, initialInvoice, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.bank_account_id || !formData.amount) {
      return
    }

  try {
      const notes = [...(formData.notes || [])]
      if (description) {
        notes.push({ 
          content: description, 
          user_id: 'system', 
          user_name: 'System', 
          created_at: new Date().toISOString() 
        })
      }

      const inputData = {
        ...formData,
        amount: Number(formData.amount),
        notes,
        invoice_id: initialInvoice?.id || incomeToEdit?.invoice_id || null,
        project_id: initialInvoice?.project_id || incomeToEdit?.project_id || null,
        customer_id: initialInvoice?.customer_id || incomeToEdit?.customer_id || null,
        received_from: initialInvoice?.customer?.name || incomeToEdit?.received_from || 'Customer'
      } as IncomeInput

      if (incomeToEdit) {
        await updateIncome.mutateAsync({ id: incomeToEdit.id, input: inputData })
      } else {
        await createIncome.mutateAsync(inputData)
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to save collection', error)
    }
  }

  const isSaving = createIncome.isPending || updateIncome.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{incomeToEdit ? 'Edit Collection' : 'Record Collection'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount Collected</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mode">Payment Mode</Label>
              <select
                id="mode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={formData.payment_mode || 'Bank Transfer'}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
              >
                <option value="">Select Mode</option>
                {paymentModes?.map(mode => (
                  <option key={mode.id} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={formData.category || 'Sales Receipt'}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select Category</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Deposit To</Label>
            <select
              id="bank"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
              value={formData.bank_account_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_account_id: e.target.value }))}
            >
              <option value="">Select Bank Account</option>
              {bankAccounts?.map(b => (
                <option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>
              ))}
            </select>
          </div>

          {initialInvoice && (
            <div className="p-3 bg-muted/30 rounded-lg border border-muted-foreground/10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 text-[10px]">Linking to Invoice</p>
              <div className="flex justify-between items-center capitalize">
                <span className="text-sm font-mono font-bold text-primary">{initialInvoice.invoice_number}</span>
                <span className="text-xs font-semibold">Total: ₹{initialInvoice.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Received via cheque..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Recording...' : (incomeToEdit ? 'Update Collection' : 'Record Collection')}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
