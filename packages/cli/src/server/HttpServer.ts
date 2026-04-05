/**
 * HttpServer — local HTTP server để IDE extensions gọi vào.
 * Chạy tại http://localhost:3131
 *
 * Endpoints:
 *   POST /query         — query index, trả về context
 *   GET  /status        — index health check
 *   POST /update        — trigger incremental update
 *   GET  /health        — server health
 */

import * as http from "http"
import * as path from "path"
import { FileSystemIndexStore, Retriever } from "@codeindex/core"
import type { LLMClient } from "@codeindex/core"
import type { CodeIndexConfig } from "../config.js"
import { createIndexManager } from "../createServices.js"

export interface HttpServerOptions {
  port?: number
  projectRoot: string
  config: CodeIndexConfig
  llmClient: LLMClient
}

export class HttpServer {
  private readonly port: number
  private readonly projectRoot: string
  private readonly config: CodeIndexConfig
  private readonly llmClient: LLMClient
  private server: http.Server | null = null

  constructor(options: HttpServerOptions) {
    this.port = options.port ?? 3131
    this.projectRoot = options.projectRoot
    this.config = options.config
    this.llmClient = options.llmClient
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // CORS headers cho IDE extensions
        res.setHeader("Access-Control-Allow-Origin", "*")
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        res.setHeader("Access-Control-Allow-Headers", "Content-Type")

        if (req.method === "OPTIONS") {
          res.writeHead(204)
          res.end()
          return
        }

        try {
          await this.handleRequest(req, res)
        } catch (err) {
          this.sendJson(res, 500, {
            error: (err as Error).message,
          })
        }
      })

      this.server.on("error", reject)
      this.server.listen(this.port, "127.0.0.1", () => resolve())
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve()
      this.server.close((err) => (err ? reject(err) : resolve()))
    })
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${this.port}`)

    // GET /health
    if (req.method === "GET" && url.pathname === "/health") {
      this.sendJson(res, 200, { status: "ok", port: this.port })
      return
    }

    // GET /status
    if (req.method === "GET" && url.pathname === "/status") {
      const manager = createIndexManager(this.projectRoot, this.config, this.llmClient)
      const status = await manager.status()
      this.sendJson(res, 200, status)
      return
    }

    // POST /query
    if (req.method === "POST" && url.pathname === "/query") {
      const body = await this.readBody(req)
      const { query, maxTokens, expandDeps, maxSymbols } = JSON.parse(body) as {
        query: string
        maxTokens?: number
        expandDeps?: boolean
        maxSymbols?: number
      }

      if (!query || typeof query !== "string") {
        this.sendJson(res, 400, { error: "query field is required" })
        return
      }

      const store = new FileSystemIndexStore(this.projectRoot, this.config.indexDir)
      const tree = await store.loadTree()

      if (!tree) {
        this.sendJson(res, 404, {
          error: "No index found. Run: codeindex index <path>",
        })
        return
      }

      const retriever = new Retriever({
        llmClient: this.llmClient,
        config: {
          maxOutputTokens: maxTokens ?? 4000,
          expandDeps: expandDeps ?? true,
          maxSymbols: maxSymbols ?? 10,
          depSymbolsIncludeBody: false,
        },
      })

      const result = await retriever.retrieve(tree, { query })

      this.sendJson(res, 200, {
        query: result.query,
        context: result.formattedContext,
        estimatedTokens: result.estimatedTokens,
        traversalPath: result.traversalPath,
        files: result.files.map((f) => ({
          path: f.node.filePath,
          symbols: f.symbols.map((s) => s.node.title),
        })),
      })
      return
    }

    // POST /update
    if (req.method === "POST" && url.pathname === "/update") {
      const manager = createIndexManager(this.projectRoot, this.config, this.llmClient)
      const result = await manager.update()
      this.sendJson(res, 200, {
        upToDate: result.upToDate,
        filesUpdated: result.filesUpdated,
        filesNew: result.filesNew,
        filesDeleted: result.filesDeleted,
        durationMs: result.durationMs,
      })
      return
    }

    this.sendJson(res, 404, { error: `Unknown endpoint: ${req.method} ${url.pathname}` })
  }

  private sendJson(
    res: http.ServerResponse,
    status: number,
    data: unknown
  ): void {
    const body = JSON.stringify(data)
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    })
    res.end(body)
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on("data", (chunk: Buffer) => chunks.push(chunk))
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
      req.on("error", reject)
    })
  }
}
