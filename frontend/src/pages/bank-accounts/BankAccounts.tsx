import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, ArrowRightLeft, RefreshCw } from 'lucide-react'
import { useBankAccounts, useDeleteBankAccount, useUpdateBankAccount, useComputedBankBalance } from '@/hooks/useBankAccounts'
import { InternalTransferModal } from '@/components/bank-accounts/InternalTransferModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import type { BankAccount, Note } from '@/lib/types'
import { NotesManager } from '@/components/NotesManager'
import { Badge } from '@/components/ui/badge'
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
import { PageHeader } from '@/components/shared/PageHeader'

export default function BankAccounts() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: bankAccounts, isLoading } = useBankAccounts()
  const deleteBankAccount = useDeleteBankAccount()
  const updateBankAccount = useUpdateBankAccount()
  const computeBalance = useComputedBankBalance()
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [reconciliationAccount, setReconciliationAccount] = useState<{
    id: string;
    account_name: string;
    stored: number;
    computed: number;
  } | null>(null)

  const handleRecalculate = async (account: BankAccount) => {
    try {
      const computed = await computeBalance.mutateAsync(account.id)
      if (Math.abs(Number(computed) - Number(account.current_balance)) < 0.01) {
        toast.success(`Balance for ${account.account_name} is accurate`)
      } else {
        setReconciliationAccount({
          id: account.id,
          account_name: account.account_name,
          stored: account.current_balance,
          computed: computed
        })
      }
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleConfirmReconciliation = async () => {
    if (!reconciliationAccount) return
    
    await updateBankAccount.mutateAsync({
      id: reconciliationAccount.id,
      input: { current_balance: reconciliationAccount.computed },
      successMessage: `Balance for ${reconciliationAccount.account_name} has been reconciled`
    })
    setReconciliationAccount(null)
  }

  const filteredBankAccounts = bankAccounts?.filter((account) =>
    account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.account_number?.includes(searchQuery)
  )

  const handleDelete = (id: string) => {
    deleteBankAccount.mutate(id)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading bank accounts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Bank Accounts"
        description="Manage your bank accounts and track balances"
      >
        <Button variant="outline" onClick={() => setIsTransferModalOpen(true)}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Transfer Money
        </Button>
        <Button asChild>
          <Link to={`/${orgSlug}/bank-accounts/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bank Account
          </Link>
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by account name, bank, or account number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead className="text-right">Opening Balance</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBankAccounts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No bank accounts found. Create your first bank account to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBankAccounts?.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.account_name}</TableCell>
                      <TableCell>{account.bank_name || '—'}</TableCell>
                      <TableCell>{account.account_number || '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.opening_balance)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleRecalculate(account)}
                            disabled={computeBalance.isPending}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${computeBalance.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                          <Badge variant={account.current_balance >= 0 ? 'success' : 'destructive'}>
                            {formatCurrency(account.current_balance)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-primary">
                          <NotesManager
                            notes={account.notes}
                            onUpdate={async (newNotes: Note[], message: string) => {
                              await updateBankAccount.mutateAsync({
                                id: account.id,
                                input: { notes: newNotes },
                                successMessage: message
                              })
                            }}
                            title={`Notes for ${account.account_name}`}
                            entityName={account.account_name}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/${orgSlug}/bank-accounts/${account.id}/edit`}>
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
                                <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {account.account_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(account.id)}
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredBankAccounts?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No bank accounts found. Create your first bank account to get started.
            </CardContent>
          </Card>
        ) : (
          filteredBankAccounts?.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{account.account_name}</span>
                  <div className="flex gap-1 items-center">
                    <NotesManager
                      notes={account.notes}
                      onUpdate={async (newNotes: Note[], message: string) => {
                        await updateBankAccount.mutateAsync({
                          id: account.id,
                          input: { notes: newNotes },
                          successMessage: message
                        })
                      }}
                      title={`Notes for ${account.account_name}`}
                      entityName={account.account_name}
                    />
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/${orgSlug}/bank-accounts/${account.id}/edit`}>
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
                          <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {account.account_name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(account.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {account.bank_name && (
                  <div>
                    <span className="text-muted-foreground">Bank:</span>{' '}
                    <span>{account.bank_name}</span>
                  </div>
                )}
                {account.account_number && (
                  <div>
                    <span className="text-muted-foreground">Account Number:</span>{' '}
                    <span>{account.account_number}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Opening Balance:</span>{' '}
                  <span className="font-medium">{formatCurrency(account.opening_balance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Balance:</span>{' '}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-muted-foreground hover:text-primary"
                      onClick={() => handleRecalculate(account)}
                      disabled={computeBalance.isPending}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${computeBalance.isPending ? 'animate-spin' : ''}`} />
                      Recalculate
                    </Button>
                    <Badge variant={account.current_balance >= 0 ? 'success' : 'destructive'}>
                      {formatCurrency(account.current_balance)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <InternalTransferModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)} 
      />

      <AlertDialog open={!!reconciliationAccount} onOpenChange={() => setReconciliationAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Balance Discrepancy Found</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p>
                The stored balance for <strong>{reconciliationAccount?.account_name}</strong> does not match the computed balance from transaction history.
              </p>
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/50">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Stored Balance</div>
                  <div className="text-lg font-semibold text-destructive">
                    {reconciliationAccount && formatCurrency(reconciliationAccount.stored)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Computed Balance</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {reconciliationAccount && formatCurrency(reconciliationAccount.computed)}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Would you like to update the stored balance to match the computed value? This will fix the display but won't alter any historical transactions.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReconciliation}
            >
              Update Balance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
