#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i++
      }
    }
  }
  return args
}

function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if ([
        'node_modules', '.git', '.index', 'dist', 'build', 'coverage', '.next', '.turbo'
      ].includes(entry.name)) continue
      walk(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

function isSourceFile(file) {
  return [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md'
  ].includes(path.extname(file).toLowerCase())
}

function getFullDumpStats(projectRoot) {
  const files = walk(projectRoot).filter(isSourceFile)
  let totalChars = 0
  for (const file of files) {
    try {
      totalChars += fs.readFileSync(file, 'utf8').length
    } catch {}
  }
  return {
    fileCount: files.length,
    chars: totalChars,
    estimatedTokens: estimateTokens('x'.repeat(totalChars)),
  }
}

function runCodeIndexQuery(projectRoot, query, maxTokens = 4000) {
  const cliPath = path.resolve(process.cwd(), 'packages/cli/dist/cli.js')
  const started = Date.now()
  const stdout = execFileSync(
    process.execPath,
    [cliPath, 'query', query, '--cwd', projectRoot, '--format', 'json', '--max-tokens', String(maxTokens)],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    }
  )
  const latencyMs = Date.now() - started
  const parsed = JSON.parse(stdout)
  return {
    latencyMs,
    raw: parsed,
    estimatedTokens: parsed.estimatedTokens ?? estimateTokens(parsed.context ?? ''),
  }
}

function ratio(found, total) {
  if (total === 0) return 1
  return found / total
}

function evaluateCase(result, testCase) {
  const files = Array.isArray(result.raw.files) ? result.raw.files : []
  const foundPaths = new Set(files.map((f) => String(f.path || '')))
  const foundSymbols = new Set(files.flatMap((f) => Array.isArray(f.symbols) ? f.symbols.map(String) : []))

  const expectedFiles = Array.isArray(testCase.expectedFiles) ? testCase.expectedFiles : []
  const expectedSymbols = Array.isArray(testCase.expectedSymbols) ? testCase.expectedSymbols : []

  const fileHits = expectedFiles.filter((item) => foundPaths.has(item))
  const symbolHits = expectedSymbols.filter((item) => foundSymbols.has(item))

  return {
    fileHits,
    symbolHits,
    fileHitRate: ratio(fileHits.length, expectedFiles.length),
    symbolHitRate: ratio(symbolHits.length, expectedSymbols.length),
  }
}

function renderMarkdown(summary) {
  const lines = []
  lines.push(`# CodeIndex Benchmark Report`)
  lines.push('')
  lines.push(`- Project: \`${summary.projectRoot}\``)
  lines.push(`- GeneratedAt: ${summary.generatedAt}`)
  lines.push(`- FullDump Files: ${summary.fullDump.fileCount}`)
  lines.push(`- FullDump Estimated Tokens: ${summary.fullDump.estimatedTokens}`)
  lines.push('')
  lines.push('| ID | Query | CodeIndex Tokens | Full Dump Tokens | Latency (ms) | File Hit Rate | Symbol Hit Rate |')
  lines.push('|---|---|---:|---:|---:|---:|---:|')
  for (const row of summary.results) {
    lines.push(`| ${row.id} | ${row.query.replace(/\|/g, '\\|')} | ${row.codeindexTokens} | ${row.fullDumpTokens} | ${row.latencyMs} | ${(row.fileHitRate * 100).toFixed(0)}% | ${(row.symbolHitRate * 100).toFixed(0)}% |`)
  }
  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- Token estimate hiện tại dùng công thức gần đúng `chars / 4`.')
  lines.push('- Benchmark này ưu tiên chạy được ngay trên repo thật.')
  return lines.join('\n')
}

function main() {
  const args = parseArgs(process.argv)
  const projectRoot = path.resolve(String(args.project || '.'))
  const queriesPath = path.resolve(String(args.queries || 'benchmarks/queries.json'))
  const outDir = path.resolve(String(args.outDir || 'benchmarks/output'))

  if (!fs.existsSync(projectRoot)) {
    console.error(`Project not found: ${projectRoot}`)
    process.exit(1)
  }

  if (!fs.existsSync(queriesPath)) {
    console.error(`Queries file not found: ${queriesPath}`)
    process.exit(1)
  }

  const queryCases = JSON.parse(fs.readFileSync(queriesPath, 'utf8'))
  const fullDump = getFullDumpStats(projectRoot)

  const results = []
  for (const testCase of queryCases) {
    const queryResult = runCodeIndexQuery(projectRoot, testCase.query)
    const evalResult = evaluateCase(queryResult, testCase)

    results.push({
      id: testCase.id,
      query: testCase.query,
      codeindexTokens: queryResult.estimatedTokens,
      fullDumpTokens: fullDump.estimatedTokens,
      latencyMs: queryResult.latencyMs,
      fileHitRate: evalResult.fileHitRate,
      symbolHitRate: evalResult.symbolHitRate,
      fileHits: evalResult.fileHits,
      symbolHits: evalResult.symbolHits,
      filesReturned: queryResult.raw.files,
      traversalPath: queryResult.raw.traversalPath,
    })
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    fullDump,
    results,
  }

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(summary, null, 2))
  fs.writeFileSync(path.join(outDir, 'latest.md'), renderMarkdown(summary))

  console.log(`✅ Benchmark complete`)
  console.log(`JSON: ${path.join(outDir, 'latest.json')}`)
  console.log(`MD:   ${path.join(outDir, 'latest.md')}`)
}

main()
