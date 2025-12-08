export const EVENTS = {
  // keep
  PASTE_LINK: {
    SHOW_MENU: 'paste-link:show-menu',
    PASTED: 'paste-link:pasted'
  },
  // keep
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    RELOAD: 'window:reload'
  },
  // keep
  APP: {
    RELAUNCH: 'app:relaunch'
  },
  // keep
  NAVIGATE: 'navigate:to',
  // keep
  CONFIG: {
    GET: 'config:get',
    UPDATE: 'config:update',
    GET_APP_DEFAULTS: 'config:get-defaults',
    UPDATED: 'config:updated'
  },
  // keep
  PREFERENCES: {
    LOCALE: {
      LOADED: 'preferences:locale:loaded',
      LOAD: 'preferences:locale:load'
    },
    DOWNLOAD_PATH: {
      CHANGE_LOCAL: 'preferences:download-path:change-local',
      CHANGE_GLOBAL: 'preferences:download-path:change-global',
      CHANGED_GLOBAL: 'preferences:download-path:changed-global',
      CHANGED_LOCAL: 'preferences:download-path:changed-local'
    },
    YTDLP_FILE_PATH: {
      CHANGE: 'preferences:ytdlp-path:change',
      CHANGED: 'preferences:ytdlp-path:changed'
    }
  },
  // keep
  DOWNLOAD_JOBS: {
    ADD: 'download-jobs:add',
    LIST: 'download-jobs:list',
    UPDATE_STATUS: 'download-jobs:update-status',
    REMOVE: 'download-jobs:remove',
    PAUSE: 'download-jobs:pause',
    RESUME: 'download-jobs:resume',
    UPDATED: 'download-jobs:updated'
  },
  // keep
  DOWNLOADS: {
    GET_INFO: 'downloads:get-info'
  },
  // delete
  STATUS: {
    UPDATE: 'status:update', // renderer listens
    SNAPSHOT: 'status:snapshot' // renderer invokes to get current state
  },
  // keep
  APP_UPDATE: {
    DOWNLOAD_APPROVAL_RESPONSE: 'app-update: download-approval-response',
    INSTALL_APPROVAL_RESPONSE: 'app-update: install-approval-response',
    CHECK: 'app-update:check'
  }
}
