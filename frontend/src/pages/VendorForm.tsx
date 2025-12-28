import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useVendor, useCreateVendor, useUpdateVendor } from '@/hooks/useVendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { VendorInput } from '@/lib/types'

type FormData = {
  name: string
  category: string
  gst_number: string
  notes: string
}

export default function VendorForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const { data: vendor, isLoading } = useVendor(id)
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      category: '',
      gst_number: '',
      notes: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (vendor) {
      reset({
        name: vendor.name,
        category: vendor.category || '',
        gst_number: vendor.gst_number || '',
        notes: vendor.notes?.map(n => n.text).join('\n') || '',
      })
    }
  }, [vendor, reset])

  const onSubmit = async (data: FormData) => {
    const input: VendorInput = {
      name: data.name,
      category: data.category || null,
      gst_number: data.gst_number || null,
      notes: data.notes ? [{ text: data.notes, timestamp: new Date().toISOString() }] : [],
    }

    try {
      if (isEditMode && id) {
        await updateVendor.mutateAsync({ id, input })
      } else {
        await createVendor.mutateAsync(input)
      }
      navigate(`/${orgSlug}/vendors`)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/vendors`)
  }

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading vendor...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Vendor' : 'New Vendor'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update vendor information' : 'Add a new vendor to your database'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
          <CardDescription>
            Enter the vendor details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="Enter vendor name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="e.g., Solar Panels, Inverters, Installation"
              />
            </div>

            {/* GST Number */}
            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number</Label>
              <Input
                id="gst_number"
                {...register('gst_number')}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Add any additional notes about this vendor..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createVendor.isPending || updateVendor.isPending}
                className="w-full sm:w-auto"
              >
                {createVendor.isPending || updateVendor.isPending
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Vendor'
                  : 'Create Vendor'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
