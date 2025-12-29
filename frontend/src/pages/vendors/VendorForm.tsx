import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useVendor, useCreateVendor, useUpdateVendor } from '@/hooks/useVendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { VendorInput } from '@/lib/types'

type FormData = {
  name: string
  category: string
  gst_number: string
}

interface VendorFormProps {
  isDialog?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export default function VendorForm({ isDialog, onSuccess, onCancel }: VendorFormProps = {}) {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id && !isDialog // In dialog mode, we always assume "create" for now

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
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (vendor) {
      reset({
        name: vendor.name,
        category: vendor.category || '',
        gst_number: vendor.gst_number || '',
      })
    }
  }, [vendor, reset])

  const onSubmit = async (data: FormData) => {
    const input: VendorInput = {
      name: data.name,
      category: data.category || null,
      gst_number: data.gst_number || null,
    }

    try {
      if (isEditMode && id) {
        await updateVendor.mutateAsync({ id, input })
      } else {
        await createVendor.mutateAsync(input)
      }
      
      if (isDialog) {
        onSuccess?.()
      } else {
        navigate(`/${orgSlug}/vendors`)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    if (isDialog) {
      onCancel?.()
    } else {
      navigate(`/${orgSlug}/vendors`)
    }
  }

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading vendor...</div>
      </div>
    )
  }

  const content = (
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
  )

  if (isDialog) {
    return content
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
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    </div>
  )
}
