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

export interface RetrieverOptions {
  llmClient: LLMClient
  config?: Partial<RetrievalConfig>
}

export class Retriever {
  private readonly config: RetrievalConfig
  private readonly contextBuilder: ContextBuilder
  private readonly depExpander: DependencyExpander

  constructor(private readonly options: RetrieverOptions) {
    this.config = { ...DEFAULT_RETRIEVAL_CONFIG, ...options.config }
    this.contextBuilder = new ContextBuilder()
    this.depExpander = new DependencyExpander()
  }

  async retrieve(tree: IndexTree, query: RetrievalQuery): Promise<RetrievalResult> {
    const config: RetrievalConfig = {
      ...this.config,
      ...(query.maxSymbols !== undefined && { maxSymbols: query.maxSymbols }),
      ...(query.expandDeps !== undefined && { expandDeps: query.expandDeps }),
      ...(query.maxOutputTokens !== undefined && { maxOutputTokens: query.maxOutputTokens }),
    }

    // Step 1: Traverse tree to find relevant files + symbols
    const traversal = new TreeTraversal({
      llmClient: this.options.llmClient,
      maxSymbols: config.maxSymbols,
    })

    const { selectedFiles, selectedSymbols, path } = await traversal.traverse(
      tree,
      query.query
    )

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

    // Step 4: Assemble result
    const fileMap = new Map(selectedFiles.map((f) => [f.nodeId, f]))

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
