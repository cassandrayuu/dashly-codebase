/**
 * Restaurant Detail Page (Customer)
 *
 * Shows restaurant menu organized by category.
 * Customers can add items to cart from here.
 *
 * Data flow:
 * 1. Fetches restaurant with menu from database
 * 2. Displays categories and items
 * 3. "Add to Cart" buttons call POST /api/cart
 */

import { prisma } from '@/lib/db'
import { checkRestaurantAvailability } from '@/domain/restaurant/availability'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import NavHeader from '@/components/NavHeader'
import { MenuItemCard } from '@/components/ui'
import {
  ArrowLeft,
  Clock,
  DollarSign,
  MapPin,
  Star,
  Truck,
  ChevronRight,
} from 'lucide-react'

export default async function RestaurantPage({ params }: { params: { id: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.id },
    include: {
      openingHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
      menuCategories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          menuItems: {
            orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
          },
        },
      },
    },
  })

  if (!restaurant) {
    notFound()
  }

  const availability = checkRestaurantAvailability(restaurant, restaurant.openingHours)

  // Get popular items across all categories
  const popularItems = restaurant.menuCategories
    .flatMap((c) => c.menuItems)
    .filter((item) => item.isPopular && item.isAvailable)
    .slice(0, 4)

  return (
    <>
      <NavHeader currentRole="customer" />
      <main className="page">
        <div className="container">
          {/* Breadcrumb */}
          <Link href="/restaurants" className="back-link">
            <ArrowLeft size={16} />
            <span>All Restaurants</span>
          </Link>

          {/* Restaurant Header */}
          <header className="restaurant-header">
            <div className="restaurant-hero">
              <div
                className="restaurant-hero-image"
                style={{ background: getRestaurantColor(restaurant.name) }}
              >
                <span className="restaurant-hero-initial">
                  {restaurant.name.charAt(0).toUpperCase()}
                </span>
                {!availability.isOpen && (
                  <div className="restaurant-closed-overlay">
                    <span>Currently Closed</span>
                  </div>
                )}
              </div>

              <div className="restaurant-hero-content">
                <div className="restaurant-title-row">
                  <h1 className="restaurant-name">{restaurant.name}</h1>
                  <div className="restaurant-rating">
                    <Star size={16} fill="currentColor" />
                    <span>4.5</span>
                    <span className="rating-count">(120+ ratings)</span>
                  </div>
                </div>

                <p className="restaurant-cuisine">{restaurant.cuisine}</p>

                <p className="restaurant-description">{restaurant.description}</p>

                <div className="restaurant-meta">
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>
                      {availability.isOpen
                        ? `Open until ${availability.closesAt}`
                        : 'Currently closed'}
                    </span>
                  </div>
                  <div className="meta-item">
                    <MapPin size={16} />
                    <span>
                      {restaurant.streetAddress}, {restaurant.city}
                    </span>
                  </div>
                </div>

                <div className="restaurant-info-badges">
                  <div className="info-badge">
                    <DollarSign size={16} />
                    <div>
                      <div className="info-badge-value">${restaurant.minimumOrderAmount}</div>
                      <div className="info-badge-label">Min. order</div>
                    </div>
                  </div>
                  <div className="info-badge">
                    <Truck size={16} />
                    <div>
                      <div className="info-badge-value">
                        {restaurant.deliveryFee === 0
                          ? 'Free'
                          : `$${restaurant.deliveryFee.toFixed(2)}`}
                      </div>
                      <div className="info-badge-label">Delivery</div>
                    </div>
                  </div>
                  <div className="info-badge">
                    <Clock size={16} />
                    <div>
                      <div className="info-badge-value">{restaurant.estimatedPrepTime + 15} min</div>
                      <div className="info-badge-label">Delivery time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Popular Items */}
          {popularItems.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Popular Items</h2>
              </div>
              <div className="grid grid-4">
                {popularItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    isAvailable={item.isAvailable}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Menu Categories */}
          <div className="menu-layout">
            {/* Category Navigation */}
            <nav className="menu-nav">
              <div className="menu-nav-header">Menu</div>
              {restaurant.menuCategories.map((category) => (
                <a key={category.id} href={`#${category.id}`} className="menu-nav-link">
                  <span>{category.name}</span>
                  <span className="menu-nav-count">{category.menuItems.length}</span>
                </a>
              ))}
            </nav>

            {/* Menu Content */}
            <div className="menu-content">
              {restaurant.menuCategories.map((category) => (
                <section key={category.id} id={category.id} className="menu-category">
                  <h2 className="menu-category-title">{category.name}</h2>
                  <div className="grid grid-2">
                    {category.menuItems.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        name={item.name}
                        description={item.description}
                        price={item.price}
                        isAvailable={item.isAvailable}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Hours Card */}
          <section className="section">
            <div className="card card-body">
              <h3 className="text-lg font-semibold mb-4">Hours of Operation</h3>
              <div className="hours-grid">
                {restaurant.openingHours.map((hours) => {
                  const isToday = hours.dayOfWeek === new Date().getDay()
                  return (
                    <div key={hours.id} className={`hours-row ${isToday ? 'hours-row-today' : ''}`}>
                      <span className="hours-day">
                        {getDayName(hours.dayOfWeek)}
                        {isToday && <span className="hours-today-badge">Today</span>}
                      </span>
                      <span className={`hours-time ${hours.isClosed ? 'hours-closed' : ''}`}>
                        {hours.isClosed ? 'Closed' : `${hours.openTime} - ${hours.closeTime}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}

function getRestaurantColor(name: string): string {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6']
  const colorIndex = name.charCodeAt(0) % colors.length
  return colors[colorIndex]
}
