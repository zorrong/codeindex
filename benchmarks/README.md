# Benchmarks

Bộ benchmark tối thiểu để đo `codeindex` trên repo thực.

## Mục tiêu

Đo 4 thứ:
- token output của `codeindex query`
- latency query
- file/symbol hit rate cơ bản
- so sánh sơ bộ với full source dump

## Chuẩn bị repo cần benchmark

Trong repo mục tiêu, cần có:
- `.codeindex.json`
- `.index/` đã được build bằng `codeindex index`

## Tạo file queries

Copy file mẫu và chỉnh lại theo repo thật:

```bash
cp benchmarks/queries.example.json benchmarks/queries.json
```

Format:

```json
[
  {
    "id": "auth-flow",
    "query": "How does authentication work?",
    "expectedFiles": ["src/auth/auth.service.ts"],
    "expectedSymbols": ["AuthService", "validateToken"]
  }
]
```

## Chạy benchmark

```bash
pnpm benchmark --project /path/to/your-project --queries benchmarks/queries.json
```

Ví dụ:

```bash
pnpm benchmark --project /home/zorrong/pnf-terminal --queries benchmarks/queries.json
```

## Output

Script sẽ tạo:
- `benchmarks/output/latest.json`
- `benchmarks/output/latest.md`

## Chỉ số hiện có

### 1. codeindex tokens
Ước lượng bằng ký tự/4 để có số tương đối, đủ dùng để so sánh.

### 2. full dump tokens
Đọc toàn bộ source text trong repo, ước lượng token để thấy chênh lệch.

### 3. latencyMs
Thời gian chạy một query.

### 4. fileHitRate / symbolHitRate
Tỷ lệ expected items xuất hiện trong output JSON của `codeindex query --format json`.

## Ghi chú

- Đây là benchmark tối thiểu, ưu tiên thực chiến và dễ chạy.
- Bản sau nên thay token estimator bằng tokenizer thật (`tiktoken`), thêm p50/p95 và baseline `grep`.
