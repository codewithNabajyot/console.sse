import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MoreVertical, Pencil, Trash2, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useUpdateInvoice, useDeleteInvoice } from '@/hooks/useInvoices'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NotesManager } from '@/components/NotesManager'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
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
import { MobileTransactionCard } from '@/components/MobileTransactionCard'
import { RecordCollectionModal } from '@/components/invoices/RecordCollectionModal'
import { AllocateIncomeModal } from '@/components/invoices/AllocateIncomeModal'
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal'
import type { Invoice } from '@/lib/types'

interface InvoiceTableProps {
  invoices: Invoice[]
  isLoading?: boolean
  showProjectInfo?: boolean
  isProjectContext?: boolean
  isReadOnly?: boolean
}

export function InvoiceTable({ 
  invoices, 
  isLoading, 
  showProjectInfo = true,
  isProjectContext = false,
  isReadOnly = false
}: InvoiceTableProps) {
  const { orgSlug } = useParams()
  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'invoice'; title: string } | null>(null)

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

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground italic">Syncing Invoices...</div>
  }

  return (
    <>
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
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(inv => {
                    const attachment = inv.attachments?.[0]
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold py-4">
                          {format(new Date(inv.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-bold text-blue-600">{inv.invoice_number}</span>
                            {showProjectInfo && <ProjectCustomerInfo project={inv.project} customer={inv.customer} />}
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
                            {!isReadOnly && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/${orgSlug}/invoices/${inv.id}/edit${isProjectContext && inv.project_id ? `?project_id=${inv.project_id}` : ''}`} className="flex items-center">
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
                            )}
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
      <div className="md:hidden space-y-4">
        {invoices.map(inv => (
          <MobileTransactionCard
            key={inv.id}
            title={format(new Date(inv.date), 'dd MMM yyyy')}
            badge={<span className="font-mono font-bold text-blue-600">{inv.invoice_number}</span>}
            fields={[
              ...(showProjectInfo ? [{ label: 'Client / Proj', value: <ProjectCustomerInfo project={inv.project} customer={inv.customer} layout="horizontal" /> }] : []),
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
            editLink={isReadOnly ? undefined : `/${orgSlug}/invoices/${inv.id}/edit${isProjectContext && inv.project_id ? `?project_id=${inv.project_id}` : ''}`}
            onDelete={isReadOnly ? undefined : () => setDeleteConfirm({ id: inv.id, type: 'invoice', title: inv.invoice_number })}
          />
        ))}
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
    </>
  )
}
