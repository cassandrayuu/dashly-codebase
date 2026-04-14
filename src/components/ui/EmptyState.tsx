/**
 * EmptyState Component
 *
 * Placeholder for empty lists or sections.
 */

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-text">{description}</p>}
      {action && (
        <a href={action.href} className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
          {action.label}
        </a>
      )}
    </div>
  )
}
