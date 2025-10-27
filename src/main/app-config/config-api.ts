import fs from 'node:fs'
import { DEFAULT_CONFIG, DEFAULT_INTERNAL_CONFIG } from './default-config'
import { useTray } from '../tray'
import { updateBrowserLocale } from '../i18n'
import { AppConfig, DeepPartial } from '../../shared/types'
import { success } from '../status-bus'

function ensureConfigFile(): void {
  try {
    fs.accessSync(DEFAULT_INTERNAL_CONFIG.configFilePath, fs.constants.R_OK)
  } catch {
    fs.mkdirSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, { recursive: true })
    fs.writeFileSync(
      DEFAULT_INTERNAL_CONFIG.configFilePath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    )
  }
}

export function readConfig(): AppConfig {
  ensureConfigFile()
  try {
    const raw = fs.readFileSync(DEFAULT_INTERNAL_CONFIG.configFilePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    const merged: AppConfig = { ...DEFAULT_CONFIG, ...parsed }
    return merged
  } catch {
    fs.writeFileSync(
      DEFAULT_INTERNAL_CONFIG.configFilePath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    )
    return DEFAULT_CONFIG
  }
}

export function writeConfig(config: AppConfig): void {
  fs.mkdirSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, { recursive: true })
  fs.writeFileSync(DEFAULT_INTERNAL_CONFIG.configFilePath, JSON.stringify(config, null, 2))
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

function performSideEffects(patch: DeepPartial<AppConfig>): void {
  if (typeof patch.general?.closeToTray === 'boolean') {
    useTray(patch.general.closeToTray)
    success(
      'configTray',
      patch.general.closeToTray ? 'status.config.tray.enabled' : 'status.config.tray.disabled'
    )
  }
  if (patch.general?.language) {
    updateBrowserLocale(patch.general.language)
  }
}

export function updateConfig(patch: DeepPartial<AppConfig>): AppConfig {
  ensureConfigFile()
  const current = readConfig()
  const newLang = patch.general?.language
  if (patch.general && newLang) {
    patch.general.dir = newLang === 'ar' || newLang === 'fa' ? 'rtl' : 'ltr'
  }
  const merged = mergeNamespaced(current, patch)
  writeConfig(merged)
  performSideEffects(patch)
  return merged
}
