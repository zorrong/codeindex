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

# Cấu hình API Key toàn cục (CHỈ CẦN LÀM 1 LẦN)
codeindex setup
```

---

## Sử dụng trong project của bạn

### Bước 1 — Thiết lập toàn cục (Global Setup)

Thay vì phải khai báo API Key cho mỗi dự án, bạn chỉ cần chạy lệnh sau một lần duy nhất khi vừa cài đặt:

```bash
codeindex setup
```

Lệnh này sẽ hỏi bạn Provider (OpenAI, Gemini, v.v.), API Key, Model name và Base URL (nếu có).

Thông tin này sẽ được lưu tại `~/.codeindex/config.json` và áp dụng cho **tất cả** các dự án sau này.

### Bước 2 — Khởi tạo dự án (Init project)

Khi bắt đầu dự án mới, bạn chỉ cần dùng `init`. Nó sẽ tự nhận diện cấu hình toàn cục của bạn:

```bash
cd /path/to/your-project
codeindex init
```

Nhấn **Enter** để xác nhận các giá trị mặc định được lấy từ `setup`. File `.codeindex.json` sẽ được tạo:

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "indexDir": ".index"
}
```

> [!TIP]
> Bạn vẫn có thể ghi đè (override) cấu hình toàn cục bằng cách sửa file `.codeindex.json` dự án hoặc dùng biến môi trường.

**Thứ tự ưu tiên (Priority):**
`Mặc định < Toàn cục (~/.codeindex) < Dự án (.codeindex.json) < Biến môi trường (ENV) < CLI flags`

**Providers được hỗ trợ:**
| Provider | Biến ENV | Model mặc định |
|---|---|---|
| `openai` | `OPENAI_API_KEY` | `gpt-4o` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5` |
| `google` | `GOOGLE_API_KEY` | `gemini-1.5-flash` |
| `custom` | `CUSTOM_API_KEY` | `gpt-4o-compatible` |
| `ollama` | _(không cần)_ | `llama3.2` |

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
codeindex setup                # Cấu hình API Key/Provider toàn cục
codeindex init [path]          # Setup config file cho project mới
codeindex index [path]         # Full rebuild index dự án
codeindex query "<text>"       # Query và lấy code context
codeindex update [path]        # Update index (sau git commit)
codeindex status [path]        # Kiểm tra sức khỏe index
codeindex serve [path]         # Start server cho IDE integration
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

## Tích hợp IDE & AI Agent

`codeindex` cung cấp một HTTP server chạy local, đóng vai trò là "nguồn tri thức" cho các công cụ AI ưa thích của bạn.

### 1. Khởi chạy Server
Luôn giữ server chạy ở một terminal nền:
```bash
codeindex serve . --port 3131
```

### 2. Tích hợp với Claude Code
Tạo một script hỗ trợ tại `~/.claude/tools/codeindex.sh`:
```bash
#!/bin/bash
# Tool: codeindex
# Description: Lấy context code liên quan từ index local
QUERY="$1"
curl -s -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"maxTokens\": 3000}" \
  | jq -r '.context'
```

### 3. Tích hợp với Cursor / Windsurf
Tạo file `.cursorrules` hoặc `.windsurfrules` ở thư mục gốc project để hướng dẫn AI cách dùng codeindex:

```markdown
# Truy vấn ngữ cảnh từ Codeindex
Khi bạn cần hiểu codebase hoặc lần theo chuỗi dependency:
1. Chạy lệnh này để lấy các đoạn mã liên quan:
   curl -s -X POST http://localhost:3131/query -d '{"query": "CÂU_HỎI_CỦA_BẠN"}' | jq -r '.context'
2. Sử dụng kết quả trả về để lập luận và thực hiện code.
```

### 4. Tích hợp với Cline (VSCode)
Trong chế độ "Plan Mode" hoặc "Custom Instruction" của Cline, bạn có thể hướng dẫn CLI chạy:
`codeindex query "câu hỏi của bạn" --format text`
Sau đó dùng kết quả trả về làm ngữ cảnh.

---

## Các API Endpoints

Server (mặc định: `localhost:3131`) cung cấp các endpoint:

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/health` | Kiểm tra tình trạng server |
| `POST` | `/query` | Truy vấn context code (Xem body mẫu trong `HttpServer.ts`) |
| `POST` | `/update` | Kích hoạt cập nhật index tăng trưởng |
| `GET` | `/status` | Xem thống kê index hiện tại |

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
