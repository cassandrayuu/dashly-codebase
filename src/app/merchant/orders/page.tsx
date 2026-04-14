/**
 * Merchant Orders Page
 *
 * Shows incoming orders for a restaurant.
 * Merchants can confirm, prepare, and mark orders ready.
 *
 * Order Status Flow (merchant actions):
 * PENDING → [Confirm] → CONFIRMED → [Start Preparing] → PREPARING → [Mark Ready] → READY_FOR_PICKUP
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import NavHeader from '@/components/NavHeader'
import { StatusBadge, EmptyState } from '@/components/ui'
import {
  ArrowLeft,
  Clock,
  MapPin,
  User,
  AlertCircle,
  ChefHat,
  CheckCircle2,
  Package,
  Phone,
} from 'lucide-react'

export default async function MerchantOrdersPage({
  searchParams,
}: {
  searchParams: { restaurant?: string }
}) {
  let restaurantId = searchParams.restaurant

  // If no restaurant specified, get the first merchant's first restaurant
  if (!restaurantId) {
    const merchant = await prisma.user.findFirst({
      where: { role: 'MERCHANT' },
    })
    if (merchant) {
      const firstRestaurant = await prisma.restaurant.findFirst({
        where: { merchantId: merchant.id },
      })
      if (firstRestaurant) {
        restaurantId = firstRestaurant.id
      }
    }
  }

  if (!restaurantId) {
    return (
      <>
        <NavHeader currentRole="merchant" />
        <main className="page">
          <div className="container">
            <EmptyState
              icon={Package}
              title="No restaurants found"
              description="Add a restaurant to start receiving orders."
              action={{ label: 'Back to Dashboard', href: '/merchant' }}
            />
          </div>
        </main>
      </>
    )
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  })

  if (!restaurant) {
    return (
      <>
        <NavHeader currentRole="merchant" />
        <main className="page">
          <div className="container">
            <EmptyState
              icon={Package}
              title="Restaurant not found"
              action={{ label: 'Back to Dashboard', href: '/merchant' }}
            />
          </div>
        </main>
      </>
    )
  }

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurantId,
      status: {
        in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'],
      },
    },
    include: {
      items: {
        include: { menuItem: true },
      },
      customer: {
        select: { name: true, phone: true },
      },
      deliveryAddress: true,
    },
    orderBy: { placedAt: 'desc' },
  })

  const pendingOrders = orders.filter((o) => o.status === 'PENDING')
  const activeOrders = orders.filter((o) =>
    ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status)
  )

  return (
    <>
      <NavHeader currentRole="merchant" />
      <main className="page">
        <div className="container">
          {/* Back link */}
          <Link href="/merchant" className="back-link">
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>

          {/* Page Header */}
          <header className="orders-header">
            <div className="orders-header-info">
              <h1 className="page-title">{restaurant.name}</h1>
              <p className="page-subtitle">Order Management</p>
            </div>
            <div className="orders-summary">
              <div className="summary-item summary-pending">
                <AlertCircle size={18} />
                <span>{pendingOrders.length} pending</span>
              </div>
              <div className="summary-item summary-active">
                <ChefHat size={18} />
                <span>{activeOrders.length} in progress</span>
              </div>
            </div>
          </header>

          {/* Pending Orders - Need Confirmation */}
          {pendingOrders.length > 0 && (
            <section className="section">
              <div className="section-header urgent-header">
                <h2 className="section-title">
                  <AlertCircle size={20} />
                  Needs Confirmation
                  <span className="section-count">({pendingOrders.length})</span>
                </h2>
              </div>
              <div className="orders-grid">
                {pendingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} action="confirm" urgent />
                ))}
              </div>
            </section>
          )}

          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">
                  <ChefHat size={20} />
                  Active Orders
                  <span className="section-count">({activeOrders.length})</span>
                </h2>
              </div>
              <div className="orders-grid">
                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    action={
                      order.status === 'CONFIRMED'
                        ? 'prepare'
                        : order.status === 'PREPARING'
                        ? 'ready'
                        : null
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {orders.length === 0 && (
            <EmptyState
              icon={Package}
              title="No active orders"
              description="New orders will appear here when customers place them."
            />
          )}
        </div>
      </main>
    </>
  )
}

function OrderCard({
  order,
  action,
  urgent = false,
}: {
  order: {
    id: string
    status: string
    placedAt: Date
    total: number
    estimatedDelivery: Date | null
    items: Array<{
      id: string
      quantity: number
      specialInstructions: string | null
      substitutionStatus: string
      menuItem: { name: string }
    }>
    customer: { name: string; phone: string | null }
    deliveryAddress: { streetLine1: string; city: string }
  }
  action: 'confirm' | 'prepare' | 'ready' | null
  urgent?: boolean
}) {
  const actionConfig = {
    confirm: { label: 'Confirm Order', icon: CheckCircle2, variant: 'btn-primary' },
    prepare: { label: 'Start Preparing', icon: ChefHat, variant: 'btn-primary' },
    ready: { label: 'Mark Ready', icon: Package, variant: 'btn-success' },
  }

  const config = action ? actionConfig[action] : null
  const Icon = config?.icon

  const timeSince = (date: Date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
  }

  return (
    <div className={`order-card card ${urgent ? 'order-card-urgent' : ''}`}>
      <div className="order-card-header">
        <div className="order-card-info">
          <h3 className="order-id">#{order.id.slice(-8).toUpperCase()}</h3>
          <div className="order-time">
            <Clock size={14} />
            <span>{timeSince(order.placedAt)}</span>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Customer Info */}
      <div className="order-customer">
        <div className="customer-info">
          <User size={16} />
          <span>{order.customer.name}</span>
        </div>
        {order.customer.phone && (
          <div className="customer-phone">
            <Phone size={14} />
            <span>{order.customer.phone}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="order-items">
        {order.items.map((item) => (
          <div key={item.id} className="order-item">
            <span className="item-qty">{item.quantity}x</span>
            <div className="item-details">
              <span className="item-name">{item.menuItem.name}</span>
              {item.specialInstructions && (
                <span className="item-note">{item.specialInstructions}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Address */}
      <div className="order-delivery">
        <MapPin size={14} />
        <span>
          {order.deliveryAddress.streetLine1}, {order.deliveryAddress.city}
        </span>
      </div>

      {/* Footer */}
      <div className="order-card-footer">
        <span className="order-total">${order.total.toFixed(2)}</span>
        {config && Icon && (
          <button className={`btn ${config.variant}`}>
            <Icon size={16} />
            {config.label}
          </button>
        )}
      </div>

    </div>
  )
}
