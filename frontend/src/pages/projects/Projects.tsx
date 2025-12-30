import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, CheckCircle2, Clock, Briefcase, ChevronRight } from 'lucide-react'
import { useProjects, useDeleteProject, useUpdateProject } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Note, Project } from '@/lib/types'
import { NotesManager } from '@/components/NotesManager'
import { Badge } from '@/components/ui/badge'
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal'
import { ProjectFinancialsModal } from '@/components/ProjectFinancialsModal'
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
import { cn } from '@/lib/utils'

type FilterType = 'ALL_ACTIVE' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED'

export default function Projects() {
  const { orgSlug } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL_ACTIVE')
  const { data: projects, isLoading } = useProjects(true) // Fetch all including completed
  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isFinancialsModalOpen, setIsFinancialsModalOpen] = useState(false)

  const handleView = (project: Project) => {
    setSelectedProject(project)
    setIsViewModalOpen(true)
  }

  const handleFinancials = (project: Project) => {
    setSelectedProject(project)
    setIsFinancialsModalOpen(true)
  }

  const stats = {
    booked: projects?.filter(p => !p.deleted_at && p.status === 'Booked').length || 0,
    inProgress: projects?.filter(p => !p.deleted_at && p.status !== 'Booked' && p.status !== 'Completed').length || 0,
    completed: projects?.filter(p => !p.deleted_at && p.status === 'Completed').length || 0,
  }

  const filteredProjects = projects?.filter((project) => {
    if (project.deleted_at) return false

    // Search filter
    const searchMatch = 
      project.project_id_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())

    if (!searchMatch) return false

    // Status filter
    if (activeFilter === 'BOOKED') return project.status === 'Booked'
    if (activeFilter === 'COMPLETED') return project.status === 'Completed'
    if (activeFilter === 'IN_PROGRESS') return project.status !== 'Booked' && project.status !== 'Completed'
    if (activeFilter === 'ALL_ACTIVE') return project.status !== 'Completed'

    return true
  })

  const handleDelete = (id: string) => {
    deleteProject.mutate(id)
  }

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'Completed': return 'success'
      case 'Booked': return 'secondary'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your solar installations
          </p>
        </div>
        <Button asChild>
          <Link to={`/${orgSlug}/projects/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
            activeFilter === 'BOOKED' ? "bg-primary text-primary-foreground ring-2 ring-primary" : "bg-card text-card-foreground"
          )}
          onClick={() => setActiveFilter(activeFilter === 'BOOKED' ? 'ALL_ACTIVE' : 'BOOKED')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm font-medium", activeFilter === 'BOOKED' ? "text-primary-foreground/80" : "text-muted-foreground")}>Booked</p>
                <h3 className="text-2xl font-bold">{stats.booked}</h3>
              </div>
              <Briefcase className={cn("h-8 w-8", activeFilter === 'BOOKED' ? "text-primary-foreground opacity-40" : "text-primary opacity-20")} />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
            activeFilter === 'IN_PROGRESS' ? "bg-orange-500 text-white ring-2 ring-orange-500" : "bg-card text-card-foreground"
          )}
          onClick={() => setActiveFilter(activeFilter === 'IN_PROGRESS' ? 'ALL_ACTIVE' : 'IN_PROGRESS')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm font-medium", activeFilter === 'IN_PROGRESS' ? "text-white/80" : "text-muted-foreground")}>In Progress</p>
                <h3 className="text-2xl font-bold">{stats.inProgress}</h3>
              </div>
              <Clock className={cn("h-8 w-8", activeFilter === 'IN_PROGRESS' ? "text-white opacity-40" : "text-orange-500 opacity-20")} />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
            activeFilter === 'COMPLETED' ? "bg-secondary text-secondary-foreground ring-2 ring-secondary" : "bg-card text-card-foreground"
          )}
          onClick={() => setActiveFilter(activeFilter === 'COMPLETED' ? 'ALL_ACTIVE' : 'COMPLETED')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-sm font-medium", activeFilter === 'COMPLETED' ? "text-secondary-foreground/80" : "text-muted-foreground")}>Completed</p>
                <h3 className="text-2xl font-bold">{stats.completed}</h3>
              </div>
              <CheckCircle2 className={cn("h-8 w-8", activeFilter === 'COMPLETED' ? "text-secondary-foreground opacity-40" : "text-secondary opacity-20")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects by ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project ID / Funding</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Deal Value</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects?.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono font-medium">{project.project_id_code}</span>
                          <span className="text-[10px] text-muted-foreground">{project.funding_type || 'No Funding'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{project.customer?.name || '—'}</TableCell>
                      <TableCell>₹{project.deal_value.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {(project.deal_value - (project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)) <= 0 ? (
                            <Badge variant="success">Paid</Badge>
                          ) : (
                            <span className="text-orange-600">
                              ₹{(project.deal_value - (project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)).toLocaleString('en-IN')}
                            </span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleView(project)}
                            title="View Payment History"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const income = project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0;
                            const expenses = project.expenses?.reduce((sum, exp) => sum + exp.total_paid, 0) || 0;
                            const profit = income - expenses;
                            return (
                              <span className={profit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                                ₹{profit.toLocaleString('en-IN')}
                              </span>
                            );
                          })()}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleFinancials(project)}
                            title="View Detailed Financials"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(project.status)}>
                          {project.status || 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-primary">
                          <NotesManager
                            notes={project.notes}
                            onUpdate={async (newNotes: Note[], message: string) => {
                              await updateProject.mutateAsync({
                                id: project.id,
                                input: { notes: newNotes },
                                successMessage: message
                              })
                            }}
                            title={`Notes for ${project.project_id_code}`}
                            entityName={project.project_id_code}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/${orgSlug}/projects/${project.id}/edit`}>
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
                                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete project {project.project_id_code}? This action will soft-delete the record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(project.id)}
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
        {filteredProjects?.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-mono">{project.project_id_code}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">{project.funding_type || 'No Funding'}</span>
                </div>
                <Badge variant={getStatusBadgeVariant(project.status)}>
                  {project.status || 'Draft'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{project.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deal Value:</span>
                <span className="font-medium">₹{project.deal_value.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Pending Amount:</span>
                <div className="flex items-center gap-2">
                  {(project.deal_value - (project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)) <= 0 ? (
                    <Badge variant="success">Paid</Badge>
                  ) : (
                    <span className="font-bold text-orange-600">
                      ₹{(project.deal_value - (project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0)).toLocaleString('en-IN')}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleView(project)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t font-semibold">
                <span className="text-muted-foreground">Profit Margin:</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const income = project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0;
                    const expenses = project.expenses?.reduce((sum, exp) => sum + exp.total_paid, 0) || 0;
                    const profit = income - expenses;
                    return (
                      <span className={profit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        ₹{profit.toLocaleString('en-IN')}
                      </span>
                    );
                  })()}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleFinancials(project)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <NotesManager
                  notes={project.notes}
                  onUpdate={async (newNotes: Note[], message: string) => {
                    await updateProject.mutateAsync({
                      id: project.id,
                      input: { notes: newNotes },
                      successMessage: message
                    })
                  }}
                  title={`Notes for ${project.project_id_code}`}
                  entityName={project.project_id_code}
                />
                <Button variant="ghost" size="icon" asChild>
                  <Link to={`/${orgSlug}/projects/${project.id}/edit`}>
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
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete project {project.project_id_code}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(project.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <PaymentHistoryModal
        title={selectedProject?.project_id_code || ''}
        totalLabel="Deal Value"
        totalAmount={selectedProject?.deal_value || 0}
        income={selectedProject?.income}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
      />

      <ProjectFinancialsModal
        project={selectedProject}
        isOpen={isFinancialsModalOpen}
        onClose={() => setIsFinancialsModalOpen(false)}
      />
    </div>
  )
}
