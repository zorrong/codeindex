/**
 * FileWatcher — real-time file change detection using fs.watch.
 * Replaces full directory scanning with instant file change notifications.
 */

import * as fs from "fs"
import * as path from "path"
import { EventEmitter } from "events"

export interface FileChange {
  type: "add" | "change" | "unlink"
  filePath: string
  timestamp: number
}

export interface FileWatcherEvents {
  change: (change: FileChange) => void
  batch: (changes: FileChange[]) => void
  error: (error: Error) => void
}

export class FileWatcher extends EventEmitter {
  private watcher: fs.FSWatcher | null = null
  private readonly projectRoot: string
  private readonly extensions: Set<string>
  private readonly ignoredDirs: Set<string>
  private pendingChanges: Map<string, FileChange> = new Map()
  private debounceTimer: NodeJS.Timeout | null = null
  private readonly debounceMs: number

  constructor(
    projectRoot: string,
    extensions: string[],
    options: {
      ignoredDirs?: string[]
      debounceMs?: number
    } = {}
  ) {
    super()
    this.projectRoot = projectRoot
    this.extensions = new Set(extensions.map((e) => e.toLowerCase()))
    this.ignoredDirs = new Set([
      "node_modules",
      "dist",
      "build",
      ".git",
      ".index",
      "coverage",
      ".next",
      ".nuxt",
      ...(options.ignoredDirs ?? []),
    ])
    this.debounceMs = options.debounceMs ?? 500
  }

  start(): void {
    if (this.watcher) return

    this.watcher = fs.watch(this.projectRoot, { recursive: true }, (eventType, filename) => {
      if (!filename) return
      this.handleWatchEvent(eventType, filename)
    })

    this.watcher.on("error", (error) => {
      this.emit("error", error)
    })
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.pendingChanges.clear()
  }

  private handleWatchEvent(eventType: string, filename: string): void {
    const fullPath = path.join(this.projectRoot, filename)

    if (!this.shouldTrack(fullPath)) return

    const changeType = this.getChangeType(eventType, fullPath)
    if (!changeType) return

    const change: FileChange = {
      type: changeType,
      filePath: fullPath,
      timestamp: Date.now(),
    }

    this.pendingChanges.set(fullPath, change)

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.flushPendingChanges()
    }, this.debounceMs)
  }

  private shouldTrack(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    if (!this.extensions.has(ext)) return false

    const relativePath = path.relative(this.projectRoot, filePath)
    const parts = relativePath.split(path.sep)

    for (const part of parts) {
      if (this.ignoredDirs.has(part)) return false
    }

    return true
  }

  private getChangeType(eventType: string, filePath: string): FileChange["type"] | null {
    try {
      fs.accessSync(filePath, fs.constants.R_OK)
    } catch {
      return "unlink"
    }

    if (eventType === "rename" || eventType === "change") {
      return "change"
    }

    return null
  }

  private flushPendingChanges(): void {
    if (this.pendingChanges.size === 0) return

    const changes = Array.from(this.pendingChanges.values())
    this.pendingChanges.clear()

    const grouped = this.groupByFile(changes)

    for (const change of grouped) {
      this.emit("change", change)
    }

    this.emit("batch", changes)
  }

  private groupByFile(changes: FileChange[]): FileChange[] {
    const latestByFile = new Map<string, FileChange>()

    for (const change of changes) {
      const existing = latestByFile.get(change.filePath)
      if (!existing || change.timestamp > existing.timestamp) {
        latestByFile.set(change.filePath, change)
      }
    }

    return Array.from(latestByFile.values())
  }

  isWatching(): boolean {
    return this.watcher !== null
  }
}

export class FileWatcherManager {
  private watchers: Map<string, FileWatcher> = new Map()

  createWatcher(
    projectRoot: string,
    extensions: string[],
    options?: {
      ignoredDirs?: string[]
      debounceMs?: number
      onChanges?: (changes: FileChange[]) => void
    }
  ): FileWatcher {
    const existing = this.watchers.get(projectRoot)
    if (existing) return existing

    const watcher = new FileWatcher(projectRoot, extensions, {
      ...(options?.ignoredDirs !== undefined && { ignoredDirs: options.ignoredDirs }),
      ...(options?.debounceMs !== undefined && { debounceMs: options.debounceMs }),
    })

    if (options?.onChanges) {
      watcher.on("batch", options.onChanges)
    }

    watcher.start()
    this.watchers.set(projectRoot, watcher)

    return watcher
  }

  getWatcher(projectRoot: string): FileWatcher | undefined {
    return this.watchers.get(projectRoot)
  }

  removeWatcher(projectRoot: string): void {
    const watcher = this.watchers.get(projectRoot)
    if (watcher) {
      watcher.stop()
      this.watchers.delete(projectRoot)
    }
  }

  removeAll(): void {
    for (const [projectRoot] of this.watchers) {
      this.removeWatcher(projectRoot)
    }
  }
}
