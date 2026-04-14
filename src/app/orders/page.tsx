/**
 * Orders Page (Customer)
 *
 * Shows customer's order history and active orders.
 * Customers can view details and track status.
 *
 * Data flow:
 * 1. Fetches from GET /api/orders
 * 2. Shows order status, restaurant, total
 * 3. Links to individual order tracking pages
 */

import { prisma } from '@/lib/db'
import NavHeader from '@/components/NavHeader'
import { OrderCard, EmptyState } from '@/components/ui'
import { ShoppingBag, Package, Clock } from 'lucide-react'

export default async function OrdersPage() {
  // Get first customer for demo
  const customer = await prisma.user.findFirst({
    where: { role: 'CUSTOMER' },
  })

  if (!customer) {
    return (
      <>
        <NavHeader currentRole="customer" />
        <main className="page">
          <div className="container">
            <EmptyState
              icon={ShoppingBag}
              title="No customer found"
              description="Demo data may not be seeded."
            />
          </div>
        </main>
      </>
    )
  }

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: {
      restaurant: true,
      items: true,
      deliveryAddress: true,
    },
    orderBy: { placedAt: 'desc' },
    take: 20,
  })

  const activeOrders = orders.filter((o) =>
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COURIER_ASSIGNED', 'PICKED_UP'].includes(
      o.status
    )
  )
  const pastOrders = orders.filter((o) => ['DELIVERED', 'CANCELLED'].includes(o.status))

  return (
    <>
      <NavHeader currentRole="customer" />
      <main className="page">
        <div className="container">
          {/* Page Header */}
          <header className="page-header">
            <h1 className="page-title">Your Orders</h1>
            <p className="page-subtitle">Track active orders and view order history</p>
          </header>

          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">
                  <Clock
                    size={20}
                    style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}
                  />
                  Active Orders
                  <span className="section-count">({activeOrders.length})</span>
                </h2>
              </div>

              <div className="active-orders-grid">
                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    id={order.id}
                    restaurantName={order.restaurant.name}
                    status={order.status}
                    total={order.total}
                    itemCount={order.items.length}
                    createdAt={order.placedAt}
                    deliveryAddress={`${order.deliveryAddress.streetLine1}, ${order.deliveryAddress.city}`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Orders */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <Package
                  size={20}
                  style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}
                />
                Order History
                <span className="section-count">({pastOrders.length})</span>
              </h2>
            </div>

            {pastOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No past orders"
                description="Your completed orders will appear here"
                action={{ label: 'Browse Restaurants', href: '/restaurants' }}
              />
            ) : (
              <div className="orders-grid">
                {pastOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    id={order.id}
                    restaurantName={order.restaurant.name}
                    status={order.status}
                    total={order.total}
                    itemCount={order.items.length}
                    createdAt={order.placedAt}
                    deliveryAddress={`${order.deliveryAddress.streetLine1}, ${order.deliveryAddress.city}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
