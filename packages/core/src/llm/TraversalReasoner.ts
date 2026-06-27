/**
 * TraversalReasoner — dùng LLM để chọn relevant nodes khi traverse tree.
 * Mỗi level chỉ feed summaries (không feed full source) → rất ít token.
 */

import type { LLMClient } from "../types/LLMClient.js"

export interface NodeCandidate {
  nodeId: string
  title: string
  summary: string
}

export interface TraversalDecision {
  selectedIds: string[]
  reasoning: string
}

export class TraversalReasoner {
  constructor(private readonly llm: LLMClient) {}

  /**
   * Cho LLM chọn relevant nodes từ danh sách candidates.
   * Feed: query + node summaries (compact, ~50 tokens/node)
   * Output: danh sách nodeIds được chọn
   */
  async selectNodes(
    query: string,
    candidates: NodeCandidate[],
    level: "module" | "file" | "symbol",
    maxSelect = 5
  ): Promise<TraversalDecision> {
    if (candidates.length === 0) {
      return { selectedIds: [], reasoning: "No candidates available" }
    }

    // Nếu chỉ có 1 candidate thì chọn luôn, không cần LLM
    if (candidates.length === 1 && candidates[0]) {
      return {
        selectedIds: [candidates[0].nodeId],
        reasoning: "Only one candidate available",
      }
    }

    const heuristic = this.selectByHeuristic(query, candidates, maxSelect)
    if (heuristic) return { selectedIds: heuristic, reasoning: "Heuristic selection" }

    const heuristicFallback = this.selectFallback(query, candidates, maxSelect)

    const candidateList = candidates
      .map((c) => `[${c.nodeId}] ${c.title}: ${c.summary}`)
      .join("\n")

    const prompt = `You are an expert developer navigating a codebase index (Project -> Module -> File -> Symbol).
Your goal is to select the most relevant nodes for the given query to provide context for answering.

Query: "${query}"

Guidelines:
1. The query might be in a language other than English (e.g., Vietnamese). Translate or interpret the technical intent accurately.
2. Favor files or symbols that contain implementation logic (e.g., "engines", "services", "logic", "calculations") if the query asks for "how" something works, "logic", or "implementation".
3. Consider synonyms and related technical concepts (e.g., "tính toán" -> "calculation/compute", "đảo chiều" -> "reversal").

Available ${level}s:
${candidateList}

Select up to ${maxSelect} most relevant ${level}s.
Respond with ONLY a JSON object, no markdown:
{
  "selected": ["nodeId1", "nodeId2"],
  "reasoning": "brief explanation in English of why these were selected"
}`


    try {
      const response = await this.llm.complete({
        messages: [{ role: "user", content: prompt }],
        maxTokens: 200,
        temperature: 0.0,
        requestLabel: `traverse:${level}`,
      })

      return this.parseDecision(response.content, candidates)
    } catch {
      return {
        selectedIds: heuristicFallback,
        reasoning: "LLM failed, using heuristic fallback",
      }
    }
  }

  private parseDecision(
    content: string,
    candidates: NodeCandidate[]
  ): TraversalDecision {
    try {
      const cleaned = content.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(cleaned) as {
        selected?: string[]
        reasoning?: string
      }

      const validIds = new Set(candidates.map((c) => c.nodeId))
      const selectedIds = (parsed.selected ?? []).filter((id) =>
        validIds.has(id)
      )

      return {
        selectedIds,
        reasoning: parsed.reasoning ?? "",
      }
    } catch {
      // Fallback: chọn candidate đầu tiên
      return {
        selectedIds: candidates[0] ? [candidates[0].nodeId] : [],
        reasoning: "Failed to parse LLM response, using first candidate",
      }
    }
  }

  private selectByHeuristic(query: string, candidates: NodeCandidate[], maxSelect: number): string[] | null {
    const scored = this.scoreCandidates(query, candidates)

    const best = scored[0]
    const second = scored[1]
    if (!best || best.score <= 0) return null

    const gap = best.score - (second?.score ?? 0)
    if (best.score < 2 && gap < 1) return null

    const threshold = Math.max(1, best.score * 0.55)
    const selected = scored
      .filter((s) => s.score >= threshold && s.score > 0)
      .slice(0, maxSelect)
      .map((s) => s.id)

    return selected.length > 0 ? selected : null
  }

  private normalize(text: string): string {
    return text
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/[\/:_\.-]+/g, " ")
      .toLowerCase()
      .replace(/[^\w\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(Boolean)
  }

  private selectFallback(query: string, candidates: NodeCandidate[], maxSelect: number): string[] {
    const scored = this.scoreCandidates(query, candidates).filter((s) => s.score > 0)
    if (scored.length === 0) {
      const q = this.normalize(query)
      const qTokens = this.tokenize(q).filter((t) => t.length >= 2)
      if (qTokens.length === 0) {
        return candidates.slice(0, maxSelect).map((c) => c.nodeId)
      }
      return []
    }

    const top = scored.slice(0, maxSelect).map((s) => s.id)
    return top.length > 0 ? top : candidates.slice(0, maxSelect).map((c) => c.nodeId)
  }

  private scoreCandidates(query: string, candidates: NodeCandidate[]): Array<{ id: string; score: number }> {
    const normalizedQuery = this.normalize(query)
    const queryTokens = [...new Set(this.tokenize(normalizedQuery).filter((t) => t.length >= 2))]
    const rawQueryTerms = this.extractRawTerms(query)

    return candidates
      .map((c) => {
        const title = this.normalize(c.title)
        const summary = this.normalize(c.summary)
        const nodeId = this.normalize(c.nodeId)
        const titleTokens = new Set(this.tokenize(title))
        const summaryTokens = new Set(this.tokenize(summary))
        const nodeTokens = new Set(this.tokenize(nodeId))
        const compactTitle = this.compact(c.title)
        const compactSummary = this.compact(c.summary)
        const compactNodeId = this.compact(c.nodeId)

        let score = 0
        let matchedTokens = 0

        for (const token of queryTokens) {
          let matched = false
          if (titleTokens.has(token)) {
            score += 4
            matched = true
          } else if (nodeTokens.has(token)) {
            score += 3
            matched = true
          } else if (summaryTokens.has(token)) {
            score += 2
            matched = true
          } else if (title.includes(token)) {
            score += 2.5
            matched = true
          } else if (nodeId.includes(token)) {
            score += 2
            matched = true
          } else if (summary.includes(token)) {
            score += 1.5
            matched = true
          }

          if (matched) matchedTokens++
        }

        for (const rawTerm of rawQueryTerms) {
          const compactTerm = this.compact(rawTerm)
          if (compactTerm.length < 3) continue

          if (compactTitle.includes(compactTerm)) {
            score += 6
          } else if (compactNodeId.includes(compactTerm)) {
            score += 5
          } else if (compactSummary.includes(compactTerm)) {
            score += 3
          }
        }

        if (normalizedQuery.length >= 3) {
          if (title.includes(normalizedQuery)) score += 4
          else if (nodeId.includes(normalizedQuery)) score += 3
          else if (summary.includes(normalizedQuery)) score += 2
        }

        if (matchedTokens > 0) {
          score += (matchedTokens / Math.max(1, queryTokens.length)) * 3
        }

        return { id: c.nodeId, score }
      })
      .sort((a, b) => b.score - a.score)
  }

  private extractRawTerms(text: string): string[] {
    return text
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 3)
  }

  private compact(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "")
  }
}
