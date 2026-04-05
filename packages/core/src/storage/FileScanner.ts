/**
 * FileScanner — scan project files và detect những file nào cần index/re-index.
 */

import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"

export interface ScanResult {
  /** Tất cả .ts/.tsx files trong project (absolute paths) */
  allFiles: string[]
  /** Files đã thay đổi kể từ lần index cuối (absolute paths) */
  changedFiles: string[]
  /** Files mới chưa được index */
  newFiles: string[]
  /** Files đã bị xóa */
  deletedFiles: string[]
}

export interface FileScannerOptions {
  projectRoot: string
  /** File extensions cần scan */
  extensions: string[]
  /** Directories cần bỏ qua */
  ignoreDirs?: string[]
}

const DEFAULT_IGNORE = [
  "node_modules",
  "dist",
  "build",
  ".git",
  ".index",
  "coverage",
  ".next",
  ".nuxt",
]

export class FileScanner {
  private readonly options: Required<FileScannerOptions>

  constructor(options: FileScannerOptions) {
    this.options = {
      ...options,
      ignoreDirs: [...DEFAULT_IGNORE, ...(options.ignoreDirs ?? [])],
    }
  }

  /**
   * Scan toàn bộ project, so sánh với gitHashMap để tìm changed files.
   */
  scan(indexedHashMap: Record<string, string>): ScanResult {
    const allFiles = this.walkDirectory(this.options.projectRoot)
    const allRelative = new Set(
      allFiles.map((f) => path.relative(this.options.projectRoot, f))
    )

    const changedFiles: string[] = []
    const newFiles: string[] = []
    const deletedFiles: string[] = []

    // Check indexed files
    for (const [relPath, indexedHash] of Object.entries(indexedHashMap)) {
      if (!allRelative.has(relPath)) {
        // File đã bị xóa
        deletedFiles.push(relPath)
        continue
      }

      const absPath = path.join(this.options.projectRoot, relPath)
      const currentHash = this.getFileHash(absPath)
      if (currentHash !== indexedHash) {
        changedFiles.push(absPath)
      }
    }

    // Check new files
    for (const absPath of allFiles) {
      const relPath = path.relative(this.options.projectRoot, absPath)
      if (!(relPath in indexedHashMap)) {
        newFiles.push(absPath)
      }
    }

    return { allFiles, changedFiles, newFiles, deletedFiles }
  }

  /**
   * Detect files thay đổi từ git diff (nhanh hơn scan toàn bộ).
   * Dùng trong post-commit hook.
   */
  detectGitChanges(since = "HEAD~1"): string[] {
    try {
      const output = execSync(`git diff --name-only ${since} HEAD`, {
        cwd: this.options.projectRoot,
        encoding: "utf-8",
      })

      return output
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f && this.isSupported(f))
        .map((f) => path.join(this.options.projectRoot, f))
        .filter((f) => fs.existsSync(f))
    } catch {
      // Fallback to full scan if git not available
      return []
    }
  }

  /**
   * Get current hash của một file (git hash hoặc mtime fallback).
   */
  getFileHash(absPath: string): string {
    try {
      const relPath = path.relative(this.options.projectRoot, absPath)
      return execSync(`git hash-object "${relPath}"`, {
        cwd: this.options.projectRoot,
        encoding: "utf-8",
      }).trim()
    } catch {
      try {
        const stat = fs.statSync(absPath)
        return `mtime:${stat.mtimeMs}`
      } catch {
        return "unknown"
      }
    }
  }

  /**
   * Build gitHashMap từ tất cả files hiện tại.
   */
  buildHashMap(files: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    for (const absPath of files) {
      const relPath = path.relative(this.options.projectRoot, absPath)
      map[relPath] = this.getFileHash(absPath)
    }
    return map
  }

  private walkDirectory(dir: string): string[] {
    const results: string[] = []

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return results
    }

    for (const entry of entries) {
      if (this.options.ignoreDirs.includes(entry.name)) continue

      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        results.push(...this.walkDirectory(fullPath))
      } else if (entry.isFile() && this.isSupported(entry.name)) {
        results.push(fullPath)
      }
    }

    return results
  }

  private isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return this.options.extensions.includes(ext)
  }
}
