// Utilities for processing yt-dlp formats and building options for UI rendering

import { YtdlpInfo } from '@root/shared/ipc/get-media-info'

export type YtDlpFormat = {
  format_id?: string
  ext?: string
  height?: number
  fps?: number
  vcodec?: string
  acodec?: string
  video_ext?: string
  filesize?: number
  filesize_approx?: number
  format_note?: string
  tbr?: number
}

export type VideoOption = {
  id: string
  ext: string
  height?: number
  fps?: number
  vcodec?: string
  hasAudio: boolean
  sizeBytes?: number
  display: string
  selected: boolean
}

export type AudioOption = {
  id: string
  ext: string
  note: string
  sizeBytes?: number
  display: string
}

export type Preferences = {
  videoQuality: number
  videoCodec: string
  showMoreFormats: boolean
}

export type ProcessResult = {
  video: VideoOption[]
  audio: AudioOption[]
  bestHeight: number
  audioPresent: boolean
  isPlaylist: boolean
}

export class MediaInfoProcessor {
  constructor(private prefs: Preferences) {}

  /**
   * @description
   * Parses the formats from the info object and formats it to a string
   */
  public processVideoFormats(info: YtdlpInfo): ProcessResult {
    const formats = this._extractFormatsArray(info)
    const isPlaylist = this._detectPlaylist(info)

    const { videoQuality, videoCodec, showMoreFormats } = this.prefs

    // Fallback when no formats
    if (formats.length === 0) {
      return { video: [], audio: [], bestHeight: 0, audioPresent: false, isPlaylist }
    }

    // Use a non-breaking space for more consistent visual padding in the labels
    const NON_BREAKING_SPACE = '\u00A0'

    // First pass: determine the maximum label widths for video and audio quality columns
    let widestVideoLabel = 0
    let widestAudioLabel = 0
    for (const fmt of formats) {
      if (!fmt) continue

      // For video formats we measure the height+fps label (e.g. "1080p60")
      if (fmt.video_ext !== 'none' && fmt.vcodec !== 'none') {
        const videoLabel = `${fmt.height ?? '???'}p${fmt.fps === 60 ? '60' : ''}`
        if (videoLabel.length > widestVideoLabel) widestVideoLabel = videoLabel.length
      }

      // For audio-only formats we measure the human readable quality note
      if (fmt.acodec !== 'none' && fmt.video_ext === 'none') {
        const qualityNote = String(fmt.format_note || 'Unknown quality')
        if (qualityNote.length > widestAudioLabel) widestAudioLabel = qualityNote.length
      }
    }

    // Fixed column paddings for extension, codec and size columns
    const videoQualityColWidth = widestVideoLabel
    const audioQualityColWidth = widestAudioLabel
    const extColWidth = 5
    const codecColWidth = 5
    const sizeColWidth = 10

    // Compute the preferred video height based on user preference and available formats
    let bestMatchHeight = 0
    for (const f of formats) {
      if (
        f &&
        typeof f.height === 'number' &&
        f.height <= videoQuality &&
        f.height > bestMatchHeight &&
        f.video_ext !== 'none'
      ) {
        bestMatchHeight = f.height
      }
    }
    if (bestMatchHeight === 0) {
      const heights = formats
        .map((ff) => ff?.height)
        .filter((h): h is number => typeof h === 'number')
      if (heights.length) bestMatchHeight = Math.max(...heights)
    }

    // Decide which codec to prefer for the chosen height (falling back to any if preference not present)
    const availableCodecs = new Set(
      formats
        .filter((f) => f && f.height === bestMatchHeight && f.vcodec)
        .map((f) => String(f.vcodec).split('.')[0])
    )
    const preferredCodec = availableCodecs.has(videoCodec)
      ? videoCodec
      : [...availableCodecs][availableCodecs.size - 1]

    const video: VideoOption[] = []
    const audio: AudioOption[] = []

    // Helper: approximate byte size from filesize, filesize_approx or duration*tbr
    const durationSec = this._extractDurationFromInfo(info) ?? 0
    const deriveSizeBytes = (fmt: YtDlpFormat): { bytes?: number; approximate: boolean } => {
      if (typeof fmt.filesize === 'number' && isFinite(fmt.filesize)) {
        return { bytes: fmt.filesize, approximate: false }
      }
      if (typeof fmt.filesize_approx === 'number' && isFinite(fmt.filesize_approx)) {
        return { bytes: fmt.filesize_approx, approximate: true }
      }
      if (durationSec > 0 && typeof fmt.tbr === 'number' && isFinite(fmt.tbr)) {
        // Rough estimate similar in spirit to the original logic: derive MB from duration * bitrate
        const approxMb = (durationSec * fmt.tbr) / 8192
        return { bytes: approxMb * 1_000_000, approximate: true }
      }
      return { bytes: undefined, approximate: false }
    }

    // Helper: format the size label, prefixing with ~ when it's only an approximation
    const formatSizeLabel = (bytes?: number, isApprox?: boolean): string => {
      if (!bytes || !isFinite(bytes)) return 'Unknown size'
      const mbStr = (bytes / 1_000_000).toFixed(2) + ' MB'
      return (isApprox ? '~' : '') + mbStr
    }

    let hasSelectedVideo = false

    // Second pass: build the video and audio option descriptors, mirroring the padding rules
    for (const f of formats) {
      if (!f) continue

      const { bytes, approximate } = deriveSizeBytes(f)
      const sizeLabel = formatSizeLabel(bytes, approximate)

      // Handle formats that contain a video stream
      if (f.video_ext !== 'none' && f.vcodec !== 'none') {
        // Optionally hide some webm/vp* entries when the user does not want extra formats
        if (!showMoreFormats && (f.ext === 'webm' || String(f.vcodec || '').startsWith('vp')))
          continue

        let selected = false
        if (
          !hasSelectedVideo &&
          f.height === bestMatchHeight &&
          String(f.vcodec || '').startsWith(String(preferredCodec || ''))
        ) {
          selected = true
          hasSelectedVideo = true
        }

        const qualityLabel = `${f.height ?? '???'}p${f.fps === 60 ? '60' : ''}`
        const hasAudioTrack = f.acodec !== 'none'

        const paddedQuality = qualityLabel.padEnd(videoQualityColWidth + 1, NON_BREAKING_SPACE)
        const paddedExt = String(f.ext || '').padEnd(extColWidth, NON_BREAKING_SPACE)
        const paddedSize = sizeLabel.padEnd(sizeColWidth, NON_BREAKING_SPACE)

        let display: string
        if (showMoreFormats) {
          const vcodecShort = String(f.vcodec || '').split('.')[0]
          const paddedCodec = vcodecShort.padEnd(codecColWidth, NON_BREAKING_SPACE)
          display = `${paddedQuality} | ${paddedExt} | ${paddedCodec} | ${paddedSize}${hasAudioTrack ? ' 🔊' : ''}`
        } else {
          display = `${paddedQuality} | ${paddedExt} | ${paddedSize}${hasAudioTrack ? ' 🔊' : ''}`
        }

        video.push({
          id: String(f.format_id ?? ''),
          ext: String(f.ext ?? ''),
          height: f.height,
          fps: f.fps,
          vcodec: f.vcodec,
          hasAudio: hasAudioTrack,
          sizeBytes: bytes,
          display,
          selected
        })
      }

      // Handle audio-only formats
      else if (f.acodec !== 'none' && f.video_ext === 'none') {
        // Optionally hide webm audio entries unless the user wants all formats
        if (!showMoreFormats && f.ext === 'webm') continue

        const audioExt = f.ext === 'webm' ? 'opus' : String(f.ext || '')
        const audioQuality = String(f.format_note || 'Unknown quality')

        const paddedQuality = audioQuality.padEnd(audioQualityColWidth, NON_BREAKING_SPACE)
        const paddedExt = audioExt.padEnd(extColWidth, NON_BREAKING_SPACE)
        const paddedSize = sizeLabel.padEnd(sizeColWidth, NON_BREAKING_SPACE)

        const display = `${paddedQuality} | ${paddedExt} | ${paddedSize}`

        audio.push({
          id: String(f.format_id ?? ''),
          ext: audioExt,
          note: audioQuality,
          sizeBytes: bytes,
          display
        })
      }
    }

    // Boolean indicating whether there is at least one usable audio track in any format
    const audioPresent = formats.some((ff) => ff?.acodec && ff.acodec !== 'none')
    return { video, audio, bestHeight: bestMatchHeight, audioPresent, isPlaylist }
  }

  private _extractFormatsArray(info: unknown): YtDlpFormat[] {
    const v = (info as { formats?: YtDlpFormat[] }) || {}
    return Array.isArray(v.formats) ? (v.formats as YtDlpFormat[]) : []
  }

  private _detectPlaylist(info: YtdlpInfo): boolean {
    if (Array.isArray(info.entries)) return true
    if (typeof info.playlist === 'string' && info.playlist.length > 0) return true
    if (typeof info.playlist_count === 'number' && info.playlist_count > 0) return true
    if (typeof info.extractor === 'string' && info.extractor.toLowerCase().includes('playlist')) {
      return true
    }
    return false
  }

  /**
   * @description
   * Extracts the duration from the info object and formats it to a string
   */
  public processVideoLength(info: YtdlpInfo): { durationSec: number; formatted: string } {
    const duration = this._extractDurationFromInfo(info)
    if (!duration) return { durationSec: 0, formatted: '0:00:00' }
    const formatted = this.formatSecondsToHMS(duration)
    return { durationSec: duration, formatted }
  }

  private _extractDurationFromInfo(info: YtdlpInfo): number | null {
    const duration = info && (info['duration'] as unknown)
    if (typeof duration === 'number' && isFinite(duration)) return duration
    const durationSeconds = info && (info['duration_seconds'] as unknown)
    if (typeof durationSeconds === 'number' && isFinite(durationSeconds)) return durationSeconds
    return null
  }

  public formatSecondsToHMS(total: number): string {
    const sec = Math.max(0, Math.floor(total))
    const hours = Math.floor(sec / 3600)
    const minutes = Math.floor((sec % 3600) / 60)
    const seconds = sec % 60
    const h = hours > 0 ? `${hours}:` : ''
    const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
    const ss = String(seconds).padStart(2, '0')
    return `${h}${mm}:${ss}`
  }
}
