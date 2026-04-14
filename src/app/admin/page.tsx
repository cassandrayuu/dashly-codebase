/**
 * Admin Dashboard
 *
 * Shows pending refunds and platform overview.
 * Admins can process refund requests.
 */

import { prisma } from '@/lib/db'
import { RefundStatus, RefundReason } from '@/lib/enums'
import NavHeader from '@/components/NavHeader'
import { StatCard, EmptyState, StatusBadge } from '@/components/ui'
import {
  ShoppingBag,
  Package,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  User,
  Clock,
  Receipt,
  Store,
  DollarSign,
} from 'lucide-react'

export default async function AdminDashboard() {
  // Get pending refunds
  const pendingRefunds = await prisma.refund.findMany({
    where: { status: RefundStatus.PENDING },
    include: {
      order: {
        include: {
          restaurant: true,
          items: {
            include: { menuItem: true },
          },
        },
      },
      requester: {
        select: { name: true, email: true },
      },
    },
    orderBy: { requestedAt: 'asc' },
  })

  // Get today's stats
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todayOrders = await prisma.order.count({
    where: { placedAt: { gte: startOfDay } },
  })

  const todayDelivered = await prisma.order.count({
    where: {
      deliveredAt: { gte: startOfDay },
      status: 'DELIVERED',
    },
  })

  const todayRefunds = await prisma.refund.count({
    where: { requestedAt: { gte: startOfDay } },
  })

  const todayRevenue = await prisma.order.aggregate({
    where: {
      deliveredAt: { gte: startOfDay },
      status: 'DELIVERED',
    },
    _sum: { total: true },
  })

  const reasonLabels: Record<RefundReason, string> = {
    WRONG_ITEMS: 'Wrong Items',
    MISSING_ITEMS: 'Missing Items',
    QUALITY_ISSUE: 'Quality Issue',
    NEVER_DELIVERED: 'Never Delivered',
    EXCESSIVE_DELAY: 'Excessive Delay',
    OTHER: 'Other',
  }

  const reasonIcons: Record<RefundReason, string> = {
    WRONG_ITEMS: 'warning',
    MISSING_ITEMS: 'warning',
    QUALITY_ISSUE: 'warning',
    NEVER_DELIVERED: 'danger',
    EXCESSIVE_DELAY: 'info',
    OTHER: 'neutral',
  }

  const timeSince = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <>
      <NavHeader currentRole="admin" />
      <main className="page">
        <div className="container">
          {/* Page Header */}
          <header className="admin-header">
            <div>
              <h1 className="page-title">Admin Dashboard</h1>
              <p className="page-subtitle">Platform operations and support</p>
            </div>
            <div className="header-date">
              {new Date().toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </header>

          {/* Today's Stats */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Today's Overview</h2>
            </div>
            <div className="grid grid-4">
              <StatCard
                icon={ShoppingBag}
                value={todayOrders}
                label="Total Orders"
                variant="primary"
              />
              <StatCard
                icon={Package}
                value={todayDelivered}
                label="Delivered"
                variant="success"
              />
              <StatCard
                icon={DollarSign}
                value={`$${(todayRevenue._sum.total || 0).toFixed(0)}`}
                label="Revenue"
                variant="success"
              />
              <StatCard
                icon={RotateCcw}
                value={todayRefunds}
                label="Refund Requests"
                variant="warning"
              />
            </div>
          </section>

          {/* Pending Refunds */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <AlertCircle
                  size={20}
                  style={{ marginRight: '8px', verticalAlign: 'text-bottom' }}
                />
                Pending Refunds
                <span className="section-count">({pendingRefunds.length})</span>
              </h2>
            </div>

            {pendingRefunds.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up!"
                description="No pending refund requests to review."
              />
            ) : (
              <div className="refunds-grid">
                {pendingRefunds.map((refund) => (
                  <div key={refund.id} className="refund-card card">
                    {/* Header */}
                    <div className="refund-header">
                      <div className="refund-id">
                        <RotateCcw size={16} />
                        <span>#{refund.id.slice(-8).toUpperCase()}</span>
                      </div>
                      <span
                        className={`badge badge-${
                          reasonIcons[refund.reason as RefundReason] || 'neutral'
                        }`}
                      >
                        {reasonLabels[refund.reason as RefundReason]}
                      </span>
                    </div>

                    {/* Order Reference */}
                    <div className="refund-order">
                      <Store size={14} />
                      <span>{refund.order.restaurant.name}</span>
                      <span className="refund-order-id">
                        Order #{refund.order.id.slice(-8).toUpperCase()}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="refund-customer">
                      <div className="customer-row">
                        <User size={14} />
                        <span>{refund.requester.name}</span>
                      </div>
                      <div className="customer-email">{refund.requester.email}</div>
                    </div>

                    {/* Request Details */}
                    <div className="refund-details">
                      <div className="detail-row">
                        <span className="detail-label">Requested Amount</span>
                        <span className="detail-value amount">${refund.amount.toFixed(2)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Type</span>
                        <span className="detail-value">
                          {refund.refundType.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Order Total</span>
                        <span className="detail-value">${refund.order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Reason Detail */}
                    {refund.reasonDetail && (
                      <div className="refund-reason">
                        <span className="reason-label">Customer Notes</span>
                        <p className="reason-text">{refund.reasonDetail}</p>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="refund-items">
                      <div className="items-header">
                        <Receipt size={14} />
                        <span>Order Items</span>
                      </div>
                      <ul className="items-list">
                        {refund.order.items.map((item) => (
                          <li key={item.id}>
                            <span className="item-qty">{item.quantity}x</span>
                            <span className="item-name">{item.menuItem.name}</span>
                            <span className="item-price">
                              ${(item.priceAtPurchase * item.quantity).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Timestamp */}
                    <div className="refund-time">
                      <Clock size={12} />
                      <span>Requested {timeSince(refund.requestedAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="refund-actions">
                      <button className="btn btn-success">
                        <CheckCircle2 size={16} />
                        Approve ${refund.amount.toFixed(2)}
                      </button>
                      <button className="btn btn-secondary">
                        <XCircle size={16} />
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
