---
name: "codeindex"
description: "Retrieves relevant code context from a hierarchical index to reduce token usage and improve AI coding accuracy. Invoke when understanding codebase structure, following dependencies, or needing targeted code context for a task."
---

# Codeindex — Vectorless Reasoning-Based Code Index

## Overview

`codeindex` builds a hierarchical tree index of your codebase and uses LLM reasoning to retrieve only the relevant context you need — reducing token usage from **50,000+ tokens to ~1,000-3,000 tokens** per query.

## When to Invoke This Skill

**Invoke codeindex when:**
- User asks about how a feature/component works
- Need to understand code structure or dependencies
- Following import/dependency chains
- Preparing code modifications that touch multiple files
- Onboarding to a new codebase or unfamiliar module
- Debugging and need to trace where a function/class is defined
- Any task requiring deep understanding of the codebase

**Do NOT invoke for:**
- Simple file creation/edits with obvious locations
- Questions about external libraries documentation
- When explicit file paths are already provided

## Prerequisites

Before using this skill, ensure:
1. `codeindex` is installed: `npm install -g @codeindex/codeindex` or run from source
2. Project has been indexed: `codeindex index <project-path>`
3. LLM API key is configured: `codeindex setup`

## Core Workflow

### 1. Check Index Status

```bash
codeindex status <project-path>
```

If index is stale or missing, rebuild:
```bash
codeindex index <project-path>
```

### 2. Query for Context

```bash
codeindex query "<your question>" --cwd <project-path>
```

**Examples:**
```bash
# Understand authentication flow
codeindex query "How does JWT authentication work in this codebase?"

# Find relevant service for a feature
codeindex query "Where is user profile management implemented?"

# Understand dependencies
codeindex query "What does the order processing module depend on?"

# Debug tracing
codeindex query "Trace the request flow for API calls"
```

### 3. Get Detailed Context with Options

```bash
# Include dependency signatures in output
codeindex query "<question>" --cwd <path> --format text

# JSON output for programmatic use
codeindex query "<question>" --cwd <path> --format json

# Verbose mode shows traversal path
codeindex query "<question>" --cwd <path> --verbose

# Control output size
codeindex query "<question>" --cwd <path> --max-tokens 2000
codeindex query "<question>" --cwd <path> --max-symbols 5
```

## HTTP Server Mode (Recommended for Frequent Use)

Start the server once per project:
```bash
codeindex serve <project-path> --port 3131
```

Then query via HTTP:
```bash
# Using curl
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Your question", "maxTokens": 3000}' | jq -r '.context'

# Check server status
curl http://localhost:3131/health

# Trigger incremental update after changes
curl -X POST http://localhost:3131/update
```

## Output Format

### Text Format (Default)
```
=== src/auth/auth.service.ts ===
// AuthService — Handles JWT authentication with refresh tokens
class AuthService {
  async authenticate(credentials: Credentials): Promise<AuthResult> { ... }
  async refreshToken(token: string): Promise<RefreshResult> { ... }
}

// --- Dependencies (signatures only) ---
// src/user/user.service.ts
class UserService { ... }
```

### JSON Format
```json
{
  "query": "How does authentication work?",
  "estimatedTokens": 1450,
  "traversalPath": ["root-descend [mod:src]", "modules: [mod:auth]", "selected: [file:src/auth/auth.service.ts]", "symbols: [sym:src/auth/auth.service.ts:AuthService]"],
  "files": [
    {
      "path": "src/auth/auth.service.ts",
      "symbols": ["AuthService", "TokenValidator"]
    }
  ],
  "context": "=== src/auth/auth.service.ts ===\n..."
}
```

## Integration with AI Agents

### Claude Code
Add to `~/.claude/tools/codeindex.sh`:
```bash
#!/bin/bash
QUERY="$1"
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"maxTokens\": 3000}" \
  | jq -r '.context'
```

### Cursor/Windsurf
Create `.cursorrules` or `.windsurfrules`:
```markdown
# Codeindex Context Retrieval
When you need to understand the codebase:
1. Run: curl -s -X POST http://localhost:3131/query -d '{"query": "YOUR_QUERY"}' | jq -r '.context'
2. Use the output for context before implementing
```

### Cline (VSCode)
In custom instructions or Plan Mode:
```
Use codeindex query "<your question>" to get relevant code context.
Start server with: codeindex serve . --port 3131
```

## Architecture Notes

**Why vectorless reasoning?**
- Deterministic: Same query always returns same result
- Token-efficient: Only summaries are sent to LLM during traversal, not full code
- Accurate: LLM reasoning chooses relevant paths rather than keyword matching
- Private: No vector embeddings stored externally

**Tree Structure:**
```
Project
├── Module (directory)
│   ├── File
│   │   └── Symbol (function/class/interface)
```

**Retrieval Pipeline:**
1. `TreeTraversal` — LLM selects relevant modules → files → symbols using summaries
2. `DependencyExpander` — Adds 1-hop dependency signatures
3. `ContextBuilder` — Formats final output with full source for selected symbols

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No index found" | Run `codeindex index <path>` first |
| "API key not found" | Run `codeindex setup` or set `OPENAI_API_KEY` env var |
| Stale results | Run `codeindex update <path>` after file changes |
| High token usage | Reduce `--max-tokens` or `--max-symbols` |
| Slow queries | Use local LLM (Ollama) via `codeindex setup` with `--provider ollama` |
