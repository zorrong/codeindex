/**
 * PythonDependencyResolver — resolve Python imports.
 */

import * as fs from "fs"
import * as path from "path"

const PYTHON_STDLIB = new Set([
  "sys", "os", "re", "json", "math", "time", "datetime", "collections",
  "itertools", "functools", "typing", "abc", "asyncio", "unittest",
  "io", "pathlib", "tempfile", "shutil", "glob", "copy", "pprint",
  "hashlib", "random", "platform", "struct", "codecs", "csv", "logging",
])

export class PythonDependencyResolver {
  resolveImport(importString: string, fromFile: string, projectRoot: string): string | null {
    const topLevel = importString.split(".")[0] ?? ""
    if (this.isStdlibOrExternal(topLevel)) return null
    if (importString.startsWith(".")) {
      return this.resolveRelative(importString, fromFile)
    }
    return this.resolveAbsolute(importString, projectRoot)
  }

  private isStdlibOrExternal(name: string): boolean {
    return PYTHON_STDLIB.has(name) || name.startsWith("_")
  }

  private resolveRelative(importString: string, fromFile: string): string | null {
    const fromDir = path.dirname(fromFile)
    const m = importString.match(/^\.*/)
    const level = (m ? m[0] : "").length
    let targetDir = fromDir
    for (let i = 0; i < level; i++) targetDir = path.dirname(targetDir)
    const relativePart = importString.slice(level)
    if (!relativePart) return fromFile
    const parts = relativePart.split(".")
    const filePath = path.join(targetDir, ...parts)
    return this.findPythonFile(filePath)
  }

  private resolveAbsolute(importString: string, projectRoot: string): string | null {
    const parts = importString.split(".")
    for (const src of ["src", "app", ""]) {
      const base = src ? path.join(projectRoot, src) : projectRoot
      const filePath = path.join(base, ...parts)
      const found = this.findPythonFile(filePath)
      if (found) return found
    }
    return null
  }

  private findPythonFile(filePath: string): string | null {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath
    const pyFile = filePath + ".py"
    if (fs.existsSync(pyFile)) return pyFile
    const initFile = path.join(filePath, "__init__.py")
    if (fs.existsSync(initFile)) return initFile
    return null
  }
}
