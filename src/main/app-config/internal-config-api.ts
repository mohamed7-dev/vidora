import { InternalConfig } from './default-config'
import fs from 'node:fs'
import { DEFAULT_INTERNAL_CONFIG } from './default-config'
import { DeepPartial } from '../../shared/types'

let internalConfig: InternalConfig | null = null

function ensureInternalConfigFile(): void {
  try {
    fs.accessSync(DEFAULT_INTERNAL_CONFIG.internalConfigFilePath, fs.constants.R_OK)
  } catch {
    fs.mkdirSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, { recursive: true })
    fs.writeFileSync(
      DEFAULT_INTERNAL_CONFIG.internalConfigFilePath,
      JSON.stringify(DEFAULT_INTERNAL_CONFIG, null, 2)
    )
    internalConfig = DEFAULT_INTERNAL_CONFIG
  }
}

export function readInternalConfig(): InternalConfig {
  ensureInternalConfigFile()
  if (internalConfig !== null) return internalConfig
  try {
    const raw = fs.readFileSync(DEFAULT_INTERNAL_CONFIG.internalConfigFilePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<InternalConfig>
    const merged: InternalConfig = { ...DEFAULT_INTERNAL_CONFIG, ...parsed }
    internalConfig = merged
    return merged
  } catch {
    fs.writeFileSync(
      DEFAULT_INTERNAL_CONFIG.internalConfigFilePath,
      JSON.stringify(DEFAULT_INTERNAL_CONFIG, null, 2)
    )
    internalConfig = DEFAULT_INTERNAL_CONFIG
    return DEFAULT_INTERNAL_CONFIG
  }
}

export function updateInternalConfig(patch: DeepPartial<InternalConfig>): InternalConfig {
  ensureInternalConfigFile()
  const current = readInternalConfig()
  const merged = { ...current, ...patch }
  fs.writeFileSync(DEFAULT_INTERNAL_CONFIG.internalConfigFilePath, JSON.stringify(merged, null, 2))
  internalConfig = merged
  return merged
}
