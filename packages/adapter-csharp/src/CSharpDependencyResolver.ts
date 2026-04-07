/**
 * CSharpDependencyResolver — resolve C# using statements to file paths.
 */

import * as fs from "fs"
import * as path from "path"

export class CSharpDependencyResolver {
  resolveImport(usingPath: string, fromFile: string, projectRoot: string): string | null {
    if (this.isSystemOrExternal(usingPath)) return null

    const fromDir = path.dirname(fromFile)
    const parts = usingPath.split(".")

    for (const src of ["src", ""]) {
      const base = src ? path.join(projectRoot, src) : projectRoot
      const candidate = path.join(base, ...parts)

      if (fs.existsSync(candidate + ".cs")) return candidate + ".cs"

      const partialDir = candidate
      if (fs.existsSync(partialDir)) {
        const csFiles = this.findCsFiles(partialDir)
        const firstFile = csFiles[0]
        if (firstFile) return firstFile
      }
    }

    return null
  }

  private findCsFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir)
        .filter((f) => f.endsWith(".cs"))
        .map((f) => path.join(dir, f))
    } catch {
      return []
    }
  }

  private isSystemOrExternal(usingPath: string): boolean {
    if (usingPath.startsWith("System")) return true
    if (usingPath.startsWith("Microsoft")) return true
    if (usingPath.startsWith("NETStandard")) return true
    if (usingPath.startsWith("NETCore")) return true
    return false
  }
}
