# Codei Rules

This file contains mandatory rules for using `codei` to explore the codebase.

## 🚨 Mandatory Rule: ALWAYS Query codei First

**Before answering ANY question about the codebase, you MUST use codei.**

### Workflow

```
1. Question about code
   ↓
2. Run: codei query "<question>"
   ↓
3. Review context & dependencies
   ↓
4. Only read specific files if needed
   ↓
5. After changes: codei update
```

### Commands

```bash
# Query the index (CLI)
codei query "your question"

# Query via HTTP API (faster)
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_QUESTION", "maxTokens": 4000}' \
  | jq -r '.context'

# Update index after changes
codei update

# Check index status
codei status
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
| No index | `codei index .` |
| Outdated | `codei update` |
| API error | Check `~/.codei/config.json` |
