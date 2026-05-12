/**
 * Search Service
 *
 * Handles restaurant and menu item search:
 * - Restaurant search by name, cuisine, location
 * - Menu item search within restaurant
 * - Search ranking and relevance
 *
 * AMPLITUDE FEATURE KEYS:
 * - search_relevance: search query patterns, result clicks, conversion to order
 *
 * KEY CONSTRAINTS (for Spark to discover):
 * - Search is naive SQL LIKE - no full-text search, no ranking algorithm
 * - No search personalization (doesn't use order history)
 * - No typo tolerance or synonyms
 * - Results sorted by restaurant rating only
 *
 * SEE: docs/analytics/instrumentation-map.md
 *
 * LIMITATION_SEARCH_RANKING: Uses simple LIKE matching and rating sort.
 * No semantic search, no learned relevance, no personalization.
 * See docs/known-limitations.md for enhancement opportunities:
 * - Full-text search (Postgres, Elasticsearch, Algolia)
 * - Personalized ranking based on order history
 * - Typo tolerance and query expansion
 * - Location-based boosting
 * - Sponsored/promoted results
 */

import { prisma } from '@/lib/db'

// ============================================================================
// TYPES
// ============================================================================

export interface SearchRestaurantsInput {
  query: string
  market?: string
  cuisine?: string
  limit?: number
}

export interface SearchMenuInput {
  restaurantId: string
  query: string
  limit?: number
}

export interface SearchResult<T> {
  results: T[]
  query: string
  totalCount: number
}

// ============================================================================
// SERVICE
// ============================================================================

export class SearchService {
  /**
   * Search restaurants by name or cuisine.
   *
   * FEATURE: search_relevance
   * CONSTRAINT: Naive LIKE matching, no full-text search
   * LIMITATION: No personalization, typo tolerance, or semantic understanding
   */
  async searchRestaurants(input: SearchRestaurantsInput): Promise<SearchResult<typeof results[0]>> {
    const { query, market, cuisine, limit = 20 } = input

    // Build where clause
    // LIMITATION_SEARCH_RANKING: Simple LIKE pattern, case-insensitive via SQLite COLLATE
    const where: Record<string, unknown> = {
      isActive: true,
      OR: [
        { name: { contains: query } },
        { cuisine: { contains: query } },
        { description: { contains: query } },
      ],
    }

    if (market) {
      where.market = market
    }

    if (cuisine) {
      where.cuisine = cuisine
    }

    // Get total count for pagination
    const totalCount = await prisma.restaurant.count({ where })

    // Fetch results
    // CONSTRAINT: Sort by rating only - no relevance scoring
    const results = await prisma.restaurant.findMany({
      where,
      include: {
        openingHours: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: [
        { avgRating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    })

    return {
      results,
      query,
      totalCount,
    }
  }

  /**
   * Search menu items within a restaurant.
   *
   * FEATURE: search_relevance
   * CONSTRAINT: Simple LIKE search on name and description
   */
  async searchMenu(input: SearchMenuInput): Promise<SearchResult<typeof results[0]>> {
    const { restaurantId, query, limit = 50 } = input

    const where = {
      restaurantId,
      isAvailable: true,
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
        { category: { name: { contains: query } } },
      ],
    }

    const totalCount = await prisma.menuItem.count({ where })

    const results = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    })

    return {
      results,
      query,
      totalCount,
    }
  }

  /**
   * Get search suggestions based on popular queries.
   *
   * FEATURE: search_relevance
   * LIMITATION: Returns static cuisine types, not actual popular searches
   * Would need search query logging + aggregation for real suggestions
   */
  async getSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    // LIMITATION: No query logging, so we suggest based on cuisine types
    // Real implementation would use search_queries table with frequency counts
    const cuisines = await prisma.restaurant.findMany({
      where: {
        cuisine: { contains: partialQuery },
        isActive: true,
      },
      select: { cuisine: true },
      distinct: ['cuisine'],
      take: limit,
    })

    return cuisines.map(c => c.cuisine).filter(Boolean) as string[]
  }

  /**
   * Get popular restaurants for homepage.
   *
   * Used when no search query - shows top-rated restaurants.
   * LIMITATION: Not personalized, same for all users
   */
  async getPopular(market?: string, limit: number = 10) {
    const where: Record<string, unknown> = { isActive: true }

    if (market) {
      where.market = market
    }

    return prisma.restaurant.findMany({
      where,
      include: {
        openingHours: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: [
        { avgRating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    })
  }

  /**
   * Get restaurants by cuisine type.
   *
   * For cuisine category browsing.
   */
  async getByCuisine(cuisine: string, market?: string, limit: number = 20) {
    const where: Record<string, unknown> = {
      cuisine,
      isActive: true,
    }

    if (market) {
      where.market = market
    }

    return prisma.restaurant.findMany({
      where,
      include: {
        openingHours: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { avgRating: 'desc' },
      take: limit,
    })
  }

  /**
   * Get available cuisine types.
   *
   * For category filter dropdowns.
   */
  async getCuisineTypes(market?: string): Promise<string[]> {
    const where: Record<string, unknown> = { isActive: true }

    if (market) {
      where.market = market
    }

    const cuisines = await prisma.restaurant.findMany({
      where,
      select: { cuisine: true },
      distinct: ['cuisine'],
    })

    return cuisines.map(c => c.cuisine).filter(Boolean) as string[]
  }

  /**
   * Track search event for analytics.
   *
   * FEATURE: search_relevance
   * LIMITATION: Not implemented - would need search_events table
   * This is a stub showing what data we'd capture.
   */
  async trackSearch(
    userId: string | null,
    query: string,
    resultCount: number,
    market?: string
  ): Promise<void> {
    // LIMITATION: No search event tracking table
    // Would track: userId, query, resultCount, market, timestamp
    // For analyzing: popular queries, zero-result queries, conversion rates
    //
    // Future implementation:
    // await prisma.searchEvent.create({
    //   data: { userId, query, resultCount, market }
    // })

    // For now, this is a no-op
    // Analytics would be captured via Amplitude client-side events
  }

  /**
   * Track search result click for relevance learning.
   *
   * FEATURE: search_relevance
   * LIMITATION: Not implemented - would need click tracking
   */
  async trackClick(
    userId: string | null,
    query: string,
    restaurantId: string,
    position: number
  ): Promise<void> {
    // LIMITATION: No click tracking
    // Would track: userId, query, restaurantId, position, timestamp
    // For learning: click-through rates by position, relevance signals
    //
    // Future: feed into ranking model

    // No-op for now
  }
}

export const searchService = new SearchService()
