/**
 * Restaurants Page (Customer)
 *
 * Displays list of available restaurants.
 * Customers can browse, filter, and select a restaurant.
 *
 * Data flow:
 * 1. Fetches from GET /api/restaurants
 * 2. Shows open/closed status, delivery info
 * 3. Links to individual restaurant pages
 */

import { prisma } from '@/lib/db'
import { checkRestaurantAvailability } from '@/domain/restaurant/availability'
import NavHeader from '@/components/NavHeader'
import { RestaurantCard } from '@/components/ui'
import { Search, SlidersHorizontal } from 'lucide-react'

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    include: {
      openingHours: true,
      _count: {
        select: { menuItems: { where: { isAvailable: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Group by cuisine for filtering hint
  const cuisines = Array.from(new Set(restaurants.map((r) => r.cuisine)))

  return (
    <>
      <NavHeader currentRole="customer" />
      <main className="page">
        <div className="container">
          {/* Page Header */}
          <header className="page-header">
            <h1 className="page-title">Restaurants</h1>
            <p className="page-subtitle">Order delivery from local restaurants</p>
          </header>

          {/* Search/Filter Bar */}
          <div className="search-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search restaurants or cuisines..."
                className="search-input"
                disabled
              />
            </div>
            <div className="filter-tags">
              {cuisines.slice(0, 5).map((cuisine) => (
                <span key={cuisine} className="tag">
                  {cuisine}
                </span>
              ))}
              <button className="btn btn-ghost btn-sm" disabled>
                <SlidersHorizontal size={14} />
                Filters
              </button>
            </div>
          </div>

          {/* Restaurant Grid */}
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                All Restaurants
                <span className="section-count">({restaurants.length})</span>
              </h2>
            </div>

            <div className="grid grid-3">
              {restaurants.map((restaurant) => {
                const availability = checkRestaurantAvailability(
                  restaurant,
                  restaurant.openingHours
                )

                return (
                  <RestaurantCard
                    key={restaurant.id}
                    id={restaurant.id}
                    name={restaurant.name}
                    cuisine={restaurant.cuisine}
                    isOpen={availability.isOpen}
                    deliveryFee={restaurant.deliveryFee}
                    estimatedDeliveryMinutes={restaurant.estimatedPrepTime + 15}
                    itemCount={restaurant._count.menuItems}
                  />
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
