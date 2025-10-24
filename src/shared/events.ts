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
    GET_LOCALE: 'i18n:get-locale',
    LOAD_LOCALE: 'i18n:load-locale',
    SET_LOCALE: 'i18n:set-locale',
    LOCALE_CHANGED: 'i18n:locale-changed'
  }
}
