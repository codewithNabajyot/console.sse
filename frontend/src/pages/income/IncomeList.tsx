import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, ChevronRight, MoreVertical } from 'lucide-react'
import { useIncome, useDeleteIncome, useUpdateIncome } from '@/hooks/useIncome'
import { IncomeStatsCards } from '@/components/income/IncomeStatsCards'
import { QuickLinkInvoiceModal } from '@/components/income/QuickLinkInvoiceModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotesManager } from '@/components/NotesManager'
import type { Note } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { MobileTransactionCard } from '@/components/MobileTransactionCard'
import { ProjectCustomerInfo } from '@/components/shared/ProjectCustomerInfo'
import { AmountGstInfo } from '@/components/shared/AmountGstInfo'
import { PaymentMethodInfo } from '@/components/shared/PaymentMethodInfo'

type FilterType = 'UNALLOCATED' | 'MONTHLY' | 'TOTAL' | 'ALL'

export default function IncomeList() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL')
  const [selectedIncome, setSelectedIncome] = useState<any>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

  const { data: incomeRecords, isLoading } = useIncome()
  const deleteIncome = useDeleteIncome()
  const updateIncome = useUpdateIncome()

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

  const handleDelete = (id: string) => {
    deleteIncome.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading income records...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage incoming payments
          </p>
        </div>
        <Button asChild>
          <Link to={`/${orgSlug}/income/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Record Income
          </Link>
        </Button>
      </div>

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

      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project / Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank & Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncome?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No income records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncome?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <ProjectCustomerInfo project={record.project} customer={record.customer} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <AmountGstInfo amount={record.amount} showGst={false} amountClassName="text-green-600" />
                      </TableCell>
                      <TableCell>
                        <PaymentMethodInfo bankAccount={record.bank_account} paymentMode={record.payment_mode} />
                      </TableCell>
                      <TableCell>
                        {record.invoice ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold leading-tight">Linked to</span>
                            <span className="font-mono text-[10px] font-bold text-blue-600">INV: {record.invoice.invoice_number}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group/status">
                            <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-600 border-amber-200 uppercase font-bold px-1.5">Unallocated</Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-amber-600 transition-all"
                              onClick={() => {
                                setSelectedIncome(record)
                                setIsLinkModalOpen(true)
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <NotesManager
                            notes={record.notes}
                            onUpdate={async (newNotes: Note[]) => {
                              await updateIncome.mutateAsync({
                                id: record.id,
                                input: { notes: newNotes }
                              })
                            }}
                            title={`Notes: Collection ₹${record.amount.toLocaleString('en-IN')}`}
                            entityName="Income Record"
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/${orgSlug}/income/${record.id}/edit`} className="flex items-center">
                                  <Pencil className="mr-2 h-3 w-3" /> Edit Record
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive font-medium"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete this income record of ₹${record.amount.toLocaleString('en-IN')}?`)) {
                                    handleDelete(record.id)
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-3 w-3" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
        {filteredIncome?.map((record) => (
          <MobileTransactionCard
            key={record.id}
            title={format(new Date(record.date), 'dd MMM yyyy')}
            badge={<Badge variant="outline">{record.category || 'N/A'}</Badge>}
            fields={[
              { 
                label: 'Source', 
                value: <ProjectCustomerInfo project={record.project} customer={record.customer} layout="horizontal" className="justify-end" />
              },
              { 
                label: 'Amount', 
                value: <AmountGstInfo amount={record.amount} showGst={false} amountClassName="text-green-600" />, 
              },
              { 
                label: 'Bank & Method', 
                value: <PaymentMethodInfo bankAccount={record.bank_account} paymentMode={record.payment_mode} className="items-end" />
              },
              {
                label: 'Status',
                value: record.invoice ? (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Linked</span>
                    <span className="font-mono text-[10px] font-bold text-blue-600">INV: {record.invoice.invoice_number}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-600 border-amber-200 uppercase font-bold px-1.5">Unallocated</Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-amber-600"
                      onClick={() => {
                        setSelectedIncome(record)
                        setIsLinkModalOpen(true)
                      }}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              }
            ]}
            notesProps={{
              notes: record.notes,
              onUpdate: async (newNotes) => {
                await updateIncome.mutateAsync({
                  id: record.id,
                  input: { notes: newNotes }
                })
              },
              title: `Notes for Income ₹${record.amount.toLocaleString('en-IN')}`,
              entityName: "Income Record"
            }}
            editLink={`/${orgSlug}/income/${record.id}/edit`}
            onDelete={() => handleDelete(record.id)}
            deleteTitle="Delete Income Record"
            deleteDescription={`Are you sure you want to delete this income record of ₹${record.amount.toLocaleString('en-IN')}?`}
          />
        ))}
      </div>
      <QuickLinkInvoiceModal 
        income={selectedIncome}
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false)
          setSelectedIncome(null)
        }}
      />
    </div>
  )
}
