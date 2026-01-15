import { useMemo } from 'react'
import { useIncome } from './useIncome'
import { useExpenses } from './useExpenses'
import { useInvoices } from './useInvoices'
import { useProjects } from './useProjects'
import { format, parseISO, startOfMonth, subMonths, isSameMonth, isSameYear, getYear, getMonth } from 'date-fns'

export function useDashboardStats(year: string, monthIds: string[]) {
  const { data: income, isLoading: isLoadingIncome } = useIncome()
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses()
  const { data: invoices, isLoading: isLoadingInvoices } = useInvoices()
  const { data: projects, isLoading: isLoadingProjects } = useProjects()

  const isLoading = isLoadingIncome || isLoadingExpenses || isLoadingInvoices || isLoadingProjects

  const stats = useMemo(() => {
    if (!income || !expenses || !invoices || !projects) return null

    const isLifetime = year === 'lifetime'
    const selectedYear = isLifetime ? 0 : parseInt(year)
    const isAllMonths = monthIds.length === 0 || monthIds.includes('all')
    const selectedMonthIndices = isAllMonths ? null : monthIds.map(m => parseInt(m))

    const isWithinPeriod = (dateStr: string) => {
      if (isLifetime) return true
      const date = parseISO(dateStr)
      if (selectedMonthIndices !== null) {
        return getYear(date) === selectedYear && selectedMonthIndices.includes(getMonth(date))
      }
      return getYear(date) === selectedYear
    }

    // 1. Filtered Data
    const filteredExpenses = expenses.filter(item => isWithinPeriod(item.date))
    const filteredInvoices = invoices.filter(item => isWithinPeriod(item.date))

    // 1. Financial KPIs (Accrual Basis)
    const totalRevenue = filteredInvoices.reduce((sum, item) => sum + item.total_amount, 0)
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.total_paid, 0)
    const netProfit = totalRevenue - totalExpenses
    
    // Receivables for the selected period (Accrual: Outstanding balance of invoices in this period)
    const agedReceivables = filteredInvoices.reduce((sum, item) => {
      const received = item.income?.reduce((acc, inc) => acc + inc.amount, 0) || 0
      return sum + Math.max(0, item.total_amount - received)
    }, 0)

    // 2. Monthly Trends (Accrual Basis)
    let trendMonths: Date[] = []
    if (isLifetime) {
      // For lifetime, show last 12 months including current
      trendMonths = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), i))).reverse()
    } else if (selectedMonthIndices === null || selectedMonthIndices.length > 1) {
      trendMonths = Array.from({ length: 12 }, (_, i) => new Date(selectedYear, i, 1))
    } else {
      const singleMonth = selectedMonthIndices[0]
      trendMonths = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(selectedYear, singleMonth, 1), i))).reverse()
    }

    const monthlyTrends = trendMonths.map(date => {
      const monthStr = format(date, 'MMM yy')
      // Note: we use total_amount for invoices (Sales) and total_paid for expenses (Bills)
      const mIncome = invoices
        .filter(item => isSameMonth(parseISO(item.date), date) && isSameYear(parseISO(item.date), date))
        .reduce((sum, item) => sum + item.total_amount, 0)
      const mExpense = expenses
        .filter(item => isSameMonth(parseISO(item.date), date) && isSameYear(parseISO(item.date), date))
        .reduce((sum, item) => sum + item.total_paid, 0)
      
      return {
        month: monthStr,
        income: mIncome,
        expense: mExpense
      }
    })

    // 3. Expense by Category (Filtered)
    const expenseByCategoryMap: Record<string, number> = {}
    filteredExpenses.forEach(item => {
      const category = item.category || 'Other'
      expenseByCategoryMap[category] = (expenseByCategoryMap[category] || 0) + item.total_paid
    })
    const expenseByCategory = Object.entries(expenseByCategoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // 4. Project Profitability (Top 5 in period)
    const projectIdsInPeriod = new Set([
      ...filteredInvoices.map(i => i.project_id).filter(id => !!id),
      ...filteredExpenses.map(e => e.project_id).filter(id => !!id)
    ])

    const projectProfitMap: Record<string, { name: string, income: number, expense: number }> = {}
    
    projects.forEach(p => {
      if (projectIdsInPeriod.has(p.id)) {
        projectProfitMap[p.id] = { 
          name: p.project_id_code || p.id.substring(0, 8), 
          income: 0, 
          expense: 0 
        }
      }
    })

    filteredInvoices.forEach(item => {
      if (item.project_id && projectProfitMap[item.project_id]) {
        projectProfitMap[item.project_id].income += item.total_amount
      }
    })

    filteredExpenses.forEach(item => {
      if (item.project_id && projectProfitMap[item.project_id]) {
        projectProfitMap[item.project_id].expense += item.total_paid
      }
    })

    const projectProfitability = Object.values(projectProfitMap)
      .map(p => ({
        name: p.name,
        profit: p.income - p.expense,
        income: p.income,
        expense: p.expense
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)

    // 5. Project Pipeline (Non-deleted)
    const statusMap: Record<string, number> = {}
    // If not lifetime, we show projects CREATED in the period
    // If lifetime, we show all current projects status
    const projectsToUse = isLifetime ? projects : projects.filter(p => isWithinPeriod(p.created_at))
    
    projectsToUse.forEach(p => {
      const status = p.status || 'Draft'
      statusMap[status] = (statusMap[status] || 0) + 1
    })
    const projectPipeline = Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // 6. Revenue by Funding Type (All-time or period based on project creation)
    const fundingMap: Record<string, number> = {}
    projectsToUse.forEach(p => {
      const funding = p.funding_type || 'Unknown'
      fundingMap[funding] = (fundingMap[funding] || 0) + p.deal_value
    })
    const revenueByFunding = Object.entries(fundingMap)
      .map(([name, value]) => ({ name, value }))

    // 7. Lifetime Stats (Always available)
    const lifetimeStats = {
      totalProjects: projects.length,
      completedProjects: projects.filter(p => p.status === 'Completed').length,
    }

    return {
      kpis: {
        totalRevenue,
        totalExpenses,
        netProfit,
        agedReceivables
      },
      monthlyTrends,
      expenseByCategory,
      projectProfitability,
      projectPipeline,
      revenueByFunding,
      lifetimeStats
    }
  }, [income, expenses, invoices, projects, year, monthIds])

  return {
    data: stats,
    isLoading
  }
}
