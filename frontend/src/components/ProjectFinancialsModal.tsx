import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Project } from '@/lib/types'

interface ProjectFinancialsModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
}

export function ProjectFinancialsModal({ project, isOpen, onClose }: ProjectFinancialsModalProps) {
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income')

  if (!project) return null

  const totalIncome = project.income?.reduce((sum, inc) => sum + inc.amount, 0) || 0
  const totalExpenses = project.expenses?.reduce((sum, exp) => sum + exp.total_paid, 0) || 0
  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            Project Financials: <span className="text-primary font-mono">{project.project_id_code}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex flex-col items-center">
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Total Income</span>
              <span className="text-xl font-bold font-mono text-green-700">₹{totalIncome.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex flex-col items-center">
              <span className="text-xs font-medium text-red-700 uppercase tracking-wider">Total Expenses</span>
              <span className="text-xl font-bold font-mono text-red-700">₹{totalExpenses.toLocaleString('en-IN')}</span>
            </div>
            <div className={`${netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'} p-4 rounded-lg flex flex-col items-center`}>
              <div className="flex flex-col items-center">
                <span className={`text-xs font-medium uppercase tracking-wider ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  Net Profit ({profitMargin}%)
                </span>
                <span className={`text-xl font-bold font-mono ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  ₹{netProfit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="flex border-b mb-4">
              <button
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'income' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('income')}
              >
                Income Records ({project.income?.length || 0})
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'expenses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('expenses')}
              >
                Expenses ({project.expenses?.length || 0})
              </button>
            </div>
            
            {activeTab === 'income' && (
              <div className="mt-4">
                {project.income && project.income.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left border-b">
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Method</th>
                          <th className="p-3 font-medium">Bank Account</th>
                          <th className="p-3 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {project.income.map((inc) => (
                          <tr key={inc.id}>
                            <td className="p-3">{format(new Date(inc.date), 'dd MMM yyyy')}</td>
                            <td className="p-3 capitalize">{inc.payment_mode || 'N/A'}</td>
                            <td className="p-3">
                              {inc.bank_account?.account_name}
                              <span className="block text-[10px] text-muted-foreground">{inc.bank_account?.bank_name}</span>
                            </td>
                            <td className="p-3 text-right font-bold text-green-600">
                              ₹{inc.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                    <p className="text-muted-foreground italic">No income records found for this project.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="mt-4">
                {project.expenses && project.expenses.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left border-b">
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Category</th>
                          <th className="p-3 font-medium">Vendor</th>
                          <th className="p-3 font-medium text-right">Total Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {project.expenses.map((exp) => (
                          <tr key={exp.id}>
                            <td className="p-3">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                            <td className="p-3 capitalize">{exp.category || 'N/A'}</td>
                            <td className="p-3">
                              {exp.vendor?.name || 'N/A'}
                            </td>
                            <td className="p-3 text-right font-bold text-red-600">
                              ₹{exp.total_paid.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                    <p className="text-muted-foreground italic">No expenses recorded for this project.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
