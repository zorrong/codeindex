# codeindex

**Hệ thống index code không dùng vector, dựa trên reasoning để truy xuất context cho AI.**

Thay vì đưa toàn bộ codebase vào prompt (50k+ tokens), `codeindex` xây dựng một cây index phân cấp và sử dụng LLM reasoning để tìm chính xác context bạn cần — giảm token từ **50,000+ xuống còn ~1,000-3,000 tokens** mỗi query.

---

## Tính năng

- **Truy xuất không Vector** — Sử dụng LLM reasoning để duyệt cây index phân cấp
- **Hỗ trợ đa ngôn ngữ** — TypeScript, Python, Go, Rust, Java, C#, C++, PHP, Swift
- **Tiết kiệm Token** — Chỉ lấy context liên quan, không phải toàn bộ codebase
- **Cập nhật tăng dần** — Chỉ re-index các file đã thay đổi
- **Tích hợp Git** — Tự động cập nhật index sau commit
- **HTTP Server** — Tích hợp IDE với REST API
- **Sẵn sàng Production** — API key auth, rate limiting, structured logging

---

## Cài đặt

```bash
# Clone repo
git clone https://github.com/your-org/codeindex.git
cd codeindex

# Cài đặt dependencies
pnpm install

# Build tất cả packages
pnpm -r build

# Link CLI toàn cục
cd packages/cli && npm link
```

---

## Bắt đầu nhanh

### 1. Cấu hình toàn cục (Một lần)

```bash
codeindex setup
```

Bạn sẽ được yêu cầu nhập:
- **LLM Provider**: `openai`, `anthropic`, `google`, `ollama`
- **API Key**: API key từ provider của bạn
- **Model Name**: Model mặc định (ví dụ: `gpt-4o`, `claude-sonnet-4-5`)

Cấu hình được lưu tại `~/.codeindex/config.json`.

### 2. Khởi tạo Project

```bash
cd /path/to/your-project
codeindex init
```

### 3. Build Index

```bash
codeindex index .
```

### 4. Query

```bash
codeindex query "Authentication hoạt động như thế nào?"
```

---

## CLI Commands

| Lệnh | Mô tả |
|------|-------|
| `codeindex setup` | Cấu hình toàn cục (API Key, Provider) |
| `codeindex init [path]` | Khởi tạo cấu hình project |
| `codeindex index [path]` | Build/rebuild project index |
| `codeindex query "<text>"` | Query index để lấy context |
| `codeindex update [path]` | Cập nhật tăng dần |
| `codeindex status [path]` | Kiểm tra sức khỏe index |
| `codeindex serve [path]` | Khởi động HTTP server cho IDE |

---

## Chế độ HTTP Server

Khởi động server cho các query thường xuyên:

```bash
codeindex serve . --port 3131
```

### Query qua HTTP

```bash
curl -X POST http://localhost:3131/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Authentication hoạt động như thế nào?", "maxTokens": 3000}'
```

### Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/query` | Query index |
| POST | `/update` | Trigger cập nhật tăng dần |
| GET | `/status` | Kiểm tra sức khỏe index |
| GET | `/health` | Kiểm tra sức khỏe server |

---

## Cấu hình

Ưu tiên cấu hình (cao đến thấp):
`CLI Flags < Environment Variables < Project (.codeindex.json) < Global (~/.codeindex/config.json)`

### Ví dụ `.codeindex.json`

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "indexDir": ".index",
  "projectName": "my-project",
  "serverApiKey": "optional-api-key"
}
```

### Environment Variables

```bash
OPENAI_API_KEY=sk-...
CODEINDEX_PROVIDER=openai
CODEINDEX_MODEL=gpt-4o
```

---

## Ngôn ngữ được hỗ trợ

| Ngôn ngữ | Package | Extensions |
|----------|---------|------------|
| TypeScript | `@codeindex/adapter-typescript` | `.ts`, `.tsx` |
| Python | `@codeindex/adapter-python` | `.py` |
| Go | `@codeindex/adapter-go` | `.go` |
| Rust | `@codeindex/adapter-rust` | `.rs` |
| Java | `@codeindex/adapter-java` | `.java` |
| C# | `@codeindex/adapter-csharp` | `.cs` |
| C++ | `@codeindex/adapter-cpp` | `.cpp`, `.cc`, `.hpp`, `.h` |
| PHP | `@codeindex/adapter-php` | `.php` |
| Swift | `@codeindex/adapter-swift` | `.swift` |

---

## Tích hợp Git

Tự động cập nhật index sau commit:

```bash
# Copy git hook vào project của bạn
cp packages/cli/src/hooks/post-commit.sh /your-project/.git/hooks/post-commit
chmod +x /your-project/.git/hooks/post-commit
```

---

## Kiến trúc

```
codeindex/
├── packages/
│   ├── core/              # Engine core — tree index, retrieval logic
│   ├── cli/               # Giao diện CLI
│   └── adapter-*/         # Language adapters
└── docs/                  # Tài liệu
```

Xem chi tiết kiến trúc tại [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Giấy phép

MIT License - Xem [LICENSE](../LICENSE) để biết thêm chi tiết.

---

## Đóng góp

Đóng góp được chào đón! Vui lòng đọc hướng dẫn đóng góp trước khi gửi PRs.
