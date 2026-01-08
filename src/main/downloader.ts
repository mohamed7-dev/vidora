import { chmodSync, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import * as os from 'node:os'
import { get } from 'node:https'
import { dirname } from 'node:path'

interface GetPlatformInfo {
  platform: NodeJS.Platform
  platformName: string
  arch: NodeJS.Architecture
  archName: string
  description: string
  isSupported: boolean
}

/**
 * @description
 * This class is used to downloads dependencies from the custom builds repository
 */
export class Downloader {
  /**
   * Download a file from a URL with progress tracking
   */
  static downloadFile(
    url: string,
    destinationPath: string,
    onProgress?: (downloadedBytes: number, totalBytes: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure the directory exists
      const dir = dirname(destinationPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      // Create write stream
      const file = createWriteStream(destinationPath)

      get(
        url,
        {
          headers: {
            'User-Agent': 'ffmpeg-downloader'
          }
        },
        (response) => {
          // Follow redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            file.close()
            unlinkSync(destinationPath)
            if (!response.headers.location) {
              return reject(new Error('Redirect location not found'))
            }
            return this.downloadFile(response.headers.location, destinationPath, onProgress)
              .then(resolve)
              .catch(reject)
          }

          if (response.statusCode !== 200) {
            file.close()
            unlinkSync(destinationPath)
            return reject(new Error(`Failed to download: HTTP ${response.statusCode}`))
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
          let downloadedBytes = 0

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length
            if (onProgress && totalBytes) {
              onProgress(downloadedBytes, totalBytes)
            }
          })

          response.pipe(file)

          file.on('finish', () => {
            file.close()

            // Make the binary executable (Unix-like systems)
            if (os.platform() !== 'win32') {
              try {
                chmodSync(destinationPath, 0o755)
              } catch (err) {
                console.error('Failed to make ffmpeg executable:', err)
              }
            }

            resolve()
          })
        }
      ).on('error', (err) => {
        file.close()
        if (existsSync(destinationPath)) {
          unlinkSync(destinationPath)
        }
        reject(err)
      })

      file.on('error', (err) => {
        file.close()
        if (existsSync(destinationPath)) {
          unlinkSync(destinationPath)
        }
        reject(err)
      })
    })
  }

  /**
   * Get platform and architecture information
   * @returns Object with platform, arch, and description
   */
  static getPlatformInfo(): GetPlatformInfo {
    const platform = os.platform()
    const arch = os.arch()

    let platformName = platform
    let archName = arch
    let description = ''

    // Platform names
    if (platform === 'darwin') platformName = 'macOS' as NodeJS.Platform
    else if (platform === 'win32') platformName = 'Windows' as NodeJS.Platform
    else if (platform === 'linux') platformName = 'Linux' as NodeJS.Platform

    // Architecture names
    if (arch === 'x64') {
      archName = 'x64 (amd64)'
      description = 'Intel/AMD 64-bit'
    } else if (arch === 'arm64') {
      archName = 'ARM64'
      description = platform === 'darwin' ? 'Apple Silicon (M1/M2/M3)' : 'ARM 64-bit'
    }

    return {
      platform,
      platformName,
      arch: arch as NodeJS.Architecture,
      archName,
      description,
      isSupported: this.isArchitectureSupported()
    } satisfies GetPlatformInfo
  }

  /**
   * Check if the current platform and architecture are supported
   * @returns True if supported
   */
  static isArchitectureSupported(): boolean {
    const platform = os.platform()
    const arch = os.arch()

    if (platform === 'win32') return true // Windows x64 only
    if (platform === 'darwin') return arch === 'x64' || arch === 'arm64'
    if (platform === 'linux') return arch === 'x64' || arch === 'arm64'

    return false
  }
}
