export interface JwtPayload {
  userId: string
  iat: number
  exp?: number
}

export type UserId = string
export type Email = string

export enum UserRole {
  Admin = "admin",
  User = "user",
  Guest = "guest",
}

export type UserStatus = "active" | "inactive" | "suspended"
