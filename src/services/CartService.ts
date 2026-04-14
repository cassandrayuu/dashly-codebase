/**
 * Cart Service
 *
 * Orchestrates cart operations including:
 * - Adding/removing items
 * - Updating quantities
 * - Applying promo codes
 * - Calculating totals
 *
 * Business Logic:
 * - Each customer can have one cart per restaurant
 * - Adding item from different restaurant clears current cart
 * - Promo codes are validated but not "locked in" until checkout
 */

import { prisma } from '@/lib/db'
import { Cart, CartItem, MenuItem, Prisma } from '@prisma/client'
import { CartWithDetails, CartValidationResult, CartPricing } from '@/domain/cart/types'
import { validateCartForCheckout, calculateCartSubtotal } from '@/domain/cart/validation'
import { calculateCartPricing } from '@/domain/cart/pricing'
import { checkPromotionEligibility, applyPromotion } from '@/domain/promotion/eligibility'
import { PromotionApplication } from '@/domain/promotion/types'

export class CartService {
  /**
   * Get a customer's cart for a specific restaurant.
   */
  async getCart(customerId: string, restaurantId: string): Promise<CartWithDetails | null> {
    return prisma.cart.findUnique({
      where: {
        customerId_restaurantId: { customerId, restaurantId },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: true,
      },
    })
  }

  /**
   * Get a customer's active cart (any restaurant).
   */
  async getActiveCart(customerId: string): Promise<CartWithDetails | null> {
    return prisma.cart.findFirst({
      where: { customerId },
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  /**
   * Add an item to cart. Creates cart if needed.
   * If item is from different restaurant, prompts to clear cart.
   */
  async addItem(
    customerId: string,
    menuItemId: string,
    quantity: number = 1,
    specialInstructions?: string
  ): Promise<{ cart: CartWithDetails; warning?: string }> {
    // Get the menu item to know its restaurant
    const menuItem = await prisma.menuItem.findUniqueOrThrow({
      where: { id: menuItemId },
      include: { restaurant: true },
    })

    // Check if customer has cart from different restaurant
    const existingCart = await this.getActiveCart(customerId)
    let warning: string | undefined

    if (existingCart && existingCart.restaurantId !== menuItem.restaurantId) {
      // Clear the old cart
      await prisma.cart.delete({ where: { id: existingCart.id } })
      warning = `Your cart from ${existingCart.restaurant.name} was cleared`
    }

    // Get or create cart for this restaurant
    const cart = await prisma.cart.upsert({
      where: {
        customerId_restaurantId: {
          customerId,
          restaurantId: menuItem.restaurantId,
        },
      },
      create: {
        customerId,
        restaurantId: menuItem.restaurantId,
      },
      update: {},
    })

    // Add or update cart item
    await prisma.cartItem.upsert({
      where: {
        cartId_menuItemId: { cartId: cart.id, menuItemId },
      },
      create: {
        cartId: cart.id,
        menuItemId,
        quantity,
        specialInstructions,
      },
      update: {
        quantity: { increment: quantity },
        specialInstructions,
      },
    })

    const updatedCart = await this.getCart(customerId, menuItem.restaurantId)
    return { cart: updatedCart!, warning }
  }

  /**
   * Update item quantity. Removes item if quantity is 0.
   */
  async updateItemQuantity(
    customerId: string,
    cartItemId: string,
    quantity: number
  ): Promise<CartWithDetails | null> {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    })

    if (!cartItem || cartItem.cart.customerId !== customerId) {
      throw new Error('Cart item not found')
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } })
    } else {
      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      })
    }

    return this.getCart(customerId, cartItem.cart.restaurantId)
  }

  /**
   * Remove an item from cart.
   */
  async removeItem(customerId: string, cartItemId: string): Promise<CartWithDetails | null> {
    return this.updateItemQuantity(customerId, cartItemId, 0)
  }

  /**
   * Apply a promo code to cart (validation only, not committed).
   */
  async applyPromoCode(
    customerId: string,
    restaurantId: string,
    promoCode: string
  ): Promise<PromotionApplication> {
    const cart = await this.getCart(customerId, restaurantId)
    if (!cart) {
      return {
        isValid: false,
        discountAmount: 0,
        waivesDeliveryFee: false,
        appliedPromoCode: null,
        appliedPromoId: null,
        message: 'Cart not found',
      }
    }

    // Find the promotion
    const promotion = await prisma.promotion.findUnique({
      where: { code: promoCode.toUpperCase() },
    })

    // Check customer's order history
    const orderCount = await prisma.order.count({
      where: { customerId },
    })

    // Check existing usage of this promo by this customer
    const existingUsage = promotion
      ? await prisma.promotionUsage.count({
          where: { promotionId: promotion.id, customerId },
        })
      : 0

    // Check total usage
    const totalUsage = promotion
      ? await prisma.promotionUsage.count({
          where: { promotionId: promotion.id },
        })
      : 0

    const subtotal = calculateCartSubtotal(cart)

    const eligibility = checkPromotionEligibility(promotion, {
      customerId,
      restaurantId,
      subtotal,
      deliveryFee: cart.restaurant.deliveryFee,
      isFirstOrder: orderCount === 0,
      existingUsageCount: existingUsage,
      totalUsageCount: totalUsage,
    })

    if (!eligibility.isEligible) {
      const { getIneligibilityMessage } = await import('@/domain/promotion/eligibility')
      return {
        isValid: false,
        discountAmount: 0,
        waivesDeliveryFee: false,
        appliedPromoCode: null,
        appliedPromoId: null,
        message: getIneligibilityMessage(eligibility.reason!, promotion ?? undefined),
      }
    }

    // Calculate discount
    const application = applyPromotion(
      promotion!,
      subtotal,
      cart.restaurant.deliveryFee
    )

    // Save promo code to cart (not committed until checkout)
    await prisma.cart.update({
      where: { id: cart.id },
      data: { promoCode: promoCode.toUpperCase() },
    })

    return application
  }

  /**
   * Remove promo code from cart.
   */
  async removePromoCode(customerId: string, restaurantId: string): Promise<void> {
    await prisma.cart.updateMany({
      where: { customerId, restaurantId },
      data: { promoCode: null },
    })
  }

  /**
   * Validate cart for checkout.
   */
  async validateForCheckout(
    customerId: string,
    restaurantId: string,
    deliveryAddressId: string
  ): Promise<CartValidationResult> {
    const cart = await this.getCart(customerId, restaurantId)
    if (!cart) {
      return {
        isValid: false,
        errors: [{ type: 'EMPTY_CART', message: 'Cart not found' }],
      }
    }

    const openingHours = await prisma.openingHours.findMany({
      where: { restaurantId },
    })

    const address = await prisma.address.findUnique({
      where: { id: deliveryAddressId },
    })

    const deliveryLocation = address
      ? { latitude: address.latitude, longitude: address.longitude }
      : undefined

    return validateCartForCheckout(cart, openingHours, deliveryLocation)
  }

  /**
   * Get cart pricing with optional promo.
   */
  async getCartPricing(customerId: string, restaurantId: string): Promise<CartPricing | null> {
    const cart = await this.getCart(customerId, restaurantId)
    if (!cart) return null

    let promoApplication: PromotionApplication | undefined

    if (cart.promoCode) {
      promoApplication = await this.applyPromoCode(customerId, restaurantId, cart.promoCode)
    }

    return calculateCartPricing(cart, promoApplication)
  }

  /**
   * Clear a customer's cart.
   */
  async clearCart(customerId: string, restaurantId: string): Promise<void> {
    await prisma.cart.deleteMany({
      where: { customerId, restaurantId },
    })
  }
}

export const cartService = new CartService()
