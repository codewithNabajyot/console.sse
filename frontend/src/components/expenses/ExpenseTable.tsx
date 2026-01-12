import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MoreVertical, Pencil, Trash2, ChevronRight, Wallet, ReceiptText, CircleDollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { useDeleteExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { useDeleteExpensePayment, useUpdateExpensePayment } from '@/hooks/useExpensePayments'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotesManager } from '@/components/NotesManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpenseStatusBadge } from '@/components/expenses/ExpenseStatusBadge'
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
import { RecordPaymentModal } from '@/components/expenses/RecordPaymentModal'
import { AllocatePaymentModal } from '@/components/expenses/AllocatePaymentModal'
import { ViewAllocationsModal } from '@/components/expenses/ViewAllocationsModal'
import type { Expense, ExpensePayment, Note } from '@/lib/types'

interface ExpenseTableProps {
  expenses: Expense[]
  payments: ExpensePayment[]
  isLoading?: boolean
  showProjectInfo?: boolean
  activeTab?: string
  onTabChange?: (tab: string) => void
  hideTabs?: boolean
  isProjectContext?: boolean
  isReadOnly?: boolean
}

export function ExpenseTable({ 
  expenses, 
  payments, 
  isLoading, 
  showProjectInfo = true,
  activeTab: externalTab,
  onTabChange,
  hideTabs = false,
  isProjectContext = false,
  isReadOnly = false
}: ExpenseTableProps) {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const [internalTab, setInternalTab] = useState('expenses')
  const activeTab = externalTab || internalTab
  
  const deleteExpense = useDeleteExpense()
  const updateExpense = useUpdateExpense()
  const deletePayment = useDeleteExpensePayment()
  const updatePayment = useUpdateExpensePayment()

  const [editingPayment, setEditingPayment] = useState<ExpensePayment | null>(null)
  const [allocatingPayment, setAllocatingPayment] = useState<ExpensePayment | null>(null)
  const [viewingAllocation, setViewingAllocation] = useState<{ type: 'payment' | 'expense', record: ExpensePayment | Expense } | null>(null)
  const [payingBill, setPayingBill] = useState<{ id: string, expense_number?: string, vendor_id: string, project_id?: string | null, amount: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'expense' | 'payment'; title: string; amount: number } | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

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
      project_id: p.project_id,
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
      project_id: e.project_id,
      raw: e
    })) || []
    
    return [...ep, ...dp].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [payments, expenses])

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

  const handleTabChange = (val: string) => {
    if (onTabChange) onTabChange(val)
    else setInternalTab(val)
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground italic">Loading...</div>
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {!hideTabs && (
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
        )}

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
                    {expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No expenses found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses.map((record) => {
                        const allocated = record.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0
                        return (
                            <TableRow key={record.id} className="group hover:bg-muted/30 transition-colors">
                              <TableCell className="text-xs">
                                {format(new Date(record.date), 'dd MMM yyyy')}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-mono text-[10px] font-bold text-blue-600">{record.expense_number || '-'}</span>
                                  {showProjectInfo && <ProjectCustomerInfo project={record.project} />}
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
                                        <Link to={`/${orgSlug}/expenses/${record.id}/edit${isProjectContext && isProjectContext && record.project_id ? `?project_id=${record.project_id}` : ''}`} className="flex items-center">
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
            {expenses.map((record) => (
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
                        {showProjectInfo && <ProjectCustomerInfo project={record.project} layout="horizontal" className="justify-end" />}
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
                editLink={`/${orgSlug}/expenses/${record.id}/edit${isProjectContext && record.project_id ? `?project_id=${record.project_id}` : ''}`}
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
                               <TableCell className="text-xs">
                                 {format(new Date(record.date), 'dd MMM yyyy')}
                               </TableCell>
                               <TableCell>
                                 <div className="flex flex-col">
                                   <span className="font-mono text-[10px] font-bold text-blue-600">{record.payment_number || '-'}</span>
                                   {showProjectInfo && <ProjectCustomerInfo project={record.project} />}
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
                                               onClick={() => setAllocatingPayment(record.raw as ExpensePayment)}
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
                                   {!isReadOnly && (
                                     <DropdownMenu>
                                       <DropdownMenuTrigger asChild>
                                         <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                       </DropdownMenuTrigger>
                                       <DropdownMenuContent align="end">
                                         <DropdownMenuItem onClick={() => record.type === 'payment' ? setEditingPayment(record.raw as ExpensePayment) : navigate(`/${orgSlug}/expenses/${record.id}/edit${isProjectContext && record.project_id ? `?project_id=${record.project_id}` : ''}`)} className="flex items-center">
                                           <Pencil className="mr-2 h-3 w-3" /> Edit {record.type === 'payment' ? 'Payment' : 'Expense'}
                                         </DropdownMenuItem>
                                         <DropdownMenuSeparator />
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
                               {showProjectInfo && <ProjectCustomerInfo project={record.project} className="items-end" />}
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
                                     onClick={isReadOnly ? undefined : () => setAllocatingPayment(record.raw as ExpensePayment)}
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
                       onEdit={isReadOnly ? undefined : () => record.type === 'payment' ? setEditingPayment(record.raw as ExpensePayment) : navigate(`/${orgSlug}/expenses/${record.id}/edit${isProjectContext && record.project_id ? `?project_id=${record.project_id}` : ''}`)}
                       onDelete={isReadOnly ? undefined : () => setDeleteConfirm({ 
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
        isOpen={isPaymentModalOpen || !!editingPayment || !!payingBill} 
        onClose={() => {
          setIsPaymentModalOpen(false)
          setEditingPayment(null)
          setPayingBill(null)
        }}
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
                    deletePayment.mutate(deleteConfirm.id)
                  } else {
                    deleteExpense.mutate(deleteConfirm.id)
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
    </>
  )
}

