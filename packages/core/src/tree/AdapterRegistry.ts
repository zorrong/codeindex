/**
 * DefaultAdapterRegistry — implementation mặc định của AdapterRegistry.
 * Core engine dùng cái này để tìm adapter phù hợp cho từng file.
 */

import type { AdapterRegistry, LanguageAdapter } from "../types/LanguageAdapter.js"
import type { SupportedLanguage } from "../types/RawSymbol.js"
import * as path from "path"

export class DefaultAdapterRegistry implements AdapterRegistry {
  private readonly adapters: Map<SupportedLanguage, LanguageAdapter> = new Map()
  private readonly extensionMap: Map<string, LanguageAdapter> = new Map()

  register(adapter: LanguageAdapter): void {
    this.adapters.set(adapter.language, adapter)
    for (const ext of adapter.fileExtensions) {
      this.extensionMap.set(ext.toLowerCase(), adapter)
    }
  }

  findAdapter(filePath: string): LanguageAdapter | null {
    const ext = path.extname(filePath).toLowerCase()
    return this.extensionMap.get(ext) ?? null
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.adapters.keys())
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys())
  }
}
