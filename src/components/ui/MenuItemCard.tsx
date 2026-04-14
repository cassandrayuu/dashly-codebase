/**
 * MenuItemCard Component
 *
 * Card display for menu items on restaurant detail page.
 */

import { Plus, AlertCircle } from 'lucide-react'

interface MenuItemCardProps {
  name: string
  description: string | null
  price: number
  isAvailable: boolean
}

export default function MenuItemCard({
  name,
  description,
  price,
  isAvailable,
}: MenuItemCardProps) {
  return (
    <div className={`menu-item-card ${!isAvailable ? 'menu-item-unavailable' : ''}`}>
      <div className="menu-item-content">
        <div className="menu-item-header">
          <h4 className="menu-item-name">{name}</h4>
          {!isAvailable && (
            <span className="menu-item-badge">
              <AlertCircle size={12} />
              Unavailable
            </span>
          )}
        </div>
        {description && <p className="menu-item-description">{description}</p>}
        <div className="menu-item-footer">
          <span className="menu-item-price">${price.toFixed(2)}</span>
          {isAvailable && (
            <button className="menu-item-add" type="button">
              <Plus size={16} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
