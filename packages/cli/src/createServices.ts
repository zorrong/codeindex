/**
 * createServices — factory tạo LLMClient + IndexManager từ config.
 * Shared bởi tất cả CLI commands.
 */

import type { LLMClient } from "@codeindex/core"
import { IndexManager } from "@codeindex/core"
import { TypeScriptAdapter } from "@codeindex/adapter-typescript"
import { OpenAILLMClient, AnthropicLLMClient, GoogleLLMClient } from "./llm/LLMClients.js"
import { type CodeIndexConfig, resolveApiKey } from "./config.js"

export function createLLMClient(config: CodeIndexConfig): LLMClient {
  const apiKey = resolveApiKey(config)

  switch (config.provider) {
    case "anthropic":
      return new AnthropicLLMClient({ apiKey, model: config.model })

    case "google":
      return new GoogleLLMClient({ apiKey, model: config.model })

    case "ollama":
      return new OpenAILLMClient({
        apiKey: "ollama",
        model: config.model,
        baseURL: config.baseURL ?? "http://localhost:11434/v1",
      })

    case "custom":
    case "openai":
    default:
      return new OpenAILLMClient({
        apiKey,
        model: config.model,
        ...(config.baseURL !== undefined && { baseURL: config.baseURL }),
      })
  }
}


export function createIndexManager(
  projectRoot: string,
  config: CodeIndexConfig,
  llmClient: LLMClient
): IndexManager {
  return new IndexManager({
    projectRoot,
    llmClient,
    adapters: [new TypeScriptAdapter()],
    indexDir: config.indexDir,
    verbose: config.verbose,
    ...(config.projectName !== undefined && { projectName: config.projectName }),
  })
}
