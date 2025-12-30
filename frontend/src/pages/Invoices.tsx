import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Eye, ChevronRight } from 'lucide-react'
import { useInvoices, useDeleteInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { InvoiceViewModal } from '@/components/InvoiceViewModal'
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotesManager } from '@/components/NotesManager'
import type { Note, Invoice } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { MobileTransactionCard } from '@/components/MobileTransactionCard'

export default function Invoices() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: invoices, isLoading } = useInvoices()
  const deleteInvoice = useDeleteInvoice()
  const updateInvoice = useUpdateInvoice()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsViewModalOpen(true)
  }

  const handleHistory = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsHistoryModalOpen(true)
  }

  const filteredInvoices = invoices?.filter((invoice) => {
    const searchMatch = 
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.project?.project_id_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.project?.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    return searchMatch
  })

  const handleDelete = (id: string) => {
    deleteInvoice.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading invoices...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage sales invoices
          </p>
        </div>
        <Button asChild>
          <Link to={`/${orgSlug}/invoices/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, project, or customer..."
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Project / Customer</TableHead>
                  <TableHead>Taxable Value</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices?.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {format(new Date(invoice.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-semibold">{invoice.invoice_number}</span>
                      </TableCell>
                      <TableCell>
                        {invoice.project ? (
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-semibold">{invoice.project.project_id_code}</span>
                            <span className="text-sm">{invoice.project.customer?.name}</span>
                          </div>
                        ) : invoice.customer ? (
                          <span className="text-sm font-medium">{invoice.customer.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">No Project / Customer</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{invoice.taxable_value.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.gst_percentage}%</Badge>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ₹{invoice.gst_amount.toLocaleString('en-IN')}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ₹{invoice.total_amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {(invoice.total_amount - (invoice.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)) <= 0 ? (
                            <Badge variant="success">Paid</Badge>
                          ) : (
                            <span className="text-orange-600">
                              ₹{(invoice.total_amount - (invoice.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)).toLocaleString('en-IN')}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleHistory(invoice)}
                            title="View Payment History"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-primary">
                          <NotesManager
                            notes={invoice.notes}
                            onUpdate={async (newNotes: Note[]) => {
                              await updateInvoice.mutateAsync({
                                id: invoice.id,
                                input: { notes: newNotes }
                              })
                            }}
                            title={`Notes for Invoice ${invoice.invoice_number}`}
                            entityName={`Invoice ${invoice.invoice_number}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/${orgSlug}/invoices/${invoice.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete invoice {invoice.invoice_number} of ₹{invoice.total_amount.toLocaleString('en-IN')}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(invoice.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
        {filteredInvoices?.map((invoice) => (
          <MobileTransactionCard
            key={invoice.id}
            title={format(new Date(invoice.date), 'dd MMM yyyy')}
            badge={<Badge variant="outline">{invoice.invoice_number}</Badge>}
            fields={[
              { 
                label: 'Project', 
                value: invoice.project ? (
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs">{invoice.project.project_id_code}</span>
                    <span className="text-xs text-muted-foreground">{invoice.project.customer?.name}</span>
                  </div>
                ) : invoice.customer ? (
                  <span className="text-xs font-medium">{invoice.customer.name}</span>
                ) : 'No Project'
              },
              {
                label: 'Taxable Value',
                value: `₹${invoice.taxable_value.toLocaleString('en-IN')}`
              },
              {
                label: 'GST',
                value: `${invoice.gst_percentage}% (₹${invoice.gst_amount.toLocaleString('en-IN')})`
              },
              { 
                label: 'Total', 
                value: `₹${invoice.total_amount.toLocaleString('en-IN')}`, 
                className: 'text-green-600 font-bold' 
              },
              {
                label: 'Pending',
                value: (
                  <div className="flex items-center gap-2">
                    {(invoice.total_amount - (invoice.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)) <= 0 ? (
                      <Badge variant="success">Paid</Badge>
                    ) : (
                      <span className="text-orange-600 font-bold">
                        ₹{(invoice.total_amount - (invoice.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)).toLocaleString('en-IN')}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleHistory(invoice)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              }
            ]}
            notesProps={{
              notes: invoice.notes,
              onUpdate: async (newNotes) => {
                await updateInvoice.mutateAsync({
                  id: invoice.id,
                  input: { notes: newNotes }
                })
              },
              title: `Notes for Invoice ${invoice.invoice_number}`,
              entityName: `Invoice ${invoice.invoice_number}`
            }}
            editLink={`/${orgSlug}/invoices/${invoice.id}/edit`}
            onDelete={() => handleDelete(invoice.id)}
            deleteTitle="Delete Invoice"
            deleteDescription={`Are you sure you want to delete invoice ${invoice.invoice_number} of ₹${invoice.total_amount.toLocaleString('en-IN')}?`}
          />
        ))}
      </div>

      <InvoiceViewModal
        invoice={selectedInvoice}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
      />

      <PaymentHistoryModal
        title={selectedInvoice?.invoice_number || ''}
        totalLabel="Total Amount"
        totalAmount={selectedInvoice?.total_amount || 0}
        income={selectedInvoice?.income}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  )
}
