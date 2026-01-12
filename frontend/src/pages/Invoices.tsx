import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { InvoiceStatsCards } from '@/components/invoices/InvoiceStatsCards'
import { InvoiceTable } from '@/components/invoices/InvoiceTable'
import { Plus, Search } from 'lucide-react'
import { useInvoices } from '@/hooks/useInvoices'
import { useIncome } from '@/hooks/useIncome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/PageHeader'

type FilterType = 'OUTSTANDING' | 'SETTLED' | 'MONTHLY' | 'ALL'

export default function Invoices() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL')

  const { data: invoices, isLoading: loadingInvoices } = useInvoices()
  const { data: collections, isLoading: loadingCollections } = useIncome()

  const filteredInvoices = invoices?.filter(inv => {
    const collected = inv.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
    const isPaid = collected >= inv.total_amount - 0.1
    
    if (activeFilter === 'OUTSTANDING' && isPaid) return false
    if (activeFilter === 'SETTLED' && !isPaid) return false
    if (activeFilter === 'MONTHLY') {
      const date = new Date(inv.date)
      const now = new Date()
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false
    }
    
    const searchStr = `${inv.invoice_number} ${inv.project?.project_id_code} ${inv.project?.customer?.name} ${inv.customer?.name}`.toLowerCase()
    return searchStr.includes(searchQuery.toLowerCase())
  })

  if (loadingInvoices || loadingCollections) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground italic">Syncing Invoices & Collections...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Invoices" 
        description="Manage your receivables and billing status"
      >
          <Button asChild variant="outline">
            <Link to={`/${orgSlug}/income/new`}>
              <Plus className="mr-2 h-3 w-3" />
              Quick Collection
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/${orgSlug}/invoices/new`}>
              <Plus className="mr-2 h-3 w-3" />
              New Invoice
            </Link>
          </Button>
      </PageHeader>

      <InvoiceStatsCards 
        invoices={invoices}
        income={collections}
        activeFilter={activeFilter}
        onOutstandingClick={() => setActiveFilter(prev => prev === 'OUTSTANDING' ? 'ALL' : 'OUTSTANDING')}
        onSettledClick={() => setActiveFilter(prev => prev === 'SETTLED' ? 'ALL' : 'SETTLED')}
        onMonthlyCollectionsClick={() => setActiveFilter(prev => prev === 'MONTHLY' ? 'ALL' : 'MONTHLY')}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices by number, project or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      <InvoiceTable 
        invoices={filteredInvoices || []} 
        isLoading={false} 
      />
    </div>
  )
}
