/**
 * Dashly Seed Data
 *
 * Creates a believable set of sample data for testing and development:
 * - 5 users (1 customer, 1 merchant, 2 couriers, 1 admin)
 * - 3 restaurants with menus
 * - Sample orders in various states
 * - Active promotions
 */

import { PrismaClient } from '@prisma/client'
import { UserRole, OrderStatus, DiscountType, CourierStatus } from '../src/lib/enums'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Dashly database...')

  // ============================================================================
  // USERS
  // ============================================================================

  const customer = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      name: 'Sarah Chen',
      phone: '555-123-4567',
      role: UserRole.CUSTOMER,
    },
  })

  const merchant = await prisma.user.create({
    data: {
      email: 'mario@bellaroma.com',
      name: 'Mario Rossi',
      phone: '555-234-5678',
      role: UserRole.MERCHANT,
    },
  })

  const courier1 = await prisma.user.create({
    data: {
      email: 'alex@dashly.com',
      name: 'Alex Rivera',
      phone: '555-345-6789',
      role: UserRole.COURIER,
      courierStatus: CourierStatus.AVAILABLE,
    },
  })

  const courier2 = await prisma.user.create({
    data: {
      email: 'jamie@dashly.com',
      name: 'Jamie Park',
      phone: '555-456-7890',
      role: UserRole.COURIER,
      courierStatus: CourierStatus.OFFLINE,
    },
  })

  const admin = await prisma.user.create({
    data: {
      email: 'support@dashly.com',
      name: 'Dashly Support',
      phone: '555-000-0000',
      role: UserRole.ADMIN,
    },
  })

  console.log('✓ Created users')

  // ============================================================================
  // CUSTOMER ADDRESSES
  // ============================================================================

  const customerAddress = await prisma.address.create({
    data: {
      userId: customer.id,
      label: 'Home',
      streetLine1: '123 Oak Street',
      streetLine2: 'Apt 4B',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      latitude: 37.7749,
      longitude: -122.4194,
      isDefault: true,
    },
  })

  console.log('✓ Created customer addresses')

  // ============================================================================
  // COURIER LOCATIONS
  // ============================================================================

  await prisma.courierLocation.create({
    data: {
      courierId: courier1.id,
      latitude: 37.7751,
      longitude: -122.4180,
    },
  })

  console.log('✓ Created courier locations')

  // ============================================================================
  // RESTAURANTS
  // ============================================================================

  const bellaRoma = await prisma.restaurant.create({
    data: {
      merchantId: merchant.id,
      name: 'Bella Roma Trattoria',
      description: 'Authentic Italian cuisine made with fresh, local ingredients.',
      cuisine: 'Italian',
      streetAddress: '456 Mission Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      latitude: 37.7850,
      longitude: -122.4000,
      deliveryRadiusMiles: 5.0,
      minimumOrderAmount: 15.0,
      deliveryFee: 3.99,
      estimatedPrepTime: 25,
      isActive: true,
    },
  })

  // Create another merchant for variety
  const merchant2 = await prisma.user.create({
    data: {
      email: 'chen@dragonpalace.com',
      name: 'David Chen',
      phone: '555-567-8901',
      role: UserRole.MERCHANT,
    },
  })

  const dragonPalace = await prisma.restaurant.create({
    data: {
      merchantId: merchant2.id,
      name: 'Dragon Palace',
      description: 'Traditional Chinese dishes with a modern twist.',
      cuisine: 'Chinese',
      streetAddress: '789 Grant Avenue',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94108',
      latitude: 37.7940,
      longitude: -122.4070,
      deliveryRadiusMiles: 4.0,
      minimumOrderAmount: 20.0,
      deliveryFee: 4.99,
      estimatedPrepTime: 30,
      isActive: true,
    },
  })

  const merchant3 = await prisma.user.create({
    data: {
      email: 'jose@tacotiempo.com',
      name: 'José Garcia',
      phone: '555-678-9012',
      role: UserRole.MERCHANT,
    },
  })

  const tacoTiempo = await prisma.restaurant.create({
    data: {
      merchantId: merchant3.id,
      name: 'Taco Tiempo',
      description: 'Fresh Mexican street food, made to order.',
      cuisine: 'Mexican',
      streetAddress: '321 Valencia Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      latitude: 37.7650,
      longitude: -122.4210,
      deliveryRadiusMiles: 3.5,
      minimumOrderAmount: 12.0,
      deliveryFee: 2.99,
      estimatedPrepTime: 20,
      isActive: true,
    },
  })

  console.log('✓ Created restaurants')

  // ============================================================================
  // OPENING HOURS
  // ============================================================================

  // Bella Roma: Open 11am-10pm, closed Mondays
  for (let day = 0; day <= 6; day++) {
    await prisma.openingHours.create({
      data: {
        restaurantId: bellaRoma.id,
        dayOfWeek: day,
        openTime: '11:00',
        closeTime: '22:00',
        isClosed: day === 1, // Closed Monday
      },
    })
  }

  // Dragon Palace: Open 11:30am-9:30pm daily
  for (let day = 0; day <= 6; day++) {
    await prisma.openingHours.create({
      data: {
        restaurantId: dragonPalace.id,
        dayOfWeek: day,
        openTime: '11:30',
        closeTime: '21:30',
        isClosed: false,
      },
    })
  }

  // Taco Tiempo: Open 10am-11pm daily
  for (let day = 0; day <= 6; day++) {
    await prisma.openingHours.create({
      data: {
        restaurantId: tacoTiempo.id,
        dayOfWeek: day,
        openTime: '10:00',
        closeTime: '23:00',
        isClosed: false,
      },
    })
  }

  console.log('✓ Created opening hours')

  // ============================================================================
  // MENU CATEGORIES & ITEMS
  // ============================================================================

  // Bella Roma Menu
  const bellaApps = await prisma.menuCategory.create({
    data: { restaurantId: bellaRoma.id, name: 'Appetizers', sortOrder: 1 },
  })
  const bellaPasta = await prisma.menuCategory.create({
    data: { restaurantId: bellaRoma.id, name: 'Pasta', sortOrder: 2 },
  })
  const bellaPizza = await prisma.menuCategory.create({
    data: { restaurantId: bellaRoma.id, name: 'Pizza', sortOrder: 3 },
  })
  const bellaDessert = await prisma.menuCategory.create({
    data: { restaurantId: bellaRoma.id, name: 'Desserts', sortOrder: 4 },
  })

  const margheritaPizza = await prisma.menuItem.create({
    data: {
      restaurantId: bellaRoma.id,
      categoryId: bellaPizza.id,
      name: 'Margherita Pizza',
      description: 'San Marzano tomatoes, fresh mozzarella, basil, olive oil',
      price: 16.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  const spaghettiCarbonara = await prisma.menuItem.create({
    data: {
      restaurantId: bellaRoma.id,
      categoryId: bellaPasta.id,
      name: 'Spaghetti Carbonara',
      description: 'Guanciale, egg yolk, pecorino romano, black pepper',
      price: 18.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: bellaRoma.id,
      categoryId: bellaPasta.id,
      name: 'Fettuccine Alfredo',
      description: 'Creamy parmesan sauce with fresh fettuccine',
      price: 17.99,
      isAvailable: true,
    },
  })

  const bruschetta = await prisma.menuItem.create({
    data: {
      restaurantId: bellaRoma.id,
      categoryId: bellaApps.id,
      name: 'Bruschetta',
      description: 'Toasted bread with tomatoes, garlic, basil, olive oil',
      price: 9.99,
      isAvailable: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: bellaRoma.id,
      categoryId: bellaApps.id,
      name: 'Calamari Fritti',
      description: 'Fried calamari with marinara sauce',
      price: 14.99,
      isAvailable: false, // Currently unavailable
    },
  })

  const tiramisu = await prisma.menuItem.create({
    data: {
      restaurantId: bellaRoma.id,
      categoryId: bellaDessert.id,
      name: 'Tiramisu',
      description: 'Classic Italian dessert with mascarpone and espresso',
      price: 8.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  // Dragon Palace Menu
  const dragonApps = await prisma.menuCategory.create({
    data: { restaurantId: dragonPalace.id, name: 'Appetizers', sortOrder: 1 },
  })
  const dragonMain = await prisma.menuCategory.create({
    data: { restaurantId: dragonPalace.id, name: 'Main Dishes', sortOrder: 2 },
  })
  const dragonNoodles = await prisma.menuCategory.create({
    data: { restaurantId: dragonPalace.id, name: 'Noodles & Rice', sortOrder: 3 },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: dragonPalace.id,
      categoryId: dragonApps.id,
      name: 'Pork Dumplings',
      description: 'Pan-fried dumplings with ginger soy dipping sauce',
      price: 10.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: dragonPalace.id,
      categoryId: dragonApps.id,
      name: 'Spring Rolls',
      description: 'Crispy vegetable spring rolls with sweet chili sauce',
      price: 8.99,
      isAvailable: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: dragonPalace.id,
      categoryId: dragonMain.id,
      name: 'Kung Pao Chicken',
      description: 'Spicy diced chicken with peanuts, peppers, and Sichuan peppercorns',
      price: 16.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: dragonPalace.id,
      categoryId: dragonMain.id,
      name: 'Mapo Tofu',
      description: 'Soft tofu in spicy fermented bean sauce',
      price: 14.99,
      isAvailable: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: dragonPalace.id,
      categoryId: dragonNoodles.id,
      name: 'Beef Chow Mein',
      description: 'Stir-fried egg noodles with beef and vegetables',
      price: 15.99,
      isAvailable: true,
    },
  })

  // Taco Tiempo Menu
  const tacoTacos = await prisma.menuCategory.create({
    data: { restaurantId: tacoTiempo.id, name: 'Tacos', sortOrder: 1 },
  })
  const tacoBurritos = await prisma.menuCategory.create({
    data: { restaurantId: tacoTiempo.id, name: 'Burritos', sortOrder: 2 },
  })
  const tacoSides = await prisma.menuCategory.create({
    data: { restaurantId: tacoTiempo.id, name: 'Sides', sortOrder: 3 },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: tacoTiempo.id,
      categoryId: tacoTacos.id,
      name: 'Carne Asada Taco',
      description: 'Grilled steak, onion, cilantro, salsa verde',
      price: 4.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: tacoTiempo.id,
      categoryId: tacoTacos.id,
      name: 'Al Pastor Taco',
      description: 'Marinated pork, pineapple, onion, cilantro',
      price: 4.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: tacoTiempo.id,
      categoryId: tacoTacos.id,
      name: 'Fish Taco',
      description: 'Beer-battered fish, cabbage slaw, chipotle crema',
      price: 5.49,
      isAvailable: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: tacoTiempo.id,
      categoryId: tacoBurritos.id,
      name: 'California Burrito',
      description: 'Carne asada, french fries, cheese, guacamole, sour cream',
      price: 12.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: tacoTiempo.id,
      categoryId: tacoSides.id,
      name: 'Chips & Guacamole',
      description: 'Fresh tortilla chips with house-made guacamole',
      price: 6.99,
      isAvailable: true,
    },
  })

  console.log('✓ Created menu items')

  // ============================================================================
  // PROMOTIONS
  // ============================================================================

  // Set promotion dates to 1 year from now
  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  await prisma.promotion.create({
    data: {
      code: 'WELCOME10',
      description: '$10 off your first order',
      discountType: DiscountType.FLAT_AMOUNT,
      discountValue: 10.0,
      minimumOrderAmount: 25.0,
      firstOrderOnly: true,
      isActive: true,
      validUntil: oneYearFromNow,
    },
  })

  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

  await prisma.promotion.create({
    data: {
      code: 'PASTA20',
      description: '20% off at Bella Roma',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0.20,
      minimumOrderAmount: 30.0,
      maximumDiscount: 15.0,
      restaurantId: bellaRoma.id,
      usageLimit: 100,
      isActive: true,
      validUntil: sixMonthsFromNow,
    },
  })

  await prisma.promotion.create({
    data: {
      code: 'FREEDEL',
      description: 'Free delivery on orders over $35',
      discountType: DiscountType.FREE_DELIVERY,
      discountValue: 0, // Not used for free delivery
      minimumOrderAmount: 35.0,
      isActive: true,
    },
  })

  console.log('✓ Created promotions')

  // ============================================================================
  // SAMPLE ORDERS
  // ============================================================================

  // Order 1: Completed delivery
  const order1 = await prisma.order.create({
    data: {
      customerId: customer.id,
      restaurantId: bellaRoma.id,
      courierId: courier1.id,
      deliveryAddressId: customerAddress.id,
      status: OrderStatus.DELIVERED,
      placedAt: new Date('2025-01-15T12:30:00'),
      confirmedAt: new Date('2025-01-15T12:32:00'),
      preparingAt: new Date('2025-01-15T12:35:00'),
      readyAt: new Date('2025-01-15T12:55:00'),
      pickedUpAt: new Date('2025-01-15T13:00:00'),
      deliveredAt: new Date('2025-01-15T13:15:00'),
      subtotal: 44.97,
      deliveryFee: 3.99,
      serviceFee: 2.25,
      discount: 0,
      tip: 5.00,
      total: 56.21,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      menuItemId: margheritaPizza.id,
      quantity: 1,
      priceAtPurchase: 16.99,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      menuItemId: spaghettiCarbonara.id,
      quantity: 1,
      priceAtPurchase: 18.99,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      menuItemId: bruschetta.id,
      quantity: 1,
      priceAtPurchase: 9.99,
    },
  })

  // Order 2: Currently in progress
  const order2 = await prisma.order.create({
    data: {
      customerId: customer.id,
      restaurantId: bellaRoma.id,
      deliveryAddressId: customerAddress.id,
      status: OrderStatus.PREPARING,
      placedAt: new Date(),
      confirmedAt: new Date(),
      preparingAt: new Date(),
      subtotal: 25.98,
      deliveryFee: 3.99,
      serviceFee: 1.30,
      discount: 0,
      tip: 3.00,
      total: 34.27,
      estimatedDelivery: new Date(Date.now() + 35 * 60 * 1000), // 35 min from now
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      menuItemId: margheritaPizza.id,
      quantity: 1,
      priceAtPurchase: 16.99,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      menuItemId: tiramisu.id,
      quantity: 1,
      priceAtPurchase: 8.99,
    },
  })

  // Order 3: Pending (awaiting merchant confirmation)
  const order3 = await prisma.order.create({
    data: {
      customerId: customer.id,
      restaurantId: bellaRoma.id,
      deliveryAddressId: customerAddress.id,
      status: OrderStatus.PENDING,
      placedAt: new Date(),
      subtotal: 16.99,
      deliveryFee: 3.99,
      serviceFee: 0.85,
      discount: 0,
      tip: 2.00,
      total: 23.83,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order3.id,
      menuItemId: margheritaPizza.id,
      quantity: 1,
      priceAtPurchase: 16.99,
    },
  })

  console.log('✓ Created sample orders')

  // ============================================================================
  // SAMPLE CART
  // ============================================================================

  const cart = await prisma.cart.create({
    data: {
      customerId: customer.id,
      restaurantId: bellaRoma.id,
    },
  })

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      menuItemId: spaghettiCarbonara.id,
      quantity: 2,
      specialInstructions: 'Extra cheese please',
    },
  })

  console.log('✓ Created sample cart')

  console.log('')
  console.log('🎉 Seed completed successfully!')
  console.log('')
  console.log('Sample logins:')
  console.log('  Customer: sarah@example.com')
  console.log('  Merchant: mario@bellaroma.com')
  console.log('  Courier:  alex@dashly.com')
  console.log('  Admin:    support@dashly.com')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
