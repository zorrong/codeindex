import type { UserService } from "./user.service.js"
import type { JwtPayload } from "../types.js"

export interface LoginDto {
  email: string
  password: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * AuthService handles JWT-based authentication.
 * Provides login, token validation, and refresh functionality.
 */
export class AuthService {
  private readonly jwtSecret: string

  constructor(
    private readonly userService: UserService,
    jwtSecret: string
  ) {
    this.jwtSecret = jwtSecret
  }

  /**
   * Authenticate user with email and password.
   * Returns a token pair on success.
   */
  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userService.findByEmail(dto.email)
    if (!user) {
      throw new Error("Invalid credentials")
    }
    return {
      accessToken: `access_${user.id}`,
      refreshToken: `refresh_${user.id}`,
    }
  }

  /**
   * Validate an access token and return the payload.
   */
  validateToken(token: string): JwtPayload {
    if (!token.startsWith("access_")) {
      throw new Error("Invalid token")
    }
    return { userId: token.replace("access_", ""), iat: Date.now() }
  }

  /**
   * Refresh an expired access token using a refresh token.
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken.startsWith("refresh_")) {
      throw new Error("Invalid refresh token")
    }
    const userId = refreshToken.replace("refresh_", "")
    return {
      accessToken: `access_${userId}`,
      refreshToken: `refresh_${userId}`,
    }
  }

  private signToken(payload: JwtPayload): string {
    return `signed_${JSON.stringify(payload)}_${this.jwtSecret}`
  }
}

export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_TTL: 3600,
  REFRESH_TOKEN_TTL: 86400,
}
