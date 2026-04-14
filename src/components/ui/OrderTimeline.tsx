/**
 * OrderTimeline Component
 *
 * Visual status timeline for order tracking.
 */

import { Check, Circle, Clock } from 'lucide-react'
import { OrderStatus } from '@/lib/enums'

interface TimelineStep {
  status: string
  label: string
  timestamp?: Date | null
}

interface OrderTimelineProps {
  currentStatus: string
  timestamps: {
    createdAt: Date
    confirmedAt?: Date | null
    preparingAt?: Date | null
    readyAt?: Date | null
    pickedUpAt?: Date | null
    deliveredAt?: Date | null
    cancelledAt?: Date | null
  }
}

const statusOrder = [
  { status: OrderStatus.PENDING, label: 'Order Placed', field: 'createdAt' },
  { status: OrderStatus.CONFIRMED, label: 'Confirmed', field: 'confirmedAt' },
  { status: OrderStatus.PREPARING, label: 'Preparing', field: 'preparingAt' },
  { status: OrderStatus.READY_FOR_PICKUP, label: 'Ready for Pickup', field: 'readyAt' },
  { status: OrderStatus.PICKED_UP, label: 'Out for Delivery', field: 'pickedUpAt' },
  { status: OrderStatus.DELIVERED, label: 'Delivered', field: 'deliveredAt' },
]

export default function OrderTimeline({ currentStatus, timestamps }: OrderTimelineProps) {
  const currentIndex = statusOrder.findIndex((s) => s.status === currentStatus)
  const isCancelled = currentStatus === OrderStatus.CANCELLED

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return null
    return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  if (isCancelled) {
    return (
      <div className="timeline">
        <div className="timeline-item">
          <div className="timeline-marker timeline-marker-complete">
            <Check size={14} />
          </div>
          <div className="timeline-content">
            <div className="timeline-title">Order Placed</div>
            <div className="timeline-time">{formatTime(timestamps.createdAt)}</div>
          </div>
        </div>
        <div className="timeline-item">
          <div
            className="timeline-marker"
            style={{ background: 'var(--color-danger)', color: 'white' }}
          >
            <Circle size={10} fill="currentColor" />
          </div>
          <div className="timeline-content">
            <div className="timeline-title" style={{ color: 'var(--color-danger)' }}>
              Order Cancelled
            </div>
            <div className="timeline-time">{formatTime(timestamps.cancelledAt)}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="timeline">
      {statusOrder.map((step, index) => {
        const timestamp = timestamps[step.field as keyof typeof timestamps] as Date | null
        const isComplete = index < currentIndex || (index === currentIndex && timestamp)
        const isCurrent = index === currentIndex
        const isPending = index > currentIndex

        let markerClass = 'timeline-marker-pending'
        if (isComplete) markerClass = 'timeline-marker-complete'
        else if (isCurrent) markerClass = 'timeline-marker-current'

        return (
          <div key={step.status} className="timeline-item">
            <div className={`timeline-marker ${markerClass}`}>
              {isComplete ? (
                <Check size={14} />
              ) : isCurrent ? (
                <Clock size={14} />
              ) : (
                <Circle size={8} />
              )}
            </div>
            {index < statusOrder.length - 1 && (
              <div
                className="timeline-line"
                style={{
                  background: isComplete ? 'var(--color-success)' : 'var(--color-border)',
                }}
              />
            )}
            <div className="timeline-content">
              <div
                className="timeline-title"
                style={{ color: isPending ? 'var(--color-text-muted)' : undefined }}
              >
                {step.label}
              </div>
              {timestamp && <div className="timeline-time">{formatTime(timestamp)}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
