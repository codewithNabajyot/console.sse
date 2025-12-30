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

    const selectedYear = parseInt(year)
    const isAllMonths = monthIds.length === 0 || monthIds.includes('all')
    const selectedMonthIndices = isAllMonths ? null : monthIds.map(m => parseInt(m))

    const isWithinPeriod = (dateStr: string) => {
      const date = parseISO(dateStr)
      if (selectedMonthIndices !== null) {
        return getYear(date) === selectedYear && selectedMonthIndices.includes(getMonth(date))
      }
      return getYear(date) === selectedYear
    }

    // 1. Filtered Data
    const filteredIncome = income.filter(item => isWithinPeriod(item.date))
    const filteredExpenses = expenses.filter(item => isWithinPeriod(item.date))
    const filteredInvoices = invoices.filter(item => isWithinPeriod(item.date))

    // 1. Financial KPIs
    const totalRevenue = filteredIncome.reduce((sum, item) => sum + item.amount, 0)
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.total_paid, 0)
    const netProfit = totalRevenue - totalExpenses
    
    // Receivables for the selected period
    const totalInvoiced = filteredInvoices.reduce((sum, item) => sum + item.total_amount, 0)
    const agedReceivables = Math.max(0, totalInvoiced - totalRevenue)

    // 2. Monthly Trends
    let trendMonths: Date[] = []
    if (selectedMonthIndices === null || selectedMonthIndices.length > 1) {
      trendMonths = Array.from({ length: 12 }, (_, i) => new Date(selectedYear, i, 1))
    } else {
      const singleMonth = selectedMonthIndices[0]
      trendMonths = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(selectedYear, singleMonth, 1), i))).reverse()
    }

    const monthlyTrends = trendMonths.map(date => {
      const monthStr = format(date, 'MMM yy')
      const mIncome = income
        .filter(item => isSameMonth(parseISO(item.date), date) && isSameYear(parseISO(item.date), date))
        .reduce((sum, item) => sum + item.amount, 0)
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

    // 4. Project Profitability (Top 5)
    const projectIdsInPeriod = new Set([
      ...filteredIncome.map(i => i.project_id).filter(id => !!id),
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

    filteredIncome.forEach(item => {
      if (item.project_id && projectProfitMap[item.project_id]) {
        projectProfitMap[item.project_id].income += item.amount
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

    // 5. Project Status Funnel
    const filteredProjects = projects.filter(p => isWithinPeriod(p.created_at))
    
    const statusMap: Record<string, number> = {}
    const projectsToUse = (selectedMonthIndices === null && selectedYear === getYear(new Date())) ? projects : filteredProjects
    projectsToUse.forEach(p => {
      const status = p.status || 'Draft'
      statusMap[status] = (statusMap[status] || 0) + 1
    })
    const projectPipeline = Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // 6. Revenue by Funding Type
    const fundingMap: Record<string, number> = {}
    filteredProjects.forEach(p => {
      const funding = p.funding_type || 'Unknown'
      fundingMap[funding] = (fundingMap[funding] || 0) + p.deal_value
    })
    const revenueByFunding = Object.entries(fundingMap)
      .map(([name, value]) => ({ name, value }))

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
      revenueByFunding
    }
  }, [income, expenses, invoices, projects, year, monthIds])

  return {
    data: stats,
    isLoading
  }
}
