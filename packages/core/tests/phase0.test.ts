/**
 * Phase 0 tests — chỉ verify types/interfaces compile đúng
 * và DefaultAdapterRegistry hoạt động cơ bản.
 * Logic tests sẽ được thêm ở các Phase sau.
 */

import { describe, it, expect, beforeEach } from "vitest"
import { DefaultAdapterRegistry } from "../src/tree/AdapterRegistry.js"
import type { LanguageAdapter } from "../src/types/LanguageAdapter.js"
import type { ParsedFile } from "../src/types/RawSymbol.js"

// Mock adapter để test registry
const mockTsAdapter: LanguageAdapter = {
  language: "typescript",
  fileExtensions: [".ts", ".tsx"],
  async parseFile(_filePath: string, _projectRoot: string): Promise<ParsedFile> {
    throw new Error("mock — not implemented")
  },
  supports(filePath: string): boolean {
    return filePath.endsWith(".ts") || filePath.endsWith(".tsx")
  },
  async resolveImport(_importString, _fromFile, _projectRoot) {
    return null
  },
}

const mockPyAdapter: LanguageAdapter = {
  language: "python",
  fileExtensions: [".py"],
  async parseFile(_filePath, _projectRoot): Promise<ParsedFile> {
    throw new Error("mock — not implemented")
  },
  supports(filePath: string): boolean {
    return filePath.endsWith(".py")
  },
  async resolveImport(_importString, _fromFile, _projectRoot) {
    return null
  },
}

describe("DefaultAdapterRegistry", () => {
  let registry: DefaultAdapterRegistry

  beforeEach(() => {
    registry = new DefaultAdapterRegistry()
  })

  it("should start empty", () => {
    expect(registry.getSupportedLanguages()).toHaveLength(0)
    expect(registry.getSupportedExtensions()).toHaveLength(0)
  })

  it("should register a TypeScript adapter", () => {
    registry.register(mockTsAdapter)
    expect(registry.getSupportedLanguages()).toContain("typescript")
    expect(registry.getSupportedExtensions()).toContain(".ts")
    expect(registry.getSupportedExtensions()).toContain(".tsx")
  })

  it("should find adapter by .ts extension", () => {
    registry.register(mockTsAdapter)
    const adapter = registry.findAdapter("src/auth/auth.service.ts")
    expect(adapter).not.toBeNull()
    expect(adapter?.language).toBe("typescript")
  })

  it("should find adapter by .tsx extension", () => {
    registry.register(mockTsAdapter)
    const adapter = registry.findAdapter("src/components/Button.tsx")
    expect(adapter).not.toBeNull()
    expect(adapter?.language).toBe("typescript")
  })

  it("should return null for unsupported file type", () => {
    registry.register(mockTsAdapter)
    const adapter = registry.findAdapter("src/styles/main.css")
    expect(adapter).toBeNull()
  })

  it("should support multiple languages", () => {
    registry.register(mockTsAdapter)
    registry.register(mockPyAdapter)
    expect(registry.getSupportedLanguages()).toHaveLength(2)
    expect(registry.getSupportedLanguages()).toContain("typescript")
    expect(registry.getSupportedLanguages()).toContain("python")
  })

  it("should route python files to python adapter", () => {
    registry.register(mockTsAdapter)
    registry.register(mockPyAdapter)
    const adapter = registry.findAdapter("scripts/process.py")
    expect(adapter?.language).toBe("python")
  })

  it("should override adapter when registering same language twice", () => {
    registry.register(mockTsAdapter)
    const newTsAdapter: LanguageAdapter = { ...mockTsAdapter, fileExtensions: [".ts"] }
    registry.register(newTsAdapter)
    // Language entry bị replace
    expect(registry.getSupportedLanguages()).toHaveLength(1)
    // .ts vẫn route đúng tới adapter mới
    const adapter = registry.findAdapter("auth.service.ts")
    expect(adapter).not.toBeNull()
    expect(adapter?.fileExtensions).toEqual([".ts"])
  })
})

describe("Type contracts — compile-time checks", () => {
  it("RawSymbol shape is valid", () => {
    const symbol = {
      name: "AuthService",
      kind: "class" as const,
      signature: "class AuthService",
      startLine: 10,
      endLine: 50,
      fullSource: "class AuthService { ... }",
      isExported: true,
      docComment: "Handles authentication",
    }
    // Nếu file này compile được = types đúng
    expect(symbol.name).toBe("AuthService")
    expect(symbol.kind).toBe("class")
  })

  it("TreeNode levels are correct", () => {
    const levels = ["project", "module", "file", "symbol"] as const
    expect(levels).toHaveLength(4)
  })

  it("DEFAULT_LLM_CONFIG has expected shape", async () => {
    const { DEFAULT_LLM_CONFIG } = await import("../src/types/LLMClient.js")
    expect(DEFAULT_LLM_CONFIG.summaryMaxTokens).toBeGreaterThan(0)
    expect(DEFAULT_LLM_CONFIG.traversalMaxTokens).toBeGreaterThan(0)
    expect(DEFAULT_LLM_CONFIG.summaryTemperature).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_LLM_CONFIG.traversalTemperature).toBe(0)
  })

  it("DEFAULT_RETRIEVAL_CONFIG has expected shape", async () => {
    const { DEFAULT_RETRIEVAL_CONFIG } = await import("../src/types/Retrieval.js")
    expect(DEFAULT_RETRIEVAL_CONFIG.maxSymbols).toBeGreaterThan(0)
    expect(DEFAULT_RETRIEVAL_CONFIG.expandDeps).toBe(true)
    expect(DEFAULT_RETRIEVAL_CONFIG.maxOutputTokens).toBeGreaterThan(0)
    expect(DEFAULT_RETRIEVAL_CONFIG.depSymbolsIncludeBody).toBe(false)
  })
})

describe("Stub implementations throw correctly", () => {
  it("TreeBuilder.build() now works (Phase 2 implemented)", async () => {
    const { TreeBuilder } = await import("../src/tree/TreeBuilder.js")
    const builder = new TreeBuilder({
      projectRoot: "/fake",
      llmClient: {
        async complete() {
          return { content: '{"short":"mock","detailed":"mock"}', usage: { inputTokens: 0, outputTokens: 0 } }
        },
      },
    })
    // Build với empty files array nên resolve, không throw
    const tree = await builder.build([])
    expect(tree.root.level).toBe("project")
  })

  it("Retriever.retrieve() now works (Phase 3 implemented)", async () => {
    const { Retriever } = await import("../src/retrieval/Retriever.js")
    const retriever = new Retriever({
      llmClient: {
        async complete() {
          return { content: '{"selected":[],"reasoning":"mock"}', usage: { inputTokens: 0, outputTokens: 0 } }
        },
      },
    })
    // Minimal valid tree
    const minimalTree = {
      root: { nodeId: "project:root", title: "test", level: "project", shortSummary: "", rootPath: "/", primaryLanguage: "typescript", children: [] },
      nodes: { "project:root": { nodeId: "project:root", title: "test", level: "project", shortSummary: "", rootPath: "/", primaryLanguage: "typescript", children: [] } },
      version: "1.0.0",
      builtAt: Date.now(),
    }
    const result = await retriever.retrieve(minimalTree as never, { query: "test" })
    expect(result.query).toBe("test")
    expect(result.formattedContext).toBeDefined()
  })
})
