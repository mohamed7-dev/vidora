import fs from 'node:fs'
import os from 'node:os'
import cp from 'node:child_process'
import { platform } from '@electron-toolkit/utils'
import path from 'node:path'
import { DEFAULT_INTERNAL_CONFIG } from './app-config/default-config'
import { begin, fail, success } from './status-bus'
/**
 * @description
 * Checks if ffmpeg is installed
 * @returns path to ffmpeg or null if it fails
 */
export async function checkFFmpeg(): Promise<string | null> {
  begin('ffmpeg', 'status.ffmpeg.checking')
  // if env variable exist, prioritize it
  if (process.env.VIDORA_FFMPEG_PATH) {
    if (fs.existsSync(process.env.VIDORA_FFMPEG_PATH)) {
      success('ffmpeg', 'status.ffmpeg.ready')
      return String(process.env.VIDORA_FFMPEG_PATH)
    }
    fail(
      'ffmpeg',
      "VIDORA_FFMPEG_PATH ENV variable is used, but the file doesn't exist there.",
      'status.ffmpeg.env_missing'
    )
    return null
  }

  // if platform is bsd, then use ffmpeg from the system
  if (os.platform() === 'freebsd') {
    try {
      const ffmpegPath = cp.execSync('which ffmpeg').toString().trim()
      if (fs.existsSync(ffmpegPath)) {
        success('ffmpeg', 'status.ffmpeg.ready')
        return ffmpegPath
      }
    } catch {
      fail('ffmpeg', 'Ffmpeg is not found on freebsd', 'status.ffmpeg.not_found_freebsd')
      return null
    }
  }

  // if platform is windows,mac, or linux then use ffmpeg from the user data folder
  // bundled with the app
  success('ffmpeg', 'status.ffmpeg.ready')
  return path.join(DEFAULT_INTERNAL_CONFIG.ffmpegPath, platform.isWindows ? 'ffmpeg.exe' : 'ffmpeg')
}
