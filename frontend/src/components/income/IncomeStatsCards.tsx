import { Card, CardContent } from "@/components/ui/card"
import { Wallet, Unplug, Calendar } from "lucide-react"
import type { Income } from "@/lib/types"
import { cn } from "@/lib/utils"

interface IncomeStatsCardsProps {
  income: Income[] | undefined
  onUnallocatedClick?: () => void
  onMonthlyClick?: () => void
  onTotalClick?: () => void
  activeFilter?: 'UNALLOCATED' | 'MONTHLY' | 'TOTAL' | 'ALL'
}

export function IncomeStatsCards({ 
  income, 
  onUnallocatedClick, 
  onMonthlyClick,
  onTotalClick,
  activeFilter 
}: IncomeStatsCardsProps) {
  // Calculate stats
  const totalIncome = income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
  
  const unallocatedCount = income?.filter(inc => !inc.invoice_id).length || 0
  
  const monthlyIncome = income?.reduce((sum, inc) => {
    const date = new Date(inc.date)
    const now = new Date()
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return sum + inc.amount
    }
    return sum
  }, 0) || 0

  const stats = [
    {
      id: 'TOTAL',
      label: "Total Income",
      value: `₹${totalIncome.toLocaleString('en-IN')}`,
      icon: Wallet,
      activeClass: "bg-primary text-primary-foreground ring-2 ring-primary",
      iconColor: "text-primary",
      onClick: onTotalClick,
    },
    {
      id: 'UNALLOCATED',
      label: "Unallocated",
      value: unallocatedCount.toString(),
      icon: Unplug,
      activeClass: "bg-amber-600 text-white ring-2 ring-amber-600",
      iconColor: "text-amber-600",
      onClick: onUnallocatedClick,
    },
    {
      id: 'MONTHLY',
      label: "Received (Month)",
      value: `₹${monthlyIncome.toLocaleString('en-IN')}`,
      icon: Calendar,
      activeClass: "bg-green-600 text-white ring-2 ring-green-600",
      iconColor: "text-green-600",
      onClick: onMonthlyClick,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card 
          key={stat.id} 
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
            activeFilter === stat.id ? stat.activeClass : "bg-card text-card-foreground"
          )}
          onClick={stat.onClick}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium", 
                  activeFilter === stat.id ? "opacity-90" : "text-muted-foreground"
                )}>
                  {stat.label}
                </p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
              <stat.icon className={cn(
                "h-8 w-8", 
                activeFilter === stat.id ? "opacity-40" : cn(stat.iconColor, "opacity-20")
              )} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
