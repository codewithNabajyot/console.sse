import { useState } from 'react'
import { MessageSquare, Plus, Trash2, Calendar, User as UserIcon } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Note } from '@/lib/types'

interface NotesManagerProps {
  notes: Note[]
  onUpdate: (newNotes: Note[], successMessage: string) => Promise<void>
  title: string
  entityName: string
}

export function NotesManager({ notes = [], onUpdate, title, entityName }: NotesManagerProps) {
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { profile } = useAuth()

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setIsSubmitting(true)
    const note: Note = {
      content: newNote.trim(),
      created_at: new Date().toISOString(),
      user_name: profile?.full_name || 'Unknown User',
      user_id: profile?.id || 'unknown',
    }

    try {
      await onUpdate([note, ...notes], 'Note added successfully')
      setNewNote('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async (index: number) => {
    const updatedNotes = notes.filter((_, i) => i !== index)
    await onUpdate(updatedNotes, 'Note deleted successfully')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-4 w-4" />
          {notes.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {notes.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Notes for {entityName}
          </DialogTitle>
          <DialogDescription>
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Add Note Section */}
          <div className="p-6 border-b bg-muted/30">
            <div className="space-y-3">
              <Textarea
                placeholder="Type your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[100px] bg-background"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleAddNote} 
                  disabled={isSubmitting || !newNote.trim()}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </div>
          </div>

          {/* Notes List */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No notes yet</p>
                  <p className="text-xs">Add your first comment above</p>
                </div>
              ) : (
                notes.map((note, index) => (
                  <Card key={index} className="border-none bg-muted/50 rounded-2xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {note.user_name}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteNote(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
