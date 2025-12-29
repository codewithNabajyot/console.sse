import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useExpenses, useDeleteExpense, useUpdateExpense } from '@/hooks/useExpenses'
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

export default function ExpenseList() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: expenses, isLoading } = useExpenses()
  const deleteExpense = useDeleteExpense()
  const updateExpense = useUpdateExpense()

  const filteredExpenses = expenses?.filter((record) => {
    const searchMatch = 
      record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.project?.project_id_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return searchMatch
  })

  const handleDelete = (id: string) => {
    deleteExpense.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading expenses...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage outgoing payments
          </p>
        </div>
        <Button asChild>
          <Link to={`/${orgSlug}/expenses/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by vendor, project, or description..."
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
                  <TableHead>Description / Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid From</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium line-clamp-1" title={record.description || ''}>
                            {record.description || '—'}
                          </span>
                          {record.project ? (
                            <span className="font-mono text-[10px] text-muted-foreground">{record.project.project_id_code}</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Common</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        ₹{record.total_paid.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {record.bank_account?.account_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-primary">
                          <NotesManager
                            notes={record.notes}
                            onUpdate={async (newNotes: Note[]) => {
                              await updateExpense.mutateAsync({
                                id: record.id,
                                input: { notes: newNotes }
                              })
                              // We can use toast here if needed, but match existing UX
                            }}
                            title={`Notes for ${record.vendor?.name || 'Expense'}`}
                            entityName={record.vendor?.name || 'Expense Record'}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/${orgSlug}/expenses/${record.id}/edit`}>
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
                                  Are you sure you want to delete this expense record of ₹{record.total_paid.toLocaleString('en-IN')}? This action cannot be undone.
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
        {filteredExpenses?.map((record) => (
          <MobileTransactionCard
            key={record.id}
            title={format(new Date(record.date), 'dd MMM yyyy')}
            badge={<Badge variant="outline">{record.category || 'N/A'}</Badge>}
            fields={[
              { 
                label: 'Project', 
                value: record.project ? (
                  <span className="font-mono text-xs">{record.project.project_id_code}</span>
                ) : 'Common'
              },
              {
                label: 'Description',
                value: <span className="line-clamp-1">{record.description || '—'}</span>
              },
              { 
                label: 'Amount', 
                value: `₹${record.total_paid.toLocaleString('en-IN')}`, 
                className: 'text-red-600 font-bold' 
              },
              {
                label: 'Vendor',
                value: record.vendor?.name || '—'
              },
              { 
                label: 'Bank', 
                value: record.bank_account?.account_name 
              }
            ]}
            notesProps={{
              notes: record.notes,
              onUpdate: async (newNotes) => {
                await updateExpense.mutateAsync({
                  id: record.id,
                  input: { notes: newNotes }
                })
              },
              title: `Notes for ${record.vendor?.name || 'Expense'}`,
              entityName: record.vendor?.name || 'Expense Record'
            }}
            editLink={`/${orgSlug}/expenses/${record.id}/edit`}
            onDelete={() => handleDelete(record.id)}
            deleteTitle="Delete Expense Record"
            deleteDescription={`Are you sure you want to delete this expense record of ₹${record.total_paid.toLocaleString('en-IN')}?`}
          />
        ))}
      </div>
    </div>
  )
}
