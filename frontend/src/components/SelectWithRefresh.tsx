import * as React from "react"
import { Plus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { QuickAdd, type QuickAddType } from "@/components/quick-add/QuickAdd"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectWithRefreshProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  isRefreshing?: boolean
  onRefresh: () => void
  className?: string
  quickAddType?: QuickAddType
}

export function SelectWithRefresh({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  isRefreshing = false,
  onRefresh,
  className,
  quickAddType,
}: SelectWithRefreshProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false)

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsQuickAddOpen(true)
  }

  return (
    <>
      <Select 
        key={`${options.length}-${value}`} 
        value={value || ""} 
        onValueChange={onValueChange} 
        disabled={disabled}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {/* Options */}
          {options
            .filter(opt => opt.value && opt.value !== "")
            .map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}

          {options.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No options available
            </div>
          )}

          {/* Add New Button at the bottom */}
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-2 mx-1 mt-1 rounded-sm text-sm font-medium cursor-pointer",
              "bg-primary/5 text-primary hover:bg-primary/10 transition-colors border-t border-border",
              isRefreshing && "opacity-50 cursor-wait"
            )}
            onClick={handleAddClick}
          >
            <Plus
              className={cn(
                "h-4 w-4",
                isRefreshing && "animate-spin"
              )}
            />
            <span>{isRefreshing ? "Refreshing..." : "Add New"}</span>
          </div>
        </SelectContent>
      </Select>

      {quickAddType && (
        <QuickAdd
          type={quickAddType}
          open={isQuickAddOpen}
          onOpenChange={setIsQuickAddOpen}
          onSuccess={onRefresh}
        />
      )}
    </>
  )
}
