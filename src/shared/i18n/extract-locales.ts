/*
 * Localization extraction script.
 *
 * Run with:
 *   pnpm i18n:extract
 * or
 *   npx tsx src/shared/i18n/extract-locales.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { LOCALE_CONFIG, type LocaleCode } from './config'

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..')
const LOCALES_DIR = path.join(PROJECT_ROOT, 'resources', 'locales')

const SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx'])
const TEMPLATE_EXTENSIONS = new Set(['.html'])
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'binaries', 'build', 'out', 'dist'])

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue
      collectSourceFiles(fullPath, files)
    } else {
      const ext = path.extname(entry.name)
      if (SCRIPT_EXTENSIONS.has(ext) || TEMPLATE_EXTENSIONS.has(ext)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

function extractKeysFromFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const ext = path.extname(filePath)

  const keys = new Set<string>()

  if (SCRIPT_EXTENSIONS.has(ext)) {
    // Tagged template usage in TS/TSX: t`foo.bar.baz`
    const taggedTemplateRegex = /\bt`([^`]+)`/g
    let match: RegExpExecArray | null
    while ((match = taggedTemplateRegex.exec(content)) !== null) {
      const key = match[1].trim()
      if (key) keys.add(key)
    }
  } else if (TEMPLATE_EXTENSIONS.has(ext)) {
    // HTML templates: any attribute whose name starts with data-i18n
    // Examples:
    //   data-i18n="home.pageTitle"
    //   data-i18n-placeholder="home.placeholder"
    //   data-i18n-aria-label="buttons.ok"
    const dataI18nAttrRegex = /\bdata-i18n[\w-]*\s*=\s*"([^"]+)"/g
    let m: RegExpExecArray | null
    while ((m = dataI18nAttrRegex.exec(content)) !== null) {
      const key = m[1].trim()
      if (key) keys.add(key)
    }
  }

  return [...keys]
}

function loadLocale(locale: LocaleCode): Record<string, unknown> {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`)
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch (e) {
    // If parsing fails, start from empty to avoid crashing the whole script
    console.warn(`Failed to parse ${filePath}, starting from empty locale.`, e)
    return {}
  }
}

function ensureNestedKey(
  root: Record<string, unknown>,
  keyPath: string[],
  defaultValue: string
): void {
  let cur: Record<string, unknown> = root

  for (let i = 0; i < keyPath.length; i++) {
    const seg = keyPath[i]!
    const isLeaf = i === keyPath.length - 1

    if (isLeaf) {
      if (typeof cur[seg] === 'undefined') {
        cur[seg] = defaultValue
      }
    } else {
      const next = cur[seg]
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        const obj: Record<string, unknown> = {}
        cur[seg] = obj
        cur = obj
      } else {
        cur = next as Record<string, unknown>
      }
    }
  }
}

function writeLocale(locale: LocaleCode, data: Record<string, unknown>): void {
  if (!fs.existsSync(LOCALES_DIR)) {
    fs.mkdirSync(LOCALES_DIR, { recursive: true })
  }

  const filePath = path.join(LOCALES_DIR, `${locale}.json`)
  const json = JSON.stringify(data, null, 2)
  fs.writeFileSync(filePath, `${json}\n`, 'utf8')
}

function main(): void {
  console.log('Scanning project for t`` calls...')

  const sourceFiles = collectSourceFiles(PROJECT_ROOT)
  const allKeys = new Set<string>()

  for (const file of sourceFiles) {
    const keys = extractKeysFromFile(file)
    keys.forEach((k) => allKeys.add(k))
  }

  console.log(`Found ${allKeys.size} unique localization keys.`)

  if (allKeys.size === 0) {
    console.log('No keys found. Nothing to do.')
    return
  }

  for (const locale of LOCALE_CONFIG.locales) {
    console.log(`\nUpdating locale: ${locale}`)
    const localeData = loadLocale(locale)

    for (const key of allKeys) {
      const segments = key.split('.').filter(Boolean)
      if (segments.length === 0) continue

      const defaultValue =
        locale === LOCALE_CONFIG.defaultLocale ? (segments[segments.length - 1] ?? key) : key
      ensureNestedKey(localeData, segments, defaultValue)
    }

    writeLocale(locale, localeData)
    console.log(`Locale ${locale} updated.`)
  }

  console.log('\nLocalization extraction completed.')
}

main()
