import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExpenses } from '@/hooks/useExpenses'
import { useUpdatePaymentAllocations } from '@/hooks/useExpensePayments'
import type { ExpensePayment } from '@/lib/types'
import { format } from 'date-fns'

interface AllocatePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: ExpensePayment
  onSuccess?: () => void
}

export function AllocatePaymentModal({ isOpen, onClose, payment, onSuccess }: AllocatePaymentModalProps) {
  const { data: expenses } = useExpenses()
  const updateAllocations = useUpdatePaymentAllocations()
  const [allocations, setAllocations] = useState<{ [expenseId: string]: number }>({})

  // Initialize allocations from existing payment allocations
  useEffect(() => {
     if (isOpen && payment.allocations) {
        const initialAllocations: { [key: string]: number } = {}
        payment.allocations.forEach(a => {
           initialAllocations[a.expense_id] = a.amount
        })
        setAllocations(initialAllocations)
     } else {
        setAllocations({})
     }
  }, [isOpen, payment])

  // Filter bills eligible for allocation
  const eligibleBills = useMemo(() => {
    if (!expenses || !payment.vendor_id) return []

    return expenses.filter(expense => {
       // Must match vendor
       if (expense.vendor_id !== payment.vendor_id) return false
       
       // Must be a "Bill" (not direct payment)
       if (expense.bank_account_id) return false

       // Calculate remaining balance:
       // Total Paid (Bill Amt) - (All Allocations - Allocated by THIS payment)
       const allAllocationsSum = expense.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
       const allocatedByDoesNotCount = expense.allocations
          ?.filter(a => a.payment_id === payment.id)
          .reduce((sum, a) => sum + a.amount, 0) || 0
          
       const paidByOthers = allAllocationsSum - allocatedByDoesNotCount
       const remaining = expense.total_paid - paidByOthers
       
       // Allow small float margin
       return remaining > 0.1 
    })
  }, [expenses, payment.vendor_id, payment.id])

  // Calculate payment balance
  // We want: Total Payment Amount - Sum(Current Form Allocations)
  const currentAllocationTotal = Object.values(allocations).reduce((sum, val) => sum + val, 0)
  const remainingToAllocate = payment.amount - currentAllocationTotal

  const handleAutoAllocate = () => {
     const newAllocations = { ...allocations }

     // Auto-allocate only to unallocated bills or partially allocated
     // This logic is slightly tricky with updates. Simplest is:
     // Reset available to total payment and re-allocate from scratch? 
     // Or just fill gaps. Let's try filling gaps.
     
     // Better UX: Recalculate 'available' based on TOTAL payment limit
     let currentTotal = Object.values(newAllocations).reduce((sum, val) => sum + val, 0)
     let remainingBudget = payment.amount - currentTotal
     
     if (remainingBudget <= 0) return

     eligibleBills.forEach(bill => {
        if (remainingBudget <= 0.1) return
        
        const currentAssigned = newAllocations[bill.id] || 0
        
        // Calculate max allocatable for this bill
        const allAllocationsSum = bill.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
        const allocatedByDoesNotCount = bill.allocations
           ?.filter(a => a.payment_id === payment.id)
           .reduce((sum, a) => sum + a.amount, 0) || 0
        
        const paidByOthers = allAllocationsSum - allocatedByDoesNotCount
        const billBalance = bill.total_paid - paidByOthers
        
        const remainingBillSpace = billBalance - currentAssigned

        if (remainingBillSpace > 0) {
           const toAdd = Math.min(remainingBudget, remainingBillSpace)
           newAllocations[bill.id] = currentAssigned + toAdd
           remainingBudget -= toAdd
        }
     })
     setAllocations(newAllocations)
  }

  const handleSubmit = async () => {
    const allocationList = Object.entries(allocations)
       .filter(([_, amount]) => amount > 0)
       .map(([expenseId, amount]) => ({
          payment_id: payment.id,
          expense_id: expenseId,
          amount
       }))

    // Even if empty, we might want to save (to clear all links)
    // But UI disables button if empty? 
    // Wait, createAllocations disabled if empty. 
    // updateAllocations should ALLOW empty to clear links.
    
    try {
       await updateAllocations.mutateAsync({
          paymentId: payment.id,
          allocations: allocationList
       })
       onSuccess?.()
       onClose()
    } catch (error) {
       console.error(error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Link Payment to Bills</DialogTitle>
          <div className="text-sm text-muted-foreground mt-2">
             Payment of <span className="font-bold text-green-600">₹{payment.amount.toLocaleString('en-IN')}</span> 
             {' '} (Unused: ₹{remainingToAllocate.toLocaleString('en-IN')})
          </div>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-4">
           {eligibleBills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                 No unpaid bills found for this vendor.
              </div>
           ) : (
              <table className="w-full text-sm">
                 <thead className="text-muted-foreground border-b text-left">
                    <tr>
                       <th className="py-2 pl-2">Bill No</th>
                       <th className="py-2">Date</th>
                       <th className="py-2">Project</th>
                       <th className="py-2">Description</th>
                       <th className="py-2 text-right">Bill Amount</th>
                       <th className="py-2 text-right">Balance Due</th>
                       <th className="py-2 text-right w-[150px] pr-2">Allocate</th>
                    </tr>
                 </thead>
                 <tbody>
                    {eligibleBills.map(bill => {
                       // Correctly calculate Balance for UI
                       const allAllocationsSum = bill.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                       const allocatedByDoesNotCount = bill.allocations
                          ?.filter(a => a.payment_id === payment.id)
                          .reduce((sum, a) => sum + a.amount, 0) || 0
                       
                       const paidByOthers = allAllocationsSum - allocatedByDoesNotCount
                       const billRemaining = bill.total_paid - paidByOthers
                       
                       // Highlight if already linked
                       const isLinked = (allocations[bill.id] || 0) > 0
                       
                       return (
                          <tr key={bill.id} className={`border-b ${isLinked ? 'bg-muted/30' : ''}`}>
                             <td className="py-2 pl-2 font-mono text-xs text-muted-foreground">
                                {bill.expense_number || '-'}
                             </td>
                             <td className="py-2">{format(new Date(bill.date), 'dd MMM')}</td>
                             <td className="py-2 text-xs font-mono">
                                {bill.project?.project_id_code || 'Common'}
                                {bill.project?.customer?.name && (
                                   <div className="text-[10px] text-muted-foreground font-sans truncate max-w-[150px]" title={bill.project.customer.name}>
                                      {bill.project.customer.name}
                                   </div>
                                )}
                             </td>
                             <td className="py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={bill.description || ''}>
                                {bill.description || '—'}
                             </td>
                             <td className="py-2 text-right">₹{bill.total_paid.toLocaleString('en-IN')}</td>
                             <td className="py-2 text-right text-red-600">₹{billRemaining.toLocaleString('en-IN')}</td>
                             <td className="py-2 pl-4 pr-2">
                                <Input 
                                   type="number" 
                                   className="h-8 text-right bg-background"
                                   placeholder="0"
                                   min={0}
                                   max={Math.min(billRemaining, (remainingToAllocate + (allocations[bill.id] || 0)))} 
                                   value={allocations[bill.id] || ''}
                                   onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value))
                                      setAllocations(prev => ({
                                         ...prev,
                                         [bill.id]: val
                                      }))
                                   }}
                                />
                             </td>
                          </tr>
                       )
                    })}
                 </tbody>
              </table>
           )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
           <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAutoAllocate}>
                 Auto-Allocate
              </Button>
              <div className={`text-sm font-medium ${remainingToAllocate < -0.1 ? 'text-red-600' : 'text-muted-foreground'}`}>
                 Remaining: ₹{remainingToAllocate.toLocaleString('en-IN')}
              </div>
           </div>
           
           <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={remainingToAllocate < -0.1 || updateAllocations.isPending}>
                 {updateAllocations.isPending ? 'Saving...' : 'Save Links'}
              </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
