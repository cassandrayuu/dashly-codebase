/**
 * Merchant Dashboard
 *
 * Shows overview of merchant's restaurants and today's activity.
 * Merchants can navigate to specific restaurant management.
 *
 * Data flow:
 * 1. Fetches merchant's restaurants
 * 2. Shows today's order stats
 * 3. Links to order and menu management
 */

import { prisma } from '@/lib/db'
import Link from 'next/link'
import NavHeader from '@/components/NavHeader'
import { StatCard, EmptyState } from '@/components/ui'
import {
  Store,
  ShoppingBag,
  Clock,
  ChefHat,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  UtensilsCrossed,
  Settings,
} from 'lucide-react'

export default async function MerchantDashboard() {
  // Get first merchant for demo
  const merchant = await prisma.user.findFirst({
    where: { role: 'MERCHANT' },
  })

  if (!merchant) {
    return (
      <>
        <NavHeader currentRole="merchant" />
        <main className="page">
          <div className="container">
            <EmptyState
              icon={Store}
              title="No merchant found"
              description="Demo data may not be seeded."
            />
          </div>
        </main>
      </>
    )
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { merchantId: merchant.id },
    include: {
      _count: {
        select: { menuItems: true },
      },
    },
  })

  // Get today's stats for each restaurant
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const statsPromises = restaurants.map(async (restaurant) => {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        placedAt: { gte: startOfDay },
      },
      select: { status: true, total: true },
    })

    return {
      restaurantId: restaurant.id,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
      activeOrders: orders.filter((o) =>
        ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status)
      ).length,
      completedOrders: orders.filter((o) => o.status === 'DELIVERED').length,
      revenue: orders.filter((o) => o.status === 'DELIVERED').reduce((sum, o) => sum + o.total, 0),
    }
  })

  const stats = await Promise.all(statsPromises)

  // Calculate totals
  const totals = stats.reduce(
    (acc, s) => ({
      orders: acc.orders + s.totalOrders,
      pending: acc.pending + s.pendingOrders,
      active: acc.active + s.activeOrders,
      revenue: acc.revenue + s.revenue,
    }),
    { orders: 0, pending: 0, active: 0, revenue: 0 }
  )

  return (
    <>
      <NavHeader currentRole="merchant" />
      <main className="page">
        <div className="container">
          {/* Page Header */}
          <header className="page-header">
            <div className="merchant-header">
              <div>
                <h1 className="page-title">Merchant Dashboard</h1>
                <p className="page-subtitle">Welcome back, {merchant.name}</p>
              </div>
              <div className="header-date">
                {new Date().toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </header>

          {/* Today's Overview */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Today's Overview</h2>
            </div>
            <div className="grid grid-4">
              <StatCard icon={ShoppingBag} value={totals.orders} label="Total Orders" variant="primary" />
              <StatCard
                icon={AlertCircle}
                value={totals.pending}
                label="Needs Confirmation"
                variant="warning"
              />
              <StatCard icon={ChefHat} value={totals.active} label="In Progress" variant="info" />
              <StatCard
                icon={DollarSign}
                value={`$${totals.revenue.toFixed(0)}`}
                label="Revenue"
                variant="success"
              />
            </div>
          </section>

          {/* Restaurants */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <Store size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                Your Restaurants
              </h2>
            </div>

            <div className="restaurants-grid">
              {restaurants.map((restaurant) => {
                const restaurantStats = stats.find((s) => s.restaurantId === restaurant.id)!
                const hasPending = restaurantStats.pendingOrders > 0

                return (
                  <div key={restaurant.id} className="restaurant-card card">
                    <div className="restaurant-card-header">
                      <div className="restaurant-card-info">
                        <div
                          className="restaurant-card-avatar"
                          style={{ background: getRestaurantColor(restaurant.name) }}
                        >
                          {restaurant.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="restaurant-card-name">{restaurant.name}</h3>
                          <p className="restaurant-card-meta">
                            {restaurant.cuisine} • {restaurant._count.menuItems} menu items
                          </p>
                        </div>
                      </div>
                      {hasPending && (
                        <span className="pending-badge">
                          <AlertCircle size={14} />
                          {restaurantStats.pendingOrders} pending
                        </span>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-item-value">{restaurantStats.totalOrders}</span>
                        <span className="stat-item-label">Orders</span>
                      </div>
                      <div className="stat-item stat-item-warning">
                        <span className="stat-item-value">{restaurantStats.pendingOrders}</span>
                        <span className="stat-item-label">Pending</span>
                      </div>
                      <div className="stat-item stat-item-info">
                        <span className="stat-item-value">{restaurantStats.activeOrders}</span>
                        <span className="stat-item-label">Active</span>
                      </div>
                      <div className="stat-item stat-item-success">
                        <span className="stat-item-value">${restaurantStats.revenue.toFixed(0)}</span>
                        <span className="stat-item-label">Revenue</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="restaurant-card-actions">
                      <Link
                        href={`/merchant/orders?restaurant=${restaurant.id}`}
                        className={`btn ${hasPending ? 'btn-primary' : 'btn-secondary'} restaurant-action-btn`}
                      >
                        <UtensilsCrossed size={16} />
                        View Orders
                        {hasPending && (
                          <span className="action-badge">{restaurantStats.pendingOrders}</span>
                        )}
                        <ChevronRight size={16} className="action-chevron" />
                      </Link>
                      <Link
                        href={`/merchant/menu?restaurant=${restaurant.id}`}
                        className="btn btn-ghost restaurant-action-btn"
                      >
                        <Settings size={16} />
                        Manage Menu
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function getRestaurantColor(name: string): string {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6']
  const colorIndex = name.charCodeAt(0) % colors.length
  return colors[colorIndex]
}
