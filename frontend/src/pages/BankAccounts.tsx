import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useBankAccounts, useDeleteBankAccount } from '@/hooks/useBankAccounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function BankAccounts() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: bankAccounts, isLoading } = useBankAccounts()
  const deleteBankAccount = useDeleteBankAccount()

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your bank accounts and track balances
          </p>
        </div>
        <Button asChild>
          <Link to={`/${orgSlug}/bank-accounts/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bank Account
          </Link>
        </Button>
      </div>

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
                      <TableCell className="text-right">
                        <Badge variant={account.current_balance >= 0 ? 'success' : 'destructive'}>
                          {formatCurrency(account.current_balance)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                  <div className="flex gap-2">
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
                  <span className="text-muted-foreground">Balance:</span>{' '}
                  <Badge variant={account.current_balance >= 0 ? 'success' : 'destructive'}>
                    {formatCurrency(account.current_balance)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
