/**
 * JavaDependencyResolver — resolve Java imports to file paths.
 */

import * as fs from "fs"
import * as path from "path"

export class JavaDependencyResolver {
  resolveImport(importPath: string, fromFile: string, projectRoot: string): string | null {
    if (this.isJavaLangOrExternal(importPath)) return null

    const fromDir = path.dirname(fromFile)
    const parts = importPath.split(".")
    const srcRoot = this.findSrcRoot(projectRoot)

    if (!srcRoot) return null

    const basePath = path.join(srcRoot, ...parts)
    const javaFile = basePath + ".java"

    if (fs.existsSync(javaFile)) return javaFile

    const dirPath = basePath
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      for (const file of fs.readdirSync(dirPath)) {
        if (file.endsWith(".java")) {
          return path.join(dirPath, file)
        }
      }
    }

    return null
  }

  private findSrcRoot(projectRoot: string): string | null {
    for (const candidate of ["src/main/java", "src/test/java", "src", ""]) {
      const dir = candidate ? path.join(projectRoot, candidate) : projectRoot
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir
      }
    }
    return projectRoot
  }

  private isJavaLangOrExternal(importPath: string): boolean {
    if (importPath.startsWith("java.lang")) return true
    if (importPath.startsWith("java.util")) return true
    if (importPath.startsWith("java.io")) return true
    if (importPath.startsWith("java.nio")) return true
    if (importPath.startsWith("java.net")) return true
    if (importPath.startsWith("javax.")) return true
    return false
  }
}
