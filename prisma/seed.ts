/**
 * Dashly Seed Data
 *
 * Creates a realistic set of sample data for testing and development:
 * - 10 users across 4 markets (SF, Austin, Phoenix, Miami)
 * - 5 restaurants with menus
 * - Sample orders in various states
 * - Active promotions
 * - Dashly Plus subscribers
 * - Customer reviews
 *
 * Market distribution matches Amplitude sandbox:
 * - SF: mature, healthy baseline
 * - Austin: growing market
 * - Phoenix: struggling, menu accuracy issues (3% cancellation)
 * - Miami: struggling, dasher supply issues (0.79 acceptance rate)
 */

import { PrismaClient } from '@prisma/client'
import {
  UserRole,
  OrderStatus,
  DiscountType,
  CourierStatus,
  SubscriptionStatus,
  SubscriptionPlan,
  Market,
} from '../src/lib/enums'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Dashly database...')

  // ============================================================================
  // USERS - Multiple customers across markets
  // ============================================================================

  // San Francisco customers (mature market, healthy)
  const customer1 = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      name: 'Sarah Chen',
      phone: '555-123-4567',
      role: UserRole.CUSTOMER,
      market: Market.SF,
    },
  })

  // Power user with Plus subscription
  const customer2 = await prisma.user.create({
    data: {
      email: 'mike@example.com',
      name: 'Mike Johnson',
      phone: '555-123-4568',
      role: UserRole.CUSTOMER,
      market: Market.SF,
    },
  })

  // Austin customer (growing market)
  const customer3 = await prisma.user.create({
    data: {
      email: 'emily@example.com',
      name: 'Emily Davis',
      phone: '555-234-5678',
      role: UserRole.CUSTOMER,
      market: Market.AUS,
    },
  })

  // Phoenix customer (struggling market - menu accuracy issues)
  const customer4 = await prisma.user.create({
    data: {
      email: 'carlos@example.com',
      name: 'Carlos Martinez',
      phone: '555-345-6789',
      role: UserRole.CUSTOMER,
      market: Market.PHX,
    },
  })

  // Miami customer (struggling market - dasher supply issues)
  const customer5 = await prisma.user.create({
    data: {
      email: 'ana@example.com',
      name: 'Ana Rodriguez',
      phone: '555-456-7890',
      role: UserRole.CUSTOMER,
      market: Market.MIA,
    },
  })

  // Merchants
  const merchant1 = await prisma.user.create({
    data: {
      email: 'mario@bellaroma.com',
      name: 'Mario Rossi',
      phone: '555-234-5678',
      role: UserRole.MERCHANT,
      market: Market.SF,
    },
  })

  const merchant2 = await prisma.user.create({
    data: {
      email: 'chen@dragonpalace.com',
      name: 'David Chen',
      phone: '555-567-8901',
      role: UserRole.MERCHANT,
      market: Market.SF,
    },
  })

  const merchant3 = await prisma.user.create({
    data: {
      email: 'jose@tacotiempo.com',
      name: 'José Garcia',
      phone: '555-678-9012',
      role: UserRole.MERCHANT,
      market: Market.SF,
    },
  })

  // Phoenix merchant (struggling market)
  const merchant4 = await prisma.user.create({
    data: {
      email: 'linda@phoenixgrill.com',
      name: 'Linda Thompson',
      phone: '555-789-0123',
      role: UserRole.MERCHANT,
      market: Market.PHX,
    },
  })

  // Miami merchant
  const merchant5 = await prisma.user.create({
    data: {
      email: 'pedro@cubancafe.com',
      name: 'Pedro Fernandez',
      phone: '555-890-1234',
      role: UserRole.MERCHANT,
      market: Market.MIA,
    },
  })

  // Couriers
  const courier1 = await prisma.user.create({
    data: {
      email: 'alex@dashly.com',
      name: 'Alex Rivera',
      phone: '555-345-6789',
      role: UserRole.COURIER,
      courierStatus: CourierStatus.AVAILABLE,
      market: Market.SF,
    },
  })

  const courier2 = await prisma.user.create({
    data: {
      email: 'jamie@dashly.com',
      name: 'Jamie Park',
      phone: '555-456-7890',
      role: UserRole.COURIER,
      courierStatus: CourierStatus.OFFLINE,
      market: Market.SF,
    },
  })

  // Miami courier (struggling market - low acceptance rate)
  const courier3 = await prisma.user.create({
    data: {
      email: 'maria@dashly.com',
      name: 'Maria Santos',
      phone: '555-567-8901',
      role: UserRole.COURIER,
      courierStatus: CourierStatus.AVAILABLE,
      market: Market.MIA,
    },
  })

  const admin = await prisma.user.create({
    data: {
      email: 'support@dashly.com',
      name: 'Dashly Support',
      phone: '555-000-0000',
      role: UserRole.ADMIN,
      market: Market.SF,
    },
  })

  console.log('✓ Created users (5 customers, 5 merchants, 3 couriers, 1 admin)')

  // ============================================================================
  // DASHLY PLUS SUBSCRIPTIONS
  // ============================================================================
  // FEATURE: dashly_plus_retention

  const oneMonthFromNow = new Date()
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

  // Active Plus subscriber (power user)
  await prisma.subscription.create({
    data: {
      userId: customer2.id,
      status: SubscriptionStatus.ACTIVE,
      plan: SubscriptionPlan.MONTHLY,
      monthlyPrice: 9.99,
      startedAt: new Date('2024-10-15'),
      currentPeriodStart: new Date('2025-01-15'),
      currentPeriodEnd: oneMonthFromNow,
    },
  })

  // Trial subscriber
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 7)

  await prisma.subscription.create({
    data: {
      userId: customer3.id,
      status: SubscriptionStatus.TRIAL,
      plan: SubscriptionPlan.MONTHLY,
      monthlyPrice: 9.99,
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    },
  })

  // Cancelled subscriber (for churn analysis)
  await prisma.subscription.create({
    data: {
      userId: customer5.id,
      status: SubscriptionStatus.CANCELLED,
      plan: SubscriptionPlan.MONTHLY,
      monthlyPrice: 9.99,
      startedAt: new Date('2024-09-01'),
      currentPeriodStart: new Date('2024-12-01'),
      currentPeriodEnd: new Date('2025-01-01'),
      cancelledAt: new Date('2024-12-20'),
      cancelReason: 'NOT_ENOUGH_VALUE',
    },
  })

  console.log('✓ Created Dashly Plus subscriptions (1 active, 1 trial, 1 cancelled)')

  // ============================================================================
  // CUSTOMER ADDRESSES
  // ============================================================================

  const address1 = await prisma.address.create({
    data: {
      userId: customer1.id,
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

  const address2 = await prisma.address.create({
    data: {
      userId: customer2.id,
      label: 'Home',
      streetLine1: '456 Pine Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94108',
      latitude: 37.7899,
      longitude: -122.4084,
      isDefault: true,
    },
  })

  const address4 = await prisma.address.create({
    data: {
      userId: customer4.id,
      label: 'Home',
      streetLine1: '789 Camelback Road',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85016',
      latitude: 33.5088,
      longitude: -111.9850,
      isDefault: true,
    },
  })

  const address5 = await prisma.address.create({
    data: {
      userId: customer5.id,
      label: 'Home',
      streetLine1: '321 Collins Avenue',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      latitude: 25.7906,
      longitude: -80.1300,
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

  await prisma.courierLocation.create({
    data: {
      courierId: courier3.id,
      latitude: 25.7617,
      longitude: -80.1918,
    },
  })

  console.log('✓ Created courier locations')

  // ============================================================================
  // RESTAURANTS
  // ============================================================================

  // San Francisco restaurants (healthy market)
  const bellaRoma = await prisma.restaurant.create({
    data: {
      merchantId: merchant1.id,
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
      market: Market.SF,
      avgRating: 4.5,
      reviewCount: 127,
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
      market: Market.SF,
      avgRating: 4.3,
      reviewCount: 89,
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
      market: Market.SF,
      avgRating: 4.7,
      reviewCount: 203,
    },
  })

  // Phoenix restaurant (struggling market - menu accuracy issues)
  const phoenixGrill = await prisma.restaurant.create({
    data: {
      merchantId: merchant4.id,
      name: 'Phoenix Grill & Bar',
      description: 'Southwest cuisine with a local twist.',
      cuisine: 'American',
      streetAddress: '100 E Camelback Road',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85016',
      latitude: 33.5094,
      longitude: -111.9760,
      deliveryRadiusMiles: 6.0,
      minimumOrderAmount: 15.0,
      deliveryFee: 3.99,
      estimatedPrepTime: 30,
      isActive: true,
      market: Market.PHX,
      avgRating: 3.8, // Lower rating due to menu accuracy issues
      reviewCount: 45,
    },
  })

  // Miami restaurant
  const cubanCafe = await prisma.restaurant.create({
    data: {
      merchantId: merchant5.id,
      name: 'Cuban Café Miami',
      description: 'Authentic Cuban cuisine and tropical drinks.',
      cuisine: 'Cuban',
      streetAddress: '500 Ocean Drive',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      latitude: 25.7825,
      longitude: -80.1304,
      deliveryRadiusMiles: 4.0,
      minimumOrderAmount: 18.0,
      deliveryFee: 4.99,
      estimatedPrepTime: 25,
      isActive: true,
      market: Market.MIA,
      avgRating: 4.4,
      reviewCount: 67,
    },
  })

  console.log('✓ Created restaurants (3 SF, 1 Phoenix, 1 Miami)')

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
        isClosed: day === 1,
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

  // Phoenix Grill: Open 11am-10pm daily
  for (let day = 0; day <= 6; day++) {
    await prisma.openingHours.create({
      data: {
        restaurantId: phoenixGrill.id,
        dayOfWeek: day,
        openTime: '11:00',
        closeTime: '22:00',
        isClosed: false,
      },
    })
  }

  // Cuban Café: Open 8am-11pm daily
  for (let day = 0; day <= 6; day++) {
    await prisma.openingHours.create({
      data: {
        restaurantId: cubanCafe.id,
        dayOfWeek: day,
        openTime: '08:00',
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
      isAvailable: false,
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

  // Phoenix Grill Menu (with some unavailable items to simulate menu accuracy issues)
  const phxStarters = await prisma.menuCategory.create({
    data: { restaurantId: phoenixGrill.id, name: 'Starters', sortOrder: 1 },
  })
  const phxMains = await prisma.menuCategory.create({
    data: { restaurantId: phoenixGrill.id, name: 'Main Courses', sortOrder: 2 },
  })

  const southwestSalad = await prisma.menuItem.create({
    data: {
      restaurantId: phoenixGrill.id,
      categoryId: phxStarters.id,
      name: 'Southwest Salad',
      description: 'Mixed greens, black beans, corn, avocado, chipotle ranch',
      price: 12.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  // Item frequently out of stock (demonstrates Phoenix menu accuracy issue)
  await prisma.menuItem.create({
    data: {
      restaurantId: phoenixGrill.id,
      categoryId: phxStarters.id,
      name: 'Jalapeño Poppers',
      description: 'Cream cheese stuffed jalapeños, breaded and fried',
      price: 9.99,
      isAvailable: false, // Often unavailable
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: phoenixGrill.id,
      categoryId: phxMains.id,
      name: 'BBQ Brisket Plate',
      description: 'Slow-smoked brisket with coleslaw and cornbread',
      price: 22.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  // Cuban Café Menu
  const cubanApps = await prisma.menuCategory.create({
    data: { restaurantId: cubanCafe.id, name: 'Appetizers', sortOrder: 1 },
  })
  const cubanMains = await prisma.menuCategory.create({
    data: { restaurantId: cubanCafe.id, name: 'Main Courses', sortOrder: 2 },
  })

  const cubanSandwich = await prisma.menuItem.create({
    data: {
      restaurantId: cubanCafe.id,
      categoryId: cubanMains.id,
      name: 'Cuban Sandwich',
      description: 'Roasted pork, ham, swiss, pickles, mustard on pressed Cuban bread',
      price: 14.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: cubanCafe.id,
      categoryId: cubanMains.id,
      name: 'Ropa Vieja',
      description: 'Shredded beef in tomato sauce with rice and black beans',
      price: 18.99,
      isAvailable: true,
      isPopular: true,
    },
  })

  await prisma.menuItem.create({
    data: {
      restaurantId: cubanCafe.id,
      categoryId: cubanApps.id,
      name: 'Tostones',
      description: 'Twice-fried green plantains with mojo sauce',
      price: 7.99,
      isAvailable: true,
    },
  })

  console.log('✓ Created menu items')

  // ============================================================================
  // PROMOTIONS
  // ============================================================================

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
      discountValue: 0,
      minimumOrderAmount: 35.0,
      isActive: true,
    },
  })

  // Plus-only promo
  await prisma.promotion.create({
    data: {
      code: 'PLUSBONUS',
      description: '15% off for Dashly Plus members',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0.15,
      minimumOrderAmount: 20.0,
      maximumDiscount: 10.0,
      isActive: true,
      validUntil: oneYearFromNow,
    },
  })

  console.log('✓ Created promotions')

  // ============================================================================
  // SAMPLE ORDERS
  // ============================================================================

  // Order 1: Completed delivery (SF - healthy market)
  const order1 = await prisma.order.create({
    data: {
      customerId: customer1.id,
      restaurantId: bellaRoma.id,
      courierId: courier1.id,
      deliveryAddressId: address1.id,
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
      customerId: customer1.id,
      restaurantId: bellaRoma.id,
      deliveryAddressId: address1.id,
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
      estimatedDelivery: new Date(Date.now() + 35 * 60 * 1000),
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

  // Order 3: Plus member order (free delivery)
  const order3 = await prisma.order.create({
    data: {
      customerId: customer2.id,
      restaurantId: bellaRoma.id,
      courierId: courier1.id,
      deliveryAddressId: address2.id,
      status: OrderStatus.DELIVERED,
      placedAt: new Date('2025-01-14T19:00:00'),
      confirmedAt: new Date('2025-01-14T19:02:00'),
      preparingAt: new Date('2025-01-14T19:05:00'),
      readyAt: new Date('2025-01-14T19:25:00'),
      pickedUpAt: new Date('2025-01-14T19:30:00'),
      deliveredAt: new Date('2025-01-14T19:45:00'),
      subtotal: 35.98,
      deliveryFee: 0, // Free for Plus members
      serviceFee: 1.80,
      discount: 0,
      tip: 6.00,
      total: 43.78,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order3.id,
      menuItemId: spaghettiCarbonara.id,
      quantity: 2,
      priceAtPurchase: 18.99,
    },
  })

  // Order 4: Phoenix order with cancellation (menu accuracy issue)
  const order4 = await prisma.order.create({
    data: {
      customerId: customer4.id,
      restaurantId: phoenixGrill.id,
      deliveryAddressId: address4.id,
      status: OrderStatus.CANCELLED,
      placedAt: new Date('2025-01-13T18:30:00'),
      confirmedAt: new Date('2025-01-13T18:32:00'),
      cancelledAt: new Date('2025-01-13T18:40:00'),
      cancellationReason: 'Item unavailable - customer declined substitution',
      subtotal: 22.98,
      deliveryFee: 3.99,
      serviceFee: 1.15,
      discount: 0,
      tip: 0,
      total: 28.12,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order4.id,
      menuItemId: southwestSalad.id,
      quantity: 1,
      priceAtPurchase: 12.99,
      substitutionStatus: 'UNAVAILABLE',
    },
  })

  // Order 5: Miami order - delivered late (dasher supply issue)
  const order5 = await prisma.order.create({
    data: {
      customerId: customer5.id,
      restaurantId: cubanCafe.id,
      courierId: courier3.id,
      deliveryAddressId: address5.id,
      status: OrderStatus.DELIVERED,
      placedAt: new Date('2025-01-12T12:00:00'),
      confirmedAt: new Date('2025-01-12T12:05:00'),
      preparingAt: new Date('2025-01-12T12:10:00'),
      readyAt: new Date('2025-01-12T12:30:00'),
      pickedUpAt: new Date('2025-01-12T12:55:00'), // 25 min wait for dasher
      deliveredAt: new Date('2025-01-12T13:20:00'), // Late delivery
      subtotal: 14.99,
      deliveryFee: 4.99,
      serviceFee: 0.75,
      discount: 0,
      tip: 2.00,
      total: 22.73,
      estimatedDelivery: new Date('2025-01-12T12:45:00'), // Was supposed to arrive earlier
    },
  })

  await prisma.orderItem.create({
    data: {
      orderId: order5.id,
      menuItemId: cubanSandwich.id,
      quantity: 1,
      priceAtPurchase: 14.99,
    },
  })

  console.log('✓ Created sample orders')

  // ============================================================================
  // REVIEWS
  // ============================================================================
  // FEATURE: merchant_menu_accuracy, dasher_offer_quality

  // Good review for SF order
  await prisma.review.create({
    data: {
      orderId: order1.id,
      customerId: customer1.id,
      restaurantId: bellaRoma.id,
      overallRating: 5,
      foodRating: 5,
      deliveryRating: 5,
      comment: 'Amazing food, arrived hot and on time!',
      hadIssue: false,
    },
  })

  // Plus member review
  await prisma.review.create({
    data: {
      orderId: order3.id,
      customerId: customer2.id,
      restaurantId: bellaRoma.id,
      overallRating: 4,
      foodRating: 5,
      deliveryRating: 4,
      comment: 'Great pasta as always. Delivery was a few minutes late but food was perfect.',
      hadIssue: false,
    },
  })

  // Miami review with late delivery issue
  await prisma.review.create({
    data: {
      orderId: order5.id,
      customerId: customer5.id,
      restaurantId: cubanCafe.id,
      overallRating: 3,
      foodRating: 4,
      deliveryRating: 2,
      comment: 'Food was good but delivery took way too long. Had to wait 35 minutes after it was ready.',
      hadIssue: true,
      issueType: 'LATE_DELIVERY',
    },
  })

  console.log('✓ Created reviews')

  // ============================================================================
  // SAMPLE CART
  // ============================================================================

  const cart = await prisma.cart.create({
    data: {
      customerId: customer1.id,
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
  console.log('  Customer (SF):      sarah@example.com')
  console.log('  Customer (Plus):    mike@example.com')
  console.log('  Customer (Phoenix): carlos@example.com')
  console.log('  Customer (Miami):   ana@example.com')
  console.log('  Merchant:           mario@bellaroma.com')
  console.log('  Courier:            alex@dashly.com')
  console.log('  Admin:              support@dashly.com')
  console.log('')
  console.log('Markets:')
  console.log('  SF:      3 restaurants, healthy baseline')
  console.log('  Phoenix: 1 restaurant, menu accuracy issues')
  console.log('  Miami:   1 restaurant, dasher supply issues')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
