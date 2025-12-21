import { accessSync, constants, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DEFAULT_CONFIG, DEFAULT_INTERNAL_CONFIG } from './default-config'
import { AppConfig, DeepPartial } from '../../shared/types'
import { performSideEffects } from './side-effects'

let cachedConfig: AppConfig | null = null

/**
 * @description
 * This function caches the config file in memory for faster access.
 */
export function initConfigCache(): AppConfig | null {
  try {
    cachedConfig = readConfig()
    return cachedConfig
  } catch {
    cachedConfig = null
    return cachedConfig
  }
}

function ensureConfigFile(): void {
  try {
    accessSync(DEFAULT_INTERNAL_CONFIG.configFilePath, constants.R_OK)
  } catch {
    mkdirSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, { recursive: true })
    writeFileSync(DEFAULT_INTERNAL_CONFIG.configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2))
  }
}

export function readConfig(): AppConfig {
  ensureConfigFile()
  if (cachedConfig) return cachedConfig
  try {
    const raw = readFileSync(DEFAULT_INTERNAL_CONFIG.configFilePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    const merged: AppConfig = { ...DEFAULT_CONFIG, ...parsed }
    cachedConfig = merged
    return merged
  } catch {
    writeFileSync(DEFAULT_INTERNAL_CONFIG.configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2))
    cachedConfig = DEFAULT_CONFIG
    return DEFAULT_CONFIG
  }
}

export function writeConfig(config: AppConfig): void {
  mkdirSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, { recursive: true })
  writeFileSync(DEFAULT_INTERNAL_CONFIG.configFilePath, JSON.stringify(config, null, 2))
}

function mergeNamespaced(base: AppConfig, patch: DeepPartial<AppConfig>): AppConfig {
  const result: AppConfig = {
    general: { ...base.general },
    downloads: { ...base.downloads },
    downloader: { ...base.downloader }
  }

  if (patch.general) {
    result.general = { ...result.general, ...patch.general }
  }
  if (patch.downloads) {
    result.downloads = { ...result.downloads, ...patch.downloads }
  }
  if (patch.downloader) {
    result.downloader = { ...result.downloader, ...patch.downloader }
  }

  return result
}

export function updateConfig(patch: DeepPartial<AppConfig>): AppConfig {
  ensureConfigFile()
  const current = readConfig()
  const newLang = patch.general?.language
  if (patch.general && newLang) {
    patch.general.dir = newLang === 'ar' || newLang === 'fa' ? 'rtl' : 'ltr'
  }
  const merged = mergeNamespaced(current, patch)
  cachedConfig = merged
  writeConfig(merged)
  performSideEffects(patch)
  return merged
}
