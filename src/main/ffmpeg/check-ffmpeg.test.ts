import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// Mock status bus
vi.mock('./check-ffmpeg-status-bus', () => {
  return {
    begin: vi.fn(),
    complete: vi.fn(),
    error: vi.fn(),
    progress: vi.fn()
  }
})

// Mock config API
vi.mock('../app-config/internal-config-api', () => ({
  readInternalConfig: vi.fn()
}))

// Mock fs / os
vi.mock('node:fs', () => {
  const existsSync = vi.fn()
  const promises = { access: vi.fn() }
  const chmodSync = vi.fn()
  const createWriteStream = vi.fn()
  const mkdirSync = vi.fn()
  const unlinkSync = vi.fn()

  return {
    existsSync,
    promises,
    chmodSync,
    createWriteStream,
    mkdirSync,
    unlinkSync,
    default: {
      existsSync,
      promises,
      chmodSync,
      createWriteStream,
      mkdirSync,
      unlinkSync
    }
  }
})

vi.mock('node:os', () => {
  const platform = vi.fn()
  const arch = vi.fn()
  return {
    platform,
    arch,
    default: { platform, arch }
  }
})

// Avoid real network
vi.mock('node:https', () => {
  const get = vi.fn()
  return {
    get,
    default: { get }
  }
})

vi.mock('node:child_process', () => {
  const execSync = vi.fn()

  return {
    execSync,
    default: { execSync }
  }
})

// Keep constants simple
vi.mock('../constants', () => ({
  FFMPEG_BASE_URL: 'https://example.com/ffmpeg'
}))

// Shared references to mocks
import * as statusBus from './check-ffmpeg-status-bus'
import { readInternalConfig } from '../app-config/internal-config-api'
import { existsSync, promises } from 'node:fs'
import * as os from 'node:os'

describe('ensureFfmpegPath / checkFFmpeg', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    ;(os.platform as unknown as Mock).mockReturnValue('linux')
    ;(os.arch as unknown as Mock).mockReturnValue('x64')
    delete process.env.YALLA_DOWNLOAD_FFMPEG_PATH
  })

  async function loadModule(): Promise<typeof import('./check-ffmpeg')> {
    // fresh module instance each time so memoized promise is reset
    return await import('./check-ffmpeg')
  }

  async function loadDownloadFFmpegModule(): Promise<typeof import('./ffmpeg-downloader')> {
    return await import('./ffmpeg-downloader')
  }

  it('uses ENV path when YALLA_DOWNLOAD_FFMPEG_PATH exists', async () => {
    ;(readInternalConfig as Mock).mockReturnValue({ ffmpegPath: '/app/ffmpeg' })
    ;(existsSync as Mock).mockReturnValue(true)
    process.env.YALLA_DOWNLOAD_FFMPEG_PATH = '/env/ffmpeg'

    const { ensureFfmpegPath } = await loadModule()
    const result = await ensureFfmpegPath()

    expect(result).toBe('/env/ffmpeg')
    expect(statusBus.begin).toHaveBeenCalled()
    expect(statusBus.complete).toHaveBeenCalled()
    expect(statusBus.error).not.toHaveBeenCalled()
  })

  it('returns existing ffmpeg path when already downloaded', async () => {
    ;(readInternalConfig as Mock).mockReturnValue({ ffmpegPath: '/user-data/ffmpeg' })
    ;(promises.access as Mock).mockResolvedValue(undefined)

    const { ensureFfmpegPath } = await loadModule()
    const result = await ensureFfmpegPath()

    expect(result).toBe('/user-data/ffmpeg')
    expect(promises.access).toHaveBeenCalledWith('/user-data/ffmpeg')
    expect(statusBus.begin).toHaveBeenCalled()
    expect(statusBus.complete).toHaveBeenCalled()
    expect(statusBus.error).not.toHaveBeenCalled()
  })

  it('downloads ffmpeg when missing and returns its path', async () => {
    ;(readInternalConfig as Mock).mockReturnValue({ ffmpegPath: '/user-data/ffmpeg' })
    ;(promises.access as Mock).mockRejectedValue(new Error('not found'))

    const { FfmpegDownloader } = await loadDownloadFFmpegModule()

    // Spy on the static download method so we don't hit network
    const downloadSpy = vi
      .spyOn(FfmpegDownloader, 'downloadFfmpeg')
      .mockResolvedValue('/user-data/ffmpeg')

    const { ensureFfmpegPath } = await loadModule()
    const result = await ensureFfmpegPath()

    expect(result).toBe('/user-data/ffmpeg')
    expect(downloadSpy).toHaveBeenCalledWith(
      '/user-data/ffmpeg',
      expect.any(Function) // onProgress
    )
    expect(statusBus.begin).toHaveBeenCalled()
    expect(statusBus.error).not.toHaveBeenCalled()
    expect(statusBus.complete).toHaveBeenCalled()
  })

  it('returns null and reports error when download fails', async () => {
    ;(readInternalConfig as Mock).mockReturnValue({ ffmpegPath: '/user-data/ffmpeg' })
    ;(promises.access as Mock).mockRejectedValue(new Error('not found'))

    const { FfmpegDownloader } = await loadDownloadFFmpegModule()

    vi.spyOn(FfmpegDownloader, 'downloadFfmpeg').mockRejectedValue(new Error('network error'))

    const { ensureFfmpegPath } = await loadModule()

    const result = await ensureFfmpegPath()

    expect(result).toBeNull()
    expect(statusBus.error).toHaveBeenCalled()
    expect(statusBus.complete).toHaveBeenCalled()
  })
})
