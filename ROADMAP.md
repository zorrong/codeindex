# codeindex — Strategic Roadmap 🚀

This roadmap outlines the long-term vision to scale `codeindex` into a professional AI context retrieval engine.

---

## 🟢 Phase 1: Foundation & Language Expansion (Current focus)

- [ ] **Multi-language Support**: Integrate `tree-sitter` to support Python, Go, Rust, and Java (currently limited to TypeScript).
- [ ] **Incremental Build Optimization**: Improve the hashing mechanism to detect file changes even faster and only rebuild affected sub-trees.
- [ ] **Documentation Overhaul**: Complete multilingual READMEs and add detailed API usage examples.
- [ ] **Telemetry (Local only)**: Add stats for token reduction and cost-saving metrics per query.

---

## 🟡 Phase 2: Ecosystem & Better Integration (The Connectivity Phase)

- [ ] **Native MCP (Model Context Protocol) Support**: Build an official MCP server for `codeindex` to enable "plug-and-play" integration with Claude Desktop, Cursor, and Windsurf without needing custom scripts.
- [ ] **Official VS Code Extension**: A sidebar to visualize the index tree and a status bar to monitor the local server.
- [ ] **CI/CD Integration**: Official GitHub Action and GitLab Runner scripts for auto-indexing on merge.

---

## 🟠 Phase 3: Hybrid Search & Local Intelligence (The Reasoning Phase)

- [ ] **Hybrid Retrieval (RAG + Reasoning)**:
  - Implement a small, local vector store (e.g., SQLite with `sqlite-vec` or FAISS) for keyword-based jumping.
  - Combine vector search with our existing Hierarchical Reasoning Tree for 100% accuracy.
- [ ] **Local LLM First**: Optimization for Small Language Models (SLMs) like `phi-4` or `deepseek-v3` running locally via Ollama to reduce costs to zero.
- [ ] **Context Window Packing**: Intelligently pack multiple related files into a single context snippet to avoid multiple queries.

---

## 🔴 Phase 4: Enterprise & Scale (The Maturity Phase)

- [ ] **Monorepo Scalability**: Optimize memory usage for projects with 10k+ files (using disk-based tree nodes).
- [ ] **Web Dashboard**: A local web UI to:
  - Explore the generated tree visually.
  - Manage global settings and API keys.
  - Review query history and token costs.
- [ ] **Code Graph Analysis**: Go beyond imports — detect cross-file patterns (Shared state, Event emitters) that text-based search misses.

---

## 🛠 Active Technical Challenges to Solve:
1. **Circular Dependencies**: Handling infinite loops in tree traversal.
2. **Context Fragmentation**: Ensuring that splitting code into symbols doesn't lose the "bigger picture" of the logic.
3. **Private LLMs**: Ensuring sensitive code remains on-premise for enterprise clients.
