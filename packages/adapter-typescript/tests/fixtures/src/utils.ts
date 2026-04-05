import { type UserRole } from "./types.js"

/**
 * Hash a password using a simple algorithm (test only).
 */
export async function hashPassword(password: string): Promise<string> {
  return `hashed_${password}`
}

/**
 * Check if a user role has admin privileges.
 */
export function isAdmin(role: UserRole): boolean {
  return role === "admin"
}

export function formatEmail(email: string): string {
  return email.toLowerCase().trim()
}
