/**
 * SwiftDependencyResolver — resolve Swift import statements to file paths.
 */

import * as fs from "fs"
import * as path from "path"

export class SwiftDependencyResolver {
  resolveImport(moduleName: string, fromFile: string, projectRoot: string): string | null {
    if (this.isSwiftCoreOrSystem(moduleName)) return null

    const fromDir = path.dirname(fromFile)
    const srcRoot = this.findSrcRoot(projectRoot)

    if (!srcRoot) return null

    const candidates = [
      path.join(fromDir, moduleName + ".swift"),
      path.join(fromDir, moduleName + ".swiftmodule"),
      path.join(srcRoot, moduleName + ".swift"),
      path.join(srcRoot, "..", moduleName + ".swift"),
    ]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate
    }

    const moduleDir = path.join(srcRoot, moduleName)
    if (fs.existsSync(moduleDir) && fs.statSync(moduleDir).isDirectory()) {
      const swiftFiles = fs.readdirSync(moduleDir).filter((f) => f.endsWith(".swift"))
      const firstFile = swiftFiles[0]
      if (firstFile) return path.join(moduleDir, firstFile)
    }

    const found = this.searchForModule(moduleName, srcRoot)
    return found
  }

  private findSrcRoot(projectRoot: string): string | null {
    for (const candidate of ["Sources", "src", "App", ""]) {
      const dir = candidate ? path.join(projectRoot, candidate) : projectRoot
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir
      }
    }
    return projectRoot
  }

  private searchForModule(moduleName: string, searchRoot: string): string | null {
    if (!fs.existsSync(searchRoot)) return null

    const entries = fs.readdirSync(searchRoot, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name === moduleName) {
        const swiftFiles = fs.readdirSync(path.join(searchRoot, entry.name)).filter((f) => f.endsWith(".swift"))
        const firstFile = swiftFiles[0]
        if (firstFile) return path.join(searchRoot, entry.name, firstFile)
      }
    }
    return null
  }

  private isSwiftCoreOrSystem(moduleName: string): boolean {
    if (moduleName.startsWith("Swift")) return true
    if (moduleName.startsWith("Foundation")) return true
    if (moduleName.startsWith("UIKit")) return true
    if (moduleName.startsWith("AppKit")) return true
    if (moduleName.startsWith("Darwin")) return true
    if (moduleName.startsWith("ObjectiveC")) return true
    if (moduleName.startsWith("Combine")) return true
    if (moduleName.startsWith("SwiftUI")) return true
    if (moduleName.startsWith("AVFoundation")) return true
    if (moduleName.startsWith("CoreData")) return true
    if (moduleName.startsWith("CloudKit")) return true
    if (moduleName.startsWith("MapKit")) return true
    if (moduleName.startsWith("SceneKit")) return true
    if (moduleName.startsWith("SpriteKit")) return true
    if (moduleName.startsWith("WatchKit")) return true
    if (moduleName.startsWith("HealthKit")) return true
    if (moduleName.startsWith("CoreLocation")) return true
    if (moduleName.startsWith("CoreBluetooth")) return true
    if (moduleName.startsWith("UserNotifications")) return true
    return false
  }
}