import { prefetchFfmpegInBackground } from './check-ffmpeg'

export function initFFmpeg(): void {
  // trigger ffmpeg download in background
  prefetchFfmpegInBackground()
}
