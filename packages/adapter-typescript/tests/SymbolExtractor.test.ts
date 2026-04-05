import { describe, it, expect, beforeAll } from "vitest"
import { Project } from "ts-morph"
import { SymbolExtractor } from "../src/SymbolExtractor.js"
import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, "fixtures/src")

let project: Project
let extractor: SymbolExtractor

beforeAll(() => {
  project = new Project({ skipFileDependencyResolution: true })
  extractor = new SymbolExtractor()
})

describe("SymbolExtractor — auth.service.ts", () => {
  it("should extract class AuthService", () => {
    const sf = project.addSourceFileAtPath(
      path.join(FIXTURES, "auth/auth.service.ts")
    )
    const symbols = extractor.extract(sf)
    const cls = symbols.find((s) => s.name === "AuthService")

    expect(cls).toBeDefined()
    expect(cls?.kind).toBe("class")
    expect(cls?.isExported).toBe(true)
    expect(cls?.signature).toContain("class AuthService")
    expect(cls?.docComment).toContain("JWT-based authentication")
  })

  it("should extract class methods", () => {
    const sf = project.getSourceFile(
      path.join(FIXTURES, "auth/auth.service.ts")
    )!
    const symbols = extractor.extract(sf)
    const methodNames = symbols
      .filter((s) => s.kind === "method")
      .map((s) => s.name)

    expect(methodNames).toContain("login")
    expect(methodNames).toContain("validateToken")
    expect(methodNames).toContain("refreshToken")
    expect(methodNames).toContain("signToken")
  })

  it("should set parentName on methods", () => {
    const sf = project.getSourceFile(
      path.join(FIXTURES, "auth/auth.service.ts")
    )!
    const symbols = extractor.extract(sf)
    const loginMethod = symbols.find((s) => s.name === "login")

    expect(loginMethod?.parentName).toBe("AuthService")
  })

  it("should extract method signatures with return types", () => {
    const sf = project.getSourceFile(
      path.join(FIXTURES, "auth/auth.service.ts")
    )!
    const symbols = extractor.extract(sf)
    const login = symbols.find((s) => s.name === "login")

    expect(login?.signature).toContain("async")
    expect(login?.signature).toContain("LoginDto")
    expect(login?.signature).toContain("Promise<TokenPair>")
  })

  it("should extract exported interfaces", () => {
    const sf = project.getSourceFile(
      path.join(FIXTURES, "auth/auth.service.ts")
    )!
    const symbols = extractor.extract(sf)
    const interfaces = symbols.filter((s) => s.kind === "interface")

    expect(interfaces.map((i) => i.name)).toContain("LoginDto")
    expect(interfaces.map((i) => i.name)).toContain("TokenPair")
  })

  it("should extract exported constants", () => {
    const sf = project.getSourceFile(
      path.join(FIXTURES, "auth/auth.service.ts")
    )!
    const symbols = extractor.extract(sf)
    const constant = symbols.find((s) => s.name === "AUTH_CONSTANTS")

    expect(constant).toBeDefined()
    expect(constant?.kind).toBe("constant")
    expect(constant?.isExported).toBe(true)
  })

  it("should include fullSource for class", () => {
    const sf = project.getSourceFile(
      path.join(FIXTURES, "auth/auth.service.ts")
    )!
    const symbols = extractor.extract(sf)
    const cls = symbols.find((s) => s.name === "AuthService")

    expect(cls?.fullSource).toContain("class AuthService")
    expect(cls?.fullSource.length).toBeGreaterThan(100)
  })
})

describe("SymbolExtractor — types.ts", () => {
  it("should extract enum", () => {
    const sf = project.addSourceFileAtPath(path.join(FIXTURES, "types.ts"))
    const symbols = extractor.extract(sf)
    const enumSymbol = symbols.find((s) => s.name === "UserRole")

    expect(enumSymbol).toBeDefined()
    expect(enumSymbol?.kind).toBe("enum")
    expect(enumSymbol?.signature).toContain("Admin")
    expect(enumSymbol?.signature).toContain("User")
    expect(enumSymbol?.signature).toContain("Guest")
  })

  it("should extract type aliases", () => {
    const sf = project.getSourceFile(path.join(FIXTURES, "types.ts"))!
    const symbols = extractor.extract(sf)
    const typeAliases = symbols.filter((s) => s.kind === "type")

    expect(typeAliases.map((t) => t.name)).toContain("UserId")
    expect(typeAliases.map((t) => t.name)).toContain("Email")
    expect(typeAliases.map((t) => t.name)).toContain("UserStatus")
  })
})

describe("SymbolExtractor — utils.ts", () => {
  it("should extract async top-level functions", () => {
    const sf = project.addSourceFileAtPath(path.join(FIXTURES, "utils.ts"))
    const symbols = extractor.extract(sf)
    const hashFn = symbols.find((s) => s.name === "hashPassword")

    expect(hashFn).toBeDefined()
    expect(hashFn?.kind).toBe("function")
    expect(hashFn?.signature).toContain("async")
    expect(hashFn?.signature).toContain("Promise<string>")
    expect(hashFn?.isExported).toBe(true)
  })

  it("should extract sync functions", () => {
    const sf = project.getSourceFile(path.join(FIXTURES, "utils.ts"))!
    const symbols = extractor.extract(sf)
    const isAdminFn = symbols.find((s) => s.name === "isAdmin")

    expect(isAdminFn?.kind).toBe("function")
    expect(isAdminFn?.signature).toContain("boolean")
  })
})
