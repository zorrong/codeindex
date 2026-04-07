/**
 * ParallelSymbolExtractor — parallel file parsing.
 */

import type { ParsedFile } from "../types/RawSymbol.js"
import type { LanguageAdapter } from "../types/LanguageAdapter.js"

export interface ParallelParserOptions {
  adapters: LanguageAdapter[]
  projectRoot: string
  concurrency?: number
}

export class ParallelSymbolExtractor {
  private readonly adapters: LanguageAdapter[]
  private readonly projectRoot: string
  private readonly concurrency: number

  constructor(options: ParallelParserOptions) {
    this.adapters = options.adapters
    this.projectRoot = options.projectRoot
    this.concurrency = options.concurrency ?? 10
  }

  async parseFiles(filePaths: string[]): Promise<{ parsed: ParsedFile[]; errors: string[] }> {
    const tasks = this.createTasks(filePaths)
    const batches = this.createBatches(tasks)
    const results: ParsedFile[] = []
    const errors: string[] = []

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((task) => this.parseSingle(task))
      )

      for (const result of batchResults) {
        if (result.success) {
          results.push(result.success)
        } else if (result.error) {
          errors.push(result.filePath + ": " + result.error)
        }
      }
    }

    return { parsed: results, errors }
  }

  private createTasks(filePaths: string[]): Array<{ filePath: string; adapter: LanguageAdapter }> {
    const tasks: Array<{ filePath: string; adapter: LanguageAdapter }> = []
    for (const filePath of filePaths) {
      const adapter = this.adapters.find((a) => a.supports(filePath))
      if (adapter) {
        tasks.push({ filePath, adapter })
      }
    }
    return tasks
  }

  private createBatches(tasks: Array<{ filePath: string; adapter: LanguageAdapter }>): Array<Array<{ filePath: string; adapter: LanguageAdapter }>> {
    const batches: Array<Array<{ filePath: string; adapter: LanguageAdapter }>> = []
    for (let i = 0; i < tasks.length; i += this.concurrency) {
      batches.push(tasks.slice(i, i + this.concurrency))
    }
    return batches
  }

  private async parseSingle(task: { filePath: string; adapter: LanguageAdapter }): Promise<{ success: ParsedFile | null; filePath: string; error?: string }> {
    try {
      const parsed = await task.adapter.parseFile(task.filePath, this.projectRoot)
      return { success: parsed, filePath: task.filePath }
    } catch (error) {
      return { success: null, filePath: task.filePath, error: (error as Error).message }
    }
  }
}
