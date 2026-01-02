import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import type { Expense } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ExpenseStatusBadgeProps {
  record: Expense
  onPay?: () => void
  onViewLinks?: () => void
  className?: string
}

export function ExpenseStatusBadge({ record, onPay, onViewLinks, className }: ExpenseStatusBadgeProps) {
  const isDirectlyPaid = !!record.bank_account_id
  const allocatedAmount = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
  
  if (isDirectlyPaid) {
    return (
      <Badge 
        variant="secondary" 
        className={cn("bg-green-100 text-green-800 hover:bg-green-200 border-green-200 cursor-default", className)}
      >
        Paid (Direct)
      </Badge>
    )
  }

  if (allocatedAmount >= record.total_paid - 0.1) {
    return (
      <div className="flex items-center gap-1 group/status">
        <Badge 
          variant="secondary" 
          className={cn("bg-green-100 text-green-800 hover:bg-green-200 border-green-200 whitespace-nowrap cursor-default", className)}
        >
          Paid
        </Badge>
        {onViewLinks && (record.allocations?.length || 0) > 0 && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewLinks()
            }}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-all opacity-0 group-hover/status:opacity-100"
            title="View linked payments"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  if (allocatedAmount > 0) {
    const pending = record.total_paid - allocatedAmount
    return (
      <div className="flex items-center gap-1 group/status">
        <Badge 
          variant="secondary" 
          className={cn("bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200 whitespace-nowrap cursor-pointer", className)}
          onClick={(e) => {
            e.stopPropagation()
            onPay?.()
          }}
          title="Click to Pay remaining"
        >
          Partial (₹{pending.toLocaleString('en-IN')})
        </Badge>
        {onViewLinks && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewLinks()
            }}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-all"
            title="View partially linked payments"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <Badge 
      variant="destructive" 
      className={cn("whitespace-nowrap cursor-pointer hover:bg-destructive/90 transition-all", className)}
      onClick={(e) => {
        e.stopPropagation()
        onPay?.()
      }}
      title="Click to record payment"
    >
      Unpaid
    </Badge>
  )
}
