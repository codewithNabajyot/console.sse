import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Wallet, Clock } from "lucide-react"
import type { Expense, ExpensePayment } from "@/lib/types"

interface ExpenseStatsCardsProps {
  expenses: Expense[] | undefined
  payments: ExpensePayment[] | undefined
}

export function ExpenseStatsCards({ expenses, payments }: ExpenseStatsCardsProps) {
  // Calculate stats
  const totalOutstanding = expenses?.reduce((sum, exp) => {
    // If it's a direct payment (has bank_account_id), it's fully paid
    if (exp.bank_account_id) return sum

    const allocated = exp.allocations?.reduce((aSum, a) => aSum + a.amount, 0) || 0
    // Only include unpaid or partially paid
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
      label: "Total Outstanding",
      value: `₹${totalOutstanding.toLocaleString('en-IN')}`,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      label: "Expenses (This Month)",
      value: `₹${totalExpensesThisMonth.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Unused Advances",
      value: `₹${unusedPaymentBalance.toLocaleString('en-IN')}`,
      icon: Wallet,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-xl font-bold">{stat.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
