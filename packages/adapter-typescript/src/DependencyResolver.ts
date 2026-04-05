/**
 * DependencyResolver — resolve import strings thành absolute file paths.
 * Phân biệt internal imports (trong project) vs external (node_modules).
 */

import type { SourceFile } from "ts-morph"
import * as path from "path"
import * as fs from "fs"

/** Extensions TypeScript sẽ thử khi resolve (theo thứ tự ưu tiên) */
const TS_EXTENSIONS = [".ts", ".tsx", ".d.ts"]
const INDEX_FILES = ["index.ts", "index.tsx"]

export class DependencyResolver {
  /**
   * Extract tất cả import strings từ một SourceFile.
   * Phân loại thành internal (relative/absolute trong project) vs external.
   */
  extractImports(
    sourceFile: SourceFile,
    projectRoot: string
  ): { internal: string[]; external: string[] } {
    const internal: string[] = []
    const external: string[] = []

    for (const importDecl of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue()
      const resolved = this.resolveImport(
        moduleSpecifier,
        sourceFile.getFilePath(),
        projectRoot
      )

      if (resolved !== null) {
        internal.push(resolved)
      } else {
        // Extract package name (ignore subpath)
        const pkgName = this.extractPackageName(moduleSpecifier)
        if (pkgName && !external.includes(pkgName)) {
          external.push(pkgName)
        }
      }
    }

    // Export declarations cũng có thể có re-exports
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      const moduleSpecifier = exportDecl.getModuleSpecifierValue()
      if (!moduleSpecifier) continue

      const resolved = this.resolveImport(
        moduleSpecifier,
        sourceFile.getFilePath(),
        projectRoot
      )

      if (resolved !== null && !internal.includes(resolved)) {
        internal.push(resolved)
      }
    }

    return { internal, external }
  }

  /**
   * Resolve một import string thành absolute file path.
   * Trả về null nếu là external import.
   */
  resolveImport(
    importString: string,
    fromFile: string,
    projectRoot: string
  ): string | null {
    // External package — bắt đầu bằng letter hoặc @scope
    if (!importString.startsWith(".") && !importString.startsWith("/")) {
      return null
    }

    const fromDir = path.dirname(fromFile)
    const basePath = importString.startsWith("/")
      ? path.join(projectRoot, importString)
      : path.resolve(fromDir, importString)

    // Thử exact path trước
    if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
      return basePath
    }

    // Thử thêm TypeScript extensions
    for (const ext of TS_EXTENSIONS) {
      const withExt = basePath + ext
      if (fs.existsSync(withExt)) {
        return withExt
      }
    }

    // Thử như directory — tìm index file
    if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
      for (const indexFile of INDEX_FILES) {
        const indexPath = path.join(basePath, indexFile)
        if (fs.existsSync(indexPath)) {
          return indexPath
        }
      }
    }

    // Không resolve được — có thể là .js import trỏ tới .ts
    const withoutExt = basePath.replace(/\.js$/, "")
    for (const ext of TS_EXTENSIONS) {
      const candidate = withoutExt + ext
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }

    return null
  }

  /**
   * Extract package name từ import string.
   * "@scope/pkg/subpath" → "@scope/pkg"
   * "pkg/subpath" → "pkg"
   */
  private extractPackageName(importString: string): string | null {
    if (importString.startsWith("@")) {
      const parts = importString.split("/")
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`
      }
      return null
    }

    const firstSlash = importString.indexOf("/")
    if (firstSlash === -1) return importString
    return importString.substring(0, firstSlash)
  }
}
