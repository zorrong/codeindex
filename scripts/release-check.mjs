import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)))
const packagesDir = join(rootDir, "packages")

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"))
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function getPublicPackages() {
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(packagesDir, entry.name)
      const manifestPath = join(dir, "package.json")
      const manifest = readJson(manifestPath)
      return {
        dir,
        manifestPath,
        manifest,
      }
    })
    .filter(({ manifest }) => manifest.private !== true)
}

function ensureReleaseArtifacts(pkg) {
  const readmePath = join(pkg.dir, "README.md")
  const distDir = join(pkg.dir, "dist")

  if (!existsSync(readmePath)) {
    throw new Error(`${pkg.manifest.name}: missing README.md`)
  }

  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    throw new Error(`${pkg.manifest.name}: missing dist/ (run pnpm -r build first)`)
  }
}

function packPackage(pkg, packDir) {
  const before = new Set(readdirSync(packDir))
  run("pnpm", ["pack", "--pack-destination", packDir], pkg.dir)

  const created = readdirSync(packDir)
    .filter((fileName) => fileName.endsWith(".tgz") && !before.has(fileName))
    .map((fileName) => join(packDir, fileName))

  if (created.length !== 1) {
    throw new Error(`${pkg.manifest.name}: expected exactly one tarball, found ${created.length}`)
  }

  return created[0]
}

function readPackedManifest(tarballPath) {
  const content = run("tar", ["-xOf", tarballPath, "package/package.json"], rootDir)
  return JSON.parse(content)
}

function findWorkspaceProtocols(manifest) {
  const sections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]

  const hits = []
  for (const section of sections) {
    const deps = manifest[section]
    if (!deps) continue

    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === "string" && version.includes("workspace:")) {
        hits.push(`${section}.${name}=${version}`)
      }
    }
  }

  return hits
}

function main() {
  const packDir = mkdtempSync(join(tmpdir(), "codeindex-release-check-"))
  const publicPackages = getPublicPackages()

  try {
    const results = []

    for (const pkg of publicPackages) {
      ensureReleaseArtifacts(pkg)
      const tarballPath = packPackage(pkg, packDir)
      const packedManifest = readPackedManifest(tarballPath)
      const workspaceHits = findWorkspaceProtocols(packedManifest)

      if (workspaceHits.length > 0) {
        throw new Error(
          `${pkg.manifest.name}: packed manifest still contains workspace protocol values: ${workspaceHits.join(", ")}`
        )
      }

      results.push({
        name: packedManifest.name,
        version: packedManifest.version,
        tarball: tarballPath,
      })
    }

    console.log("Release check passed for public packages:")
    for (const result of results) {
      console.log(`- ${result.name}@${result.version}`)
    }
  } finally {
    rmSync(packDir, { recursive: true, force: true })
  }
}

main()
