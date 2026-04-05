# Codeindex

**Vectorless, reasoning-based code index cho AI context retrieval.**

Thay vì dump toàn bộ codebase vào prompt (50k+ tokens), `codeindex` build một hierarchical tree index và dùng LLM reasoning để tìm đúng context — giảm từ **50,000+ token xuống còn ~1,000-3,000 token** per query.

Inspired by [PageIndex](https://github.com/VectifyAI/PageIndex), adapted cho codebase TypeScript.

---

## Cài đặt nhanh

```bash
# Clone repo
git clone <this-repo>
cd codeindex

# Install dependencies
pnpm install

# Build tất cả packages
pnpm build

# Link CLI globally
cd packages/cli
npm link
```

---

## Sử dụng trong project của bạn

### Bước 1 — Init config

```bash
cd /path/to/your-project
codeindex init
```

Tạo `.codeindex.json`:
```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "indexDir": ".index"
}
```

**Providers được hỗ trợ:**
| Provider | Env var | Model mặc định |
|---|---|---|
| `openai` | `OPENAI_API_KEY` | `gpt-4o` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5` |
| `google` | `GOOGLE_API_KEY` | `gemini-1.5-flash` |
| `custom` | `CUSTOM_API_KEY` | `gpt-4o-compatible` |
| `ollama` | _(không cần)_ | `llama3.2` |

### Bước 2 — Set API key

```bash
# Cách 1: dùng biến môi trường
export OPENAI_API_KEY=sk-...
# hoặc
export ANTHROPIC_API_KEY=sk-ant-...
# hoặc
export GOOGLE_API_KEY=AIzaSy...
# hoặc
export CUSTOM_API_KEY=your-key

# Cách 2: dùng file .env ở project root
cp .env.example .env
```

Bạn cũng có thể khai báo trực tiếp trong `.codeindex.json`:

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "indexDir": ".index",
  "apiKey": "sk-..."
}
```

Nếu bạn cần custom endpoint, thêm `CODEINDEX_BASE_URL` vào `.env`:

```bash
CODEINDEX_BASE_URL=https://your-endpoint.example.com/v1
```

Giá trị này sẽ được dùng cho các endpoint tương thích OpenAI khi chạy `index`, `query`, `update`, hoặc `serve`.

### Bước 3 — Build index lần đầu

```bash
codeindex index .
```

Output:
```
📁 Indexing: /your-project
🤖 Provider: openai / gpt-4o
📂 Index dir: .index

✅ Index built successfully!
   Files indexed : 142
   Symbols found : 891
   Duration      : 47.3s
   Output        : /your-project/.index/
```

### Bước 4 — Query

```bash
codeindex query "How does authentication work?"
```

Output sẵn sàng paste vào Claude/GPT:
```
=== src/auth/auth.service.ts ===
// Handles JWT-based authentication
class AuthService {
  async login(dto: LoginDto): Promise<TokenPair> { ... }
  validateToken(token: string): JwtPayload { ... }
}

// --- Dependencies (signatures only) ---
// src/user/user.service.ts
class UserService
```

---

## Commands

```bash
codeindex init [path]          # Setup config file
codeindex index [path]         # Full rebuild index
codeindex query "<text>"       # Query và get context
codeindex update [path]        # Incremental update (sau git commit)
codeindex status [path]        # Check index health
codeindex serve [path]         # HTTP server cho IDE
```

### Options hay dùng

```bash
# Query với output dạng JSON
codeindex query "auth flow" --format json

# Giới hạn token output
codeindex query "payment logic" --max-tokens 2000

# Không expand dependencies
codeindex query "UserService" --no-deps

# Verbose — xem LLM traversal path
codeindex query "how login works" -v

# Serve trên port khác
codeindex serve . --port 4000
```

---

## Auto-update sau mỗi git commit

```bash
# Copy git hook vào project của bạn
cp packages/cli/src/hooks/post-commit.sh /your-project/.git/hooks/post-commit
chmod +x /your-project/.git/hooks/post-commit
```

Sau đó mỗi `git commit`, index tự update chỉ các files thay đổi (thường < 5 giây).

---

## IDE Integration (HTTP Server)

```bash
codeindex serve . --port 3131
```

### Dùng với Claude Code / Cursor / bất kỳ AI tool nào

```bash
# Thêm vào system prompt của bạn:
# "Before answering code questions, call codeindex at http://localhost:3131"

# Hoặc query thủ công và copy context:
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "how does payment processing work?"}' \
  | jq -r '.context'
```

### Endpoints

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/health` | Server health |
| `GET` | `/status` | Index status |
| `POST` | `/query` | Query index |
| `POST` | `/update` | Trigger incremental update |

**POST /query body:**
```json
{
  "query": "how does auth work?",
  "maxTokens": 4000,
  "expandDeps": true,
  "maxSymbols": 10
}
```

---

## Tích hợp với Claude Code (MCP-style)

Thêm script này vào `~/.claude/tools/codeindex.sh`:

```bash
#!/bin/bash
# Tool: codeindex
# Description: Get relevant code context for a query
QUERY="$1"
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"maxTokens\": 3000}" \
  | jq -r '.context'
```

---

## Cấu trúc project

```
codeindex/
├── packages/
│   ├── core/                    # Core engine — language-agnostic
│   │   ├── src/tree/            # TreeBuilder, TreeTraversal
│   │   ├── src/retrieval/       # Retriever, DependencyExpander, ContextBuilder
│   │   ├── src/llm/             # SummaryGenerator, TraversalReasoner
│   │   └── src/storage/         # FileSystemIndexStore, IndexManager, FileScanner
│   ├── adapter-typescript/      # TypeScript parser (ts-morph)
│   └── cli/                     # CLI commands + HTTP server
└── .index/                      # Generated index (gitignored)
    ├── tree.json
    └── meta.json
```

---

## Token reduction estimate

| Project size | Before (dump all) | After (codeindex) | Reduction |
|---|---|---|---|
| Small (50 files) | ~15,000 tokens | ~800 tokens | **94%** |
| Medium (200 files) | ~60,000 tokens | ~1,500 tokens | **97%** |
| Large (500+ files) | context overflow | ~2,500 tokens | ✅ feasible |

---

## Thêm ngôn ngữ mới (Phase 6)

Implement `LanguageAdapter` interface:

```typescript
import type { LanguageAdapter } from "@codeindex/core"

export class PythonAdapter implements LanguageAdapter {
  readonly language = "python"
  readonly fileExtensions = [".py"]

  async parseFile(filePath, projectRoot): Promise<ParsedFile> {
    // Parse .py file với Python AST (child_process hoặc tree-sitter)
  }
  supports(filePath: string) { return filePath.endsWith(".py") }
  async resolveImport(...) { ... }
}
```

Register vào `createServices.ts`:
```typescript
adapters: [new TypeScriptAdapter(), new PythonAdapter()]
```

Core engine không cần thay đổi gì.
