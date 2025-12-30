import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useIncome, useDeleteIncome, useUpdateIncome } from '@/hooks/useIncome'
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

export default function IncomeList() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: incomeRecords, isLoading } = useIncome()
  const deleteIncome = useDeleteIncome()
  const updateIncome = useUpdateIncome()

  const filteredIncome = incomeRecords?.filter((record) => {
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
                  <TableHead>Bank Account</TableHead>
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
                        <div className="flex flex-col">
                          {record.invoice && (
                            <span className="font-mono text-[10px] font-bold text-blue-600">INV: {record.invoice.invoice_number}</span>
                          )}
                          {record.project ? (
                            <>
                              <span className="font-mono text-xs font-semibold">{record.project.project_id_code}</span>
                              <span className="text-sm">{record.project.customer?.name}</span>
                            </>
                          ) : record.customer ? (
                            <span className="text-sm font-medium">{record.customer.name}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Common</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ₹{record.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {record.bank_account?.account_name}
                          <div className="text-xs text-muted-foreground">{record.bank_account?.bank_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-primary">
                          <NotesManager
                            notes={record.notes}
                            onUpdate={async (newNotes: Note[]) => {
                              await updateIncome.mutateAsync({
                                id: record.id,
                                input: { notes: newNotes }
                              })
                            }}
                            title={`Notes for Income ₹${record.amount.toLocaleString('en-IN')}`}
                            entityName="Income Record"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/${orgSlug}/income/${record.id}/edit`}>
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
                                <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this income record of ₹{record.amount.toLocaleString('en-IN')}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(record.id)}
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
        {filteredIncome?.map((record) => (
          <MobileTransactionCard
            key={record.id}
            title={format(new Date(record.date), 'dd MMM yyyy')}
            badge={<Badge variant="outline">{record.category || 'N/A'}</Badge>}
            fields={[
              { 
                label: 'Source', 
                value: (
                  <div className="flex flex-col items-end">
                    {record.invoice && (
                      <span className="font-mono text-[10px] font-bold text-blue-600">INV: {record.invoice.invoice_number}</span>
                    )}
                    {record.project ? (
                      <>
                        <span className="font-mono text-xs">{record.project.project_id_code}</span>
                        <span className="text-xs text-muted-foreground">{record.project.customer?.name}</span>
                      </>
                    ) : record.customer ? (
                      <span className="text-xs font-medium">{record.customer.name}</span>
                    ) : 'Common'}
                  </div>
                )
              },
              { 
                label: 'Amount', 
                value: `₹${record.amount.toLocaleString('en-IN')}`, 
                className: 'text-green-600 font-bold' 
              },
              { 
                label: 'Bank', 
                value: record.bank_account?.account_name 
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
    </div>
  )
}
