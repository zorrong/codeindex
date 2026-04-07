/**
 * CppDependencyResolver — resolve C++ #include statements to file paths.
 */

import * as fs from "fs"
import * as path from "path"

export class CppDependencyResolver {
  resolveImport(includePath: string, fromFile: string, projectRoot: string): string | null {
    if (includePath.startsWith("<")) return null

    const fromDir = path.dirname(fromFile)
    const cleanPath = includePath.replace(/^"/, "").replace(/"$/, "")

    const candidates = [
      path.join(fromDir, cleanPath),
      path.join(fromDir, cleanPath + ".h"),
      path.join(fromDir, cleanPath + ".hpp"),
      path.join(fromDir, cleanPath + ".cpp"),
      path.join(projectRoot, cleanPath),
      path.join(projectRoot, cleanPath + ".h"),
      path.join(projectRoot, cleanPath + ".hpp"),
      path.join(projectRoot, "include", cleanPath),
    ]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate
      }
    }

    return null
  }
}
