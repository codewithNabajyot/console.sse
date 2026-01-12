import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Pencil,
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  User,
  Tag,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'
import { useProject } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils'
import { InvoiceTable } from '@/components/invoices/InvoiceTable'
import { IncomeTable } from '@/components/income/IncomeTable'
import { ExpenseTable } from '@/components/expenses/ExpenseTable'

export default function ProjectDetails() {
  const { id, orgSlug } = useParams()
  const { data: project, isLoading, error } = useProject(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Gathering project insights...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-destructive font-medium">Failed to load project details.</p>
        <Button asChild variant="outline">
          <Link to={`/${orgSlug}/projects`}>Back to Projects</Link>
        </Button>
      </div>
    )
  }

  const totalIncome = project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
  const totalExpenses = project.expenses?.reduce((sum, exp) => sum + exp.total_paid, 0) || 0
  const totalInvoiced = project.invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0'
  const pendingFromCustomer = project.deal_value - totalIncome
  const invoicePending = totalInvoiced - totalIncome

  const isCompleted = project.status === 'Completed'

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9">
          <Link to={`/${orgSlug}/projects`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader 
          title={project.project_id_code} 
          description={`Project insights for ${project.customer?.name}`}
          className="flex-1"
        />
        {!isCompleted && (
          <div className="flex items-center gap-2">
            <Button size="sm" asChild variant="outline" className="h-9 gap-2">
              <Link to={`/${orgSlug}/projects/${project.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit Project
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Project Metadata Pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border text-[13px] font-medium text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="text-foreground">{project.customer?.name}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border text-[13px] font-medium text-muted-foreground">
          <Tag className="h-3.5 w-3.5" />
          <span className="text-foreground">{project.funding_type || 'Self Funded'}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border text-[13px] font-medium text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-foreground">Started {format(new Date(project.created_at), 'dd MMM yyyy')}</span>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-bold",
          pendingFromCustomer > 0 ? "bg-orange-500/10 border-orange-500/20 text-orange-600" : "bg-green-500/10 border-green-500/20 text-green-600"
        )}>
          <Wallet className="h-3.5 w-3.5" />
          <span>Pending: ₹{pendingFromCustomer.toLocaleString('en-IN')}</span>
        </div>
        <Badge variant={project.status === 'Completed' ? 'success' : project.status === 'Booked' ? 'secondary' : 'outline'} className="rounded-full px-3 py-1 border font-bold text-[11px] uppercase tracking-wider">
          {project.status || 'Draft'}
        </Badge>
      </div>

      {/* Financial Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Deal Value</p>
            <p className="text-2xl font-black font-mono">₹{project.deal_value.toLocaleString('en-IN')}</p>
            <IndianRupee className="absolute -right-2 -bottom-2 h-16 w-16 opacity-[0.03] -rotate-12" />
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/10 overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Received</p>
            <p className="text-2xl font-black font-mono text-green-600">₹{totalIncome.toLocaleString('en-IN')}</p>
            <Wallet className="absolute -right-2 -bottom-2 h-16 w-16 opacity-[0.03] -rotate-12 text-green-600" />
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/10 overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Spent</p>
            <p className="text-2xl font-black font-mono text-red-600">₹{totalExpenses.toLocaleString('en-IN')}</p>
            <TrendingDown className="absolute -right-2 -bottom-2 h-16 w-16 opacity-[0.03] -rotate-12 text-red-600" />
          </CardContent>
        </Card>

        <Card className={cn("overflow-hidden relative", netProfit >= 0 ? "bg-blue-500/5 border-blue-500/10" : "bg-orange-500/5 border-orange-500/10")}>
          <CardContent className="pt-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Profit ({profitMargin}%)</p>
            <p className={cn("text-2xl font-black font-mono", netProfit >= 0 ? "text-blue-600" : "text-orange-600")}>
              ₹{netProfit.toLocaleString('en-IN')}
            </p>
            <TrendingUp className={cn("absolute -right-2 -bottom-2 h-16 w-16 opacity-[0.03] -rotate-12", netProfit >= 0 ? "text-blue-600" : "text-orange-600")} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-12 mt-8">
        {/* Invoices Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight">Project Invoices</h2>
              <span className="text-xs font-bold text-muted-foreground uppercase">Total: ₹{totalInvoiced.toLocaleString('en-IN')}</span>
            </div>
            {!isCompleted && (
              <Button size="sm" asChild className="h-8 gap-1.5 font-bold">
                <Link to={`/${orgSlug}/invoices/new?project_id=${project.id}`}>
                  <Plus className="h-3.5 w-3.5" /> New Invoice
                </Link>
              </Button>
            )}
          </div>
          <InvoiceTable 
            invoices={project.invoices || []} 
            isLoading={false} 
            showProjectInfo={false} 
            isProjectContext={true} 
            isReadOnly={isCompleted}
          />
        </div>

        {/* Income Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight">Project Income</h2>
              <span className={cn("text-xs font-bold uppercase", invoicePending > 0 ? "text-orange-600" : "text-green-600")}>
                Invoice Bal: ₹{invoicePending.toLocaleString('en-IN')}
              </span>
            </div>
            {!isCompleted && (
              <Button size="sm" asChild className="h-8 gap-1.5 font-bold">
                <Link to={`/${orgSlug}/income/new?project_id=${project.id}`}>
                  <Plus className="h-3.5 w-3.5" /> Add Income
                </Link>
              </Button>
            )}
          </div>
          <IncomeTable 
            incomeRecords={project.income || []} 
            isLoading={false} 
            showProjectInfo={false} 
            isProjectContext={true} 
            isReadOnly={isCompleted}
          />
        </div>

        {/* Expenses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight">Project Expenses</h2>
              <span className="text-xs font-bold text-muted-foreground uppercase">Total Spent: ₹{totalExpenses.toLocaleString('en-IN')}</span>
            </div>
            {!isCompleted && (
              <Button size="sm" asChild className="h-8 gap-1.5 font-bold">
                <Link to={`/${orgSlug}/expenses/new?project_id=${project.id}`}>
                  <Plus className="h-3.5 w-3.5" /> Add Expense
                </Link>
              </Button>
            )}
          </div>
          
          <ExpenseTable 
            expenses={project.expenses || []} 
            payments={project.expense_payments || []} 
            isLoading={false} 
            showProjectInfo={false}
            hideTabs={true}
            isProjectContext={true}
            isReadOnly={isCompleted}
          />
        </div>
      </div>
    </div>
  )
}
