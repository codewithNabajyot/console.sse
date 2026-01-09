import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PaymentMethodInfoProps {
  bankAccount?: {
    account_name: string
  } | null
  paymentMode?: string | null
  className?: string
  accountClassName?: string
  detailsClassName?: string
}

export const PaymentMethodInfo: React.FC<PaymentMethodInfoProps> = ({
  bankAccount,
  paymentMode,
  className = '',
  accountClassName = '',
  detailsClassName = '',
}) => {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-xs sm:text-sm font-semibold text-primary truncate max-w-[180px]", accountClassName)} title={bankAccount?.account_name}>
          {bankAccount?.account_name || 'Generic Payment'}
        </span>
      </div>
      {paymentMode && (
        <div className="flex items-center">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-[9px] h-4 px-1 leading-none uppercase bg-muted/50 text-muted-foreground border-transparent font-bold tracking-tight", 
              detailsClassName
            )}
          >
            {paymentMode}
          </Badge>
        </div>
      )}
    </div>
  )
}
