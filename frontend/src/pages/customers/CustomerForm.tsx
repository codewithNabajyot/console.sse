import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { CustomerInput } from '@/lib/types'

type FormData = {
  name: string
  email: string
  phone: string
  gst_number: string
}

interface CustomerFormProps {
  isDialog?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export default function CustomerForm({ isDialog, onSuccess, onCancel }: CustomerFormProps = {}) {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id && !isDialog // In dialog mode, we always assume "create" for now

  const { data: customer, isLoading } = useCustomer(id)
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      gst_number: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        gst_number: customer.gst_number || '',
      })
    }
  }, [customer, reset])

  const onSubmit = async (data: FormData) => {
    const input: CustomerInput = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      gst_number: data.gst_number || null,
    }

    try {
      if (isEditMode && id) {
        await updateCustomer.mutateAsync({ id, input })
      } else {
        await createCustomer.mutateAsync(input)
      }
      
      if (isDialog) {
        onSuccess?.()
      } else {
        navigate(`/${orgSlug}/customers`)
      }
    } catch (error) {
      // Error is handled by the mutation hooks with toast
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    if (isDialog) {
      onCancel?.()
    } else {
      navigate(`/${orgSlug}/customers`)
    }
  }

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading customer...</div>
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
          placeholder="Enter customer name"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="customer@example.com"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          placeholder="+91 98765 43210"
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
          disabled={createCustomer.isPending || updateCustomer.isPending}
          className="w-full sm:w-auto"
        >
          {createCustomer.isPending || updateCustomer.isPending
            ? 'Saving...'
            : isEditMode
            ? 'Update Customer'
            : 'Create Customer'}
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
            {isEditMode ? 'Edit Customer' : 'New Customer'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update customer information' : 'Add a new customer to your database'}
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
