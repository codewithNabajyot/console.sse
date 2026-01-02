import { Card, CardContent } from "@/components/ui/card"
import { TrendingDown, Wallet, Clock } from "lucide-react"
import type { Invoice, Income } from "@/lib/types"
import { cn } from "@/lib/utils"

interface InvoiceStatsCardsProps {
  invoices: Invoice[] | undefined
  income: Income[] | undefined
  onOutstandingClick?: () => void
  onMonthlyCollectionsClick?: () => void
  onSettledClick?: () => void
  activeFilter?: 'OUTSTANDING' | 'SETTLED' | 'MONTHLY' | 'ALL'
}

export function InvoiceStatsCards({ 
  invoices, 
  income, 
  onOutstandingClick, 
  onMonthlyCollectionsClick,
  onSettledClick,
  activeFilter 
}: InvoiceStatsCardsProps) {
  // Calculate stats
  const totalOutstanding = invoices?.reduce((sum, inv) => {
    const collected = inv.income?.reduce((aSum, a) => aSum + a.amount, 0) || 0
    if (collected < inv.total_amount - 0.1) {
      return sum + (inv.total_amount - collected)
    }
    return sum
  }, 0) || 0

  const collectionsThisMonth = income?.reduce((sum, inc) => {
    const date = new Date(inc.date)
    const now = new Date()
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return sum + inc.amount
    }
    return sum
  }, 0) || 0

  const paidInvoicesCount = invoices?.filter(inv => {
    const collected = inv.income?.reduce((aSum, a) => aSum + a.amount, 0) || 0
    return collected >= inv.total_amount - 0.1
  }).length || 0

  const stats = [
    {
      id: 'OUTSTANDING',
      label: "Outstanding AR",
      value: `₹${totalOutstanding.toLocaleString('en-IN')}`,
      icon: Clock,
      activeClass: "bg-primary text-primary-foreground ring-2 ring-primary",
      iconColor: "text-primary",
      onClick: onOutstandingClick,
    },
    {
      id: 'MONTHLY',
      label: "Collected (Month)",
      value: `₹${collectionsThisMonth.toLocaleString('en-IN')}`,
      icon: Wallet,
      activeClass: "bg-green-600 text-white ring-2 ring-green-600",
      iconColor: "text-green-600",
      onClick: onMonthlyCollectionsClick,
    },
    {
      id: 'SETTLED',
      label: "Settled Invoices",
      value: paidInvoicesCount.toString(),
      icon: TrendingDown,
      activeClass: "bg-blue-600 text-white ring-2 ring-blue-600",
      iconColor: "text-blue-600",
      onClick: onSettledClick,
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
