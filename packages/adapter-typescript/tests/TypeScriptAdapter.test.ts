import { describe, it, expect } from "vitest"
import { TypeScriptAdapter } from "../src/TypeScriptAdapter.js"
import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_ROOT = path.join(__dirname, "fixtures")
const AUTH_SERVICE = path.join(FIXTURES_ROOT, "src/auth/auth.service.ts")
const UTILS_FILE = path.join(FIXTURES_ROOT, "src/utils.ts")

describe("TypeScriptAdapter", () => {
  const adapter = new TypeScriptAdapter()

  it("should support .ts files", () => {
    expect(adapter.supports("src/auth/auth.service.ts")).toBe(true)
    expect(adapter.supports("Component.tsx")).toBe(true)
    expect(adapter.supports("styles.css")).toBe(false)
    expect(adapter.supports("script.js")).toBe(false)
  })

  it("should have correct language and extensions", () => {
    expect(adapter.language).toBe("typescript")
    expect(adapter.fileExtensions).toContain(".ts")
    expect(adapter.fileExtensions).toContain(".tsx")
  })

  describe("parseFile — auth.service.ts", () => {
    it("should return ParsedFile with correct shape", async () => {
      const result = await adapter.parseFile(AUTH_SERVICE, FIXTURES_ROOT)

      expect(result.filePath).toBe(AUTH_SERVICE)
      expect(result.language).toBe("typescript")
      expect(result.symbols).toBeInstanceOf(Array)
      expect(result.symbols.length).toBeGreaterThan(0)
      expect(result.internalImports).toBeInstanceOf(Array)
      expect(result.externalImports).toBeInstanceOf(Array)
      expect(result.exports).toBeInstanceOf(Array)
    })

    it("should detect internal imports", async () => {
      const result = await adapter.parseFile(AUTH_SERVICE, FIXTURES_ROOT)
      // auth.service.ts imports from ./user.service.js and ../types.js
      expect(result.internalImports.length).toBeGreaterThan(0)
    })

    it("should have correct relativePath", async () => {
      const result = await adapter.parseFile(AUTH_SERVICE, FIXTURES_ROOT)
      expect(result.relativePath).toBe("src/auth/auth.service.ts")
    })

    it("should export AuthService, LoginDto, TokenPair, AUTH_CONSTANTS", async () => {
      const result = await adapter.parseFile(AUTH_SERVICE, FIXTURES_ROOT)
      expect(result.exports).toContain("AuthService")
      expect(result.exports).toContain("LoginDto")
      expect(result.exports).toContain("TokenPair")
      expect(result.exports).toContain("AUTH_CONSTANTS")
    })

    it("should extract meaningful symbols", async () => {
      const result = await adapter.parseFile(AUTH_SERVICE, FIXTURES_ROOT)
      const symbolNames = result.symbols.map((s) => s.name)

      expect(symbolNames).toContain("AuthService")
      expect(symbolNames).toContain("login")
      expect(symbolNames).toContain("validateToken")
    })
  })

  describe("parseFile — utils.ts", () => {
    it("should parse functions correctly", async () => {
      const result = await adapter.parseFile(UTILS_FILE, FIXTURES_ROOT)
      const fnNames = result.symbols.map((s) => s.name)

      expect(fnNames).toContain("hashPassword")
      expect(fnNames).toContain("isAdmin")
      expect(fnNames).toContain("formatEmail")
    })
  })

  describe("resolveImport", () => {
    it("should return null for external packages", async () => {
      const result = await adapter.resolveImport(
        "express",
        AUTH_SERVICE,
        FIXTURES_ROOT
      )
      expect(result).toBeNull()
    })

    it("should return null for @scope packages", async () => {
      const result = await adapter.resolveImport(
        "@nestjs/common",
        AUTH_SERVICE,
        FIXTURES_ROOT
      )
      expect(result).toBeNull()
    })

    it("should resolve relative import to existing file", async () => {
      const result = await adapter.resolveImport(
        "../types.js",
        AUTH_SERVICE,
        FIXTURES_ROOT
      )
      // types.ts exists at src/types.ts
      expect(result).toBe("src/types.ts")
    })
  })
})
