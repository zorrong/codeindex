/**
 * GoDependencyResolver — resolve Go import paths to file paths.
 */

import * as fs from "fs"
import * as path from "path"

export class GoDependencyResolver {
  resolveImport(importPath: string, fromFile: string, projectRoot: string): string | null {
    if (this.isStdlib(importPath)) return null
    if (importPath.startsWith(".")) {
      return this.resolveRelative(importPath, fromFile)
    }
    return this.resolveModule(importPath, fromFile, projectRoot)
  }

  private isStdlib(importPath: string): boolean {
    const top = importPath.split("/")[0]
    return (
      top === "fmt" ||
      top === "os" ||
      top === "io" ||
      top === "bufio" ||
      top === "bytes" ||
      top === "strings" ||
      top === "strconv" ||
      top === "errors" ||
      top === "encoding" ||
      top === "json" ||
      top === "time" ||
      top === "log" ||
      top === "flag" ||
      top === "context" ||
      top === "sync" ||
      top === "net" ||
      top === "http" ||
      top === "regexp" ||
      top === "sort" ||
      top === "math" ||
      top === "crypto" ||
      top === "testing" ||
      top === "golang.org" ||
      top === "github.com" ||
      top === "go.uber.org" ||
      top === "go.mongodb.org"
    )
  }

  private resolveRelative(importPath: string, fromFile: string): string | null {
    const fromDir = path.dirname(fromFile)
    return path.join(fromDir, importPath)
  }

  private resolveModule(importPath: string, fromFile: string, projectRoot: string): string | null {
    const goModPath = this.findGoMod(projectRoot)
    if (!goModPath) return null

    const modDir = path.dirname(goModPath)
    const moduleRoot = this.findModuleRoot(modDir)
    if (!moduleRoot) return null

    const importParts = importPath.split("/")
    const candidate = path.join(moduleRoot, ...importParts) + ".go"
    if (fs.existsSync(candidate)) return candidate

    const dirCandidate = path.join(moduleRoot, ...importParts, "*.go")
    return candidate
  }

  private findGoMod(dir: string): string | null {
    let current: string | null = dir
    while (current && current !== path.dirname(current)) {
      const goMod = path.join(current, "go.mod")
      if (fs.existsSync(goMod)) return goMod
      current = path.dirname(current)
    }
    return null
  }

  private findModuleRoot(goModDir: string): string | null {
    return goModDir
  }
}
