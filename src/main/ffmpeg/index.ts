import { t } from '../../shared/i18n/i18n'
import { updateInternalConfig } from '../app-config/internal-config-api'
import { ensureFfmpegPath } from './check-ffmpeg'
import { begin, complete, error, info } from './check-ffmpeg-status-bus'

export async function initFFmpeg(): Promise<void> {
  await ensureFfmpegPath({
    onBegin: () => {
      begin()
    },
    onComplete: (payload) => {
      complete({ payload: { finalFfmpegPath: payload.finalFfmpegPath } })
    },
    onInfo: (payload) => {
      const messages: Record<(typeof payload)['scope'], string> = {
        'freebsd-bin-notfound': t`ffmpeg is not found, please install it!`
      }
      info({ message: messages[payload.scope], payload: { scope: payload.scope } })
    },
    onError: (payload) => {
      const messages: Record<(typeof payload)['source'], string> = {
        env: t`The ffmpeg path from the environment is invalid or does not exist.`,
        'ffmpeg-notfound': t`Failed to find and initialize Ffmpeg`
      }
      error({
        message: messages[payload.source],
        payload: {
          source: payload.source,
          cause: payload.err instanceof Error ? payload.err.message : String(payload.err)
        }
      })
    }
  }).then((finalFFmpegPath) => {
    updateInternalConfig({ ffmpegPath: finalFFmpegPath })
  })
}
