/**
 * Order Detail Page (Customer)
 *
 * Shows full order details and status timeline.
 * Customers can track progress and request support.
 *
 * Data flow:
 * 1. Fetches order with all relations
 * 2. Shows items, pricing, delivery info
 * 3. Displays status timeline
 * 4. Provides actions (cancel, refund request)
 */

import { prisma } from '@/lib/db'
import { checkOrderCancellation } from '@/domain/order/lifecycle'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import NavHeader from '@/components/NavHeader'
import { StatusBadge, OrderTimeline } from '@/components/ui'
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  CreditCard,
  HelpCircle,
  XCircle,
  RotateCcw,
  Receipt,
  Store,
} from 'lucide-react'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      restaurant: true,
      items: {
        include: { menuItem: true },
      },
      deliveryAddress: true,
      courier: true,
      refunds: true,
    },
  })

  if (!order) {
    notFound()
  }

  const cancellation = checkOrderCancellation(order)
  const isActive = ![
    'DELIVERED',
    'CANCELLED',
  ].includes(order.status)

  return (
    <>
      <NavHeader currentRole="customer" />
      <main className="page">
        <div className="container-narrow">
          {/* Back link */}
          <Link href="/orders" className="back-link">
            <ArrowLeft size={16} />
            <span>Your Orders</span>
          </Link>

          {/* Order Header */}
          <header className="order-header">
            <div className="order-header-content">
              <div className="order-header-main">
                <div className="order-restaurant">
                  <Store size={20} />
                  <h1>{order.restaurant.name}</h1>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <p className="order-id">Order #{order.id.slice(-8).toUpperCase()}</p>
              <p className="order-date">
                Placed on {order.placedAt.toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })} at {order.placedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </header>

          <div className="order-layout">
            {/* Main Content */}
            <div className="order-main">
              {/* Status Timeline or Cancelled Notice */}
              {order.status === 'CANCELLED' ? (
                <section className="card cancelled-card">
                  <div className="cancelled-header">
                    <XCircle size={24} />
                    <h2>Order Cancelled</h2>
                  </div>
                  <p className="cancelled-reason">
                    {order.cancellationReason || 'No reason provided'}
                  </p>
                  {order.cancelledAt && (
                    <p className="cancelled-time">
                      Cancelled on {order.cancelledAt.toLocaleString()}
                    </p>
                  )}
                </section>
              ) : (
                <section className="card card-body">
                  <h2 className="card-title">Order Status</h2>
                  <OrderTimeline
                    currentStatus={order.status}
                    timestamps={{
                      createdAt: order.placedAt,
                      confirmedAt: order.confirmedAt,
                      preparingAt: order.preparingAt,
                      readyAt: order.readyAt,
                      pickedUpAt: order.pickedUpAt,
                      deliveredAt: order.deliveredAt,
                      cancelledAt: order.cancelledAt,
                    }}
                  />
                </section>
              )}

              {/* Order Items */}
              <section className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    <Receipt size={18} />
                    Order Items
                  </h2>
                </div>
                <div className="items-list">
                  {order.items.map((item) => (
                    <div key={item.id} className="item-row">
                      <div className="item-details">
                        <div className="item-quantity">{item.quantity}x</div>
                        <div className="item-info">
                          <p className="item-name">{item.menuItem.name}</p>
                          {item.specialInstructions && (
                            <p className="item-note">{item.specialInstructions}</p>
                          )}
                          {item.substitutionStatus !== 'NONE' && (
                            <span className="badge badge-warning mt-1">
                              {item.substitutionStatus.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="item-price">
                        ${(item.priceAtPurchase * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="order-sidebar">
              {/* Delivery Info */}
              <section className="card card-body">
                <h2 className="card-title">
                  <MapPin size={18} />
                  Delivery Address
                </h2>
                <div className="delivery-info">
                  <p className="delivery-label">{order.deliveryAddress.label}</p>
                  <p className="delivery-address">
                    {order.deliveryAddress.streetLine1}
                    {order.deliveryAddress.streetLine2 && <br />}
                    {order.deliveryAddress.streetLine2}
                  </p>
                  <p className="delivery-city">
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}{' '}
                    {order.deliveryAddress.zipCode}
                  </p>
                </div>

                {order.deliveryInstructions && (
                  <div className="delivery-instructions">
                    <p className="instructions-label">Delivery Instructions</p>
                    <p className="instructions-text">{order.deliveryInstructions}</p>
                  </div>
                )}

                {order.courier && (
                  <div className="courier-info">
                    <div className="courier-header">
                      <div className="avatar avatar-primary">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="courier-name">{order.courier.name}</p>
                        <p className="courier-label">Your Courier</p>
                      </div>
                    </div>
                    {order.courier.phone && (
                      <div className="courier-contact">
                        <Phone size={14} />
                        <span>{order.courier.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Payment Summary */}
              <section className="card card-body">
                <h2 className="card-title">
                  <CreditCard size={18} />
                  Payment
                </h2>
                <div className="payment-rows">
                  <div className="payment-row">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="payment-row">
                    <span>Delivery Fee</span>
                    <span>${order.deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="payment-row">
                    <span>Service Fee</span>
                    <span>${order.serviceFee.toFixed(2)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="payment-row payment-discount">
                      <span>
                        Discount {order.appliedPromoCode && `(${order.appliedPromoCode})`}
                      </span>
                      <span>-${order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.tip > 0 && (
                    <div className="payment-row">
                      <span>Tip</span>
                      <span>${order.tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="payment-row payment-total">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </section>

              {/* Help & Actions */}
              <section className="card card-body">
                <h2 className="card-title">
                  <HelpCircle size={18} />
                  Need Help?
                </h2>

                <div className="help-actions">
                  {cancellation.canCancel && (
                    <button className="btn btn-secondary w-full">
                      <XCircle size={16} />
                      Cancel Order
                      {cancellation.willIncurFee && (
                        <span className="cancel-fee">
                          (${cancellation.cancellationFee.toFixed(2)} fee)
                        </span>
                      )}
                    </button>
                  )}

                  {order.status === 'DELIVERED' && order.refunds.length === 0 && (
                    <button className="btn btn-secondary w-full">
                      <RotateCcw size={16} />
                      Request Refund
                    </button>
                  )}

                  {order.refunds.length > 0 && (
                    <div className="refund-status">
                      <p className="refund-title">Refund Status</p>
                      {order.refunds.map((refund) => (
                        <div key={refund.id} className="refund-item">
                          <span>${refund.amount.toFixed(2)}</span>
                          <StatusBadge status={refund.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
