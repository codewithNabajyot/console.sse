import { useState } from 'react'
import { FolderKanban, Users, Building2, Landmark } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import CustomerForm from '@/pages/customers/CustomerForm'
import VendorForm from '@/pages/vendors/VendorForm'
import BankAccountForm from '@/pages/bank-accounts/BankAccountForm'
import ProjectForm from '@/pages/projects/ProjectForm'

export type QuickAddType = 'customer' | 'vendor' | 'bank_account' | 'project'

interface QuickAddProps {
  type: QuickAddType
  trigger?: React.ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function QuickAdd({ type, trigger, onSuccess, open: propOpen, onOpenChange: propOnOpenChange }: QuickAddProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = propOpen !== undefined ? propOpen : internalOpen
  const setOpen = propOnOpenChange !== undefined ? propOnOpenChange : setInternalOpen

  const handleSuccess = () => {
    setOpen(false)
    onSuccess?.()
  }

  const handleCancel = () => {
    setOpen(false)
  }

  const config = {
    customer: {
      title: 'New Customer',
      description: 'Quickly add a new customer to your database',
      icon: Users,
      Form: CustomerForm
    },
    vendor: {
      title: 'New Vendor',
      description: 'Quickly add a new vendor to your database',
      icon: Building2,
      Form: VendorForm
    },
    bank_account: {
      title: 'New Bank Account',
      description: 'Quickly add a new bank account to track',
      icon: Landmark,
      Form: BankAccountForm
    },
    project: {
      title: 'New Project',
      description: 'Quickly add a new project to your database',
      icon: FolderKanban,
      Form: ProjectForm
    }
  }[type]

  const { title, description, icon: Icon, Form } = config

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent 
        className="sm:max-w-[500px]"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Form 
            isDialog 
            onSuccess={handleSuccess} 
            onCancel={handleCancel} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
