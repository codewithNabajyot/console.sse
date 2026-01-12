import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useIncome } from '@/hooks/useIncome'
import { IncomeStatsCards } from '@/components/income/IncomeStatsCards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IncomeTable } from '@/components/income/IncomeTable'
import { PageHeader } from '@/components/shared/PageHeader'

type FilterType = 'UNALLOCATED' | 'MONTHLY' | 'TOTAL' | 'ALL'

export default function IncomeList() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL')

  const { data: incomeRecords, isLoading } = useIncome()

  const filteredIncome = incomeRecords?.filter((record) => {
    // Stats Filtering
    if (activeFilter === 'UNALLOCATED' && record.invoice_id) return false
    if (activeFilter === 'MONTHLY') {
      const date = new Date(record.date)
      const now = new Date()
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false
    }

    // Search Filtering
    const searchMatch = 
      record.received_from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.project?.project_id_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.project?.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.invoice?.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return searchMatch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading income records...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Track and manage incoming payments"
      >
        <Button asChild>
          <Link to={`/${orgSlug}/income/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Record Income
          </Link>
        </Button>
      </PageHeader>

      <IncomeStatsCards 
        income={incomeRecords}
        activeFilter={activeFilter}
        onTotalClick={() => setActiveFilter(prev => prev === 'TOTAL' ? 'ALL' : 'TOTAL')}
        onUnallocatedClick={() => setActiveFilter(prev => prev === 'UNALLOCATED' ? 'ALL' : 'UNALLOCATED')}
        onMonthlyClick={() => setActiveFilter(prev => prev === 'MONTHLY' ? 'ALL' : 'MONTHLY')}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by project, customer, or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <IncomeTable 
        incomeRecords={filteredIncome || []} 
        isLoading={isLoading} 
      />
    </div>
  )
}
