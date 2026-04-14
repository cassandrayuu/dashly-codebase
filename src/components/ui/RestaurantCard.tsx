/**
 * RestaurantCard Component
 *
 * Card display for restaurant listings.
 */

import Link from 'next/link'
import { Clock, DollarSign, Star, MapPin } from 'lucide-react'

interface RestaurantCardProps {
  id: string
  name: string
  cuisine: string
  isOpen: boolean
  deliveryFee: number
  estimatedDeliveryMinutes: number
  itemCount: number
  address?: string
}

export default function RestaurantCard({
  id,
  name,
  cuisine,
  isOpen,
  deliveryFee,
  estimatedDeliveryMinutes,
  itemCount,
  address,
}: RestaurantCardProps) {
  // Generate a consistent color based on restaurant name
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6']
  const colorIndex = name.charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]

  return (
    <Link href={`/restaurants/${id}`} style={{ textDecoration: 'none' }}>
      <div className="card card-clickable restaurant-card">
        {/* Image Placeholder */}
        <div className="restaurant-image" style={{ background: bgColor }}>
          <span className="restaurant-initial">{name.charAt(0).toUpperCase()}</span>
          {!isOpen && (
            <div className="restaurant-closed-overlay">
              <span>Closed</span>
            </div>
          )}
        </div>

        <div className="card-body">
          <div className="restaurant-card-header">
            <h3 className="restaurant-card-name">{name}</h3>
            <div className="restaurant-card-rating">
              <Star size={14} fill="currentColor" />
              <span>4.5</span>
            </div>
          </div>

          <p className="restaurant-card-cuisine">{cuisine}</p>

          <div className="restaurant-card-meta">
            <span className="restaurant-meta-item">
              <Clock size={14} />
              {estimatedDeliveryMinutes} min
            </span>
            <span className="restaurant-meta-item">
              <DollarSign size={14} />
              {deliveryFee === 0 ? 'Free delivery' : `$${deliveryFee.toFixed(2)} delivery`}
            </span>
          </div>

          {address && (
            <div className="restaurant-card-address">
              <MapPin size={12} />
              <span>{address}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
