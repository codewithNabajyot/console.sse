import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useInvoices } from '@/hooks/useInvoices'
import { useUpdateIncome } from '@/hooks/useIncome'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Income } from '@/lib/types'

interface QuickLinkInvoiceModalProps {
  income: Income | null
  isOpen: boolean
  onClose: () => void
}

export function QuickLinkInvoiceModal({ income, isOpen, onClose }: QuickLinkInvoiceModalProps) {
  const { data: invoices, isLoading } = useInvoices()
  const updateIncome = useUpdateIncome()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  // Filter for outstanding invoices only
  const targetCustomerId = income?.customer_id || income?.project?.customer_id

  const outstandingInvoices = invoices?.filter(inv => {
    // Filter by customer if known
    if (targetCustomerId) {
      const invCustomerId = inv.customer_id || inv.project?.customer_id
      if (invCustomerId !== targetCustomerId) return false
    }

    const collected = inv.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
    const isPaid = collected >= inv.total_amount - 0.1
    
    if (isPaid) return false

    return true
  })

  const handleLink = async () => {
    if (!income || !selectedInvoiceId) return

    try {
      await updateIncome.mutateAsync({
        id: income.id,
        input: { invoice_id: selectedInvoiceId }
      })
      onClose()
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Invoice</DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            Linking ₹{income?.amount.toLocaleString()} from {income?.received_from}
            {(income?.customer?.name || income?.project?.customer?.name) && (
              <span className="block text-[10px] font-bold text-amber-600 uppercase mt-0.5">
                Filtered: Invoices for {income?.customer?.name || income?.project?.customer?.name}
              </span>
            )}
          </div>
        </DialogHeader>


        <ScrollArea className="h-[300px] mt-4 border rounded-md p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground italic">
              Loading invoices...
            </div>
          ) : outstandingInvoices?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground italic">
              No outstanding invoices found.
            </div>
          ) : (
            <div className="space-y-2">
              {outstandingInvoices?.map((inv) => {
                const collected = inv.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
                const pending = inv.total_amount - collected
                
                return (
                  <div
                    key={inv.id}
                    className={cn(
                      "flex flex-col p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                      selectedInvoiceId === inv.id ? "border-primary bg-primary/[0.02] ring-1 ring-primary" : "border-transparent"
                    )}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-sm text-blue-600">{inv.invoice_number}</span>
                        <span className="text-xs text-muted-foreground">{inv.project?.project_id_code || 'Direct Service'}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">₹{inv.total_amount.toLocaleString()}</div>
                        <div className="text-[10px] text-amber-600 font-bold uppercase">Pending: ₹{pending.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-xs truncate max-w-[200px]">{inv.customer?.name || inv.project?.customer?.name}</span>
                       <span className="text-[10px] text-muted-foreground">{format(new Date(inv.date), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedInvoiceId || updateIncome.isPending}
          >
            {updateIncome.isPending ? 'Linking...' : 'Confirm Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
