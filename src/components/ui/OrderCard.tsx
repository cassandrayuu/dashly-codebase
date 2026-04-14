/**
 * OrderCard Component
 *
 * Card display for order listings.
 */

import Link from 'next/link'
import { ChevronRight, MapPin, Clock } from 'lucide-react'
import StatusBadge from './StatusBadge'

interface OrderCardProps {
  id: string
  restaurantName: string
  status: string
  total: number
  itemCount: number
  createdAt: Date
  deliveryAddress?: string
  showActions?: boolean
}

export default function OrderCard({
  id,
  restaurantName,
  status,
  total,
  itemCount,
  createdAt,
  deliveryAddress,
  showActions = true,
}: OrderCardProps) {
  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <Link href={`/orders/${id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-clickable order-card-link">
        <div className="order-card-header">
          <div className="order-card-restaurant">
            <h3 className="order-card-name">{restaurantName}</h3>
            <StatusBadge status={status} size="sm" />
          </div>
          <div className="order-card-meta">
            <span className="order-card-date">
              <Clock size={14} />
              {formatDate(createdAt)} at {formatTime(createdAt)}
            </span>
          </div>
        </div>

        <div className="order-card-body">
          <div className="order-card-summary">
            <span className="order-card-items">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            <span className="order-card-total">${total.toFixed(2)}</span>
          </div>

          {deliveryAddress && (
            <div className="order-card-address">
              <MapPin size={14} />
              <span>{deliveryAddress}</span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="order-card-footer">
            <span className="order-card-action">
              View details
              <ChevronRight size={16} />
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
