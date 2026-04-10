# @codeindex/cli

**Vectorless, reasoning-based code index for AI context retrieval.**

> Cut your AI coding costs by 95%. `codeindex` gives AI exactly the context it needs — nothing more.

## Quick Start

```bash
# Install
npm install -g @codeindex/cli

# Setup (one-time)
codeindex setup

# Index your project
cd your-project
codeindex index .

# Query!
codeindex query "How does authentication work?"
```

## Commands

| Command | Description |
|---------|-------------|
| `codeindex setup` | Global configuration (API Key, Provider) |
| `codeindex init [path]` | Initialize project |
| `codeindex index [path]` | Build/rebuild index |
| `codeindex query "<text>"` | Query the index |
| `codeindex update [path]` | Incremental update |
| `codeindex status [path]` | Check index health |
| `codeindex serve [path]` | HTTP server for IDE integration |

## Features

- **Token Efficient** — ~2KB response instead of 50KB+
- **Vectorless** — Uses LLM reasoning, not embeddings
- **Multi-Language** — TypeScript, Python, Go, Rust, Java, C#, C++, PHP, Swift
- **IDE Integration** — HTTP API for VSCode, JetBrains, Neovim, Claude Code

## IDE Integration

### Claude Code
```bash
curl -s -X POST http://localhost:3131/query \
  -d '{"query": "$1", "maxTokens": 3000}' | jq -r '.context'
```

### Cursor / Windsurf
Add to `.cursorrules`:
```
When you need context, run:
  curl -s -X POST http://localhost:3131/query -d '{"query": "YOUR_QUESTION"}'
```

## License

MIT — See [main repo](https://github.com/zorrong/codeindex)
