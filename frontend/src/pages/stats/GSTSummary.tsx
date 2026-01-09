import React, { useMemo, useState } from 'react'
import { useInvoices } from '@/hooks/useInvoices'
import { useExpenses } from '@/hooks/useExpenses'
import { useIncome } from '@/hooks/useIncome'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Download, Loader2, Plus } from 'lucide-react'
import { utils, writeFile } from 'xlsx'
import { Button } from '@/components/ui/button'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'

const GSTSummary: React.FC = () => {
  const { data: invoices, isLoading: isLoadingInvoices } = useInvoices()
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses()
  const { data: income, isLoading: isLoadingIncome } = useIncome()
  const { orgSlug } = useParams()
  const [isExporting, setIsExporting] = useState(false)
  
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
        return isWithinInterval(date, { start: month.start, end: month.end }) && !exp.category?.startsWith('STATUTORY')
      })

      const monthPayments = expenses.filter(exp => {
        const date = new Date(exp.date)
        return isWithinInterval(date, { start: month.start, end: month.end }) && exp.category === 'STATUTORY_GST_PAYMENT'
      })

      const outputTax = monthInvoices.reduce((sum, inv) => sum + (inv.gst_amount || 0), 0)
      const inputTax = monthExpenses.reduce((sum, exp) => sum + (exp.gst_amount || 0), 0)
      const netGST = outputTax - inputTax
      const paidGST = monthPayments.reduce((sum, exp) => sum + (exp.total_paid || 0), 0)
      const balancePayable = netGST - paidGST

      return {
        month: month.name,
        outputTax,
        inputTax,
        netGST,
        paidGST,
        balancePayable
      }
    })
  }, [months, invoices, expenses])

  const totals = useMemo(() => {
    return stats.reduce((acc, curr) => ({
      outputTax: acc.outputTax + curr.outputTax,
      inputTax: acc.inputTax + curr.inputTax,
      netGST: acc.netGST + curr.netGST,
      paidGST: acc.paidGST + (curr.paidGST || 0),
      balancePayable: acc.balancePayable + (curr.balancePayable || 0)
    }), { outputTax: 0, inputTax: 0, netGST: 0, paidGST: 0, balancePayable: 0 })
  }, [stats])

  const handleCAExport = async () => {
    if (!invoices || !expenses || !income) return

    try {
      setIsExporting(true)
      const startDate = new Date(selectedFY, 3, 1) // April 1st
      const endDate = new Date(selectedFY + 1, 2, 31, 23, 59, 59) // March 31st end of day

      const dateFilter = (dateStr: string) => {
        const date = parseISO(dateStr)
        return isWithinInterval(date, { start: startDate, end: endDate })
      }

      // Filter Data
      const fyInvoices = invoices.filter(inv => dateFilter(inv.date))
      const fyExpenses = expenses.filter(exp => dateFilter(exp.date))
      const fyIncome = income.filter(inc => dateFilter(inc.date))

      // --- Sheet 1: GST Summary ---
      const summaryHeaders = ['Month', 'Output Tax (Sales)', 'Input Tax (Expenses)', 'Net GST Payable']
      const summaryData = stats.map(s => [
        s.month,
        s.outputTax,
        s.inputTax,
        s.netGST
      ])
      const summaryTotal = ['Total', totals.outputTax, totals.inputTax, totals.netGST]
      
      const wsSummary = utils.aoa_to_sheet([
        [`GST Summary for FY ${selectedFY}-${(selectedFY + 1) % 100}`],
        [],
        summaryHeaders,
        ...summaryData,
        [],
        summaryTotal
      ])

      // --- Sheet 2: Invoices (Sales) ---
      const invoiceHeaders = ['Date', 'Invoice #', 'Customer', 'GSTIN', 'Taxable Amount', 'IGST', 'CGST', 'SGST', 'Total Tax', 'Total Amount']
      const invoiceData = fyInvoices.map(inv => [
        format(parseISO(inv.date), 'dd/MM/yyyy'),
        inv.invoice_number,
        inv.customer?.name || 'N/A',
        inv.customer?.gst_number || 'N/A',
        (inv.taxable_value || 0),
        0, // Placeholder for IGST separation if needed later
        (inv.gst_amount || 0) / 2, // Assuming equal split for now if intra-state
        (inv.gst_amount || 0) / 2,
        inv.gst_amount || 0,
        inv.total_amount
      ])
      
      const wsInvoices = utils.aoa_to_sheet([
        [`Invoices for FY ${selectedFY}-${(selectedFY + 1) % 100}`],
        [],
        invoiceHeaders,
        ...invoiceData
      ])

      // --- Sheet 3: Bank Transactions ---
      // Combine Income and Expenses
      // --- Sheet 3: Bank Transactions ---
      // Combine Income and Expenses
      const bankTxHeaders = ['Date', 'Type', 'Category', 'Description/party', 'Bank Account', 'Reference', 'GST %', 'GST Amount', 'Payment Mode', 'Vendor/Customer Name', 'Vendor Invoice #', 'Credit (Income)', 'Debit (Expense)']
      
      const incomeRows = fyIncome.map(inc => ({
        date: inc.date,
        row: [
          format(parseISO(inc.date), 'dd/MM/yyyy'),
          'Income',
          inc.category || 'Income',
          inc.received_from || '',
          inc.bank_account?.account_name || 'N/A',
          inc.invoice?.invoice_number || '', // Using Invoice # as Reference for Income
          inc.invoice?.gst_percentage || '', // GST % from Invoice if available
          '', // GST Amount blank for Income (Output Tax) per user request
          inc.payment_mode || '',
          inc.customer?.name || inc.received_from || '', // Vendor/Customer Name
          '', // Vendor Invoice # not applicable for Income
          inc.amount,
          ''
        ]
      }))

      const expenseRows = fyExpenses.map(exp => ({
        date: exp.date,
        row: [
          format(parseISO(exp.date), 'dd/MM/yyyy'),
          'Expense',
          exp.category || 'Expense',
          exp.description || '',
          exp.bank_account?.account_name || 'N/A',
          '',
          exp.gst_percentage || '',
          exp.gst_amount || '',
          '', // Payment Mode not currently tracked for expenses in DB/UI
          exp.vendor?.name || '',
          exp.vendor_invoice_number || '',
          '',
          exp.total_paid
        ]
      }))

      const allBankRows = [...incomeRows, ...expenseRows]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(item => item.row)

      const wsBankTx = utils.aoa_to_sheet([
        [`Bank Transactions for FY ${selectedFY}-${(selectedFY + 1) % 100}`],
        [],
        bankTxHeaders,
        ...allBankRows
      ])

      // Create Workbook
      const wb = utils.book_new()
      utils.book_append_sheet(wb, wsSummary, "GST Summary")
      utils.book_append_sheet(wb, wsInvoices, "Invoices")
      utils.book_append_sheet(wb, wsBankTx, "Bank Transactions")

      // Save
      writeFile(wb, `CA_Data_FY_${selectedFY}-${(selectedFY+1)%100}.xlsx`)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoadingInvoices || isLoadingExpenses || isLoadingIncome) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground animate-pulse">Calculating GST stats...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Summary"
        description="Month-wise Output vs Input GST comparison"
      >
        <Link to={`/${orgSlug}/expenses/new?category=STATUTORY_GST_PAYMENT`}>
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Record GST Payment
          </Button>
        </Link>
        <button
          onClick={handleCAExport}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export for CA
        </button>
        <div className="w-full sm:w-48">
          <select 
            value={selectedFY} 
            onChange={(e) => setSelectedFY(parseInt(e.target.value))}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus-ring focus:ring-offset-2"
          >
            {financialYears.map(year => (
              <option key={year} value={year}>
                FY {year}-{((year + 1) % 100).toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-green-600 dark:text-green-400">Total Output Tax (Sales)</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold">₹{totals.outputTax.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">Total Input Tax (Expenses)</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold">₹{totals.inputTax.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-primary/20",
          totals.netGST > 0 ? "bg-amber-50/50 dark:bg-amber-950/20" : "bg-slate-50/50 dark:bg-slate-900/50"
        )}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[11px] uppercase tracking-wider font-semibold">Net GST Liability</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold">₹{totals.netGST.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-[11px] uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">Total GST Paid (Settled)</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold">₹{totals.paidGST.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        <Card className={cn(
          "md:col-span-2 lg:col-span-4 border-2",
          totals.balancePayable > 0.1 ? "bg-primary/5 border-primary/20 shadow-md" : "bg-green-50/50 border-green-200"
        )}>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-base font-black flex items-center justify-between">
              Balance Payable to Dept
              <Badge variant={totals.balancePayable > 0.1 ? "default" : "secondary"} className="font-bold">
                {totals.balancePayable > 0.1 ? "PAYMENT DUE" : "CLEARED"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className={cn("text-3xl font-black", totals.balancePayable > 0.1 ? "text-primary" : "text-green-700")}>
              ₹{Math.abs(totals.balancePayable).toLocaleString('en-IN')}
              {totals.balancePayable < -0.1 && <span className="text-sm ml-2 font-bold">(Excess Paid)</span>}
            </div>
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
                  <TableHead className="text-right">Net Liability</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((row) => (
                  <TableRow key={row.month} className={row.netGST === 0 && row.outputTax === 0 && row.inputTax === 0 && row.paidGST === 0 ? "opacity-40" : ""}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right text-xs sm:text-sm">₹{row.outputTax.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-xs sm:text-sm text-red-600 dark:text-red-400">₹{row.inputTax.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-xs sm:text-sm font-bold">₹{row.netGST.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-xs sm:text-sm text-blue-600 font-bold">₹{(row.paidGST || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className={cn(
                      "text-right font-black",
                      row.balancePayable > 0.1 ? "text-primary" : row.balancePayable < -0.1 ? "text-green-600" : ""
                    )}>
                      ₹{row.balancePayable.toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">₹{totals.outputTax.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400">₹{totals.inputTax.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right">₹{totals.netGST.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right text-blue-600">₹{totals.paidGST.toLocaleString('en-IN')}</TableCell>
                  <TableCell className={cn(
                    "text-right font-black text-lg",
                    totals.balancePayable > 0.1 ? "text-primary" : "text-green-600"
                  )}>
                    ₹{totals.balancePayable.toLocaleString('en-IN')}
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
