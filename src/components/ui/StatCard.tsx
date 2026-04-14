/**
 * StatCard Component
 *
 * Displays a metric with icon, value, and label.
 */

import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  value: string | number
  label: string
  variant?: 'primary' | 'success' | 'warning' | 'info'
}

export default function StatCard({ icon: Icon, value, label, variant = 'primary' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${variant}`}>
        <Icon size={20} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
