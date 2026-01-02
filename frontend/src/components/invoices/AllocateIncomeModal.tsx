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
import { Wallet } from 'lucide-react'
import { useIncome, useUpdateIncome } from '@/hooks/useIncome'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

interface AllocateIncomeModalProps {
  invoice: Invoice | null
  isOpen: boolean
  onClose: () => void
}

export function AllocateIncomeModal({ invoice, isOpen, onClose }: AllocateIncomeModalProps) {
  const { data: incomeRecords, isLoading } = useIncome()
  const updateIncome = useUpdateIncome()
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null)

  // Filter for unallocated income from the same customer
  const unallocatedIncome = incomeRecords?.filter(inc => {
    // Must be unallocated
    if (inc.invoice_id) return false

    // Must be same customer or same project's customer
    const invoiceCustomerId = invoice?.customer_id || invoice?.project?.customer_id
    const incomeCustomerId = inc.customer_id || inc.project?.customer_id

    if (invoiceCustomerId !== incomeCustomerId) return false

    return true
  })

  const handleAllocate = async () => {
    if (!invoice || !selectedIncomeId) return

    try {
      await updateIncome.mutateAsync({
        id: selectedIncomeId,
        input: { invoice_id: invoice.id }
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
          <DialogTitle>Allocate Existing Income</DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            Linking unallocated funds for <span className="font-bold text-foreground">{invoice?.project?.customer?.name || invoice?.customer?.name}</span>
          </div>
        </DialogHeader>


        <ScrollArea className="h-[300px] mt-4 border rounded-md p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground italic">
              Searching receipts...
            </div>
          ) : unallocatedIncome?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Wallet className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <div className="text-sm text-muted-foreground italic">
                No unallocated income found for this customer.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {unallocatedIncome?.map((inc) => (
                <div
                  key={inc.id}
                  className={cn(
                    "flex flex-col p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                    selectedIncomeId === inc.id ? "border-primary bg-primary/[0.02] ring-1 ring-primary" : "border-transparent"
                  )}
                  onClick={() => setSelectedIncomeId(inc.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">{inc.received_from || 'Direct Receipt'}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(inc.date), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">₹{inc.amount.toLocaleString()}</div>
                      {inc.project && (
                         <div className="text-[10px] font-mono text-muted-foreground">{inc.project.project_id_code}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleAllocate} 
            disabled={!selectedIncomeId || updateIncome.isPending}
          >
            {updateIncome.isPending ? 'Allocating...' : 'Allocate to Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
