import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useCustomers, useDeleteCustomer, useUpdateCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Note } from '@/lib/types'
import { NotesManager } from '@/components/NotesManager'
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

export default function Customers() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: customers, isLoading } = useCustomers()
  const deleteCustomer = useDeleteCustomer()
  const updateCustomer = useUpdateCustomer()

  const filteredCustomers = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  )

  const handleDelete = (id: string) => {
    deleteCustomer.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer database
          </p>
        </div>
        <Button asChild>
          <Link to={`/${orgSlug}/customers/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers by name, email, or phone..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No customers found. Create your first customer to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers?.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email || '—'}</TableCell>
                      <TableCell>{customer.phone || '—'}</TableCell>
                      <TableCell>{customer.gst_number || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-primary">
                          <NotesManager
                            notes={customer.notes}
                            onUpdate={async (newNotes: Note[], message: string) => {
                              await updateCustomer.mutateAsync({
                                id: customer.id,
                                input: { notes: newNotes },
                                successMessage: message
                              })
                            }}
                            title={`Notes for ${customer.name}`}
                            entityName={customer.name}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/${orgSlug}/customers/${customer.id}/edit`}>
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
                                <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {customer.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(customer.id)}
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
        {filteredCustomers?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No customers found. Create your first customer to get started.
            </CardContent>
          </Card>
        ) : (
          filteredCustomers?.map((customer) => (
            <Card key={customer.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{customer.name}</span>
                  <div className="flex gap-1 items-center">
                    <NotesManager
                      notes={customer.notes}
                      onUpdate={async (newNotes: Note[], message: string) => {
                        await updateCustomer.mutateAsync({
                          id: customer.id,
                          input: { notes: newNotes },
                          successMessage: message
                        })
                      }}
                      title={`Notes for ${customer.name}`}
                      entityName={customer.name}
                    />
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/${orgSlug}/customers/${customer.id}/edit`}>
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
                          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {customer.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(customer.id)}
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
                {customer.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.gst_number && (
                  <div>
                    <span className="text-muted-foreground">GST:</span>{' '}
                    <span>{customer.gst_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
