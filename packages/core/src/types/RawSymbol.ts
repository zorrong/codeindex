/**
 * RawSymbol — common schema cho một symbol được extract từ source code.
 * Language adapters phải normalize output của mình về type này.
 * Không chứa bất kỳ thông tin language-specific nào.
 */

export type SymbolKind =
  | "class"
  | "function"
  | "method"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "constant"
  | "struct"
  | "module"
  | "property"

export type AccessModifier = "public" | "private" | "protected" | "internal"

export interface RawSymbol {
  /** Tên của symbol, ví dụ: "AuthService", "login" */
  name: string

  /** Loại symbol */
  kind: SymbolKind

  /**
   * Text representation của signature.
   * Không include body — chỉ include declaration line(s).
   * Ví dụ: "async login(dto: LoginDto): Promise<TokenPair>"
   */
  signature: string

  /** Line số bắt đầu trong file (1-indexed) */
  startLine: number

  /** Line số kết thúc trong file (1-indexed) */
  endLine: number

  /** Full source code của symbol bao gồm body */
  fullSource: string

  /** Symbol này có được export ra ngoài không */
  isExported: boolean

  /** JSDoc / docstring nếu có */
  docComment?: string | undefined

  /** Parent symbol nếu là nested (ví dụ method thuộc class) */
  parentName?: string | undefined

  /** Generic parameters nếu có, ví dụ: ["T", "K extends string"] */
  generics?: string[] | undefined
}

export interface ParsedFile {
  /** Absolute path của file */
  filePath: string

  /** Relative path từ project root */
  relativePath: string

  /** Ngôn ngữ của file */
  language: SupportedLanguage

  /** Tất cả symbols trong file */
  symbols: RawSymbol[]

  importBindings?: Array<{
    from: string
    defaultImport?: string | undefined
    namespaceImport?: string | undefined
    namedImports?: string[] | undefined
    typeOnly?: boolean | undefined
  }> | undefined

  /** Internal imports (trong cùng project) */
  internalImports: string[]

  /** External imports (node_modules hoặc stdlib) */
  externalImports: string[]

  /** Exports của file */
  exports: string[]
}

export type SupportedLanguage = "typescript" | "python" | "go" | "java" | "rust" | "csharp" | "cpp" | "php" | "swift"
