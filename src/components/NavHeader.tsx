/**
 * NavHeader Component
 *
 * Modern navigation header with role-based highlighting.
 */

import Link from 'next/link'
import { Store, ShoppingBag, Truck, Settings, UtensilsCrossed } from 'lucide-react'

interface NavHeaderProps {
  currentRole?: 'customer' | 'merchant' | 'courier' | 'admin'
}

export default function NavHeader({ currentRole }: NavHeaderProps) {
  const navLinks = [
    { href: '/restaurants', label: 'Restaurants', role: 'customer' as const, icon: UtensilsCrossed },
    { href: '/orders', label: 'Orders', role: 'customer' as const, icon: ShoppingBag },
  ]

  const roleLinks = [
    { href: '/merchant', label: 'Merchant', role: 'merchant' as const, icon: Store },
    { href: '/courier', label: 'Courier', role: 'courier' as const, icon: Truck },
    { href: '/admin', label: 'Admin', role: 'admin' as const, icon: Settings },
  ]

  return (
    <nav className="nav-header">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">D</div>
          <span>Dashly</span>
        </Link>

        <div className="nav-links">
          <div className="nav-group">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = currentRole === link.role
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="nav-divider" />

          <div className="nav-group">
            {roleLinks.map((link) => {
              const Icon = link.icon
              const isActive = currentRole === link.role
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link nav-link-muted ${isActive ? 'nav-link-active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
