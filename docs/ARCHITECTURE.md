# Architecture

## Overview

`codeindex` is a vectorless, reasoning-based code index system. Instead of using vector embeddings for similarity search, it builds a hierarchical tree index and uses LLM reasoning to traverse and retrieve relevant context.

## Why Vectorless?

| Approach | Pros | Cons |
|----------|------|------|
| Vector Embeddings | Fast similarity search | Requires external storage, token overhead for indexing, embedding drift over time |
| **LLM Reasoning (codeindex)** | **Deterministic**, no external storage, always up-to-date | Slightly slower queries |

## Core Principles

1. **Token Efficiency** — Only summaries are sent to LLM during traversal, not full code
2. **Deterministic Results** — Same query always returns same result
3. **Privacy First** — No vector embeddings stored externally
4. **Language Agnostic** — Adapter pattern supports any language

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI / HTTP API                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      IndexManager                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │ FileScanner │  │   Builder   │  │ FileSystemStore │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tree Structure                           │
│                                                             │
│  Project                                                    │
│  └── Module (directory)                                     │
│      └── File                                               │
│          └── Symbol (function/class/interface)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Retrieval Pipeline                       │
│                                                             │
│  TreeTraversal ──► DependencyExpander ──► ContextBuilder   │
│        │                    │                    │           │
│        ▼                    ▼                    ▼           │
│   Select relevant     Add 1-hop deps      Format output     │
│   modules→files→      signatures          with full source │
└─────────────────────────────────────────────────────────────┘
```

## Package Structure

```
packages/
├── core/
│   └── src/
│       ├── storage/          # FileScanner, IndexStore, FileWatcher
│       ├── tree/             # TreeBuilder, TreeNode types
│       ├── retrieval/        # TreeTraversal, DependencyExpander, ContextBuilder
│       ├── types/            # RawSymbol, LanguageAdapter interfaces
│       └── index.ts         # Core exports
│
├── cli/
│   └── src/
│       ├── commands/        # CLI command handlers
│       ├── server/          # HTTP server
│       ├── config.ts        # Configuration loader
│       └── cli.ts           # Entry point
│
└── adapter-*/               # Language-specific adapters
    └── src/
        ├── *AstParser.ts    # Regex-based AST extraction
        ├── *DependencyResolver.ts
        ├── *Adapter.ts      # LanguageAdapter implementation
        └── index.ts
```

## Index Tree Structure

```typescript
interface IndexTree {
  root: IndexNode
  nodes: Record<string, IndexNode>
  version: string
  builtAt: number
}

interface IndexNode {
  nodeId: string           // e.g., "project:root", "mod:src/auth", "file:src/auth/auth.service.ts"
  title: string            // Display name
  level: "project" | "module" | "file" | "symbol"
  shortSummary: string     // LLM-generated summary for reasoning
  rootPath?: string        // For project level
  dirPath?: string         // For module level
  filePath?: string        // For file level
  signature?: string       // For symbol level
  children: string[]       // Child node IDs
  parentId?: string
  primaryLanguage?: SupportedLanguage
}
```

## Retrieval Pipeline

### 1. TreeTraversal

The `TreeTraversal` class uses LLM reasoning to navigate the index tree:

```
User Query: "How does authentication work?"
    │
    ▼
LLM receives:
- Project summary
- Module summaries (e.g., "src/auth: Handles user login, JWT tokens")
- User query

LLM reasoning:
"This query is about authentication. The auth module at src/auth is most relevant.
 Within auth, auth.service.ts likely contains the core auth logic."
    │
    ▼
Output: Selected module/file/symbol paths
```

### 2. DependencyExpander

Adds 1-hop dependency signatures to the selected context:

```typescript
// Selected: auth.service.ts
// Expanded with deps:
// - user.service.ts: class UserService { ... }
// - jwt.utils.ts: function generateToken() { ... }
```

### 3. ContextBuilder

Formats the final output with full source code for selected symbols.

## Key Algorithms

### Incremental Update Algorithm

```
1. Load existing index metadata (git hash map)
2. Scan current file system
3. Compare hashes:
   - Changed files → re-parse
   - New files → parse
   - Deleted files → remove from tree
4. Propagate changes up the tree
5. Save updated index
```

### Parallel Symbol Extraction

```
1. Batch files into groups (default: 10 files/batch)
2. For each batch:
   - Parse files in parallel (Promise.all)
   - Extract symbols using language adapter
3. Aggregate results
4. Build dependency graph
```

## Supported Languages

All adapters implement the `LanguageAdapter` interface:

```typescript
interface LanguageAdapter {
  readonly language: SupportedLanguage
  readonly fileExtensions: string[]

  supports(filePath: string): boolean
  parseFile(filePath: string, projectRoot: string): Promise<ParsedFile>
  resolveImport(importPath: string, fromFile: string, projectRoot: string): Promise<string | null>
}
```

| Language | Parser Type |
|----------|-------------|
| TypeScript | ts-morph (AST) |
| Python | Regex-based |
| Go | Regex-based |
| Rust | Regex-based |
| Java | Regex-based |
| C# | Regex-based |
| C++ | Regex-based |
| PHP | Regex-based |
| Swift | Regex-based |

## Performance Considerations

- **Parsing**: Parallel parsing with configurable batch size
- **Caching**: LRU cache for traversal results (TTL: 5 minutes)
- **Index Size**: ~1KB per file summary, ~100 bytes per symbol
- **Query Speed**: ~100-500ms for typical queries (network latency + LLM reasoning)

## Future Architecture Considerations

- [ ] Clustering for large monorepos
- [ ] Remote index storage (S3, etc.)
- [ ] Incremental symbol-level updates
- [ ] Multi-index federation
