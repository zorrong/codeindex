/**
 * RustDependencyResolver — resolve Rust use statements to module paths.
 */

import * as fs from "fs"
import * as path from "path"

export class RustDependencyResolver {
  resolveImport(usePath: string, fromFile: string, projectRoot: string): string | null {
    if (usePath.startsWith("crate::") || usePath.startsWith("super::") || usePath.startsWith("self::")) {
      return this.resolveCrateRelative(usePath, fromFile, projectRoot)
    }
    return this.resolveExternal(usePath, fromFile, projectRoot)
  }

  private resolveCrateRelative(usePath: string, fromFile: string, projectRoot: string): string | null {
    const modPath = usePath.replace(/^(crate|super|self)::/, "")
    const fromDir = path.dirname(fromFile)

    if (usePath.startsWith("crate::")) {
      const srcRoot = this.findSrcRoot(projectRoot)
      if (!srcRoot) return null
      return path.join(srcRoot, ...modPath.split("::"))
    }

    if (usePath.startsWith("super::")) {
      let current = fromDir
      let superCount = (usePath.match(/^super::/g) ?? []).length
      for (let i = 0; i < superCount && current !== projectRoot; i++) {
        current = path.dirname(current)
      }
      const relPath = usePath.replace(/^(super::)+/, "")
      return path.join(current, ...relPath.split("::"))
    }

    if (usePath.startsWith("self::")) {
      const relPath = usePath.replace(/^self::/, "")
      return path.join(fromDir, ...relPath.split("::"))
    }

    return null
  }

  private resolveExternal(usePath: string, fromFile: string, projectRoot: string): string | null {
    const parts = usePath.split("::")
    const first = parts[0]

    if (first === "crate" || first === "super" || first === "self") {
      return this.resolveCrateRelative(usePath, fromFile, projectRoot)
    }

    const srcRoot = this.findSrcRoot(projectRoot)
    if (!srcRoot) return null

    const candidate = path.join(srcRoot, ...parts)
    if (fs.existsSync(candidate + ".rs")) return candidate + ".rs"
    if (fs.existsSync(path.join(candidate, "mod.rs"))) return path.join(candidate, "mod.rs")
    if (fs.existsSync(path.join(candidate, "lib.rs"))) return path.join(candidate, "lib.rs")

    return null
  }

  private findSrcRoot(projectRoot: string): string | null {
    for (const candidate of ["src", "lib", ""]) {
      const dir = candidate ? path.join(projectRoot, candidate) : projectRoot
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir
      }
    }
    return projectRoot
  }
}
