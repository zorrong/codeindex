/**
 * createServices — factory tạo LLMClient + IndexManager từ config.
 * Shared bởi tất cả CLI commands.
 */

import type { LLMClient, LanguageAdapter } from "@codeindex/core"
import { IndexManager } from "@codeindex/core"
import { TypeScriptAdapter } from "@codeindex/adapter-typescript"
import { OpenAILLMClient, AnthropicLLMClient, GoogleLLMClient } from "./llm/LLMClients.js"
import { type CodeIndexConfig, resolveApiKey } from "./config.js"

// Tất cả adapters — mỗi adapter đăng ký extensions riêng
async function loadAllAdapters(): Promise<LanguageAdapter[]> {
  const adapters: LanguageAdapter[] = [
    new TypeScriptAdapter(), // .ts, .tsx
  ]

  // Dynamic import các adapters khác (safe fallback nếu chưa build)
  const optionalAdapters: Array<{ load: () => Promise<LanguageAdapter>; name: string }> = [
    { name: "python", load: async () => { const { PythonAdapter } = await import("@codeindex/adapter-python"); return new PythonAdapter() } },
    { name: "go", load: async () => { const { GoAdapter } = await import("@codeindex/adapter-go"); return new GoAdapter() } },
    { name: "java", load: async () => { const { JavaAdapter } = await import("@codeindex/adapter-java"); return new JavaAdapter() } },
    { name: "php", load: async () => { const { PhpAdapter } = await import("@codeindex/adapter-php"); return new PhpAdapter() } },
    { name: "rust", load: async () => { const { RustAdapter } = await import("@codeindex/adapter-rust"); return new RustAdapter() } },
    { name: "csharp", load: async () => { const { CSharpAdapter } = await import("@codeindex/adapter-csharp"); return new CSharpAdapter() } },
    { name: "cpp", load: async () => { const { CppAdapter } = await import("@codeindex/adapter-cpp"); return new CppAdapter() } },
    { name: "swift", load: async () => { const { SwiftAdapter } = await import("@codeindex/adapter-swift"); return new SwiftAdapter() } },
  ]

  for (const { name, load } of optionalAdapters) {
    try {
      adapters.push(await load())
    } catch {
      // Adapter chưa được cài hoặc chưa build — bỏ qua
    }
  }

  return adapters
}

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


export async function createIndexManager(
  projectRoot: string,
  config: CodeIndexConfig,
  llmClient: LLMClient
): Promise<IndexManager> {
  const adapters = await loadAllAdapters()
  
  return new IndexManager({
    projectRoot,
    llmClient,
    adapters,
    indexDir: config.indexDir,
    verbose: config.verbose,
    ...(config.projectName !== undefined && { projectName: config.projectName }),
  })
}
