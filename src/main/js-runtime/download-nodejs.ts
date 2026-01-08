/*
This module is currently not used, it's useful if we want to download nodejs at runtime
which is not the case at the moment, right now nodejs is bundles with the app code.
*/

import * as os from 'node:os'
import { DEPS_BASE_URL } from '../constants'
import { Downloader } from '../downloader'

const BASE_URL = DEPS_BASE_URL

/**
 * @description
 * Downloads nodejs from the custom builds repository
 */
export class NodejsDownloader {
  /**
   * Get the download URL for the current platform and architecture
   * @returns The GitHub URL for the platform-specific nodejs binary
   */
  static getDownloadUrl(): string {
    const platform = os.platform()
    const arch = os.arch() // 'x64', 'arm64', 'arm', etc.

    switch (platform) {
      case 'win32':
        // Windows only has x64 build available
        return `${BASE_URL}/node.exe`

      case 'linux':
        if (arch === 'arm64') {
          return `${BASE_URL}/nodejs-linux-arm64` // ARM64 (Raspberry Pi 4, etc.)
        } else if (arch === 'x64') {
          return `${BASE_URL}/nodejs-linux-amd64` // Standard x64 Linux
        } else {
          throw new Error(
            `Unsupported Linux architecture: ${arch}. Only x64 and arm64 are supported.`
          )
        }

      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Download nodejs to the specified path
   * @param destinationPath - Where to save nodejs
   * @param onProgress - Optional progress callback
   * @returns The path to the downloaded nodejs binary
   */
  static async downloadFfmpeg(
    destinationPath: string,
    onProgress?: (downloadedBytes: number, totalBytes: number) => void
  ): Promise<string> {
    const url = this.getDownloadUrl()
    console.log(`Downloading nodejs from: ${url}`)
    console.log(`Saving to: ${destinationPath}`)

    await Downloader.downloadFile(url, destinationPath, onProgress)

    console.log('nodejs downloaded successfully')
    return destinationPath
  }

  /**
   * Get the default path where nodejs should be stored
   * @returns The default path for nodejs
   */
  static async getDefaultPath(defaultPath?: string): Promise<string> {
    let nodejsRuntimePath = defaultPath
    if (!defaultPath) {
      nodejsRuntimePath = await import('../app-config/internal-config-api').then(
        (mod) => mod.readInternalConfig().jsRuntimePath ?? undefined
      )
    }
    if (!nodejsRuntimePath) return ''
    return nodejsRuntimePath
  }
}
