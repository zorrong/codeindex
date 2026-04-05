/**
 * ContextBuilder — assemble final context string từ selected symbols + deps.
 * Output được format sẵn để inject vào AI prompt.
 */

import type { SymbolNode, FileNode } from "../types/TreeNode.js"
import type { ExpandedDep } from "./DependencyExpander.js"
import type { RetrievalConfig } from "../types/Retrieval.js"

export interface ContextInput {
  selectedSymbols: SymbolNode[]
  selectedFiles: FileNode[]
  deps: ExpandedDep[]
  config: RetrievalConfig
}

export class ContextBuilder {
  /**
   * Build formatted context string.
   *
   * Format:
   * === src/auth/auth.service.ts ===
   * // AuthService — Handles JWT auth...
   * class AuthService { ... }
   *
   * // --- Dependencies (signatures only) ---
   * // src/user/user.service.ts
   * class UserService { ... }
   */
  build(input: ContextInput): { context: string; estimatedTokens: number } {
    const sections: string[] = []

    // Group symbols by file
    const symbolsByFile = new Map<string, SymbolNode[]>()
    for (const sym of input.selectedSymbols) {
      const existing = symbolsByFile.get(sym.filePath) ?? []
      existing.push(sym)
      symbolsByFile.set(sym.filePath, existing)
    }

    // Main sections — full source
    for (const [filePath, symbols] of symbolsByFile.entries()) {
      const fileNode = input.selectedFiles.find((f) => f.filePath === filePath)
      const fileHeader = `=== ${filePath} ===`
      const fileSummary = fileNode ? `// ${fileNode.shortSummary}` : ""

      const symbolBlocks = symbols.map((sym) => {
        const comment = sym.shortSummary !== sym.signature
          ? `// ${sym.shortSummary}\n`
          : ""
        return comment + sym.fullSource
      })

      sections.push([fileHeader, fileSummary, ...symbolBlocks]
        .filter(Boolean)
        .join("\n"))
    }

    // Dependency section — signatures only
    if (input.config.expandDeps && input.deps.length > 0) {
      const depLines: string[] = ["// --- Dependencies (signatures only) ---"]

      const depsByFile = new Map<string, ExpandedDep[]>()
      for (const dep of input.deps) {
        const existing = depsByFile.get(dep.fileNode.filePath) ?? []
        existing.push(dep)
        depsByFile.set(dep.fileNode.filePath, existing)
      }

      for (const [filePath, deps] of depsByFile.entries()) {
        depLines.push(`// ${filePath}`)
        for (const dep of deps) {
          if (input.config.depSymbolsIncludeBody) {
            depLines.push(dep.symbol.fullSource)
          } else {
            depLines.push(dep.signatureOnly)
          }
        }
      }

      sections.push(depLines.join("\n"))
    }

    const context = sections.join("\n\n")

    // Rough token estimate: ~4 chars per token
    const estimatedTokens = Math.ceil(context.length / 4)

    // Prune if over limit
    if (estimatedTokens > input.config.maxOutputTokens) {
      return this.pruneToLimit(context, input.config.maxOutputTokens)
    }

    return { context, estimatedTokens }
  }

  private pruneToLimit(
    context: string,
    maxTokens: number
  ): { context: string; estimatedTokens: number } {
    const maxChars = maxTokens * 4
    const pruned = context.slice(0, maxChars) + "\n// ... (truncated to fit token limit)"
    return {
      context: pruned,
      estimatedTokens: maxTokens,
    }
  }
}
