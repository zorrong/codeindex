/**
 * Retrieval types — định nghĩa input/output của retrieval engine.
 */

import type { SymbolNode, FileNode } from "./TreeNode.js"

export interface RetrievalQuery {
  /** Natural language query từ user/AI */
  query: string

  /**
   * Số lượng symbols tối đa trả về.
   * Default: 10
   */
  maxSymbols?: number

  /**
   * Có expand 1-hop dependencies không.
   * Khi true, các symbol mà result symbols depend on cũng được include (signature only).
   * Default: true
   */
  expandDeps?: boolean

  /**
   * Giới hạn token tối đa cho context output.
   * Retriever sẽ prune bớt nếu vượt quá.
   * Default: 4000
   */
  maxOutputTokens?: number
}

export interface RetrievedSymbol {
  node: SymbolNode
  /** Score từ 0-1, cao hơn = relevant hơn */
  relevanceScore: number
  /** Lý do LLM chọn symbol này */
  reasoning: string
  /** Là direct result hay 1-hop dependency */
  role: "direct" | "dependency"
}

export interface RetrievedFile {
  node: FileNode
  /** Symbols được chọn từ file này */
  symbols: RetrievedSymbol[]
}

export interface RetrievalResult {
  query: string
  /** Files được chọn, sorted by relevance */
  files: RetrievedFile[]
  /**
   * Context string đã được format, sẵn sàng inject vào LLM prompt.
   * Format:
   *   === src/auth/auth.service.ts ===
   *   // AuthService — Handles JWT auth, login, token validation
   *   async login(dto: LoginDto): Promise<TokenPair> { ... }
   *   ...
   */
  formattedContext: string
  /** Estimated token count của formattedContext */
  estimatedTokens: number
  /** Traversal path LLM đã đi qua — useful để debug */
  traversalPath: string[]
}

/**
 * Config cho retrieval behavior.
 */
export interface RetrievalConfig {
  maxSymbols: number
  expandDeps: boolean
  maxOutputTokens: number
  /** Include full source hay chỉ signature cho dependency symbols */
  depSymbolsIncludeBody: boolean
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  maxSymbols: 10,
  expandDeps: true,
  maxOutputTokens: 4000,
  depSymbolsIncludeBody: false,
}
