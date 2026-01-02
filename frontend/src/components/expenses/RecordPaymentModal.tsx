import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useVendors } from '@/hooks/useVendors'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useProjects } from '@/hooks/useProjects'
import { useCreateExpensePayment, useUpdateExpensePayment } from '@/hooks/useExpensePayments'
import { useMasterConfigsByType } from '@/hooks/useMasterConfigs'
import type { ExpensePayment, ExpensePaymentInput } from '@/lib/types'

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  paymentToEdit?: ExpensePayment | null // Optional: Pass payment for editing
  initialBill?: {
    id: string
    expense_number?: string
    vendor_id: string
    project_id?: string | null
    amount: number
  } | null
}

export function RecordPaymentModal({ isOpen, onClose, onSuccess, paymentToEdit, initialBill }: RecordPaymentModalProps) {
  const { data: vendors } = useVendors()
  const { data: bankAccounts } = useBankAccounts()
  const { data: projects } = useProjects()
  const { data: paymentModes } = useMasterConfigsByType('PAYMENT_MODE')
  const createPayment = useCreateExpensePayment()
  const updatePayment = useUpdateExpensePayment()

  const [formData, setFormData] = useState<Partial<ExpensePaymentInput>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    vendor_id: '',
    bank_account_id: '',
    project_id: '', 
    payment_mode: 'Bank Transfer',
    notes: []
  })
  
  const [description, setDescription] = useState('')

  // Populate form when editing OR pre-filling from a bill
  useEffect(() => {
     if (paymentToEdit) {
        setFormData({
           date: paymentToEdit.date,
           amount: paymentToEdit.amount,
           vendor_id: paymentToEdit.vendor_id || '',
           bank_account_id: paymentToEdit.bank_account_id || '',
           project_id: paymentToEdit.project_id || '',
           payment_mode: paymentToEdit.payment_mode || 'Bank Transfer',
           notes: paymentToEdit.notes || []
        })
        setDescription('')
     } else if (initialBill) {
        setFormData({
           date: new Date().toISOString().split('T')[0],
           amount: initialBill.amount,
           vendor_id: initialBill.vendor_id,
           bank_account_id: '',
           project_id: initialBill.project_id || '',
           payment_mode: 'Bank Transfer',
           notes: []
        })
        setDescription(`Payment for Bill #${initialBill.expense_number || initialBill.id}`)
     } else {
        // Reset
        setFormData({
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            vendor_id: '',
            bank_account_id: '',
            project_id: '', 
            payment_mode: 'Bank Transfer',
            notes: []
        })
        setDescription('')
     }
  }, [paymentToEdit, initialBill, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.vendor_id || !formData.bank_account_id || !formData.amount) {
      return // Basic validation
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
          project_id: formData.project_id || null, // Handle empty string
          amount: Number(formData.amount),
          notes
      } as ExpensePaymentInput

      if (paymentToEdit) {
         await updatePayment.mutateAsync({ id: paymentToEdit.id, input: inputData })
      } else {
         const allocations = initialBill ? [{
            expense_id: initialBill.id,
            amount: inputData.amount
         }] : []

         await createPayment.mutateAsync({
             payment: inputData,
             allocations
         })
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to save payment', error)
    }
  }

  const isSaving = createPayment.isPending || updatePayment.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{paymentToEdit ? 'Edit Vendor Payment' : 'Record Vendor Payment'}</DialogTitle>
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
               <Label htmlFor="amount">Amount</Label>
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
            <Label htmlFor="vendor">Vendor</Label>
            <select
              id="vendor"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
              value={formData.vendor_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, vendor_id: e.target.value }))}
            >
              <option value="">Select Vendor</option>
              {vendors?.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Paid From</Label>
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

          <div className="space-y-2">
             <Label htmlFor="project">Project (Optional)</Label>
             <select
                id="project"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.project_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
             >
                <option value="">Select Project (For Reference)</option>
                {projects?.map(p => (
                   <option key={p.id} value={p.id}>{p.project_id_code} - {p.customer?.name}</option>
                ))}
             </select>
             <p className="text-[10px] text-muted-foreground">Select if this is an advance for a specific project.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a new note..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : (paymentToEdit ? 'Update Payment' : 'Record Payment')}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
