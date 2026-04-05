/**
 * LanguageAdapter — contract mà mọi language-specific parser phải implement.
 *
 * Đây là boundary chính giữa core engine và language-specific code.
 * Core engine chỉ biết về interface này, không biết gì về ts-morph, ast, v.v.
 *
 * Để thêm một ngôn ngữ mới:
 * 1. Tạo package mới `adapter-<language>`
 * 2. Implement interface này
 * 3. Register vào AdapterRegistry
 * → Core engine không cần thay đổi gì
 */

import type { ParsedFile, SupportedLanguage } from "./RawSymbol.js"

export interface LanguageAdapter {
  /** Ngôn ngữ mà adapter này hỗ trợ */
  readonly language: SupportedLanguage

  /** File extensions mà adapter này xử lý, ví dụ: [".ts", ".tsx"] */
  readonly fileExtensions: string[]

  /**
   * Parse một file và trả về symbols + dependency info.
   * Không gọi LLM — chỉ static analysis thuần.
   *
   * @param filePath Absolute path của file
   * @param projectRoot Absolute path của project root (để tính relative path)
   */
  parseFile(filePath: string, projectRoot: string): Promise<ParsedFile>

  /**
   * Kiểm tra file có được adapter này hỗ trợ không.
   * Default implementation check file extension,
   * nhưng adapter có thể override để check thêm (ví dụ shebang line).
   */
  supports(filePath: string): boolean

  /**
   * Resolve một import string thành absolute file path.
   * Trả về null nếu là external import (node_modules, stdlib).
   *
   * Ví dụ TypeScript:
   *   "./auth.service" → "/project/src/auth/auth.service.ts"
   *   "express" → null (external)
   *
   * @param importString Raw import string từ source code
   * @param fromFile File chứa import statement (absolute path)
   * @param projectRoot Absolute path của project root
   */
  resolveImport(
    importString: string,
    fromFile: string,
    projectRoot: string
  ): Promise<string | null>
}

/**
 * Registry quản lý tất cả language adapters.
 * Core engine dùng registry này để tìm adapter phù hợp cho từng file.
 */
export interface AdapterRegistry {
  /** Register một adapter mới */
  register(adapter: LanguageAdapter): void

  /** Tìm adapter cho file path, trả về null nếu không có adapter nào support */
  findAdapter(filePath: string): LanguageAdapter | null

  /** Danh sách tất cả supported languages */
  getSupportedLanguages(): SupportedLanguage[]

  /** Tất cả file extensions được support */
  getSupportedExtensions(): string[]
}
