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


    const response = await this.llm.complete({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 200,
      temperature: 0.0,
      requestLabel: `traverse:${level}`,
    })

    return this.parseDecision(response.content, candidates)
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
}
