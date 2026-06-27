/**
 * `codei serve` — start local HTTP server cho IDE integration.
 */

import type { Command } from "commander"
import * as path from "path"
import { type CodeiConfig, loadConfig, resolveApiKey } from "../config.js"
import { createLLMClient, createNoopLLMClient } from "../createServices.js"
import { HttpServer } from "../server/HttpServer.js"

export function registerServeCommand(program: Command): void {
  program
    .command("serve [path]")
    .description("Start local HTTP server cho IDE integration (default: port 3131)")
    .option("--port <n>", "Port number", "3131")
    .option("--host <s>", "Host to bind (default: 127.0.0.1)", "127.0.0.1")
    .option("--index-dir <dir>", "Index directory")
    .option("--summary-mode <mode>", "Summary mode: heuristic | llm | auto")
    .option("-v, --verbose", "Verbose output")
    .action(async (targetPath: string | undefined, options: Record<string, string | boolean>) => {
      const projectRoot = path.resolve(targetPath ?? ".")
      const port = parseInt(options["port"] as string ?? "3131")
      const host = (options["host"] as string) ?? "127.0.0.1"

      const overrides: Partial<CodeiConfig> = {}
      if (options["indexDir"]) overrides.indexDir = options["indexDir"] as string
      if (options["summaryMode"]) overrides.summaryMode = options["summaryMode"] as any
      if (options["verbose"]) overrides.verbose = options["verbose"] as boolean

      const config = loadConfig(projectRoot, overrides)


      const llmClient =
        (config.summaryMode ?? "auto") === "heuristic"
          ? createNoopLLMClient()
          : createLLMClient({ ...config, apiKey: resolveApiKey(config) })

      const server = new HttpServer({
        port,
        host,
        projectRoot,
        config,
        llmClient,
      })

      try {
        await server.start()
        if (host !== "127.0.0.1" && host !== "localhost" && !config.serverApiKey) {
          console.warn(`Warning: server is bound to "${host}" without CODEI_SERVER_API_KEY`)
        }
        console.log(`🚀 codei server running at http://${host}:${port}`)
        console.log(`   Project: ${projectRoot}`)
        console.log(`   Index  : ${config.indexDir}/`)
        if (config.serverApiKey) {
          console.log(`   Auth   : enabled (CODEI_SERVER_API_KEY)`)
        } else {
          console.log(`   Auth   : disabled`)
        }
        console.log("")
        console.log("Endpoints:")
        console.log(`   POST http://${host}:${port}/query   — query index`)
        console.log(`   GET  http://${host}:${port}/status  — index status`)
        console.log(`   POST http://${host}:${port}/update  — trigger update`)
        console.log(`   GET  http://${host}:${port}/health  — health check`)
        console.log("")
        console.log("Press Ctrl+C to stop")

        // Graceful shutdown
        process.on("SIGINT", async () => {
          console.log("\nStopping server...")
          await server.stop()
          process.exit(0)
        })
        process.on("SIGTERM", async () => {
          await server.stop()
          process.exit(0)
        })
      } catch (err) {
        console.error(`❌ Failed to start server: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
