import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Search, MoreVertical, Pencil, Trash2, FileText } from 'lucide-react'
import { useInvoices, useDeleteInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { useIncome } from '@/hooks/useIncome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { NotesManager } from '@/components/NotesManager'
import { format } from 'date-fns'
import { MobileTransactionCard } from '@/components/MobileTransactionCard'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { InvoiceStatsCards } from '@/components/invoices/InvoiceStatsCards'
import { RecordCollectionModal } from '@/components/invoices/RecordCollectionModal'
import { AllocateIncomeModal } from '@/components/invoices/AllocateIncomeModal'
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal'
import { ProjectCustomerInfo } from '@/components/shared/ProjectCustomerInfo'
import { AmountGstInfo } from '@/components/shared/AmountGstInfo'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Invoice } from '@/lib/types'

type FilterType = 'OUTSTANDING' | 'SETTLED' | 'MONTHLY' | 'ALL'

export default function Invoices() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL')

  const { data: invoices, isLoading: loadingInvoices } = useInvoices()
  const { data: collections, isLoading: loadingCollections } = useIncome()
  const deleteInvoice = useDeleteInvoice()
  const updateInvoice = useUpdateInvoice()

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'invoice'; title: string } | null>(null)

  // Handlers
  const handleRecordCollection = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsRecordModalOpen(true)
  }

  const handleViewHistory = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsHistoryModalOpen(true)
  }

  const handleAllocateIncome = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsAllocateModalOpen(true)
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your receivables and billing status
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

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

      {/* DESKTOP VIEW */}
      <div className="hidden md:block">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Invoice & Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Doc</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                      No invoices found matching filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices?.map(inv => {
                    const attachment = inv.attachments?.[0]
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold py-4">
                          {format(new Date(inv.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-bold text-blue-600">{inv.invoice_number}</span>
                            <ProjectCustomerInfo project={inv.project} customer={inv.customer} />
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <AmountGstInfo 
                            amount={inv.total_amount} 
                            gstPercentage={inv.gst_percentage} 
                            gstAmount={inv.gst_amount} 
                          />
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge 
                            invoice={inv} 
                            onPayClick={handleRecordCollection}
                            onAllocateClick={handleAllocateIncome}
                            onViewHistoryClick={handleViewHistory}
                          />
                        </TableCell>
                        <TableCell>
                          {attachment ? (
                            <Button variant="ghost" size="icon" asChild title="View Invoice">
                              <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 text-primary" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium border border-red-100">No File</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <NotesManager
                              notes={inv.notes}
                              onUpdate={async (newNotes) => {
                                await updateInvoice.mutateAsync({ id: inv.id, input: { notes: newNotes } })
                              }}
                              title={`Notes: ${inv.invoice_number}`}
                              entityName="Invoice"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/${orgSlug}/invoices/${inv.id}/edit`} className="flex items-center">
                                    <Pencil className="mr-2 h-3 w-3" /> Edit Invoice
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive font-medium"
                                  onClick={() => setDeleteConfirm({ id: inv.id, type: 'invoice', title: inv.invoice_number })}
                                >
                                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-4 pb-20">
        {filteredInvoices?.map(inv => (
          <MobileTransactionCard
            key={inv.id}
            title={format(new Date(inv.date), 'dd MMM yyyy')}
            badge={<span className="font-mono font-bold text-blue-600">{inv.invoice_number}</span>}
            fields={[
              { label: 'Client / Proj', value: <ProjectCustomerInfo project={inv.project} customer={inv.customer} layout="horizontal" /> },
              { label: 'Amount', value: <AmountGstInfo amount={inv.total_amount} gstPercentage={inv.gst_percentage} layout="horizontal" />, className: 'font-bold' },
              { 
                label: 'Status', 
                value: <InvoiceStatusBadge 
                  invoice={inv} 
                  onPayClick={handleRecordCollection}
                  onAllocateClick={handleAllocateIncome}
                  onViewHistoryClick={handleViewHistory}
               /> 
              },
              { 
                label: 'Invoice', 
                value: inv.attachments?.[0] ? (
                  <a href={inv.attachments[0].file_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary font-medium">
                    <FileText className="h-3 w-3 mr-1" /> View Document
                  </a>
                ) : <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium border border-red-100 italic">No file</span>
              }
            ]}
            notesProps={{ 
              notes: inv.notes, 
              onUpdate: async (newNotes) => {
                await updateInvoice.mutateAsync({ id: inv.id, input: { notes: newNotes } })
              }, 
              title: inv.invoice_number, 
              entityName: 'Invoice' 
            }}
            editLink={`/${orgSlug}/invoices/${inv.id}/edit`}
            onDelete={() => setDeleteConfirm({ id: inv.id, type: 'invoice', title: inv.invoice_number })}
          />
        ))}
      </div>

      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button asChild className="rounded-full h-14 w-14 shadow-2xl">
          <Link to={`/${orgSlug}/invoices/new`}>
            <Plus className="h-6 w-6" />
          </Link>
        </Button>
      </div>

      {/* Modals */}
      <RecordCollectionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        initialInvoice={selectedInvoice}
      />

      <AllocateIncomeModal 
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        invoice={selectedInvoice}
      />

      <PaymentHistoryModal
        title={selectedInvoice?.invoice_number || 'Collection History'}
        totalLabel="Invoice Amount"
        totalAmount={selectedInvoice?.total_amount || 0}
        income={selectedInvoice?.income}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteConfirm?.type} <strong>{deleteConfirm?.title}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  deleteInvoice.mutate(deleteConfirm.id)
                }
                setDeleteConfirm(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
