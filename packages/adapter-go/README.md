# @codeindex/adapter-go

**Go language adapter for codei** — Parses Go source for packages, types, and functions.

## Supported Extensions

- `.go`

## What It Does

- Extracts top-level symbols for `codei`
- Captures imports or module references when possible
- Fits the standard `LanguageAdapter` interface used by `@codeindex/core`

## Usage

```typescript
import { GoAdapter } from "@codeindex/adapter-go"

const adapter = new GoAdapter()
```

## License

MIT — See [main repo](https://github.com/zorrong/codei)
