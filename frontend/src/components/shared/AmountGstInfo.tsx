import React from 'react'
import { cn } from '@/lib/utils'

interface AmountGstInfoProps {
  amount: number
  gstPercentage?: number
  gstAmount?: number
  showGst?: boolean
  className?: string
  amountClassName?: string
  gstClassName?: string
  layout?: 'vertical' | 'horizontal'
  currencySymbol?: string
}

export const AmountGstInfo: React.FC<AmountGstInfoProps> = ({
  amount,
  gstPercentage,
  gstAmount,
  showGst = true,
  className = '',
  amountClassName = '',
  gstClassName = '',
  layout = 'vertical',
  currencySymbol = '₹',
}) => {
  const formattedAmount = `${currencySymbol}${amount.toLocaleString('en-IN')}`
  const hasGst = gstPercentage !== undefined || gstAmount !== undefined

  if (layout === 'horizontal') {
    return (
      <div className={cn("flex items-baseline gap-2", className)}>
        <span className={cn("font-bold text-sm sm:text-base", amountClassName)}>
          {formattedAmount}
        </span>
        {showGst && hasGst && (
          <span className={cn("text-[10px] text-muted-foreground font-medium", gstClassName)}>
            ({gstPercentage}% GST)
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col leading-tight", className)}>
      <span className={cn("font-bold text-sm sm:text-base", amountClassName)}>
        {formattedAmount}
      </span>
      {showGst && hasGst && (
        <div className={cn("text-[10px] uppercase font-bold text-muted-foreground mt-0.5", gstClassName)}>
          GST {gstPercentage}% 
          {gstAmount !== undefined && (
            <span className="ml-1">(₹{gstAmount.toLocaleString('en-IN')})</span>
          )}
        </div>
      )}
    </div>
  )
}
