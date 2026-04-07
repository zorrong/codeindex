# Project Rules: codeindex

## Agent Skill Integration

This project defines a universal `codeindex` skill at `.trae/skills/codeindex/SKILL.md`.

## Mandatory Workflow

**Before performing ANY of these tasks, the agent MUST load and use the codeindex skill:**

1. **Understanding codebase structure** — Any question about how code is organized
2. **Following dependencies** — Tracing imports, understanding coupling
3. **Implementing features** — Modifying code that spans multiple files
4. **Debugging** — Finding where bugs originate or how components interact
5. **Code review** — Understanding what code does before suggesting changes
6. **Refactoring** — Understanding impact of changes across the codebase

## Skill Loading

```
When working with codeindex codebase, invoke the "codeindex" skill.
```

## Quick Reference

```bash
# Check if index exists and is fresh
codeindex status .

# Build/rebuild index
codeindex index .

# Query for context (MUST do before reading files manually)
codeindex query "your question here" --cwd .

# Start HTTP server for frequent queries
codeindex serve . --port 3131

# Update index after making changes
codeindex update .
```

## HTTP API (Faster)

```bash
# Query
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "question", "maxTokens": 3000}' | jq -r '.context'

# Update
curl -X POST http://localhost:3131/update
```

## Error Handling

| Error | Action |
|-------|--------|
| "No index found" | Run `codeindex index .` first |
| Stale results after editing | Run `codeindex update .` |
| Query returns wrong context | Verify with `codeindex status .` then rebuild if needed |
