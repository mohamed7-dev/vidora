export const DATA = {
  config: {
    fileNameFormatPlaylists: '%(playlist_index)s.%(title)s.%(ext)s',
    folderNameFormatPlaylists: '%(playlist_title)s',
    maxDownloads: 5,
    videoQuality: '1080',
    videoCodec: 'avc1',
    /* eslint-disable-next-line no-useless-escape */
    proxyServerPattern: '^(http:\/\/|https:\/\/|socks5:\/\/)?[a-zA-Z0-9.]+:[\d]+$',
    closeAppToSystemTray: false
  },
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
    { value: 'system', label: 'pref.general.theme.options.system' },
    { value: 'dark', label: 'pref.general.theme.options.dark' },
    { value: 'light', label: 'pref.general.theme.options.light' }
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
  ]
}
