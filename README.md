# codeindex

**Vectorless, reasoning-based code index for AI context retrieval.**

Instead of dumping your entire codebase into a prompt (50k+ tokens), `codeindex` builds a hierarchical tree index and uses LLM reasoning to find the exact context you need — reducing token usage from **50,000+ tokens to ~1,000-3,000 tokens** per query.

Inspired by [PageIndex](https://github.com/VectifyAI/PageIndex), adapted for TypeScript codebases.

---

## Quick Installation

```bash
# Clone the repo
git clone <this-repo>
cd codeindex

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Link CLI globally
cd packages/cli
npm link

# Global Configuration (DO THIS ONCE)
codeindex setup
```

---

## Getting Started in Your Project

### Step 1 — Global Setup

Instead of defining your API key for every project, run this command once after installation:

```bash
codeindex setup
```

You will be prompted for:
1.  **LLM Provider**: `openai`, `anthropic`, `google`, `custom`, or `ollama`.
2.  **API Key**: Your provider's API key.
3.  **Model Name**: Default model (e.g., `gpt-4o`, `claude-3-5-sonnet`).
4.  **Base URL**: If using a proxy or OpenRouter (e.g., `https://openrouter.ai/api/v1`).

Configuration is saved at `~/.codeindex/config.json` and applies to **all** future projects.

### Step 2 — Initialize Project

In a new project directory, simply run:

```bash
cd /path/to/your-project
codeindex init
```

The `init` command automatically detects your global settings. Press **Enter** to confirm. This creates a `.codeindex.json` file:

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "indexDir": ".index"
}
```

> [!TIP]
> You can still override global settings by editing the local `.codeindex.json` or using environment variables.

**Priority Order:**
`Defaults < Global (~/.codeindex) < Project (.codeindex.json) < Environment Variables (ENV) < CLI Flags`

---

### Step 3 — Build the Initial Index

```bash
codeindex index .
```

### Step 4 — Query

```bash
codeindex query "How does authentication work?"
```

Output is formatted and ready to paste into LLMs like Claude or ChatGPT.

---

## Commands

```bash
codeindex setup                # Global configuration (API Key, Provider)
codeindex init [path]          # Initialize project-specific config
codeindex index [path]         # Build/rebuild project index
codeindex query "<text>"       # Query the index for context
codeindex update [path]        # Incremental update (e.g., after git commit)
codeindex status [path]        # Check index health and stats
codeindex serve [path]         # Start HTTP server for IDE integration
```

---

## Git Integration (Auto-update)

```bash
# Copy git hook to your project
cp packages/cli/src/hooks/post-commit.sh /your-project/.git/hooks/post-commit
chmod +x /your-project/.git/hooks/post-commit
```

Now, after every `git commit`, the index updates in seconds.

---

## IDE Integration (HTTP Server)

```bash
codeindex serve . --port 3131
```

Set your system prompt in Cursor, Claude Code, or other AI tools to:
*"Before answering code questions, call codeindex at http://localhost:3131"*

---

## Project Structure

```
codeindex/
├── packages/
│   ├── core/                    # Core engine
│   ├── adapter-typescript/      # TypeScript parser (ts-morph)
│   └── cli/                     # CLI & HTTP Server
└── .index/                      # Generated index (gitignored)
```

---

## Token Reduction Estimate

| Project size | Before (dump all) | After (codeindex) | Reduction |
|---|---|---|---|
| Small (50 files) | ~15,000 tokens | ~800 tokens | **94%** |
| Medium (200 files) | ~60,000 tokens | ~1,500 tokens | **97%** |
| Large (500+ files) | context overflow | ~2,500 tokens | ✅ Feasible |

---

Checkout `README-Vietnamese.md` for information in Vietnamese.

License: MIT
