import { accessSync, constants, mkdirSync } from 'node:fs'
import { DEFAULT_INTERNAL_CONFIG } from '../app-config/default-config'

function ensureConfigDir(): void {
  try {
    accessSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, constants.R_OK)
  } catch {
    mkdirSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, { recursive: true })
  }
}

function ensureBinDir(): void {
  try {
    accessSync(DEFAULT_INTERNAL_CONFIG.binFolderPath, constants.R_OK)
  } catch {
    mkdirSync(DEFAULT_INTERNAL_CONFIG.binFolderPath, { recursive: true })
  }
}

/**
 * @description
 * This function initializes directories needed by the application
 */
export function initDirectories(): void {
  ensureConfigDir()
  ensureBinDir()
}
