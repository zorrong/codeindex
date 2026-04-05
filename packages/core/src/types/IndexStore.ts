/**
 * IndexStore — interface cho storage layer của index.
 * Default implementation dùng filesystem (JSON files),
 * nhưng có thể swap sang SQLite hoặc remote store nếu cần.
 */

import type { IndexTree, FileNode } from "./TreeNode.js"

export interface IndexStoreMeta {
  /** Version của index format */
  version: string
  /** Project root path */
  projectRoot: string
  /** Map từ relative file path → git hash lúc index */
  gitHashMap: Record<string, string>
  /** Timestamp build lần cuối */
  builtAt: number
  /** Tổng số files đã index */
  totalFiles: number
  /** Tổng số symbols đã index */
  totalSymbols: number
}

export interface StaleFile {
  filePath: string
  reason: "modified" | "deleted" | "new"
  currentHash?: string
  indexedHash?: string
}

export interface IndexStore {
  /**
   * Load toàn bộ index tree vào memory.
   * Trả về null nếu index chưa tồn tại.
   */
  loadTree(): Promise<IndexTree | null>

  /**
   * Save toàn bộ index tree xuống storage.
   * Atomic write — không để index ở trạng thái partially written.
   */
  saveTree(tree: IndexTree): Promise<void>

  /**
   * Load metadata của index (nhẹ hơn loadTree, dùng để check staleness).
   */
  loadMeta(): Promise<IndexStoreMeta | null>

  /**
   * Save metadata.
   */
  saveMeta(meta: IndexStoreMeta): Promise<void>

  /**
   * Load cached data của một file cụ thể.
   * Trả về null nếu file chưa được index.
   */
  loadFileNode(relativePath: string): Promise<FileNode | null>

  /**
   * Save node của một file (incremental update).
   */
  saveFileNode(node: FileNode): Promise<void>

  /**
   * Xóa cache của một file (khi file bị delete).
   */
  deleteFileNode(relativePath: string): Promise<void>

  /**
   * Check xem index có tồn tại không.
   */
  exists(): Promise<boolean>

  /**
   * Detect những files nào bị stale so với git.
   * So sánh git hash hiện tại với hash lúc index.
   */
  detectStaleFiles(projectRoot: string): Promise<StaleFile[]>
}
