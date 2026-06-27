# @codeindex/adapter-csharp

**C# language adapter for codei** — Parses C# types, methods, constructors, and properties.

## Supported Extensions

- `.cs`

## What It Does

- Extracts top-level symbols for `codei`
- Captures imports or module references when possible
- Fits the standard `LanguageAdapter` interface used by `@codeindex/core`

## Usage

```typescript
import { CSharpAdapter } from "@codeindex/adapter-csharp"

const adapter = new CSharpAdapter()
```

## License

MIT — See [main repo](https://github.com/zorrong/codei)
