/**
 * `codeindex serve` — start local HTTP server cho IDE integration.
 */

import type { Command } from "commander"
import * as path from "path"
import { type CodeIndexConfig, loadConfig, resolveApiKey } from "../config.js"
import { createLLMClient } from "../createServices.js"
import { HttpServer } from "../server/HttpServer.js"

export function registerServeCommand(program: Command): void {
  program
    .command("serve [path]")
    .description("Start local HTTP server cho IDE integration (default: port 3131)")
    .option("--port <n>", "Port number", "3131")
    .option("--host <s>", "Host to bind (default: 127.0.0.1)", "127.0.0.1")
    .option("--index-dir <dir>", "Index directory")
    .option("-v, --verbose", "Verbose output")
    .action(async (targetPath: string | undefined, options: Record<string, string | boolean>) => {
      const projectRoot = path.resolve(targetPath ?? ".")
      const port = parseInt(options["port"] as string ?? "3131")
      const host = (options["host"] as string) ?? "127.0.0.1"

      const overrides: Partial<CodeIndexConfig> = {}
      if (options["indexDir"]) overrides.indexDir = options["indexDir"] as string
      if (options["verbose"]) overrides.verbose = options["verbose"] as boolean

      const config = loadConfig(projectRoot, overrides)


      let apiKey: string
      try {
        apiKey = resolveApiKey(config)
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }

      const llmClient = createLLMClient({ ...config, apiKey })

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
          console.warn(`Warning: server is bound to "${host}" without CODEINDEX_SERVER_API_KEY`)
        }
        console.log(`🚀 codeindex server running at http://${host}:${port}`)
        console.log(`   Project: ${projectRoot}`)
        console.log(`   Index  : ${config.indexDir}/`)
        if (config.serverApiKey) {
          console.log(`   Auth   : enabled (CODEINDEX_SERVER_API_KEY)`)
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
