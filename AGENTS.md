# AI Agents Guide for codeindex

This project uses `codeindex` for efficient, reasoning-based codebase exploration. **Always use `codeindex` first** before reading files manually or making assumptions about the codebase.

## 🚨 Critical Rule: ALWAYS Use codeindex First

**Before answering any question about the codebase, you MUST query the index first.**

For detailed codeindex commands and rules, see: **CODERULES.md**

```bash
# Quick query
codeindex query "your question"

# Or use HTTP API (faster if server running)
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_QUESTION", "maxTokens": 4000}' \
  | jq -r '.context'
```

## ❌ DON'T vs ✅ DO

| DON'T | DO |
|-------|-----|
| Read files manually to understand code | Use `codeindex query` |
| Make assumptions about function signatures | Query to get accurate context |
| Use grep/find for code patterns | Use HTTP API or CLI query |

## Workflow for Every Task

1. **Query first:** `codeindex query "<your question>"`
2. **Get context:** Review the returned code fragments and dependency info
3. **If needed:** Only then read specific files for more details
4. **Update index:** After making changes, run `codeindex update`

## Maintaining the Index

```bash
# Update after file changes
codeindex update

# Or via HTTP
curl -s -X POST http://localhost:3131/update

# Check status
codeindex status
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No index found | Run `codeindex index .` |
| Outdated context | Run `codeindex update` |
| API Key issues | Check `codeindex setup` |

## For Complete Reference

See **CODERULES.md** for:
- Full list of query patterns
- Detailed command options
- Troubleshooting guide
