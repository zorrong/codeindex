/**
 * PhpDependencyResolver — resolve PHP use statements to file paths.
 */

import * as fs from "fs"
import * as path from "path"

export class PhpDependencyResolver {
  resolveImport(usePath: string, fromFile: string, projectRoot: string): string | null {
    if (this.isPhpCoreOrExternal(usePath)) return null

    const fromDir = path.dirname(fromFile)
    const parts = usePath.split("\\")
    const srcRoot = this.findSrcRoot(projectRoot)

    if (!srcRoot) return null

    const basePath = path.join(srcRoot, ...parts)
    const phpFile = basePath + ".php"

    if (fs.existsSync(phpFile)) return phpFile

    const classDir = basePath
    if (fs.existsSync(classDir) && fs.statSync(classDir).isDirectory()) {
      const phpFiles = fs.readdirSync(classDir).filter((f) => f.endsWith(".php"))
      const firstFile = phpFiles[0]
      if (firstFile) return path.join(classDir, firstFile)
    }

    return null
  }

  private findSrcRoot(projectRoot: string): string | null {
    for (const candidate of ["src", "app", ""]) {
      const dir = candidate ? path.join(projectRoot, candidate) : projectRoot
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir
      }
    }
    return projectRoot
  }

  private isPhpCoreOrExternal(usePath: string): boolean {
    if (usePath.startsWith("php\\")) return true
    if (usePath.startsWith("app\\")) return false
    if (usePath.startsWith("database\\")) return false
    if (usePath.startsWith("Illuminate\\")) return true
    if (usePath.startsWith("Symfony\\")) return true
    if (usePath.startsWith("Laravel\\")) return true
    if (usePath.startsWith("Doctrine\\")) return true
    if (usePath.startsWith("Composer\\")) return true
    return false
  }
}
