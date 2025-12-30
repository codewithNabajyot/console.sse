import { useState, useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock, 
  LayoutDashboard,
  PieChart as PieChartIcon,
  BarChart3,
  Users,
  Briefcase,
  Calendar,
  Check,
  ChevronDown
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'

const COLORS = ['#F29342', '#4CA771', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899']

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['all'])

  const { data: stats, isLoading } = useDashboardStats(selectedYear, selectedMonths)

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())
  }, [])

  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ]

  const toggleMonth = (monthValue: string) => {
    if (monthValue === 'all') {
      setSelectedMonths(['all'])
      return
    }

    setSelectedMonths(prev => {
      const filtered = prev.filter(m => m !== 'all')
      if (filtered.includes(monthValue)) {
        const next = filtered.filter(m => m !== monthValue)
        return next.length === 0 ? ['all'] : next
      } else {
        return [...filtered, monthValue]
      }
    })
  }

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonths.includes('all')) return 'All Months'
    if (selectedMonths.length === 1) return months.find(m => m.value === selectedMonths[0])?.label
    if (selectedMonths.length === 12) return 'All Months'
    return `${selectedMonths.length} Months`
  }, [selectedMonths])

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '₹0'
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-muted-foreground animate-pulse flex flex-col items-center gap-2">
          <LayoutDashboard className="h-8 w-8 animate-spin" />
          <p>Loading your business performance...</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Business performance insights for {selectedMonthLabel}, {selectedYear}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-xl border border-border/50">
          <Calendar className="h-4 w-4 text-muted-foreground ml-2 hidden sm:block" />
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-[150px] justify-between text-left font-normal bg-background">
                  <span className="truncate">{selectedMonthLabel}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Select Months</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={selectedMonths.includes('all')}
                  onCheckedChange={() => toggleMonth('all')}
                >
                  All Months
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {months.map(m => (
                  <DropdownMenuCheckboxItem
                    key={m.value}
                    checked={selectedMonths.includes(m.value)}
                    onCheckedChange={() => toggleMonth(m.value)}
                  >
                    {m.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 w-[90px] rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.kpis.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Income for selected period</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-green-500/20 group-hover:bg-green-500/40 transition-colors" />
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.kpis.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">Spending in this period</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-red-500/20 group-hover:bg-red-500/40 transition-colors" />
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.kpis.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(stats.kpis.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Period-specific margin</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-blue-500/20 group-hover:bg-blue-500/40 transition-colors" />
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Period Receivables</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.kpis.agedReceivables)}</div>
            <p className="text-xs text-muted-foreground mt-1">Unpaid invoices in this period</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-orange-500/20 group-hover:bg-orange-500/40 transition-colors" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Trend Analysis
            </CardTitle>
            <CardDescription>
              {selectedMonths.includes('all') || selectedMonths.length > 1
                ? `Full year distribution for ${selectedYear}` 
                : `6-month performance trend`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip 
                  formatter={(value: number | undefined) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="income" name="Inflow" fill="#4CA771" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Outflow" fill="#F29342" radius={[4, 4, 0, 0]} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>Categorized spending for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.expenseByCategory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No expenses found for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.expenseByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => formatCurrency(value)} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Period Project Margins
            </CardTitle>
            <CardDescription>Profitability of projects with activity in this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.projectProfitability.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No project activity in this period</p>
              ) : (
                stats.projectProfitability.map((project, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{project.name}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[10px] text-green-600 bg-green-500/5">In: {formatCurrency(project.income)}</Badge>
                        <Badge variant="outline" className="text-[10px] text-red-600 bg-red-500/5">Out: {formatCurrency(project.expense)}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={project.profit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {formatCurrency(project.profit)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Margin</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Pipeline Snapshot
            </CardTitle>
            <CardDescription>Projects started/active in this period</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
             {stats.projectPipeline.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No projects in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.projectPipeline}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ percent }: { percent: number }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {stats.projectPipeline.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Funding Analysis
          </CardTitle>
          <CardDescription>Total deal values by financing method for period-specific projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.revenueByFunding.map((funding, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-muted/20 border border-border/30 flex flex-col items-center justify-center text-center space-y-1 hover:bg-muted/40 transition-colors">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{funding.name}</p>
                <p className="text-lg font-bold">{formatCurrency(funding.value)}</p>
              </div>
            ))}
            {stats.revenueByFunding.length === 0 && (
              <p className="col-span-full text-center py-4 text-muted-foreground text-sm">No funding data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
