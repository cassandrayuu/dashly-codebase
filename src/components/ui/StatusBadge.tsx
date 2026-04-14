/**
 * StatusBadge Component
 *
 * Consistent status badge styling across the app.
 */

import { OrderStatus } from '@/lib/enums'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'default'
}

const statusConfig: Record<string, { variant: string; label: string }> = {
  [OrderStatus.PENDING]: { variant: 'warning', label: 'Pending' },
  [OrderStatus.CONFIRMED]: { variant: 'info', label: 'Confirmed' },
  [OrderStatus.PREPARING]: { variant: 'purple', label: 'Preparing' },
  [OrderStatus.READY_FOR_PICKUP]: { variant: 'info', label: 'Ready' },
  [OrderStatus.COURIER_ASSIGNED]: { variant: 'info', label: 'Courier Assigned' },
  [OrderStatus.PICKED_UP]: { variant: 'purple', label: 'Picked Up' },
  [OrderStatus.DELIVERED]: { variant: 'success', label: 'Delivered' },
  [OrderStatus.CANCELLED]: { variant: 'danger', label: 'Cancelled' },
  // Courier statuses
  AVAILABLE: { variant: 'success', label: 'Available' },
  ON_DELIVERY: { variant: 'info', label: 'On Delivery' },
  OFFLINE: { variant: 'neutral', label: 'Offline' },
  // Refund statuses
  APPROVED: { variant: 'success', label: 'Approved' },
  DENIED: { variant: 'danger', label: 'Denied' },
  // Restaurant
  OPEN: { variant: 'success', label: 'Open' },
  CLOSED: { variant: 'neutral', label: 'Closed' },
}

export default function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status] || { variant: 'neutral', label: status }
  const sizeClass = size === 'sm' ? 'badge-sm' : ''

  return <span className={`badge badge-${config.variant} ${sizeClass}`}>{config.label}</span>
}
