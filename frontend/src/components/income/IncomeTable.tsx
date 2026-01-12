import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil, Trash2, ChevronRight, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'
import { useDeleteIncome, useUpdateIncome } from '@/hooks/useIncome'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotesManager } from '@/components/NotesManager'
import { QuickLinkInvoiceModal } from '@/components/income/QuickLinkInvoiceModal'
import { ProjectCustomerInfo } from '@/components/shared/ProjectCustomerInfo'
import { AmountGstInfo } from '@/components/shared/AmountGstInfo'
import { PaymentMethodInfo } from '@/components/shared/PaymentMethodInfo'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobileTransactionCard } from '@/components/MobileTransactionCard'
import type { Income, Note } from '@/lib/types'

interface IncomeTableProps {
  incomeRecords: Income[]
  isLoading?: boolean
  showProjectInfo?: boolean
  isProjectContext?: boolean
  isReadOnly?: boolean
}

export function IncomeTable({ 
  incomeRecords, 
  isLoading, 
  showProjectInfo = true,
  isProjectContext = false,
  isReadOnly = false
}: IncomeTableProps) {
  const { orgSlug } = useParams()
  const deleteIncome = useDeleteIncome()
  const updateIncome = useUpdateIncome()
  const [selectedIncome, setSelectedIncome] = useState<any>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

  const handleDelete = (id: string) => {
    deleteIncome.mutate(id)
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground italic">Loading income records...</div>
  }

  return (
    <>
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
                {incomeRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No income records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  incomeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium text-xs">
                        {format(new Date(record.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <ProjectCustomerInfo 
                          project={record.project} 
                          customer={record.customer} 
                        />
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
                          {!isReadOnly && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/${orgSlug}/income/${record.id}/edit${isProjectContext && record.project_id ? `?project_id=${record.project_id}` : ''}`} className="flex items-center">
                                    <Pencil className="mr-2 h-3 w-3" /> Edit Record
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
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
                          )}
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
        {incomeRecords.map((record) => (
          <MobileTransactionCard
            key={record.id}
            title={format(new Date(record.date), 'dd MMM yyyy')}
            badge={<Badge variant="outline">{record.category || 'N/A'}</Badge>}
            fields={[
              ...(showProjectInfo && record.project ? [{ 
                label: 'Source', 
                value: <ProjectCustomerInfo project={record.project} customer={record.customer} layout="horizontal" className="justify-end" />
              }] : []),
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
            editLink={`/${orgSlug}/income/${record.id}/edit${isProjectContext && isProjectContext && record.project_id ? `?project_id=${record.project_id}` : ''}`}
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
    </>
  )
}
