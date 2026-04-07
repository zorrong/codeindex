/**
 * TraversalCache — LRU cache for query traversal results.
 * Caches LLM traversal decisions to avoid repeated calls for similar queries.
 */

import type { TraversalResult } from "../tree/TreeTraversal.js"

interface CacheEntry {
  result: TraversalResult
  queryHash: string
  timestamp: number
  hitCount: number
}

export class TraversalCache {
  private readonly cache: Map<string, CacheEntry> = new Map()
  private readonly maxEntries: number
  private readonly ttlMs: number

  constructor(options: {
    maxEntries?: number
    ttlMs?: number
  } = {}) {
    this.maxEntries = options.maxEntries ?? 1000
    this.ttlMs = options.ttlMs ?? 60 * 60 * 1000
  }

  get(query: string): TraversalResult | null {
    const key = this.hashQuery(query)
    const entry = this.cache.get(key)

    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return null
    }

    entry.hitCount++
    return entry.result
  }

  set(query: string, result: TraversalResult): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU()
    }

    const key = this.hashQuery(query)
    this.cache.set(key, {
      result,
      queryHash: key,
      timestamp: Date.now(),
      hitCount: 0,
    })
  }

  findSimilar(query: string, similarityThreshold = 0.8): TraversalResult | null {
    const queryWords = this.tokenize(query)
    const querySet = new Set(queryWords)

    let bestMatch: CacheEntry | null = null
    let bestScore = 0

    for (const entry of this.cache.values()) {
      if (Date.now() - entry.timestamp > this.ttlMs) continue

      const entryWords = this.tokenize(entry.queryHash)
      const entrySet = new Set(entryWords)

      const intersection = [...querySet].filter((w) => entrySet.has(w)).length
      const union = new Set([...querySet, ...entrySet]).size
      const score = intersection / union

      if (score >= similarityThreshold && score > bestScore) {
        bestScore = score
        bestMatch = entry
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++
      return bestMatch.result
    }

    return null
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  stats(): {
    size: number
    maxEntries: number
    hitRate: number
    oldestEntry: number | null
  } {
    let totalHits = 0
    let oldest: number | null = null

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount
      if (oldest === null || entry.timestamp < oldest) {
        oldest = entry.timestamp
      }
    }

    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hitRate: totalHits / Math.max(1, this.cache.size),
      oldestEntry: oldest,
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    let lowestHits = Infinity
    let lruKey: string | null = null

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
      if (entry.hitCount < lowestHits) {
        lowestHits = entry.hitCount
        lruKey = key
      }
    }

    const keyToDelete = lruKey ?? oldestKey
    if (keyToDelete) {
      this.cache.delete(keyToDelete)
    }
  }

  private hashQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .sort()
      .join(" ")
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/\s+/).filter(Boolean)
  }
}

export class TraversalCacheManager {
  private caches: Map<string, TraversalCache> = new Map()

  getCache(projectRoot: string): TraversalCache {
    let cache = this.caches.get(projectRoot)
    if (!cache) {
      cache = new TraversalCache()
      this.caches.set(projectRoot, cache)
    }
    return cache
  }

  clearCache(projectRoot?: string): void {
    if (projectRoot) {
      this.caches.get(projectRoot)?.invalidate()
    } else {
      for (const cache of this.caches.values()) {
        cache.invalidate()
      }
    }
  }

  getStats(projectRoot: string): ReturnType<TraversalCache["stats"]> | null {
    return this.caches.get(projectRoot)?.stats() ?? null
  }
}
