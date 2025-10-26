export const EVENTS = {
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    RELOAD: 'window:reload'
  },
  NAVIGATE: 'navigate:to',
  DOWNLOAD_PATH: {
    CHANGE: 'general-preferences:change-download-path',
    CHANGED: 'general-preferences:download-path-changed'
  },
  I18N: {
    LOAD_LOCALE: 'i18n:load-locale',
    LOCALE_CHANGED: 'i18n:locale-changed'
  },
  CONFIG: {
    GET_STATUS: 'config:get-status',
    STATUS: 'config:status',
    GET: 'config:get',
    UPDATE: 'config:update',
    GET_APP_DEFAULTS: 'config:get-defaults'
  },
  STATUS: {
    UPDATE: 'status:update', // renderer listens
    SNAPSHOT: 'status:snapshot' // renderer invokes to get current state
  }
}
