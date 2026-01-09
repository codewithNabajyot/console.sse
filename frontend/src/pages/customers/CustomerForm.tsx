import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
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

export default function CustomerForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

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
      navigate(`/${orgSlug}/customers`)
    } catch (error) {
      // Error is handled by the mutation hooks with toast
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/customers`)
  }

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading customer...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title={isEditMode ? 'Edit Customer' : 'New Customer'}
        description={isEditMode ? 'Update customer information' : 'Add a new customer to your database'}
        startAdornment={
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </div>
  )
}
