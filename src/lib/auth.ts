/**
 * Simplified auth helpers for Dashly
 *
 * This is a minimal auth implementation for demo purposes.
 * In production, you would use a proper auth provider like NextAuth.js.
 *
 * For this demo, we use a simple header-based approach where the
 * client sends a user ID in the x-user-id header.
 */

import { prisma } from './db'
import { User } from '@prisma/client'
import { UserRole } from '@/lib/enums'

/**
 * Get the current user from request headers.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(headers: Headers): Promise<User | null> {
  const userId = headers.get('x-user-id')
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  return user
}

/**
 * Require authentication. Throws if not logged in.
 */
export async function requireAuth(headers: Headers): Promise<User> {
  const user = await getCurrentUser(headers)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Require a specific role. Throws if user doesn't have the role.
 */
export async function requireRole(headers: Headers, role: UserRole): Promise<User> {
  const user = await requireAuth(headers)
  if (user.role !== role) {
    throw new Error(`Requires ${role} role`)
  }
  return user
}

/**
 * Check if user has one of the allowed roles.
 */
export async function requireAnyRole(headers: Headers, roles: UserRole[]): Promise<User> {
  const user = await requireAuth(headers)
  if (!roles.includes(user.role as UserRole)) {
    throw new Error(`Requires one of: ${roles.join(', ')}`)
  }
  return user
}

/**
 * Check if user can access a specific resource.
 */
export function canAccessResource(user: User, resourceOwnerId: string): boolean {
  // Admins can access anything
  if (user.role === UserRole.ADMIN) return true

  // Users can only access their own resources
  return user.id === resourceOwnerId
}
