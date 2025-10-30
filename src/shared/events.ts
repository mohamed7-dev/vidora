export const EVENTS = {
  DIALOG: {
    OPEN_FOLDER: 'dialog:open-folder',
    SELECTED_LOCATION: 'dialog:selected-location'
  },
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    RELOAD: 'window:reload'
  },
  APP: {
    RELAUNCH: 'app:relaunch'
  },
  NAVIGATE: 'navigate:to',
  DOWNLOAD_PATH: {
    CHANGE: 'download-preferences:change-download-path',
    CHANGED: 'download-preferences:download-path-changed'
  },
  CONFIG_PATH: {
    CHANGE: 'download-preferences:change-config-path',
    CHANGED: 'download-preferences:config-path-changed'
  },
  I18N: {
    LOAD_LOCALE: 'i18n:load-locale',
    LOCALE_CHANGED: 'i18n:locale-changed'
  },
  CONFIG: {
    GET: 'config:get',
    UPDATE: 'config:update',
    GET_APP_DEFAULTS: 'config:get-defaults',
    UPDATED: 'config:updated'
  },
  JOBS: {
    ADD: 'jobs:add',
    LIST: 'jobs:list',
    UPDATE_STATUS: 'jobs:update-status',
    REMOVE: 'jobs:remove',
    PAUSE: 'jobs:pause',
    RESUME: 'jobs:resume',
    UPDATED: 'jobs:updated'
  },
  DOWNLOADS: {
    GET_INFO: 'downloads:get-info'
  },
  STATUS: {
    UPDATE: 'status:update', // renderer listens
    SNAPSHOT: 'status:snapshot' // renderer invokes to get current state
  }
}
