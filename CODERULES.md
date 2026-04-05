# Codeindex Rules

This file contains mandatory rules for using `codeindex` to explore the codebase.

## 🚨 Mandatory Rule: ALWAYS Query codeindex First

**Before answering ANY question about the codebase, you MUST use codeindex.**

### Workflow

```
1. Question about code
   ↓
2. Run: codeindex query "<question>"
   ↓
3. Review context & dependencies
   ↓
4. Only read specific files if needed
   ↓
5. After changes: codeindex update
```

### Commands

```bash
# Query the index (CLI)
codeindex query "your question"

# Query via HTTP API (faster)
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_QUESTION", "maxTokens": 4000}' \
  | jq -r '.context'

# Update index after changes
codeindex update

# Check index status
codeindex status
```

### What to Query

- "How does [feature] work?"
- "[ClassName] implementation"
- "data flow from X to Y"
- "[functionName] parameters and return type"
- "dependency chain for [module]"

### Troubleshooting

| Problem | Fix |
|---------|-----|
| No index | `codeindex index .` |
| Outdated | `codeindex update` |
| API error | Check `~/.codeindex/config.json` |
