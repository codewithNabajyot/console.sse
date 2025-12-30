import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Income } from '@/lib/types'

interface PaymentHistoryModalProps {
  title: string
  totalLabel: string
  totalAmount: number
  income: Income[] | undefined
  isOpen: boolean
  onClose: () => void
}

export function PaymentHistoryModal({ 
  title, 
  totalLabel,
  totalAmount,
  income, 
  isOpen, 
  onClose 
}: PaymentHistoryModalProps) {
  const totalReceived = income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
  const pendingAmount = totalAmount - totalReceived

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            Payment History: <span className="text-primary font-mono">{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Summary Mini-Card */}
          <div className="bg-muted/30 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{totalLabel}</span>
              <span className="text-xl font-bold font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Received</span>
              <span className="text-xl font-bold text-green-600 font-mono">₹{totalReceived.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Amount</span>
              {pendingAmount <= 0 ? (
                <Badge variant="success" className="mt-1">Fully Paid</Badge>
              ) : (
                <span className="text-xl font-bold text-orange-600 font-mono">₹{pendingAmount.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>

          {/* Records Table */}
          <div>
            {income && income.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left border-b">
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Method</th>
                      <th className="p-3 font-medium">Bank Account</th>
                      <th className="p-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {income.map((payment) => (
                      <tr key={payment.id}>
                        <td className="p-3">{format(new Date(payment.date), 'dd MMM yyyy')}</td>
                        <td className="p-3">
                          <span className="capitalize">{payment.payment_mode || 'N/A'}</span>
                        </td>
                        <td className="p-3">
                          {payment.bank_account?.account_name}
                          <span className="block text-[10px] text-muted-foreground">{payment.bank_account?.bank_name}</span>
                        </td>
                        <td className="p-3 text-right font-bold text-green-600">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground italic">No payment records found.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
