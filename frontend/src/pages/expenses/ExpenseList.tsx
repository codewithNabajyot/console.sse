import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useExpenses } from '@/hooks/useExpenses'
import { useExpensePayments } from '@/hooks/useExpensePayments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExpenseStatsCards } from '@/components/expenses/ExpenseStatsCards'
import { ExpenseTable } from '@/components/expenses/ExpenseTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { RecordPaymentModal } from '@/components/expenses/RecordPaymentModal'

export default function ExpenseList() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [outstandingOnly, setOutstandingOnly] = useState(false)
  const [unusedOnly, setUnusedOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('expenses')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Expenses Hooks
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses()
  const { data: payments, isLoading: isLoadingPayments } = useExpensePayments()

  const filteredExpenses = expenses?.filter((record) => {
    const searchMatch = 
      record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.project?.project_id_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.expense_number?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!searchMatch) return false
    
    if (outstandingOnly) {
      if (record.bank_account_id) return false
      const allocated = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
      return allocated < record.total_paid - 0.1
    }

    return true
  })

  const filteredPayments = (payments || []).filter(p => {
    const searchMatch = !searchQuery || 
      p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.bank_account?.account_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!searchMatch) return false

    if (unusedOnly) {
      const used = p.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
      return p.amount - used > 0.1
    }

    return true
  })

  if (isLoadingExpenses || isLoadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground italic animate-pulse">Syncing expenses...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage business expenses and vendor bills"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
          <Button asChild>
            <Link to={`/${orgSlug}/expenses/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        </div>
      </PageHeader>

      <ExpenseStatsCards 
        expenses={expenses}
        payments={payments}
        isActiveOutstanding={outstandingOnly}
        isActiveUnused={unusedOnly}
        onOutstandingClick={() => {
          setOutstandingOnly(!outstandingOnly)
          if (!outstandingOnly) setActiveTab('expenses')
        }}
        onUnusedAdvancesClick={() => {
          setUnusedOnly(!unusedOnly)
          if (!unusedOnly) setActiveTab('payments')
        }}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab === 'expenses' ? 'bills' : 'payments'} by vendor, project, or description...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ExpenseTable 
        expenses={filteredExpenses || []} 
        payments={filteredPayments || []} 
        isLoading={isLoadingExpenses || isLoadingPayments}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <RecordPaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  )
}
