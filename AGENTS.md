# AI Agents Guide for codeindex

This project uses `codeindex` for efficient, reasoning-based codebase exploration. As an AI Agent, you should use the following tools and patterns to understand the code and provide accurate answers.

## 1. Context Retrieval Strategy

Instead of reading full files manually, use `codeindex query` to get a structured, dependency-aware context.

```bash
# General query for logic exploration
codeindex query "How does X work?"

# Specific symbol search
codeindex query "AuthService class methods"

# Technical exploration with verbose reasoning path (to see how it traversal)
codeindex query "data flow from controller to db" -v
```

## 2. Integration via Local Server (Preferred)

If a local server is running (default port `3131`), you can fetch context using `curl`. This is much faster than running the full CLI if the index is already loaded.

**Check server health:**
`curl -s http://localhost:3131/health`

**Execute query:**
```bash
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_QUESTION", "maxTokens": 4000}' \
  | jq -r '.context'
```

## 3. Maintaining the Index

The index is updated incrementally. If you modify any files, trigger an update to keep your context fresh:

```bash
# Using CLI
codeindex update

# Using HTTP API
curl -s -X POST http://localhost:3131/update
```

## 4. Troubleshooting for Agents

- **No index found?** Run `codeindex index .` to build it.
- **Outdated context?** Run `codeindex update`.
- **API Key issues?** Check `codeindex setup` or environment variables (`OPENAI_API_KEY`, etc).

## 5. Summary of Symbols

You can always get a high-level status of the index by running:
`codeindex status`

This will show you how many symbols and files are currently tracked.
