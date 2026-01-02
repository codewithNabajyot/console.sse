import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Expense, ExpensePayment } from '@/lib/types'
import { useDeletePaymentAllocation } from '@/hooks/useExpensePayments'

interface ViewAllocationsModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'payment' | 'expense' // Viewing from Payment side (show linked bills) or Expense side (show linked payments)
  record: ExpensePayment | Expense
}

export function ViewAllocationsModal({ isOpen, onClose, type, record }: ViewAllocationsModalProps) {
  const deleteAllocation = useDeletePaymentAllocation()

  const allocations = record.allocations || []
  const totalAmount = type === 'payment' 
     ? (record as ExpensePayment).amount 
     : (record as Expense).total_paid

  const handleDelete = async (allocationId: string) => {
     if (confirm('Are you sure you want to unlink this payment? The amount will be added back to "Unused".')) {
        await deleteAllocation.mutateAsync(allocationId)
     }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
             Linked {type === 'payment' ? 'Bills' : 'Payments'}
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
             For {type === 'payment' ? 'Payment' : 'Bill'} of <span className="font-semibold text-foreground">₹{totalAmount.toLocaleString('en-IN')}</span>
             {' '} on {format(new Date(record.date), 'dd MMM yyyy')}
          </div>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto border rounded-md">
           {allocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                 No links found.
              </div>
           ) : (
              <table className="w-full text-sm">
                 <thead className="bg-muted text-left">
                    <tr>
                       <th className="p-3 font-medium">Bill No</th>
                       <th className="p-3 font-medium">Date</th>
                       <th className="p-3 font-medium">{type === 'payment' ? 'Project' : 'Payment Details'}</th>
                       <th className="p-3 font-medium">{type === 'payment' ? 'Description' : 'Mode'}</th>
                       <th className="p-3 text-right font-medium">Linked Amount</th>
                       <th className="p-3 text-right font-medium">Action</th>
                    </tr>
                 </thead>
                 <tbody>
                    {allocations.map((alloc) => {
                       const isPaymentView = type === 'payment'
                       const otherSideDate = isPaymentView ? alloc.expense?.date : alloc.payment?.date
                       
                       // Column 1: Bill No / Payment No
                       const idCell = isPaymentView 
                          ? (alloc.expense?.expense_number || 'EXP-???')
                          : (alloc.payment?.payment_number || 'PAY-???')

                       // Column 3: Project (Customer) / Vendor
                       let mainDetail: React.ReactNode = '—'
                       let subDetail: React.ReactNode = null

                       if (isPaymentView) {
                          mainDetail = alloc.expense?.project?.project_id_code || 'Common'
                          subDetail = alloc.expense?.project?.customer?.name && (
                             <div className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={alloc.expense.project.customer.name}>
                                {alloc.expense.project.customer.name}
                             </div>
                          )
                       } else {
                          mainDetail = alloc.payment?.vendor?.name || 'Vendor Payment'
                       }

                       // Column 4: Description / Mode
                       const description = isPaymentView 
                          ? (alloc.expense?.description || '—')
                          : (alloc.payment?.payment_mode || '—')

                       return (
                          <tr key={alloc.id} className="border-b last:border-0 hover:bg-muted/5">
                             <td className="p-3 align-top font-mono text-xs whitespace-nowrap">
                                {idCell}
                             </td>
                             <td className="p-3 align-top whitespace-nowrap">
                                {otherSideDate ? format(new Date(otherSideDate), 'dd MMM') : '—'}
                             </td>
                             <td className="p-3 align-top">
                                <div className="font-medium text-sm">
                                   {mainDetail}
                                </div>
                                {subDetail}
                             </td>
                             <td className="p-3 align-top text-xs text-muted-foreground max-w-[200px] truncate" title={String(description)}>
                                {description}
                             </td>
                             <td className="p-3 text-right font-mono align-top whitespace-nowrap">
                                ₹{alloc.amount.toLocaleString('en-IN')}
                             </td>
                             <td className="p-3 text-right align-top">
                                <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                   onClick={() => handleDelete(alloc.id)}
                                   disabled={deleteAllocation.isPending}
                                >
                                   <Trash2 className="h-3 w-3" />
                                </Button>
                             </td>
                          </tr>
                       )
                    })}
                 </tbody>
              </table>
           )}
        </div>

        <DialogFooter>
           <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
