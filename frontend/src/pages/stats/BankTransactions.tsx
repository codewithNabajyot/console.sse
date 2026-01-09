import React, { useMemo, useState } from 'react'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useBankTransactions } from '@/hooks/useBankTransactions'
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
import { format, isSameMonth, isSameYear, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Download } from 'lucide-react'
import { MobileTransactionCard } from '@/components/MobileTransactionCard'
import { utils, writeFile } from 'xlsx'
import { AmountGstInfo } from '@/components/shared/AmountGstInfo'
import { PaymentMethodInfo } from '@/components/shared/PaymentMethodInfo'

const BankTransactions: React.FC = () => {
  const { data: bankAccounts, isLoading: isLoadingAccounts } = useBankAccounts()
  const { data: transactions, isLoading: isLoadingTransactions } = useBankTransactions()
  
  const [selectedBankId, setSelectedBankId] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())
  }, [])

  const months = [
    { value: 'all', label: 'All Months' },
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

  const categories = useMemo(() => {
    const cats = new Set<string>()
    if (transactions) transactions.forEach(t => { if (t.category) cats.add(t.category) })
    return Array.from(cats).sort()
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    const year = parseInt(selectedYear)
    const month = selectedMonth === 'all' ? null : parseInt(selectedMonth)

    return transactions.filter(tx => {
       // Date Filter
       const date = parseISO(tx.date)
       const matchYear = isSameYear(date, new Date(year, 0, 1))
       const matchMonth = month === null || isSameMonth(date, new Date(year, month, 1))
       if (!matchYear || !matchMonth) return false

       // Bank Filter
       if (selectedBankId !== 'all' && tx.bank_account_id !== selectedBankId) return false

       // Type Filter
       if (selectedType !== 'all' && tx.type !== selectedType) return false

       // Category Filter
       if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false

       return true
    })
  }, [transactions, selectedBankId, selectedYear, selectedMonth, selectedType, selectedCategory])

  const totals = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => {
      if (curr.type === 'income') {
        acc.income += curr.amount
      } else {
        acc.expense += curr.amount
      }
      return acc
    }, { income: 0, expense: 0 })
  }, [filteredTransactions])

  const handleExport = () => {
    // 1. Create Filter Summary Data
    const filterSummary = [
      ['Bank Statement Export'],
      ['Generated On', format(new Date(), 'dd MMM yyyy HH:mm')],
      [],
      ['Filters Applied:'],
      ['Bank Account', selectedBankId === 'all' ? 'All Bank Accounts' : bankAccounts?.find(b => b.id === selectedBankId)?.account_name || selectedBankId],
      ['Type', selectedType === 'all' ? 'All Types' : selectedType === 'income' ? 'Income Only' : 'Expense Only'],
      ['Category', selectedCategory === 'all' ? 'All Categories' : selectedCategory],
      ['Year', selectedYear],
      ['Month', selectedMonth === 'all' ? 'All Months' : months.find(m => m.value === selectedMonth)?.label],
      [],
      ['Transaction Details']
    ]

    // 2. Prepare Transaction Data
    const transactionHeaders = ['Date', 'Type', 'Category', 'Description', 'Party', 'Bank Account', 'Payment Method', 'Reference', 'Income', 'Expense']
    
    const transactionData = filteredTransactions.map(tx => [
      format(parseISO(tx.date), 'dd MMM yyyy'),
      tx.type.toUpperCase(),
      tx.category,
      tx.description,
      tx.party_name || '-',
      tx.bank_name,
      tx.payment_mode || '-',
      tx.reference,
      tx.type === 'income' ? tx.amount : '',
      tx.type === 'expense' ? tx.amount : ''
    ])

    // Calculate totals for export
    const totalRow = [
      'TOTAL', '', '', '', '', '', '', '',
      totals.income,
      totals.expense
    ]

    // 3. Combine all data
    const wsData = [
      ...filterSummary,
      transactionHeaders,
      ...transactionData,
      [],
      totalRow
    ]

    // 4. Create Workbook and Worksheet
    const wb = utils.book_new()
    const ws = utils.aoa_to_sheet(wsData)

    // Optional: Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Date
      { wch: 10 }, // Type
      { wch: 20 }, // Category
      { wch: 30 }, // Description
      { wch: 25 }, // Party
      { wch: 20 }, // Bank
      { wch: 15 }, // Payment Method
      { wch: 15 }, // Reference
      { wch: 12 }, // Income
      { wch: 12 }  // Expense
    ]

    utils.book_append_sheet(wb, ws, 'Bank Statement')

    // 5. Save File
    writeFile(wb, `Bank_Statement_${selectedYear}_${selectedMonth === 'all' ? 'All' : months.find(m => m.value === selectedMonth)?.label}.xlsx`)
  }

  if (isLoadingAccounts || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground animate-pulse">Loading transactions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Statement</h1>
          <p className="text-muted-foreground mt-1">
            Track bank-wise income and expenses
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Bank Account</label>
          <select 
            value={selectedBankId} 
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Bank Accounts</option>
            {bankAccounts?.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.account_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Year</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Month</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              ₹{totals.income.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Total Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5" />
              ₹{totals.expense.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-primary/20",
          (totals.income - totals.expense) >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-orange-50/50 dark:bg-orange-950/20"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Change</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totals.income - totals.expense).toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Description & Party</TableHead>
                  <TableHead>Bank & Method</TableHead>
                  <TableHead className="text-right w-[140px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No transactions found for the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={`${tx.type}-${tx.id}`}>
                      <TableCell className="font-medium whitespace-nowrap align-top py-3">
                        <div className="flex flex-col gap-1">
                          <span>{format(parseISO(tx.date), 'dd MMM yyyy')}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{tx.party_name || (tx.type === 'income' ? 'Unknown Payer' : 'Unknown Payee')}</span>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                              {tx.category}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground line-clamp-2">{tx.description}</span>
                          {tx.reference && tx.reference !== tx.payment_mode && (
                             <span className="text-xs text-muted-foreground font-mono">Ref: {tx.reference}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <PaymentMethodInfo 
                          bankAccount={{ account_name: tx.bank_name || '' }}
                          paymentMode={tx.payment_mode}
                          className="items-start"
                        />
                      </TableCell>
                      <TableCell className="text-right align-top py-3">
                        <AmountGstInfo 
                          amount={tx.amount} 
                          showGst={false} 
                          className="items-end"
                          amountClassName={tx.type === 'income' ? "text-green-600 font-bold" : "text-red-600 font-bold"}
                          currencySymbol={tx.type === 'income' ? '+' : '-'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden space-y-4">
        {filteredTransactions.map((tx) => (
          <MobileTransactionCard
            key={`${tx.type}-${tx.id}`}
            title={format(parseISO(tx.date), 'dd MMM yyyy')}
            badge={
              <Badge variant={tx.type === 'income' ? 'outline' : 'destructive'} className="text-[10px]">
                {tx.type.toUpperCase()}
              </Badge>
            }
            fields={[
              { label: 'Party', value: tx.party_name || (tx.type === 'income' ? 'Unknown Payer' : 'Unknown Payee') },
              { label: 'Description', value: (
                <div className="flex flex-col gap-1">
                  <span>{tx.description}</span>
                  <Badge variant="secondary" className="w-fit text-[10px] uppercase font-bold tracking-wider">
                    {tx.category}
                  </Badge>
                </div>
              )},
              { label: 'Bank', value: <PaymentMethodInfo bankAccount={{ account_name: tx.bank_name || '' }} paymentMode={tx.payment_mode} className="items-end" /> },
              { 
                label: 'Amount', 
                value: <AmountGstInfo 
                  amount={tx.amount} 
                  showGst={false} 
                  amountClassName={tx.type === 'income' ? "text-green-600 font-bold" : "text-red-600 font-bold"}
                  currencySymbol={tx.type === 'income' ? '+' : '-'}
                />
              }
            ]}
          />
        ))}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found.
          </div>
        )}
      </div>
    </div>
  )
}

export default BankTransactions
