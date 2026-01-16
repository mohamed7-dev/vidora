import { t } from './i18n/i18n'

// This function is never called; it only exists so the i18n extractor
// can see these window-title tokens at build time.
export function _ensureNavigationTitleTokens(): void {
  void t`Downloading`
  void t`Queued`
  void t`History`
  void t`Completed`
}

export const DATA = {
  appName: 'Vidora',
  appCreatorName: 'mohamed shaban',
  repoNewIssueLink: 'https://github.com/mohamed7-dev/vidora/issues/new',
  /* eslint-disable-next-line no-useless-escape */
  proxyServerPattern: '^(http://|https://|socks5://)?[a-zA-Z0-9.]+:[\d]+$',
  videoQualities: [
    { value: '144', label: '144p' },
    { value: '240', label: '240p' },
    { value: '360', label: '360p' },
    { value: '480', label: '480p' },
    { value: '720', label: '720p (HD)' },
    { value: '1080', label: '1080p (FHD)' },
    { value: '1440', label: '1440p (QHD)' },
    { value: '2160', label: '2160p (4K)' }
  ],
  audioQualities: [
    { value: 'mp3', label: 'Mp3' },
    { value: 'aac', label: 'Aac' },
    { value: 'm4a', label: 'M4a' },
    { value: 'opus', label: 'Opus' },
    { value: 'wav', label: 'Wav' },
    { value: 'alac', label: 'Alac' },
    { value: 'flac', label: 'Flac' },
    { value: 'vorbis', label: 'Vorbis (ogg)' }
  ],
  videoCodecs: [
    { value: 'avc1', label: 'AVC1' },
    { value: 'av01', label: 'AV01' },
    { value: 'vp9', label: 'VP9' },
    { value: 'mp4v', label: 'MP4V' }
  ],
  themes: [
    { value: 'system', label: t`System` },
    { value: 'dark', mode: 'dark', label: t`Dark` },
    { value: 'light', mode: 'light', label: t`Light` },
    { value: 'caffeine', mode: 'dark', label: 'Caffeine' },
    { value: 'spotify', mode: 'dark', label: 'Spotify' },
    { value: 'perplexity', mode: 'dark', label: 'Perplexity' }
  ],
  languages: [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' }
  ],
  cookiesFromBrowser: [
    { value: 'chrome', label: 'Chrome' },
    { value: 'firefox', label: 'Firefox' },
    { value: 'opera', label: 'Opera' },
    { value: 'brave', label: 'Brave' },
    { value: 'edge', label: 'Edge' },
    { value: 'safari', label: 'Safari' },
    { value: 'vivaldi', label: 'Vivaldi' },
    { value: 'chromium', label: 'Chromium' },
    { value: 'none', label: 'None' }
  ],
  pages: [
    { id: 'home', route: '', windowTitle: 'Vidora' },
    { id: 'downloading', route: 'downloading', windowTitle: 'Downloading' },
    { id: 'queued', route: 'queued', windowTitle: 'Queued' },
    { id: 'history', route: 'history', windowTitle: 'History' },
    { id: 'completed', route: 'completed', windowTitle: 'Completed' }
  ]
}
