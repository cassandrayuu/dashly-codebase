/**
 * Home Page
 *
 * Modern landing page for Dashly food delivery marketplace.
 * Features hero section, location search, cuisine categories,
 * and featured restaurants.
 */

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { checkRestaurantAvailability } from '@/domain/restaurant/availability'
import { RestaurantCard } from '@/components/ui'
import {
  MapPin,
  Clock,
  ChevronRight,
  Search,
  Utensils,
  Pizza,
  Coffee,
  Sandwich,
  IceCream,
  Salad,
  Truck,
  Shield,
  Star,
} from 'lucide-react'

// Cuisine categories with icons
const cuisineCategories = [
  { name: 'Italian', icon: Pizza, color: '#e31837' },
  { name: 'American', icon: Sandwich, color: '#f59e0b' },
  { name: 'Healthy', icon: Salad, color: '#10b981' },
  { name: 'Desserts', icon: IceCream, color: '#ec4899' },
  { name: 'Cafe', icon: Coffee, color: '#8b5cf6' },
  { name: 'All', icon: Utensils, color: '#6366f1' },
]

export default async function HomePage() {
  // Fetch featured restaurants (open ones first, with good ratings)
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    include: {
      openingHours: true,
      _count: {
        select: { menuItems: { where: { isAvailable: true } } },
      },
    },
    take: 6,
    orderBy: { name: 'asc' },
  })

  const openRestaurantsCount = restaurants.filter((r) => {
    const availability = checkRestaurantAvailability(r, r.openingHours)
    return availability.isOpen
  }).length

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content container">
          <div className="hero-text">
            <h1 className="hero-title">
              Food delivery from your favorite restaurants
            </h1>
            <p className="hero-subtitle">
              Order delivery or pickup from the best local restaurants near you
            </p>

            {/* Search Bar */}
            <div className="hero-search">
              <div className="hero-search-input">
                <MapPin size={20} className="hero-search-icon" />
                <input
                  type="text"
                  placeholder="Enter your delivery address"
                  className="hero-input"
                  defaultValue="123 Main Street, San Francisco"
                  disabled
                />
              </div>
              <Link href="/restaurants" className="btn btn-primary btn-lg hero-search-btn">
                <Search size={18} />
                Find Food
              </Link>
            </div>

            <div className="hero-badges">
              <span className="hero-badge">
                <Clock size={14} />
                Delivery in 30-45 min
              </span>
              <span className="hero-badge">
                <Truck size={14} />
                Free delivery on $25+
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-placeholder">
              <Utensils size={80} />
              <span>Fresh & Fast</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Categories */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Browse by cuisine</h2>
            <Link href="/restaurants" className="section-link">
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="categories-grid">
            {cuisineCategories.map((category) => {
              const Icon = category.icon
              return (
                <Link
                  key={category.name}
                  href="/restaurants"
                  className="category-card"
                  style={{ '--category-color': category.color } as React.CSSProperties}
                >
                  <div className="category-icon">
                    <Icon size={28} />
                  </div>
                  <span className="category-name">{category.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured restaurants</h2>
              <p className="section-subtitle">
                {openRestaurantsCount} restaurants open now near you
              </p>
            </div>
            <Link href="/restaurants" className="btn btn-secondary">
              See all restaurants
              <ChevronRight size={16} />
            </Link>
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
        </div>
      </section>

      {/* Value Props */}
      <section className="value-props">
        <div className="container">
          <div className="value-props-grid">
            <div className="value-prop">
              <div className="value-prop-icon">
                <Clock size={24} />
              </div>
              <h3>Fast Delivery</h3>
              <p>Get your food delivered in 30 minutes or less</p>
            </div>
            <div className="value-prop">
              <div className="value-prop-icon">
                <Star size={24} />
              </div>
              <h3>Best Restaurants</h3>
              <p>Curated selection of top-rated local favorites</p>
            </div>
            <div className="value-prop">
              <div className="value-prop-icon">
                <Shield size={24} />
              </div>
              <h3>Secure Payments</h3>
              <p>Your payment information is always protected</p>
            </div>
            <div className="value-prop">
              <div className="value-prop-icon">
                <Truck size={24} />
              </div>
              <h3>Live Tracking</h3>
              <p>Track your order in real-time from restaurant to door</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Download / CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Ready to order?</h2>
              <p>Browse restaurants and get delicious food delivered to your door</p>
              <Link href="/restaurants" className="btn btn-primary btn-lg">
                Order Now
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <Utensils size={24} />
                <span>Dashly</span>
              </div>
              <p className="footer-tagline">Food delivery made simple</p>
            </div>

            <div className="footer-links">
              <h4>For Customers</h4>
              <Link href="/restaurants">Browse Restaurants</Link>
              <Link href="/orders">Track Orders</Link>
            </div>

            <div className="footer-links">
              <h4>For Business</h4>
              <Link href="/merchant">Merchant Portal</Link>
              <Link href="/courier">Become a Courier</Link>
            </div>

            <div className="footer-links">
              <h4>Platform</h4>
              <Link href="/admin">Admin Dashboard</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <p>Demo application for AI product analysis</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
