/**
 * Courier Dashboard
 *
 * Shows courier status, active delivery, and available orders.
 * Couriers can go online/offline and accept deliveries.
 *
 * Courier Flow:
 * 1. Go online to see available orders
 * 2. Accept a delivery
 * 3. Navigate to restaurant, pick up order
 * 4. Navigate to customer, mark delivered
 * 5. Automatically become available again
 */

import { prisma } from '@/lib/db'
import { CourierStatus, OrderStatus } from '@/lib/enums'
import NavHeader from '@/components/NavHeader'
import { StatusBadge, StatCard, EmptyState } from '@/components/ui'
import {
  Truck,
  Package,
  MapPin,
  Navigation,
  Phone,
  User,
  CheckCircle2,
  Clock,
  DollarSign,
  Power,
  PowerOff,
  Store,
  Home,
  ArrowRight,
  Zap,
} from 'lucide-react'

export default async function CourierDashboard() {
  // Get first courier for demo
  const courier = await prisma.user.findFirst({
    where: { role: 'COURIER' },
  })

  if (!courier) {
    return (
      <>
        <NavHeader currentRole="courier" />
        <main className="page">
          <div className="container">
            <EmptyState
              icon={Truck}
              title="No courier found"
              description="Demo data may not be seeded."
            />
          </div>
        </main>
      </>
    )
  }

  // Get courier's active delivery
  const activeOrder = await prisma.order.findFirst({
    where: {
      courierId: courier.id,
      status: {
        in: [OrderStatus.COURIER_ASSIGNED, OrderStatus.PICKED_UP],
      },
    },
    include: {
      restaurant: true,
      customer: {
        select: { name: true, phone: true },
      },
      deliveryAddress: true,
      items: {
        include: { menuItem: true },
      },
    },
  })

  // Get available orders if courier is available and has no active delivery
  const availableOrders =
    courier.courierStatus === CourierStatus.AVAILABLE && !activeOrder
      ? await prisma.order.findMany({
          where: {
            status: OrderStatus.READY_FOR_PICKUP,
            courierId: null,
          },
          include: {
            restaurant: true,
            deliveryAddress: true,
            items: true,
          },
          orderBy: { readyAt: 'asc' },
        })
      : []

  // Get today's completed deliveries and earnings
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const todaysDeliveries = await prisma.order.findMany({
    where: {
      courierId: courier.id,
      status: OrderStatus.DELIVERED,
      deliveredAt: { gte: startOfDay },
    },
    select: { deliveryFee: true, tip: true },
  })

  const completedToday = todaysDeliveries.length
  const earningsToday = todaysDeliveries.reduce((sum, o) => sum + o.deliveryFee + o.tip, 0)

  const isOnline = courier.courierStatus !== CourierStatus.OFFLINE
  const isOnDelivery = courier.courierStatus === CourierStatus.ON_DELIVERY

  return (
    <>
      <NavHeader currentRole="courier" />
      <main className="page">
        <div className="container-narrow">
          {/* Page Header */}
          <header className="courier-header">
            <div className="courier-header-info">
              <div className="avatar avatar-lg avatar-primary">
                <User size={24} />
              </div>
              <div>
                <h1 className="courier-name">{courier.name}</h1>
                <p className="courier-subtitle">Courier Dashboard</p>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="status-toggle">
              {isOnDelivery ? (
                <div className="status-badge status-delivering">
                  <Truck size={18} />
                  <span>On Delivery</span>
                </div>
              ) : isOnline ? (
                <button className="btn btn-secondary status-btn">
                  <PowerOff size={16} />
                  Go Offline
                </button>
              ) : (
                <button className="btn btn-success status-btn">
                  <Power size={16} />
                  Go Online
                </button>
              )}
            </div>
          </header>

          {/* Today's Stats */}
          <section className="section">
            <div className="grid grid-3">
              <StatCard
                icon={Package}
                value={completedToday}
                label="Deliveries Today"
                variant="primary"
              />
              <StatCard
                icon={DollarSign}
                value={`$${earningsToday.toFixed(2)}`}
                label="Earnings Today"
                variant="success"
              />
              <StatCard
                icon={Zap}
                value={isOnline ? 'Online' : 'Offline'}
                label="Current Status"
                variant={isOnline ? 'success' : 'warning'}
              />
            </div>
          </section>

          {/* Active Delivery */}
          {activeOrder && (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">
                  <Truck size={20} />
                  Active Delivery
                </h2>
              </div>

              <div className="active-delivery-card card">
                {/* Order Info */}
                <div className="delivery-order-info">
                  <div className="order-header">
                    <span className="order-id">#{activeOrder.id.slice(-8).toUpperCase()}</span>
                    <StatusBadge status={activeOrder.status} />
                  </div>
                  <div className="order-summary">
                    <span>
                      {activeOrder.items.reduce((sum, i) => sum + i.quantity, 0)} items
                    </span>
                    <span className="order-total">${activeOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Route Steps */}
                <div className="delivery-route">
                  {/* Pickup */}
                  <div
                    className={`route-step ${
                      activeOrder.status === OrderStatus.COURIER_ASSIGNED
                        ? 'route-step-active'
                        : 'route-step-complete'
                    }`}
                  >
                    <div className="route-step-marker">
                      {activeOrder.status === OrderStatus.COURIER_ASSIGNED ? (
                        <Store size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </div>
                    <div className="route-step-content">
                      <span className="route-step-label">
                        {activeOrder.status === OrderStatus.COURIER_ASSIGNED
                          ? 'Pick up from'
                          : 'Picked up from'}
                      </span>
                      <span className="route-step-name">{activeOrder.restaurant.name}</span>
                      <span className="route-step-address">
                        {activeOrder.restaurant.streetAddress}, {activeOrder.restaurant.city}
                      </span>
                    </div>
                    {activeOrder.status === OrderStatus.COURIER_ASSIGNED && (
                      <button className="btn btn-ghost btn-icon">
                        <Navigation size={18} />
                      </button>
                    )}
                  </div>

                  <div className="route-connector">
                    <ArrowRight size={16} />
                  </div>

                  {/* Dropoff */}
                  <div
                    className={`route-step ${
                      activeOrder.status === OrderStatus.PICKED_UP
                        ? 'route-step-active'
                        : 'route-step-pending'
                    }`}
                  >
                    <div className="route-step-marker">
                      <Home size={18} />
                    </div>
                    <div className="route-step-content">
                      <span className="route-step-label">Deliver to</span>
                      <span className="route-step-name">{activeOrder.customer.name}</span>
                      <span className="route-step-address">
                        {activeOrder.deliveryAddress.streetLine1},{' '}
                        {activeOrder.deliveryAddress.city}
                      </span>
                      {activeOrder.customer.phone && (
                        <a href={`tel:${activeOrder.customer.phone}`} className="route-step-phone">
                          <Phone size={12} />
                          {activeOrder.customer.phone}
                        </a>
                      )}
                    </div>
                    {activeOrder.status === OrderStatus.PICKED_UP && (
                      <button className="btn btn-ghost btn-icon">
                        <Navigation size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="delivery-action">
                  {activeOrder.status === OrderStatus.COURIER_ASSIGNED && (
                    <button className="btn btn-primary btn-lg w-full">
                      <CheckCircle2 size={18} />
                      Confirm Pickup
                    </button>
                  )}
                  {activeOrder.status === OrderStatus.PICKED_UP && (
                    <button className="btn btn-success btn-lg w-full">
                      <CheckCircle2 size={18} />
                      Complete Delivery
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Available Orders */}
          {courier.courierStatus === CourierStatus.AVAILABLE && !activeOrder && (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">
                  <Package size={20} />
                  Available Orders
                  <span className="section-count">({availableOrders.length})</span>
                </h2>
              </div>

              {availableOrders.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No orders available"
                  description="Stay online to receive new delivery requests."
                />
              ) : (
                <div className="available-orders">
                  {availableOrders.map((order) => (
                    <div key={order.id} className="card available-order-card">
                      <div className="available-order-header">
                        <div className="available-order-restaurant">
                          <Store size={16} />
                          <span>{order.restaurant.name}</span>
                        </div>
                        <span className="available-order-total">${order.total.toFixed(2)}</span>
                      </div>

                      <div className="available-order-details">
                        <div className="detail-row">
                          <Package size={14} />
                          <span>{order.items.reduce((sum, i) => sum + i.quantity, 0)} items</span>
                        </div>
                        <div className="detail-row">
                          <MapPin size={14} />
                          <span>{order.restaurant.streetAddress}</span>
                        </div>
                        <div className="detail-row">
                          <Home size={14} />
                          <span>
                            {order.deliveryAddress.streetLine1}, {order.deliveryAddress.city}
                          </span>
                        </div>
                      </div>

                      <button className="btn btn-primary w-full">
                        <Truck size={16} />
                        Accept Delivery
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Offline Message */}
          {courier.courierStatus === CourierStatus.OFFLINE && (
            <section className="section">
              <div className="offline-card">
                <div className="offline-icon">
                  <PowerOff size={32} />
                </div>
                <h2 className="offline-title">You're Offline</h2>
                <p className="offline-text">Go online to start receiving delivery requests</p>
                <button className="btn btn-success btn-lg">
                  <Power size={18} />
                  Go Online
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
