/**
 * TreeNode — unit cơ bản của index tree.
 * Tree có 3 levels: Project → Module → File → Symbol
 */

export type NodeLevel = "project" | "module" | "file" | "symbol"

export interface BaseNode {
  /** Unique ID của node, ví dụ: "mod:auth", "file:src/auth/auth.service.ts" */
  nodeId: string

  /** Display name */
  title: string

  /** Level trong tree */
  level: NodeLevel

  /**
   * Summary ngắn (~1-2 câu) — dùng trong traversal level 1 & 2.
   * Được generate bởi LLM từ signatures, không từ full source.
   */
  shortSummary: string

  /**
   * Summary chi tiết hơn (~5-10 câu) — dùng khi cần thêm context.
   * Optional vì symbol nodes thường không cần.
   */
  detailedSummary?: string | undefined

  /** Child node IDs */
  children: string[]

  /** Parent node ID, undefined nếu là root */
  parentId?: string | undefined
}

export interface ProjectNode extends BaseNode {
  level: "project"
  /** Absolute path của project root */
  rootPath: string
  /** Ngôn ngữ chính của project */
  primaryLanguage: string
}

export interface ModuleNode extends BaseNode {
  level: "module"
  /** Relative path của thư mục module */
  dirPath: string
}

export interface FileNode extends BaseNode {
  level: "file"
  /** Relative path của file */
  filePath: string
  /** Git hash của file lúc index — dùng để detect stale */
  gitHash: string
  /** Timestamp lúc index lần cuối */
  indexedAt: number
  /** Exported symbol names */
  exports: string[]
  /** Internal file dependencies (relative paths) */
  internalDeps: string[]
  /** External package dependencies */
  externalDeps: string[]
}

export interface SymbolNode extends BaseNode {
  level: "symbol"
  /** File chứa symbol này */
  filePath: string
  /** Signature của symbol (không có body) */
  signature: string
  /** Full source code */
  fullSource: string
  /** Line range */
  startLine: number
  endLine: number
  /** Symbol kind từ RawSymbol */
  kind: string
  /** Symbol này có được export ra ngoài không */
  isExported?: boolean | undefined
  /** Các symbol khác mà symbol này depend on (trong cùng project) */
  internalRefs: string[]
}

export type TreeNode = ProjectNode | ModuleNode | FileNode | SymbolNode

/** Flat map của toàn bộ tree, keyed by nodeId */
export type TreeIndex = Record<string, TreeNode>

/** Root của tree luôn là ProjectNode */
export interface IndexTree {
  root: ProjectNode
  nodes: TreeIndex
  /** Version của index format, dùng để migrate nếu schema thay đổi */
  version: string
  /** Timestamp build lần cuối */
  builtAt: number
}
