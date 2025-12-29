import React, { useMemo, useState } from 'react'
import { useInvoices } from '@/hooks/useInvoices'
import { useExpenses } from '@/hooks/useExpenses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths } from 'date-fns'
import { cn } from '@/lib/utils'

const GSTSummary: React.FC = () => {
  const { data: invoices, isLoading: isLoadingInvoices } = useInvoices()
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses()
  
  // Financial Year Selection
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() // 0-indexed
  
  // Determine current FY
  // If month is Apr (3) or later, we are in FY year to year+1
  // If month is Jan-Mar (0-2), we are in FY year-1 to year
  const defaultFY = currentMonth >= 3 ? currentYear : currentYear - 1
  const [selectedFY, setSelectedFY] = useState<number>(defaultFY)

  const financialYears = useMemo(() => {
    const years = []
    for (let i = 0; i < 5; i++) {
      years.push(defaultFY - i)
    }
    return years
  }, [defaultFY])

  const months = useMemo(() => {
    const result = []
    const startDate = new Date(selectedFY, 3, 1) // April 1st of selected FY
    for (let i = 0; i < 12; i++) {
      const date = addMonths(startDate, i)
      result.push({
        name: format(date, 'MMMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date),
      })
    }
    return result
  }, [selectedFY])

  const stats = useMemo(() => {
    if (!invoices || !expenses) return []

    return months.map(month => {
      const monthInvoices = invoices.filter(inv => {
        const date = new Date(inv.date)
        return isWithinInterval(date, { start: month.start, end: month.end })
      })

      const monthExpenses = expenses.filter(exp => {
        const date = new Date(exp.date)
        return isWithinInterval(date, { start: month.start, end: month.end })
      })

      const outputTax = monthInvoices.reduce((sum, inv) => sum + (inv.gst_amount || 0), 0)
      const inputTax = monthExpenses.reduce((sum, exp) => sum + (exp.gst_amount || 0), 0)
      const netGST = outputTax - inputTax

      return {
        month: month.name,
        outputTax,
        inputTax,
        netGST,
      }
    })
  }, [months, invoices, expenses])

  const totals = useMemo(() => {
    return stats.reduce((acc, curr) => ({
      outputTax: acc.outputTax + curr.outputTax,
      inputTax: acc.inputTax + curr.inputTax,
      netGST: acc.netGST + curr.netGST
    }), { outputTax: 0, inputTax: 0, netGST: 0 })
  }, [stats])

  if (isLoadingInvoices || isLoadingExpenses) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground animate-pulse">Calculating GST stats...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Summary</h1>
          <p className="text-muted-foreground mt-1">
            Month-wise Output vs Input GST comparison
          </p>
        </div>
        
        <div className="w-full sm:w-48">
          <select 
            value={selectedFY} 
            onChange={(e) => setSelectedFY(parseInt(e.target.value))}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {financialYears.map(year => (
              <option key={year} value={year}>
                FY {year}-{((year + 1) % 100).toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Output Tax (Sales)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.outputTax.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Total Input Tax (Expenses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.inputTax.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-primary/20",
          totals.netGST > 0 ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-slate-50/50 dark:bg-slate-900/50"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net GST Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.netGST.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Output Tax (Sales)</TableHead>
                  <TableHead className="text-right">Input Tax (Expenses)</TableHead>
                  <TableHead className="text-right">Net GST Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((row) => (
                  <TableRow key={row.month} className={row.netGST === 0 && row.outputTax === 0 && row.inputTax === 0 ? "opacity-40" : ""}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">₹{row.outputTax.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">₹{row.inputTax.toLocaleString('en-IN')}</TableCell>
                    <TableCell className={cn(
                      "text-right font-bold",
                      row.netGST > 0 ? "text-primary" : row.netGST < 0 ? "text-green-600" : ""
                    )}>
                      ₹{row.netGST.toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">₹{totals.outputTax.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400">₹{totals.inputTax.toLocaleString('en-IN')}</TableCell>
                  <TableCell className={cn(
                    "text-right",
                    totals.netGST > 0 ? "text-primary" : "text-green-600"
                  )}>
                    ₹{totals.netGST.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GSTSummary
