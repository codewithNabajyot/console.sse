import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, Link as LinkIcon, ChevronRight, MoreVertical } from 'lucide-react'
import { useExpenses, useDeleteExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { useExpensePayments, useDeleteExpensePayment, useUpdateExpensePayment } from '@/hooks/useExpensePayments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotesManager } from '@/components/NotesManager'
import type { Note, ExpensePayment, Expense } from '@/lib/types'
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
import { RecordPaymentModal } from '@/components/expenses/RecordPaymentModal'
import { AllocatePaymentModal } from '@/components/expenses/AllocatePaymentModal'
import { ViewAllocationsModal } from '@/components/expenses/ViewAllocationsModal'
import { ExpenseStatsCards } from '@/components/expenses/ExpenseStatsCards'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ExpenseList() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<ExpensePayment | null>(null)
  const [allocatingPayment, setAllocatingPayment] = useState<ExpensePayment | null>(null)
  const [viewingAllocation, setViewingAllocation] = useState<{ type: 'payment' | 'expense', record: ExpensePayment | Expense } | null>(null)
  const [payingBill, setPayingBill] = useState<{ id: string, expense_number?: string, vendor_id: string, project_id?: string | null, amount: number } | null>(null)

  // Expenses Hooks
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses()
  const deleteExpense = useDeleteExpense()
  const updateExpense = useUpdateExpense()

  // Payments Hooks
  const { data: payments, isLoading: isLoadingPayments } = useExpensePayments()
  const deletePayment = useDeleteExpensePayment()
  const updatePayment = useUpdateExpensePayment()

  const filteredExpenses = expenses?.filter((record) => {
    const searchMatch = 
      record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.project?.project_id_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return searchMatch
  })

  const filteredPayments = payments?.filter((record) => {
    const searchMatch = 
      record.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.project?.project_id_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.bank_account?.account_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    return searchMatch
  })

  const handleDeleteExpense = (id: string) => {
    deleteExpense.mutate(id)
  }

  const handleDeletePayment = (id: string) => {
    deletePayment.mutate(id)
  }

  const handleEditPayment = (payment: ExpensePayment) => {
    setEditingPayment(payment)
    setIsPaymentModalOpen(true)
  }

  const handleAllocatePayment = (payment: ExpensePayment) => {
     setAllocatingPayment(payment)
  }

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false)
    setEditingPayment(null)
    setPayingBill(null)
  }

  const getStatusBadge = (record: Expense) => {
     if (record.bank_account_id) {
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Paid</Badge>
     }
     
     const allocatedAmount = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
     
     if (allocatedAmount >= record.total_paid - 0.1) { // Floating point tolerance
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 whitespace-nowrap">Paid</Badge>
     }

     if (allocatedAmount > 0) {
        const pending = record.total_paid - allocatedAmount
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200 whitespace-nowrap">
           Partial (₹{pending.toLocaleString('en-IN')})
        </Badge>
     }

     return <Badge variant="destructive" className="whitespace-nowrap">Unpaid</Badge>
  }

  const isLoading = isLoadingExpenses || isLoadingPayments

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses & Payments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your bills and vendor payments
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
             <Plus className="mr-2 h-4 w-4" />
             Record Payment
           </Button>
           <Button asChild>
            <Link to={`/${orgSlug}/expenses/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Record Expense
            </Link>
          </Button>
        </div>
      </div>

      <ExpenseStatsCards expenses={expenses} payments={payments} />

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="expenses">Bills & Expenses</TabsTrigger>
          <TabsTrigger value="payments">Vendor Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Bill & Project</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[140px]">Category</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No expenses found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses?.map((record) => {
                        const allocated = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                        return (
                            <TableRow key={record.id} className="group hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-mono text-[10px] text-muted-foreground">{record.expense_number || '-'}</span>
                                  {record.project ? (
                                    <span className="text-xs font-semibold text-primary truncate max-w-[160px]" title={record.project.project_id_code}>
                                      {record.project.project_id_code}
                                      {record.project.customer?.name && (
                                        <span className="block text-[10px] font-normal text-muted-foreground truncate">
                                          {record.project.customer.name}
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">Common</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(record.date), 'dd MMM yyyy')}
                              </TableCell>
                              <TableCell>
                                 <span className="text-sm font-medium line-clamp-1" title={record.description || ''}>
                                   {record.description || '—'}
                                 </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal text-xs whitespace-nowrap">{record.category || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="font-bold text-red-600/80">
                                ₹{record.total_paid.toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell>
                                 <div className="flex items-center gap-1">
                                    {getStatusBadge(record)}
                                    {(record.allocations?.length || 0) > 0 && (
                                       <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                                          onClick={() => setViewingAllocation({ type: 'expense', record })}
                                          title="View Links"
                                       >
                                          <ChevronRight className="w-4 h-4" />
                                       </Button>
                                    )}
                                 </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-1">
                                  {!record.bank_account_id && allocated < record.total_paid - 0.1 && (
                                     <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 px-3 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 font-bold transition-all"
                                        onClick={() => {
                                           setPayingBill({
                                              id: record.id,
                                              expense_number: record.expense_number,
                                              vendor_id: record.vendor_id!,
                                              project_id: record.project_id,
                                              amount: record.total_paid - allocated
                                           })
                                           setIsPaymentModalOpen(true)
                                        }}
                                     >
                                        Pay
                                     </Button>
                                  )}

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem asChild>
                                        <Link to={`/${orgSlug}/expenses/${record.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                                          <Pencil className="h-3.5 w-3.5" /> Edit
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <div className="-mx-2 -my-1.5 w-[calc(100%+1rem)] py-1.5 px-2 flex items-center gap-2 whitespace-nowrap">
                                          <NotesManager
                                            notes={record.notes}
                                            onUpdate={async (newNotes: Note[]) => {
                                              await updateExpense.mutateAsync({
                                                id: record.id,
                                                input: { notes: newNotes }
                                              })
                                            }}
                                            title={`Notes for ${record.vendor?.name || 'Expense'}`}
                                            entityName={record.vendor?.name || 'Expense Record'}
                                          />
                                          <span className="text-sm">Notes</span>
                                        </div>
                                      </DropdownMenuItem>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer font-medium">
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete this expense record of ₹{record.total_paid.toLocaleString('en-IN')}?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeleteExpense(record.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
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

          <div className="md:hidden space-y-4">
            {filteredExpenses?.map((record) => (
              <MobileTransactionCard
                key={record.id}
                title={record.expense_number || 'Expense'}
                badge={record.category ? <Badge variant="outline">{record.category}</Badge> : null}
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
                    className: 'text-red-600/80 font-bold' 
                  },
                  {
                    label: 'Status',
                    value: getStatusBadge(record)
                  },
                  {
                    label: 'Vendor',
                    value: record.vendor?.name || '—'
                  },
                  {
                    label: 'Links',
                    value: (record.allocations?.length || 0) > 0 ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => setViewingAllocation({ type: 'expense', record })}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : '—'
                  }
                ]}
                notesProps={{
                  notes: record.notes,
                  onUpdate: async (newNotes: Note[]) => {
                    await updateExpense.mutateAsync({
                      id: record.id,
                      input: { notes: newNotes }
                    })
                  },
                  title: `Notes for ${record.vendor?.name || 'Expense'}`,
                  entityName: record.vendor?.name || 'Expense Record'
                }}
                editLink={`/${orgSlug}/expenses/${record.id}/edit`}
                onDelete={() => handleDeleteExpense(record.id)}
                deleteTitle="Delete Expense Record"
                deleteDescription={`Are you sure you want to delete this expense record of ₹${record.total_paid.toLocaleString('en-IN')}?`}
              >
                {!record.bank_account_id && (record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0) < record.total_paid - 0.1 && record.vendor_id && (
                  <div className="mt-2 border-t pt-2 w-full">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-green-600 border-green-200 hover:bg-green-50 h-9 font-bold"
                      onClick={() => {
                        const allocated = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                        setPayingBill({
                          id: record.id,
                          expense_number: record.expense_number,
                          vendor_id: record.vendor_id!,
                          project_id: record.project_id,
                          amount: record.total_paid - allocated
                        })
                        setIsPaymentModalOpen(true)
                      }}
                    >
                      Pay Bill
                    </Button>
                  </div>
                )}
              </MobileTransactionCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Payment & Bank</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No payments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments?.map((record) => {
                          const usedAmount = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                          const unusedAmount = record.amount - usedAmount
                          
                          return (
                            <TableRow key={record.id} className="group hover:bg-muted/30 transition-colors">
                               <TableCell>
                                 <div className="flex flex-col">
                                   <span className="font-mono text-[10px] text-muted-foreground">{record.payment_number || '-'}</span>
                                   <span className="text-xs font-semibold text-primary truncate max-w-[160px]" title={record.bank_account?.account_name}>
                                     {record.bank_account?.account_name || 'Generic Payment'}
                                   </span>
                                 </div>
                               </TableCell>
                               <TableCell className="text-sm">
                                 {format(new Date(record.date), 'dd MMM yyyy')}
                               </TableCell>
                               <TableCell>
                                 <span className="text-sm font-medium">{record.vendor?.name || 'Unknown Vendor'}</span>
                               </TableCell>
                               <TableCell className="font-bold text-red-600/80">
                                 ₹{record.amount.toLocaleString('en-IN')}
                               </TableCell>
                               <TableCell>
                                 <div className="flex items-center gap-1">
                                   {unusedAmount > 0.1 ? (
                                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200 text-xs py-0.5 px-2.5 whitespace-nowrap">
                                        ₹{unusedAmount.toLocaleString('en-IN')} Unused
                                      </Badge>
                                   ) : (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-xs py-0.5 px-2.5 whitespace-nowrap">
                                        Fully Used
                                      </Badge>
                                   )}
                                   {(record.allocations?.length || 0) > 0 && (
                                     <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       onClick={() => setViewingAllocation({ type: 'payment', record })}
                                       className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                                       title="View Links"
                                     >
                                        <ChevronRight className="w-4 h-4" />
                                     </Button>
                                   )}
                                 </div>
                               </TableCell>
                               <TableCell className="text-right">
                                 <div className="flex justify-end items-center gap-1">
                                     {unusedAmount > 0.1 && (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => handleAllocatePayment(record)}
                                          className="h-8 px-3 text-primary border-primary/20 hover:bg-primary/5 font-bold transition-all"
                                        >
                                           Link
                                        </Button>
                                     )}
                                   
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                         <MoreVertical className="h-4 w-4" />
                                       </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end" className="w-40">
                                       <DropdownMenuItem onClick={() => handleEditPayment(record)} className="flex items-center gap-2 cursor-pointer">
                                         <Pencil className="h-3.5 w-3.5" /> Edit
                                       </DropdownMenuItem>
                                       <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                         <div className="-mx-2 -my-1.5 w-[calc(100%+1rem)] py-1.5 px-2 flex items-center gap-2 whitespace-nowrap">
                                           <NotesManager
                                             notes={record.notes}
                                             onUpdate={async (newNotes: Note[]) => {
                                               await updatePayment.mutateAsync({
                                                 id: record.id,
                                                 input: { notes: newNotes }
                                               })
                                             }}
                                             title={`Notes for Payment to ${record.vendor?.name}`}
                                             entityName={`Payment to ${record.vendor?.name}`}
                                           />
                                           <span className="text-sm">Notes</span>
                                         </div>
                                       </DropdownMenuItem>
                                       <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer font-medium">
                                             <Trash2 className="h-3.5 w-3.5" /> Delete
                                           </DropdownMenuItem>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent>
                                           <AlertDialogHeader>
                                             <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                             <AlertDialogDescription>
                                               Are you sure you want to delete this payment of ₹{record.amount.toLocaleString('en-IN')}?
                                             </AlertDialogDescription>
                                           </AlertDialogHeader>
                                           <AlertDialogFooter>
                                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                                             <AlertDialogAction
                                               onClick={() => handleDeletePayment(record.id)}
                                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                             >
                                               Delete
                                             </AlertDialogAction>
                                           </AlertDialogFooter>
                                         </AlertDialogContent>
                                       </AlertDialog>
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

          <div className="md:hidden space-y-4">
             {filteredPayments?.map((record) => {
                 const usedAmount = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                 const unusedAmount = record.amount - usedAmount
                 
                 return (
                    <MobileTransactionCard
                       key={record.id}
                       title={format(new Date(record.date), 'dd MMM yyyy')}
                       badge={<Badge variant="outline">Payment</Badge>}
                       fields={[
                          { label: 'Vendor', value: record.vendor?.name || 'Unknown' },
                          { label: 'Bank', value: record.bank_account?.account_name || '—' },
                          { 
                             label: 'Amount', 
                             value: `₹${record.amount.toLocaleString('en-IN')}`, 
                             className: 'text-red-600 font-bold' 
                          },
                          {
                             label: 'Unused',
                             value: unusedAmount > 0.1 ? `₹${unusedAmount.toLocaleString('en-IN')}` : 'Fully Used',
                             className: unusedAmount > 0.1 ? 'text-orange-600' : 'text-green-600'
                          },
                          {
                             label: 'Links',
                             value: (record.allocations?.length || 0) > 0 ? (
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-6 w-6 text-muted-foreground"
                                 onClick={() => setViewingAllocation({ type: 'payment', record })}
                               >
                                 <ChevronRight className="h-4 w-4" />
                               </Button>
                             ) : '—'
                          }
                       ]}
                       notesProps={{
                          notes: record.notes,
                          onUpdate: async (newNotes) => {
                             await updatePayment.mutateAsync({
                                id: record.id,
                                input: { notes: newNotes }
                             })
                          },
                          title: `Notes for Payment`,
                          entityName: `Payment`
                       }}
                       onEdit={() => handleEditPayment(record)}
                       onDelete={() => handleDeletePayment(record.id)}
                       deleteTitle="Delete Payment"
                       deleteDescription={`Are you sure you want to delete this payment of ₹${record.amount.toLocaleString('en-IN')}?`}
                    >
                       {unusedAmount > 0.1 && (
                          <div className="mt-2 border-t pt-2 w-full">
                             <Button variant="outline" size="sm" className="w-full" onClick={() => handleAllocatePayment(record)}>
                                <LinkIcon className="w-3 h-3 mr-2" /> Link to Bill
                             </Button>
                          </div>
                       )}
                    </MobileTransactionCard>
                 )
             })}
          </div>

        </TabsContent>
      </Tabs>

      <RecordPaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={handleClosePaymentModal}
        paymentToEdit={editingPayment}
        initialBill={payingBill}
        onSuccess={() => {}}
      />
      
      {allocatingPayment && (
         <AllocatePaymentModal
            isOpen={!!allocatingPayment}
            onClose={() => setAllocatingPayment(null)}
            payment={allocatingPayment}
            onSuccess={() => {}}
         />
      )}

      {viewingAllocation && (
         <ViewAllocationsModal
            isOpen={!!viewingAllocation}
            onClose={() => setViewingAllocation(null)}
            type={viewingAllocation.type}
            record={viewingAllocation.record}
         />
      )}
    </div>
  )
}
