import { chmodSync, createWriteStream, existsSync, mkdirSync, promises, unlinkSync } from 'node:fs'
import * as os from 'node:os'
import { execSync } from 'node:child_process'
import { get } from 'node:https'
import { dirname, join } from 'node:path'
import { readInternalConfig } from '../app-config/internal-config-api'
import { begin, complete, error, progress } from './check-ffmpeg-status-bus'
import { DATA } from '../../shared/data'

const BASE_URL = 'https://github.com/mohamed7-dev/built-ffmpeg/releases/download/V6'

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
 * Downloads ffmpeg from the custom builds repository
 * Uses the same binaries as the shell scripts (linux.sh, mac.sh, windows.sh)
 */
export class FfmpegDownloader {
  /**
   * Get the download URL for the current platform and architecture
   * @returns The GitHub URL for the platform-specific ffmpeg binary
   */
  static getDownloadUrl(): string {
    const platform = os.platform()
    const arch = os.arch() // 'x64', 'arm64', 'arm', etc.

    switch (platform) {
      case 'win32':
        // Windows only has x64 build available
        return `${BASE_URL}/ffmpeg-windows.exe`

      case 'darwin': // macOS
        if (arch === 'arm64') {
          return `${BASE_URL}/ffmpeg-mac-arm64` // Apple Silicon (M1, M2, etc.)
        } else {
          return `${BASE_URL}/ffmpeg-mac-amd64` // Intel Macs
        }

      case 'linux':
        if (arch === 'arm64') {
          return `${BASE_URL}/ffmpeg-linux-arm64` // ARM64 (Raspberry Pi 4, etc.)
        } else if (arch === 'x64') {
          return `${BASE_URL}/ffmpeg-linux-amd64` // Standard x64 Linux
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
            'User-Agent': `${DATA.appName}-ffmpeg-downloader`
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
   * Download ffmpeg to the specified path
   * @param destinationPath - Where to save ffmpeg
   * @param onProgress - Optional progress callback
   * @returns The path to the downloaded ffmpeg binary
   */
  static async downloadFfmpeg(
    destinationPath: string,
    onProgress?: (downloadedBytes: number, totalBytes: number) => void
  ): Promise<string> {
    const url = this.getDownloadUrl()
    console.log(`Downloading ffmpeg from: ${url}`)
    console.log(`Saving to: ${destinationPath}`)

    await this.downloadFile(url, destinationPath, onProgress)

    console.log('ffmpeg downloaded successfully')
    return destinationPath
  }

  /**
   * Get the default path where ffmpeg should be stored
   * @returns The default path for ffmpeg
   */
  static async getDefaultPath(defaultPath?: string): Promise<string> {
    let ffmpegPath = defaultPath
    if (!defaultPath) {
      ffmpegPath = await import('../app-config/internal-config-api').then(
        (mod) => mod.readInternalConfig().ffmpegPath
      )
    }
    if (!ffmpegPath) return ''
    return ffmpegPath
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

/**
 * @description
 * Checks if ffmpeg is installed
 * @returns path to ffmpeg or null if it fails
 */
export async function checkFFmpeg(): Promise<string | null> {
  const ffmpegPath = readInternalConfig().ffmpegPath

  begin()
  // if env variable exist, prioritize it
  if (process.env.YALLA_DOWNLOAD_FFMPEG_PATH) {
    if (existsSync(process.env.YALLA_DOWNLOAD_FFMPEG_PATH)) {
      complete()
      return String(process.env.YALLA_DOWNLOAD_FFMPEG_PATH)
    }
    error(
      new Error(
        "YALLA_DOWNLOAD_FFMPEG_PATH ENV variable is used, but the file doesn't exist there."
      ),
      "YALLA_DOWNLOAD_FFMPEG_PATH ENV variable is used, but the file doesn't exist there.",
      'status.ffmpeg.env_missing' // TODO: change
    )
    return null
  }

  // if platform is bsd, then use ffmpeg from the system
  if (os.platform() === 'freebsd') {
    try {
      const ffmpegPath = execSync('which ffmpeg').toString().trim()
      if (existsSync(ffmpegPath)) {
        complete()
        return ffmpegPath
      }
    } catch {
      error(
        new Error('Ffmpeg is not found on freebsd'),
        'Ffmpeg is not found on freebsd',
        'status.ffmpeg.not_found_freebsd' // TODO: change
      )
      return null
    }
  }

  // check if already downloaded in user data directory
  try {
    await promises.access(ffmpegPath)
    complete()
    return ffmpegPath
  } catch {
    console.log('ffmpeg not found, downloading...')
    try {
      await FfmpegDownloader.downloadFfmpeg(ffmpegPath, (downloaded, total) => {
        const percent = Math.round((downloaded / total) * 100)
        progress(percent, 'Downloading ffmpeg...', 'status.ffmpeg.downloading') // TODO: change
      })
      complete()
      return ffmpegPath
    } catch (downloadError) {
      console.error('Failed to download ffmpeg:', downloadError)
      // Fallback: Try bundled ffmpeg if download fails
      const bundledPath =
        os.platform() === 'win32'
          ? join(__dirname, '..', '..', 'ffmpeg.exe')
          : join(__dirname, '..', '..', 'ffmpeg')

      if (existsSync(bundledPath)) {
        console.log('Using bundled ffmpeg as fallback')
        complete()
        return bundledPath
      }
      error(
        new Error('Failed to download ffmpeg and no bundled version found.'),
        'Failed to download ffmpeg',
        'status.ffmpeg.download_failed' // TODO: change
      )
      throw new Error('Failed to download ffmpeg and no bundled version found.')
    }
  }
}
