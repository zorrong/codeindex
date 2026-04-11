# codeindex

**Vectorless, reasoning-based code index for AI context retrieval.**

Instead of dumping your entire codebase into a prompt (50k+ tokens), `codeindex` builds a hierarchical tree index and uses LLM reasoning to find the exact context you need — reducing token usage from **50,000+ tokens to ~1,000-3,000 tokens** per query.

---

## Features

- **Vectorless Retrieval** — Uses LLM reasoning to traverse a hierarchical tree index
- **Multi-Language Support** — TypeScript, Python, Go, Rust, Java, C#, C++, PHP, Swift
- **Token Efficient** — Only relevant context is retrieved, not the entire codebase
- **Incremental Updates** — Re-indexes only changed files
- **Git Integration** — Auto-update index after commits
- **HTTP Server** — IDE integration with REST API
- **Production Ready** — API key auth, rate limiting, structured logging

---

## Installation

```bash
# Clone the repo
git clone https://github.com/zorrong/codeindex.git
cd codeindex

# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Link CLI globally (for development)
cd packages/cli && pnpm link --global
```

---

## Quick Start

### 1. Global Setup (One-time)

```bash
codeindex setup
```

You will be prompted for:
- **LLM Provider**: `openai`, `anthropic`, `google`, `ollama`
- **API Key**: Your provider's API key
- **Model Name**: Default model (e.g., `gpt-4o`, `claude-sonnet-4-5`)

Configuration is saved at `~/.codeindex/config.json`.

### 2. Initialize Your Project

```bash
cd /path/to/your-project
codeindex init
```

### 3. Build the Index

```bash
codeindex index .
```

### 4. Query

```bash
codeindex query "How does authentication work?"
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `codeindex setup` | Global configuration (API Key, Provider) |
| `codeindex init [path]` | Initialize project-specific config |
| `codeindex index [path]` | Build/rebuild project index |
| `codeindex query "<text>"` | Query the index for context |
| `codeindex update [path]` | Incremental update |
| `codeindex status [path]` | Check index health and stats |
| `codeindex serve [path]` | Start HTTP server for IDE integration |

---

## HTTP Server Mode

Start the server for frequent queries:

```bash
codeindex serve . --port 3131
```

### Query via HTTP

```bash
curl -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How does authentication work?", "maxTokens": 3000}'
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/query` | Query the index |
| POST | `/update` | Trigger incremental update |
| GET | `/status` | Index health check |
| GET | `/health` | Server health check |

---

## Configuration

Configuration priority (highest to lowest):
`CLI Flags < Environment Variables < Project (.codeindex.json) < Global (~/.codeindex/config.json)`

### Example `.codeindex.json`

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "indexDir": ".index",
  "projectName": "my-project",
  "serverApiKey": "optional-api-key"
}
```

### Environment Variables

```bash
OPENAI_API_KEY=sk-...
CODEINDEX_PROVIDER=openai
CODEINDEX_MODEL=gpt-4o
```

---

## Supported Languages

| Language | Package | Extensions |
|----------|---------|------------|
| TypeScript | `@codeindex/adapter-typescript` | `.ts`, `.tsx` |
| Python | `@codeindex/adapter-python` | `.py` |
| Go | `@codeindex/adapter-go` | `.go` |
| Rust | `@codeindex/adapter-rust` | `.rs` |
| Java | `@codeindex/adapter-java` | `.java` |
| C# | `@codeindex/adapter-csharp` | `.cs` |
| C++ | `@codeindex/adapter-cpp` | `.cpp`, `.cc`, `.hpp`, `.h` |
| PHP | `@codeindex/adapter-php` | `.php` |
| Swift | `@codeindex/adapter-swift` | `.swift` |

---

## Git Integration

Auto-update index after commits:

```bash
# Copy git hook to your project
cp packages/cli/src/hooks/post-commit.sh /your-project/.git/hooks/post-commit
chmod +x /your-project/.git/hooks/post-commit
```

---

## Architecture

```
codeindex/
├── packages/
│   ├── core/              # Core engine — tree index, retrieval logic
│   ├── cli/               # CLI interface
│   └── adapter-*/         # Language-specific adapters
└── docs/                  # Documentation
```

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
