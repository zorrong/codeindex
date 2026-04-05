/**
 * TreeBuilder — build IndexTree từ ParsedFiles.
 * Flow: group files → build nodes → generate LLM summaries → assemble tree
 */

import type { IndexTree, ProjectNode, ModuleNode, FileNode, SymbolNode, TreeIndex } from "../types/TreeNode.js"
import type { ParsedFile, RawSymbol } from "../types/RawSymbol.js"
import type { LLMClient } from "../types/LLMClient.js"
import { SummaryGenerator } from "../llm/SummaryGenerator.js"
import { FileSystemIndexStore } from "../storage/FileSystemIndexStore.js"
import * as path from "path"

export interface TreeBuilderOptions {
  projectRoot: string
  projectName?: string
  llmClient: LLMClient
  verbose?: boolean
}

export class TreeBuilder {
  private readonly summaryGen: SummaryGenerator
  private readonly options: TreeBuilderOptions

  constructor(options: TreeBuilderOptions) {
    this.options = options
    this.summaryGen = new SummaryGenerator(options.llmClient)
  }

  async build(files: ParsedFile[]): Promise<IndexTree> {
    const { projectRoot, projectName, verbose } = this.options
    const log = verbose === true ? console.log : () => {}

    log(`[TreeBuilder] Building index for ${files.length} files...`)

    const nodes: TreeIndex = {}

    // Step 1: Generate file summaries
    log("[TreeBuilder] Generating file summaries...")
    const fileSummaries = await this.summaryGen.generateFileSummaries(files, 5)

    // Step 2: Build FileNodes + SymbolNodes
    const moduleMap = new Map<string, string[]>()

    for (const file of files) {
      const fileNodeId = `file:${file.relativePath}`
      const summary = fileSummaries.get(file.relativePath)

      const symbolNodeIds: string[] = []
      for (const symbol of file.symbols) {
        const symbolNodeId = `sym:${file.relativePath}:${symbol.name}`
        const symbolNode: SymbolNode = {
          nodeId: symbolNodeId,
          title: symbol.name,
          level: "symbol",
          shortSummary: symbol.docComment ?? symbol.signature,
          filePath: file.relativePath,
          signature: symbol.signature,
          fullSource: symbol.fullSource,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
          kind: symbol.kind,
          isExported: symbol.isExported,
          internalRefs: this.extractInternalRefs(symbol, file),
          children: [],
          parentId: fileNodeId,
        }
        nodes[symbolNodeId] = symbolNode
        symbolNodeIds.push(symbolNodeId)
      }

      const gitHash = FileSystemIndexStore.getFileGitHash(file.filePath, projectRoot)
      const fileNode: FileNode = {
        nodeId: fileNodeId,
        title: path.basename(file.relativePath),
        level: "file",
        shortSummary: summary?.shortSummary ?? `${file.relativePath} — TypeScript module`,
        detailedSummary: summary?.detailedSummary,
        filePath: file.relativePath,
        gitHash,
        indexedAt: Date.now(),
        exports: file.exports,
        internalDeps: file.internalImports,
        externalDeps: file.externalImports,
        children: symbolNodeIds,
        parentId: undefined,
      }
      nodes[fileNodeId] = fileNode

      const dirPath = path.dirname(file.relativePath)
      const existing = moduleMap.get(dirPath) ?? []
      existing.push(fileNodeId)
      moduleMap.set(dirPath, existing)
    }

    // Step 3: Build ModuleNodes
    const sortedDirs = Array.from(moduleMap.keys()).sort((a, b) => {
      if (a === ".") return -1
      if (b === ".") return 1
      const depthA = a.split(path.sep).filter(Boolean).length
      const depthB = b.split(path.sep).filter(Boolean).length
      return depthA - depthB
    })

    const moduleSummaryInputs = sortedDirs.map((dirPath) => {
      const fileIds = moduleMap.get(dirPath) ?? []
      return {
        dirPath,
        fileSummaries: fileIds.map((id) => {
          const node = nodes[id] as FileNode
          return {
            relativePath: node?.filePath ?? "",
            shortSummary: node?.shortSummary ?? "",
            detailedSummary: node?.detailedSummary ?? "",
          }
        }).filter((f) => f.relativePath),
      }
    })

    const moduleSummaryResults = await Promise.all(
      moduleSummaryInputs.map((input) =>
        this.summaryGen.generateModuleSummary(input.dirPath, input.fileSummaries)
      )
    )

    const rootModuleIds: string[] = []

    for (let i = 0; i < sortedDirs.length; i++) {
      const dirPath = sortedDirs[i]!
      const fileIds = moduleMap.get(dirPath) ?? []
      const summaryResult = moduleSummaryResults[i]!
      const moduleNodeId = `mod:${dirPath}`
      const parentDir = path.dirname(dirPath)
      const parentModuleId =
        parentDir !== dirPath && moduleMap.has(parentDir)
          ? `mod:${parentDir}`
          : undefined

      const moduleNode: ModuleNode = {
        nodeId: moduleNodeId,
        title: dirPath === "." ? (projectName ?? path.basename(projectRoot)) : path.basename(dirPath),
        level: "module",
        shortSummary: summaryResult.shortSummary,
        dirPath,
        children: [...fileIds], // Will append sub-modules later
        parentId: parentModuleId,
      }
      nodes[moduleNodeId] = moduleNode

      // Link to parent module if it exists
      if (parentModuleId && nodes[parentModuleId]) {
        const parentNode = nodes[parentModuleId] as ModuleNode
        if (!parentNode.children.includes(moduleNodeId)) {
          parentNode.children.push(moduleNodeId)
        }
      }

      for (const fileId of fileIds) {
        const fileNode = nodes[fileId] as FileNode
        if (fileNode) fileNode.parentId = moduleNodeId
      }

      if (!parentModuleId) rootModuleIds.push(moduleNodeId)
    }

    // Step 4: Build ProjectNode
    const projectNodeId = "project:root"
    const projectNode: ProjectNode = {
      nodeId: projectNodeId,
      title: projectName ?? path.basename(projectRoot),
      level: "project",
      shortSummary: `TypeScript project with ${files.length} files across ${moduleMap.size} modules`,
      rootPath: projectRoot,
      primaryLanguage: "typescript",
      children: rootModuleIds,
    }
    nodes[projectNodeId] = projectNode

    for (const modId of rootModuleIds) {
      const modNode = nodes[modId] as ModuleNode
      if (modNode) modNode.parentId = projectNodeId
    }

    return { root: projectNode, nodes, version: "1.0.0", builtAt: Date.now() }
  }

  async updatePartial(existingTree: IndexTree, changedFiles: ParsedFile[]): Promise<IndexTree> {
    const nodes = { ...existingTree.nodes }
    const fileSummaries = await this.summaryGen.generateFileSummaries(changedFiles, 5)

    for (const file of changedFiles) {
      const fileNodeId = `file:${file.relativePath}`

      for (const key of Object.keys(nodes)) {
        if (key.startsWith(`sym:${file.relativePath}:`)) delete nodes[key]
      }

      const symbolNodeIds: string[] = []
      for (const symbol of file.symbols) {
        const symbolNodeId = `sym:${file.relativePath}:${symbol.name}`
        const symbolNode: SymbolNode = {
          nodeId: symbolNodeId,
          title: symbol.name,
          level: "symbol",
          shortSummary: symbol.docComment ?? symbol.signature,
          filePath: file.relativePath,
          signature: symbol.signature,
          fullSource: symbol.fullSource,
          startLine: symbol.startLine,
          endLine: symbol.endLine,
          kind: symbol.kind,
          isExported: symbol.isExported,
          internalRefs: this.extractInternalRefs(symbol, file),
          children: [],
          parentId: fileNodeId,
        }
        nodes[symbolNodeId] = symbolNode
        symbolNodeIds.push(symbolNodeId)
      }

      const summary = fileSummaries.get(file.relativePath)
      const existing = nodes[fileNodeId] as FileNode | undefined
      const gitHash = FileSystemIndexStore.getFileGitHash(file.filePath, this.options.projectRoot)

      const fileNode: FileNode = {
        nodeId: fileNodeId,
        title: path.basename(file.relativePath),
        level: "file",
        shortSummary: summary?.shortSummary ?? existing?.shortSummary ?? file.relativePath,
        detailedSummary: summary?.detailedSummary ?? existing?.detailedSummary,
        filePath: file.relativePath,
        gitHash,
        indexedAt: Date.now(),
        exports: file.exports,
        internalDeps: file.internalImports,
        externalDeps: file.externalImports,
        children: symbolNodeIds,
        parentId: existing?.parentId,
      }
      nodes[fileNodeId] = fileNode
    }

    return { ...existingTree, nodes, builtAt: Date.now() }
  }

  private extractInternalRefs(symbol: RawSymbol, file: ParsedFile): string[] {
    const refs: string[] = []
    for (const imp of file.internalImports) {
      const baseName = path.basename(imp, path.extname(imp))
      if (symbol.fullSource.includes(baseName)) refs.push(imp)
    }
    return refs
  }
}
