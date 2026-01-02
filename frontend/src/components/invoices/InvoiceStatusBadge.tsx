
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CircleDollarSign, History, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Invoice } from '@/lib/types'

interface InvoiceStatusBadgeProps {
  invoice: Invoice
  onPayClick?: (invoice: Invoice) => void
  onAllocateClick?: (invoice: Invoice) => void
  onViewHistoryClick?: (invoice: Invoice) => void
  className?: string
}

export function InvoiceStatusBadge({ 
  invoice, 
  onPayClick, 
  onAllocateClick,
  onViewHistoryClick, 
  className 
}: InvoiceStatusBadgeProps) {
  const collected = invoice.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
  const pending = invoice.total_amount - collected
  
  // Status Logic
  let status: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID'
  if (collected >= invoice.total_amount - 0.1) {
    status = 'PAID'
  } else if (collected > 0.1) {
    status = 'PARTIAL'
  }

  const getBadgeConfig = () => {
    switch (status) {
      case 'PAID':
        return {
          label: 'Paid',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900',
          icon: History,
          onClick: () => onViewHistoryClick?.(invoice)
        }
      case 'PARTIAL':
        return {
          label: 'Partial',
          variant: 'outline' as const,
          className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
          subLabel: `Pending: ₹${pending.toLocaleString('en-IN')}`,
          onClick: () => onViewHistoryClick?.(invoice)
        }
      case 'UNPAID':
        return {
          label: collected < -0.1 ? 'Overpaid' : 'Unpaid',
          variant: 'outline' as const,
          className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',
          icon: CircleDollarSign,
          onClick: () => onPayClick?.(invoice)
        }
    }
  }

  const config = getBadgeConfig()

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex flex-col gap-1 items-start">
        <Badge 
          variant={config.variant}
          className={cn(
            "cursor-pointer font-semibold px-2 py-0.5 whitespace-nowrap transition-colors flex items-center gap-1",
            config.className
          )}
          onClick={(e) => {
            e.stopPropagation()
            config.onClick()
          }}
        >
          {config.icon && <config.icon className="h-3 w-3" />}
          {config.label}
        </Badge>
        {config.subLabel && (
          <span className="text-[10px] whitespace-nowrap font-bold text-amber-600 dark:text-amber-500 px-1">
            {config.subLabel}
          </span>
        )}
      </div>

      {status !== 'PAID' && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation()
            onAllocateClick?.(invoice)
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
