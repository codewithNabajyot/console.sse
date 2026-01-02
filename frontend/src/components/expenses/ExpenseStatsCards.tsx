import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Wallet, Clock } from "lucide-react"
import type { Expense, ExpensePayment } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ExpenseStatsCardsProps {
  expenses: Expense[] | undefined
  payments: ExpensePayment[] | undefined
  onOutstandingClick?: () => void
  onUnusedAdvancesClick?: () => void
  isActiveOutstanding?: boolean
  isActiveUnused?: boolean
}

export function ExpenseStatsCards({ 
  expenses, 
  payments, 
  onOutstandingClick, 
  onUnusedAdvancesClick,
  isActiveOutstanding,
  isActiveUnused
}: ExpenseStatsCardsProps) {
  // ... existing calculation logic ...
  const totalOutstanding = expenses?.reduce((sum, exp) => {
    if (exp.bank_account_id) return sum
    const allocated = exp.allocations?.reduce((aSum, a) => aSum + a.amount, 0) || 0
    if (allocated < exp.total_paid - 0.1) {
      return sum + (exp.total_paid - allocated)
    }
    return sum
  }, 0) || 0

  const totalExpensesThisMonth = expenses?.reduce((sum, exp) => {
    const date = new Date(exp.date)
    const now = new Date()
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return sum + exp.total_paid
    }
    return sum
  }, 0) || 0

  const unusedPaymentBalance = payments?.reduce((sum, p) => {
    const allocated = p.allocations?.reduce((aSum, a) => aSum + a.amount, 0) || 0
    return sum + (p.amount - allocated)
  }, 0) || 0

  const stats = [
    {
      id: "OUTSTANDING",
      label: "Total Outstanding",
      value: `₹${totalOutstanding.toLocaleString('en-IN')}`,
      icon: Clock,
      activeClass: "bg-primary text-primary-foreground ring-2 ring-primary",
      iconColor: "text-primary",
      onClick: onOutstandingClick,
      isActive: isActiveOutstanding,
    },
    {
      id: "EXPENSES",
      label: "Expenses (Month)",
      value: `₹${totalExpensesThisMonth.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      activeClass: "bg-red-600 text-white ring-2 ring-red-600",
      iconColor: "text-red-600",
      isActive: false,
    },
    {
      id: "ADVANCES",
      label: "Unused Advances",
      value: `₹${unusedPaymentBalance.toLocaleString('en-IN')}`,
      icon: Wallet,
      activeClass: "bg-green-600 text-white ring-2 ring-green-600",
      iconColor: "text-green-600",
      onClick: onUnusedAdvancesClick,
      isActive: isActiveUnused,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card 
          key={stat.id} 
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
            stat.isActive ? stat.activeClass : "bg-card text-card-foreground"
          )}
          onClick={stat.onClick}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium", 
                  stat.isActive ? "opacity-90" : "text-muted-foreground"
                )}>
                  {stat.label}
                </p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
              <stat.icon className={cn(
                "h-8 w-8", 
                stat.isActive ? "opacity-40" : cn(stat.iconColor, "opacity-20")
              )} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
