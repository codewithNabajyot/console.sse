import React from 'react'

interface ProjectCustomerInfoProps {
  project?: {
    project_id_code: string
    customer?: {
      name: string
    }
  } | null
  customer?: {
    name: string
  } | null
  fallback?: string
  layout?: 'vertical' | 'horizontal'
  className?: string
}

export const ProjectCustomerInfo: React.FC<ProjectCustomerInfoProps> = ({
  project,
  customer,
  fallback = 'Common',
  layout = 'vertical',
  className = '',
}) => {
  const customerName = project?.customer?.name || customer?.name

  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${className}`}>
        {project ? (
          <>
            <span className="font-mono font-bold text-primary">{project.project_id_code}</span>
            {customerName && <span className="text-muted-foreground">•</span>}
            {customerName && <span className="truncate">{customerName}</span>}
          </>
        ) : customerName ? (
          <span className="font-medium">{customerName}</span>
        ) : (
          <span className="text-muted-foreground italic">{fallback}</span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {project ? (
        <>
          <span className="font-mono text-[10px] sm:text-xs font-bold text-primary truncate max-w-[160px]" title={project.project_id_code}>
            {project.project_id_code}
          </span>
          {customerName && (
            <span className="text-[10px] sm:text-sm text-muted-foreground truncate max-w-[160px]" title={customerName}>
              {customerName}
            </span>
          )}
        </>
      ) : customerName ? (
        <span className="text-sm font-medium truncate max-w-[160px]" title={customerName}>
          {customerName}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground italic">{fallback}</span>
      )}
    </div>
  )
}
