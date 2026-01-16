/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

// Mock status bus
vi.mock('./check-ytlp-status-bus', () => {
  return {
    begin: vi.fn(),
    complete: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    progress: vi.fn()
  }
})

// Mock config API
vi.mock('../app-config/internal-config-api', () => ({
  readInternalConfig: vi.fn()
}))

// Mock fs / fs.promises / os / electron-toolkit utils / yt-dlp-wrap-plus
vi.mock('node:fs', () => {
  const existsSync = vi.fn()
  const promises = { access: vi.fn() }
  return {
    existsSync,
    promises,
    // provide default for Vitest’s ESM interop
    default: { existsSync, promises }
  }
})

vi.mock('node:fs/promises', () => {
  return {
    access: vi.fn()
  }
})

vi.mock('node:os', () => {
  const platform = vi.fn()
  return {
    platform,
    default: { platform }
  }
})
vi.mock('@electron-toolkit/utils', () => ({
  platform: { isMacOS: false }
}))
vi.mock('yt-dlp-wrap-plus', () => ({
  default: { downloadFromGithub: vi.fn() }
}))

import { readInternalConfig } from '../app-config/internal-config-api'
import { existsSync, promises } from 'node:fs'
import * as statusBus from './check-ytlp-status-bus'
import * as os from 'node:os'
import { platform } from '@electron-toolkit/utils'
import { YtdlpEngine } from './ytdlp-engine'

describe('checkYtdlp / ensureYtDlpPath', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    ;(platform as any).isMacOS = false
    ;(os.platform as unknown as Mock).mockReturnValue('linux')
    delete process.env.VIDORA_YTDLP_PATH
  })

  // fresh module instance each time so memoized promise is reset
  async function loadModule(): Promise<typeof import('./check-ytdlp')> {
    return await import('./check-ytdlp')
  }

  it('uses ENV path when VIDORA_YTDLP_PATH exists', async () => {
    ;(readInternalConfig as Mock).mockReturnValue({ ytDlpPath: '/app/ytdlp' })
    ;(existsSync as Mock).mockReturnValue(true)
    process.env.VIDORA_YTDLP_PATH = '/env/ytdlp'

    const { checkYtdlp } = await loadModule()
    const result = await checkYtdlp()

    expect(result).toBe('/env/ytdlp')
    expect(statusBus.begin).toHaveBeenCalled()
    expect(statusBus.complete).toHaveBeenCalled()
    // No download in this path
    expect(YtdlpEngine).not.toHaveBeenCalled()
  })

  it('downloads yt-dlp when not present and returns its path', async () => {
    ;(readInternalConfig as Mock).mockReturnValue({ ytDlpPath: '/user-data/ytdlp' })
    ;(existsSync as Mock).mockReturnValue(false)
    ;(promises.access as Mock).mockRejectedValue(new Error('not found'))
    ;(YtdlpEngine.download as Mock).mockImplementation(async () => {
      // simulate progress callback
      return
    })

    const { checkYtdlp } = await loadModule()
    const result = await checkYtdlp()

    expect(result).toBe('/user-data/ytdlp')
    expect(YtdlpEngine.download).toHaveBeenCalledWith(
      '/user-data/ytdlp',
      undefined,
      undefined,
      expect.any(Function)
    )
    expect(statusBus.begin).toHaveBeenCalled()
    expect(statusBus.complete).toHaveBeenCalled()
  })

  it('returns null on macOS when no system yt-dlp is found', async () => {
    ;(platform as any).isMacOS = true
    ;(existsSync as Mock).mockReturnValue(false)
    ;(readInternalConfig as Mock).mockReturnValue({ ytDlpPath: '/user-data/ytdlp' })

    const { checkYtdlp } = await loadModule()
    const result = await checkYtdlp()

    expect(result).toBeNull()
    expect(statusBus.info).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'mac-os-homebrew'
      })
    )
    expect(statusBus.complete).toHaveBeenCalled()
  })
})
