
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotesManager } from '@/components/NotesManager'
import type { Note } from '@/lib/types'
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

interface MobileTransactionCardProps {
  title: React.ReactNode
  badge?: React.ReactNode
  fields: {
    label: string
    value: React.ReactNode
    className?: string
  }[]
  notesProps: {
    notes: Note[]
    onUpdate: (newNotes: Note[]) => Promise<void>
    title: string
    entityName: string
  }
  editLink: string
  onDelete: () => void
  deleteTitle?: string
  deleteDescription?: string
}

export function MobileTransactionCard({
  title,
  badge,
  fields,
  notesProps,
  editLink,
  onDelete,
  deleteTitle = "Delete Record",
  deleteDescription = "Are you sure you want to delete this record? This action cannot be undone."
}: MobileTransactionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="font-semibold">{title}</span>
          {badge}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {fields.map((field, index) => (
          <div key={index} className="flex justify-between items-start gap-2">
            <span className="text-muted-foreground shrink-0">{field.label}:</span>
            <span className={`font-medium text-right ${field.className || ''}`}>
              {field.value}
            </span>
          </div>
        ))}
        
        <div className="flex justify-end gap-2 pt-2 border-t mt-3">
          <div className="text-primary">
            <NotesManager
              notes={notesProps.notes}
              onUpdate={notesProps.onUpdate}
              title={notesProps.title}
              entityName={notesProps.entityName}
            />
          </div>
          
          <Button variant="ghost" size="icon" asChild>
            <Link to={editLink}>
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
                <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
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
  )
}
