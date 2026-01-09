import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProject, useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import { useCustomers } from '@/hooks/useCustomers'
import { useMasterConfigsByType } from '@/hooks/useMasterConfigs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { ProjectInput } from '@/lib/types'

type FormData = {
  project_id_code: string
  customer_id: string
  deal_value: number
  status: string
  funding_type: string
}

export default function ProjectForm() {
  const { orgSlug, id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const { data: project, isLoading: isProjectLoading } = useProject(id)
  const { data: customers, isLoading: isCustomersLoading } = useCustomers()
  const { data: statuses, isLoading: isStatusesLoading } = useMasterConfigsByType('PROJECT_STATUS')
  const { data: fundingTypes, isLoading: isFundingLoading } = useMasterConfigsByType('FUNDING_TYPE')
  
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      project_id_code: '',
      customer_id: '',
      deal_value: 0,
      status: '',
      funding_type: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (project) {
      reset({
        project_id_code: project.project_id_code,
        customer_id: project.customer_id,
        deal_value: project.deal_value,
        status: project.status || '',
        funding_type: project.funding_type || '',
      })
    }
  }, [project, reset])

  const onSubmit = async (data: FormData) => {
    const input: ProjectInput = {
      project_id_code: data.project_id_code,
      customer_id: data.customer_id,
      deal_value: Number(data.deal_value),
      status: data.status || null,
      funding_type: data.funding_type || null,
    }

    try {
      if (isEditMode && id) {
        await updateProject.mutateAsync({ id, input })
      } else {
        await createProject.mutateAsync(input)
      }
      navigate(`/${orgSlug}/projects`)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate(`/${orgSlug}/projects`)
  }

  const isLoading = isProjectLoading || isCustomersLoading || isStatusesLoading || isFundingLoading

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      {/* Header */}
      <PageHeader
        title={isEditMode ? 'Edit Project' : 'New Project'}
        description={isEditMode ? 'Update project information' : 'Add a new project to your database'}
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
            {/* Project ID Code */}
            <div className="space-y-2">
              <Label htmlFor="project_id_code">
                Project ID Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="project_id_code"
                {...register('project_id_code', { required: 'Project ID Code is required' })}
                placeholder="e.g., S-001"
              />
              {errors.project_id_code && (
                <p className="text-sm text-destructive">{errors.project_id_code.message}</p>
              )}
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label htmlFor="customer_id">
                Customer <span className="text-destructive">*</span>
              </Label>
              <select
                id="customer_id"
                {...register('customer_id', { required: 'Customer is required' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select Customer</option>
                {customers?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="text-sm text-destructive">{errors.customer_id.message}</p>
              )}
            </div>

            {/* Deal Value */}
            <div className="space-y-2">
              <Label htmlFor="deal_value">
                Deal Value <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deal_value"
                type="number"
                step="0.01"
                {...register('deal_value', { 
                  required: 'Deal Value is required',
                  min: { value: 0, message: 'Deal value must be positive' }
                })}
                placeholder="0.00"
              />
              {errors.deal_value && (
                <p className="text-sm text-destructive">{errors.deal_value.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Status</option>
                  {statuses?.map((status) => (
                    <option key={status.id} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Funding Type */}
              <div className="space-y-2">
                <Label htmlFor="funding_type">Funding Type</Label>
                <select
                  id="funding_type"
                  {...register('funding_type')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Funding Type</option>
                  {fundingTypes?.map((ft) => (
                    <option key={ft.id} value={ft.value}>
                      {ft.label}
                    </option>
                  ))}
                </select>
              </div>
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
                disabled={createProject.isPending || updateProject.isPending}
                className="w-full sm:w-auto"
              >
                {createProject.isPending || updateProject.isPending
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Project'
                  : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
