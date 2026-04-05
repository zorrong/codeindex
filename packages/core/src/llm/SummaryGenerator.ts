/**
 * SummaryGenerator — dùng LLM để generate summaries cho tree nodes.
 * Chỉ feed signatures + JSDoc, KHÔNG feed full source để tiết kiệm token.
 */

import type { LLMClient } from "../types/LLMClient.js"
import type { ParsedFile, RawSymbol } from "../types/RawSymbol.js"

export interface FileSummaryResult {
  relativePath: string
  shortSummary: string
  detailedSummary: string
}

export interface ModuleSummaryResult {
  dirPath: string
  shortSummary: string
}

export class SummaryGenerator {
  constructor(private readonly llm: LLMClient) {}

  /**
   * Generate summary cho một file từ symbols của nó.
   * Feed chỉ signatures + docComments — không feed full source.
   */
  async generateFileSummary(file: ParsedFile): Promise<FileSummaryResult> {
    const signaturesText = this.buildSignaturesText(file.symbols)
    const exportsList = file.exports.join(", ")

    const prompt = `You are analyzing a TypeScript file to create a concise index entry.

File: ${file.relativePath}
Exports: ${exportsList || "none"}

Symbols (signatures only):
${signaturesText}

Respond with ONLY a JSON object in this exact format, no markdown:
{
  "short": "1-2 sentence summary of what this file does",
  "detailed": "3-5 sentence summary covering main responsibilities, key exports, and notable patterns"
}`

    const response = await this.llm.complete({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 300,
      temperature: 0.1,
      requestLabel: `summary:file:${file.relativePath}`,
    })

    const parsed = this.parseJsonResponse(response.content, {
      short: `${file.relativePath} — TypeScript module`,
      detailed: `Contains: ${exportsList}`,
    })

    return {
      relativePath: file.relativePath,
      shortSummary: parsed.short as string,
      detailedSummary: parsed.detailed as string,
    }
  }

  /**
   * Batch generate summaries cho nhiều files.
   * Gọi LLM song song với concurrency limit.
   */
  async generateFileSummaries(
    files: ParsedFile[],
    concurrency = 5
  ): Promise<Map<string, FileSummaryResult>> {
    const results = new Map<string, FileSummaryResult>()

    // Process theo batch để tránh rate limit
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            return await this.generateFileSummary(file)
          } catch {
            // Fallback nếu LLM call fail
            return {
              relativePath: file.relativePath,
              shortSummary: `${file.relativePath} — TypeScript module`,
              detailedSummary: `Exports: ${file.exports.join(", ")}`,
            }
          }
        })
      )
      for (const result of batchResults) {
        results.set(result.relativePath, result)
      }
    }

    return results
  }

  /**
   * Generate summary cho một module (directory) từ file summaries của nó.
   */
  async generateModuleSummary(
    dirPath: string,
    fileSummaries: FileSummaryResult[]
  ): Promise<ModuleSummaryResult> {
    if (fileSummaries.length === 0) {
      return { dirPath, shortSummary: `Module at ${dirPath}` }
    }

    const fileList = fileSummaries
      .map((f) => `- ${f.relativePath}: ${f.shortSummary}`)
      .join("\n")

    const prompt = `Summarize this TypeScript module (directory) in 1-2 sentences based on its files.

Module: ${dirPath}
Files:
${fileList}

Respond with ONLY a JSON object, no markdown:
{"short": "1-2 sentence summary of what this module does"}`

    const response = await this.llm.complete({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 150,
      temperature: 0.1,
      requestLabel: `summary:module:${dirPath}`,
    })

    const parsed = this.parseJsonResponse(response.content, {
      short: `Module: ${dirPath}`,
    })

    return {
      dirPath,
      shortSummary: parsed.short as string,
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildSignaturesText(symbols: RawSymbol[]): string {
    return symbols
      .map((s) => {
        let line = s.signature
        if (s.docComment) line += `  // ${s.docComment.split("\n")[0]}`
        return line
      })
      .join("\n")
  }

  private parseJsonResponse(
    content: string,
    fallback: Record<string, unknown>
  ): Record<string, unknown> {
    try {
      const cleaned = content.replace(/```json|```/g, "").trim()
      return JSON.parse(cleaned) as Record<string, unknown>
    } catch {
      return fallback
    }
  }
}
