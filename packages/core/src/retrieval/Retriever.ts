/**
 * Retriever — main entry point của retrieval pipeline.
 * Flow: TreeTraversal → DependencyExpander → ContextBuilder
 */

import type { IndexTree } from "../types/TreeNode.js"
import type { RetrievalQuery, RetrievalResult, RetrievalConfig } from "../types/Retrieval.js"
import type { LLMClient } from "../types/LLMClient.js"
import { DEFAULT_RETRIEVAL_CONFIG } from "../types/Retrieval.js"
import { TreeTraversal } from "../tree/TreeTraversal.js"
import { DependencyExpander } from "./DependencyExpander.js"
import { ContextBuilder } from "./ContextBuilder.js"
import { TraversalCache } from "./TraversalCache.js"

export interface RetrieverOptions {
  llmClient: LLMClient
  config?: Partial<RetrievalConfig>
  cache?: TraversalCache
}

export class Retriever {
  private readonly config: RetrievalConfig
  private readonly llmClient: LLMClient
  private readonly contextBuilder: ContextBuilder
  private readonly depExpander: DependencyExpander
  private readonly cache: TraversalCache | undefined

  constructor(options: RetrieverOptions) {
    this.config = { ...DEFAULT_RETRIEVAL_CONFIG, ...options.config }
    this.llmClient = options.llmClient
    this.contextBuilder = new ContextBuilder()
    this.depExpander = new DependencyExpander()
    this.cache = options.cache
  }

  async retrieve(tree: IndexTree, query: RetrievalQuery): Promise<RetrievalResult> {
    const config: RetrievalConfig = {
      ...this.config,
      ...(query.maxSymbols !== undefined && { maxSymbols: query.maxSymbols }),
      ...(query.expandDeps !== undefined && { expandDeps: query.expandDeps }),
      ...(query.maxOutputTokens !== undefined && { maxOutputTokens: query.maxOutputTokens }),
    }

    const cached = this.cache?.get(query.query) ?? this.cache?.findSimilar(query.query)
    if (cached) {
      const selectedSymbolIds = new Set(cached.selectedSymbols.map((s) => s.nodeId))
      const deps = config.expandDeps
        ? this.depExpander.expand(tree, cached.selectedSymbols, selectedSymbolIds)
        : []

      const { context, estimatedTokens } = this.contextBuilder.build({
        selectedSymbols: cached.selectedSymbols,
        selectedFiles: cached.selectedFiles,
        deps,
        config,
      })

      return {
        query: query.query,
        files: cached.selectedFiles.map((fileNode) => ({
          node: fileNode,
          symbols: cached.selectedSymbols
            .filter((s) => s.filePath === fileNode.filePath)
            .map((s) => ({
              node: s,
              relevanceScore: 1.0,
              reasoning: "Cached traversal result",
              role: "direct" as const,
            })),
        })),
        formattedContext: context,
        estimatedTokens,
        traversalPath: cached.path,
      }
    }

    const traversal = new TreeTraversal({
      llmClient: this.llmClient,
      maxSymbols: config.maxSymbols,
    })

    const { selectedFiles, selectedSymbols, path } = await traversal.traverse(tree, query.query)

    this.cache?.set(query.query, { selectedFiles, selectedSymbols, path })

    // Step 2: Expand 1-hop dependencies
    const selectedSymbolIds = new Set(selectedSymbols.map((s) => s.nodeId))
    const deps = config.expandDeps
      ? this.depExpander.expand(tree, selectedSymbols, selectedSymbolIds)
      : []

    // Step 3: Build formatted context
    const { context, estimatedTokens } = this.contextBuilder.build({
      selectedSymbols,
      selectedFiles,
      deps,
      config,
    })

    return {
      query: query.query,
      files: selectedFiles.map((fileNode) => ({
        node: fileNode,
        symbols: selectedSymbols
          .filter((s) => s.filePath === fileNode.filePath)
          .map((s) => ({
            node: s,
            relevanceScore: 1.0,
            reasoning: "Selected by LLM traversal",
            role: "direct" as const,
          })),
      })),
      formattedContext: context,
      estimatedTokens,
      traversalPath: path,
    }
  }
}
