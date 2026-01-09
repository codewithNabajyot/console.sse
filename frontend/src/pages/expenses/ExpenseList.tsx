import { useNavigate, useParams, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronRight, MoreVertical } from 'lucide-react'
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
import { ExpenseStatusBadge } from '@/components/expenses/ExpenseStatusBadge'
import { Wallet, ReceiptText, CircleDollarSign } from 'lucide-react'
import { ProjectCustomerInfo } from '@/components/shared/ProjectCustomerInfo'
import { AmountGstInfo } from '@/components/shared/AmountGstInfo'
import { PaymentMethodInfo } from '@/components/shared/PaymentMethodInfo'
import { PageHeader } from '@/components/shared/PageHeader'

export default function ExpenseList() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [outstandingOnly, setOutstandingOnly] = useState(false)
  const [unusedOnly, setUnusedOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('expenses')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<ExpensePayment | null>(null)
  const [allocatingPayment, setAllocatingPayment] = useState<ExpensePayment | null>(null)
  const [viewingAllocation, setViewingAllocation] = useState<{ type: 'payment' | 'expense', record: ExpensePayment | Expense } | null>(null)
  const [payingBill, setPayingBill] = useState<{ id: string, expense_number?: string, vendor_id: string, project_id?: string | null, amount: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'expense' | 'payment'; title: string; amount: number } | null>(null)

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
      record.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.expense_number?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!searchMatch) return false
    
    if (outstandingOnly) {
      if (record.bank_account_id) return false
      const allocated = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
      return allocated < record.total_paid - 0.1
    }

    return true
  })

  const unifiedPayments = useMemo(() => {
    const ep = payments?.map(p => ({
      id: p.id,
      date: p.date,
      vendor: p.vendor,
      amount: p.amount,
      payment_number: p.payment_number,
      bank_account: p.bank_account,
      notes: p.notes,
      type: 'payment' as const,
      payment_mode: p.payment_mode,
      allocations: p.allocations,
      project: p.project,
      raw: p
    })) || []
    
    const dp = expenses?.filter(e => e.bank_account_id).map(e => ({
      id: e.id,
      date: e.date,
      vendor: e.vendor,
      amount: e.total_paid,
      payment_number: e.expense_number,
      bank_account: e.bank_account,
      notes: e.notes,
      type: 'expense' as const,
      payment_mode: null,
      allocations: [],
      project: e.project,
      raw: e
    })) || []
    
    const combined = [...ep, ...dp].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return combined.filter(p => {
      const searchMatch = !searchQuery || 
        p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.payment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bank_account?.account_name.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (!searchMatch) return false

      if (unusedOnly) {
        if (p.type === 'expense') return false // Direct expenses are always "used"
        const used = p.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
        return p.amount - used > 0.1
      }

      return true
    })
  }, [payments, expenses, searchQuery, unusedOnly])

  const vendorAdvances = useMemo(() => {
    const advances: Record<string, number> = {}
    payments?.forEach(p => {
      if (!p.vendor_id) return
      const used = p.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
      const unused = p.amount - used
      if (unused > 0.1) {
        advances[p.vendor_id] = (advances[p.vendor_id] || 0) + unused
      }
    })
    return advances
  }, [payments])

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
      <PageHeader 
        title="Expenses" 
        description="Track and manage bills and payments"
      >
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
      </PageHeader>

      <ExpenseStatsCards 
        expenses={expenses} 
        payments={payments} 
        onOutstandingClick={() => {
          if (outstandingOnly) {
            setOutstandingOnly(false)
          } else {
            setActiveTab('expenses')
            setOutstandingOnly(true)
            setUnusedOnly(false)
          }
        }}
        onUnusedAdvancesClick={() => {
          if (unusedOnly) {
            setUnusedOnly(false)
          } else {
            setActiveTab('payments')
            setUnusedOnly(true)
            setOutstandingOnly(false)
          }
        }}
        isActiveOutstanding={outstandingOnly}
        isActiveUnused={unusedOnly}
      />

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bills, vendors, bank accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[450px]">
          <TabsTrigger value="expenses" className="gap-2">
            <ReceiptText className="h-4 w-4" />
            Bills
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Wallet className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[180px]">Bill & Project</TableHead>
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
                              <TableCell className="text-sm">
                                {format(new Date(record.date), 'dd MMM yyyy')}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-mono text-[10px] font-bold text-blue-600">{record.expense_number || '-'}</span>
                                  <ProjectCustomerInfo project={record.project} />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium line-clamp-1" title={record.description || ''}>
                                    {record.description || '—'}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase truncate">
                                    <span className="font-bold text-primary/80">{record.vendor?.name || 'Unknown Vendor'}</span>
                                    {record.vendor_invoice_number && (
                                      <>
                                        <span>•</span>
                                        <span>#{record.vendor_invoice_number}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal text-xs whitespace-nowrap">{record.category || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <AmountGstInfo 
                                  amount={record.total_paid} 
                                  gstPercentage={record.gst_percentage} 
                                  gstAmount={record.gst_amount} 
                                />
                              </TableCell>
                              <TableCell>
                                 <div className="flex flex-col gap-1">
                                    <ExpenseStatusBadge 
                                      record={record} 
                                      onPay={() => {
                                        setPayingBill({
                                          id: record.id,
                                          expense_number: record.expense_number,
                                          vendor_id: record.vendor_id!,
                                          project_id: record.project_id,
                                          amount: record.total_paid - allocated
                                        })
                                        setIsPaymentModalOpen(true)
                                      }}
                                      onViewLinks={() => setViewingAllocation({ type: 'expense', record })}
                                    />
                                    {record.vendor_id && vendorAdvances[record.vendor_id] > 0.1 && (
                                      <div className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold animate-pulse whitespace-nowrap mt-0.5 w-fit">
                                        <CircleDollarSign className="w-2.5 h-2.5" />
                                        ₹{vendorAdvances[record.vendor_id].toLocaleString('en-IN')} CR
                                      </div>
                                    )}
                                 </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
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
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link to={`/${orgSlug}/expenses/${record.id}/edit`} className="flex items-center">
                                          <Pencil className="mr-2 h-3 w-3" /> Edit Expense
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-destructive font-medium"
                                        onClick={() => setDeleteConfirm({ 
                                          id: record.id, 
                                          type: 'expense', 
                                          title: record.expense_number || 'Expense',
                                          amount: record.total_paid
                                        })}
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

          <div className="md:hidden space-y-4">
            {filteredExpenses?.map((record) => (
              <MobileTransactionCard
                key={record.id}
                title={format(new Date(record.date), 'dd MMM yyyy')}
                badge={<span className="font-mono font-bold text-blue-600">{record.expense_number || 'Exp'}</span>}
                fields={[
                  { 
                    label: 'Vendor / Project', 
                    value: (
                      <div className="flex flex-col items-end text-right">
                        <span className="font-medium">{record.vendor?.name || '—'}</span>
                        <ProjectCustomerInfo project={record.project} layout="horizontal" className="justify-end" />
                      </div>
                    )
                  },
                  { 
                    label: 'Amount', 
                    value: <AmountGstInfo amount={record.total_paid} gstPercentage={record.gst_percentage} layout="horizontal" className="items-end" />
                  },
                  {
                    label: 'Status',
                    value: (
                      <ExpenseStatusBadge 
                        record={record} 
                        onPay={() => {
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
                        onViewLinks={() => setViewingAllocation({ type: 'expense', record })}
                        className="text-xs"
                      />
                    )
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
                onDelete={() => setDeleteConfirm({ 
                  id: record.id, 
                  type: 'expense', 
                  title: record.expense_number || 'Expense',
                  amount: record.total_paid
                })}
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
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[180px]">Reference & Project</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="w-[180px]">Bank & Method</TableHead>
                      <TableHead className="w-[125px] text-right">Amount</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unifiedPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transaction history found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      unifiedPayments.map((record) => {
                          const usedAmount = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                          const unusedAmount = record.amount - usedAmount
                          
                          return (
                            <TableRow key={`${record.type}-${record.id}`} className="group hover:bg-muted/30 transition-colors">
                               <TableCell className="text-sm">
                                 {format(new Date(record.date), 'dd MMM yyyy')}
                               </TableCell>
                               <TableCell>
                                 <div className="flex flex-col">
                                   <span className="font-mono text-[10px] font-bold text-blue-600">{record.payment_number || '-'}</span>
                                   <ProjectCustomerInfo project={record.project} />
                                 </div>
                               </TableCell>
                               <TableCell>
                                 <span className="text-sm font-medium">{record.vendor?.name || 'Unknown Vendor'}</span>
                               </TableCell>
                               <TableCell>
                                 <PaymentMethodInfo 
                                   bankAccount={record.bank_account} 
                                   paymentMode={record.payment_mode}
                                 />
                               </TableCell>
                               <TableCell className="text-right font-bold text-red-600/80">
                                 ₹{record.amount.toLocaleString('en-IN')}
                               </TableCell>
                               <TableCell>
                                 <div className="flex items-center gap-1">
                                   {record.type === 'expense' ? (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-[10px] py-0 px-2 leading-5 h-5 whitespace-nowrap">
                                        Settled (Direct)
                                      </Badge>
                                   ) : (
                                       <>
                                         {unusedAmount > 0.1 ? (
                                            <Badge 
                                              variant="secondary" 
                                              className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] py-0 px-2 leading-5 h-5 whitespace-nowrap cursor-pointer hover:bg-orange-200"
                                              onClick={() => handleAllocatePayment(record.raw as ExpensePayment)}
                                            >
                                              ₹{unusedAmount.toLocaleString('en-IN')} Unused
                                            </Badge>
                                         ) : (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-[10px] py-0 px-2 leading-5 h-5 whitespace-nowrap">
                                              Fully Used
                                            </Badge>
                                         )}
                                         {(record.allocations?.length || 0) > 0 && (
                                           <Button 
                                             variant="ghost" 
                                             size="icon" 
                                             onClick={() => setViewingAllocation({ type: 'payment', record: record.raw as ExpensePayment })}
                                             className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                                             title="View Links"
                                           >
                                              <ChevronRight className="w-4 h-4" />
                                           </Button>
                                         )}
                                       </>
                                   )}
                                 </div>
                               </TableCell>
                               <TableCell className="text-right">
                                 <div className="flex justify-end gap-1">
                                   <NotesManager
                                     notes={record.notes}
                                     onUpdate={async (newNotes: Note[]) => {
                                       if (record.type === 'payment') {
                                         await updatePayment.mutateAsync({
                                           id: record.id,
                                           input: { notes: newNotes }
                                         })
                                       } else {
                                         await updateExpense.mutateAsync({
                                           id: record.id,
                                           input: { notes: newNotes }
                                         })
                                       }
                                     }}
                                     title={`Notes for ${record.type}`}
                                     entityName={record.type}
                                   />
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                       <DropdownMenuItem onClick={() => record.type === 'payment' ? handleEditPayment(record.raw as ExpensePayment) : navigate(`/${orgSlug}/expenses/${record.id}/edit`)} className="flex items-center">
                                         <Pencil className="mr-2 h-3 w-3" /> Edit {record.type === 'payment' ? 'Payment' : 'Expense'}
                                       </DropdownMenuItem>
                                       <DropdownMenuItem 
                                         className="text-destructive font-medium"
                                         onClick={() => setDeleteConfirm({ 
                                           id: record.id, 
                                           type: record.type, 
                                           title: record.payment_number || 'Payment',
                                           amount: record.amount
                                         })}
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

          <div className="md:hidden space-y-4">
             {unifiedPayments.map((record) => {
                 const usedAmount = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                 const unusedAmount = record.amount - usedAmount
                 
                 return (
                    <MobileTransactionCard
                       key={`${record.type}-${record.id}`}
                       title={format(new Date(record.date), 'dd MMM yyyy')}
                       badge={
                         <div className="flex gap-2">
                           <Badge variant="outline">{record.type === 'expense' ? 'Direct' : 'Payment'}</Badge>
                         </div>
                       }
                       fields={[
                          { label: 'Ref / Project', value: (
                             <div className="flex flex-col items-end text-right">
                               <span className="font-mono text-[10px] font-bold text-blue-600">{record.payment_number || '-'}</span>
                               <ProjectCustomerInfo project={record.project} className="items-end" />
                             </div>
                           ) },
                           { label: 'Vendor / Bank', value: (
                             <div className="flex flex-col items-end text-right">
                               <span className="font-medium">{record.vendor?.name || 'Unknown'}</span>
                              <PaymentMethodInfo 
                                bankAccount={record.bank_account} 
                                paymentMode={record.payment_mode}
                                className="items-end"
                              />
                            </div>
                          ) },
                          { 
                              label: 'Amount', 
                              value: <AmountGstInfo amount={record.amount} showGst={false} amountClassName="text-red-600" />
                           },
                          {
                             label: 'Status',
                             value: record.type === 'expense' ? (
                               <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Settled (Direct)</Badge>
                             ) : (
                               unusedAmount > 0.1 ? (
                                 <Badge 
                                    variant="secondary" 
                                    className="bg-orange-100 text-orange-800 border-orange-200"
                                    onClick={() => handleAllocatePayment(record.raw as ExpensePayment)}
                                  >
                                    ₹{unusedAmount.toLocaleString('en-IN')} Unused
                                  </Badge>
                               ) : (
                                 <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Fully Used</Badge>
                               )
                             )
                          }
                       ]}
                       notesProps={{
                          notes: record.notes,
                          onUpdate: async (newNotes) => {
                             if (record.type === 'payment') {
                               await updatePayment.mutateAsync({ id: record.id, input: { notes: newNotes } })
                             } else {
                               await updateExpense.mutateAsync({ id: record.id, input: { notes: newNotes } })
                             }
                          },
                          title: `Notes for ${record.type}`,
                          entityName: record.type
                       }}
                       onEdit={() => record.type === 'payment' ? handleEditPayment(record.raw as ExpensePayment) : navigate(`/${orgSlug}/expenses/${record.id}/edit`)}
                       onDelete={() => setDeleteConfirm({ 
                         id: record.id, 
                         type: record.type, 
                         title: (record.type === 'payment' ? record.payment_number : (record.raw as Expense).expense_number) || (record.type === 'payment' ? 'Payment' : 'Expense'),
                         amount: record.amount
                       })}
                       deleteTitle={`Delete ${record.type}`}
                       deleteDescription={`Are you sure?`}
                    />
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteConfirm?.type} <strong>{deleteConfirm?.title}</strong> of ₹{deleteConfirm?.amount.toLocaleString('en-IN')}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  if (deleteConfirm.type === 'payment') {
                    handleDeletePayment(deleteConfirm.id)
                  } else {
                    handleDeleteExpense(deleteConfirm.id)
                  }
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
