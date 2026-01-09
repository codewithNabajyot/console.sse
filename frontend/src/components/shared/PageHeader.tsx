import React, { useEffect } from 'react'
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
  titleClassName?: string
  startAdornment?: React.ReactNode
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  titleClassName,
  startAdornment
}: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} | HelioX Console`
    
    return () => {
      document.title = 'HelioX Console'
    }
  }, [title])

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div className="flex items-center gap-4">
        {startAdornment}
        <div>
          <h1 className={cn("text-2xl font-bold tracking-tight sm:text-3xl", titleClassName)}>{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
