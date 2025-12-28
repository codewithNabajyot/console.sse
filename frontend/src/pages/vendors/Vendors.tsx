import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useVendors, useDeleteVendor, useUpdateVendor } from '@/hooks/useVendors'
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

export default function Vendors() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: vendors, isLoading } = useVendors()
  const deleteVendor = useDeleteVendor()
  const updateVendor = useUpdateVendor()

  const filteredVendors = vendors?.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = (id: string) => {
    deleteVendor.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading vendors...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-1">
            Manage your vendor database
          </p>
        </div>
        <Button asChild>
          <Link to={`/${orgSlug}/vendors/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors by name or category..."
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
                  <TableHead>Category</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No vendors found. Create your first vendor to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors?.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.category || '—'}</TableCell>
                      <TableCell>{vendor.gst_number || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-primary">
                          <NotesManager
                            notes={vendor.notes}
                            onUpdate={async (newNotes: Note[], message: string) => {
                              await updateVendor.mutateAsync({
                                id: vendor.id,
                                input: { notes: newNotes },
                                successMessage: message
                              })
                            }}
                            title={`Notes for ${vendor.name}`}
                            entityName={vendor.name}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/${orgSlug}/vendors/${vendor.id}/edit`}>
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
                                <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {vendor.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(vendor.id)}
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
        {filteredVendors?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No vendors found. Create your first vendor to get started.
            </CardContent>
          </Card>
        ) : (
          filteredVendors?.map((vendor) => (
            <Card key={vendor.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{vendor.name}</span>
                  <div className="flex gap-1 items-center">
                    <NotesManager
                      notes={vendor.notes}
                      onUpdate={async (newNotes: Note[], message: string) => {
                        await updateVendor.mutateAsync({
                          id: vendor.id,
                          input: { notes: newNotes },
                          successMessage: message
                        })
                      }}
                      title={`Notes for ${vendor.name}`}
                      entityName={vendor.name}
                    />
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/${orgSlug}/vendors/${vendor.id}/edit`}>
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
                          <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {vendor.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(vendor.id)}
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
                {vendor.category && (
                  <div>
                    <span className="text-muted-foreground">Category:</span>{' '}
                    <span>{vendor.category}</span>
                  </div>
                )}
                {vendor.gst_number && (
                  <div>
                    <span className="text-muted-foreground">GST:</span>{' '}
                    <span>{vendor.gst_number}</span>
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
