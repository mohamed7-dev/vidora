import { app } from 'electron'
import { initConfig } from '../app-config/init-config'
import { initAppControls } from '../app-controls'
import { initAppUpdate } from '../app-update'
import { initMenus } from '../context-menus'
import { initFFmpeg } from '../ffmpeg'
import { initI18n } from '../i18n'
import { initJobs } from '../download-jobs'
import { initUserPref } from '../user-pref'
import { initAppInfo } from '../app-info'
import { initWindowControls } from '../window-controls'
import { initYtdlp } from '../ytdlp'
import { begin, complete, error } from './setup-status-bus'
import { initNavigation } from '../navigation'
import { initJsRuntime } from '../js-runtime'
import { LocaleCode } from '../../shared/i18n/config'
import { initDirectories } from './init-directories'

export function setupApp(): void {
  begin()
  try {
    // this must run synchrounously since it creates directories that other initializations depend on
    initDirectories()
    // first: initialize config files
    const { appConfig: config } = initConfig()
    if (config) {
      // second: initialize i18n, then run the rest of the async setup chain.
      initI18n(config.general.language as LocaleCode)
        .then(async () => {
          try {
            // third: anything else

            // init ytdlp
            await initYtdlp()
            // init ffmpeg
            await initFFmpeg()
            // init js runtime
            await initJsRuntime()
            // init app info ipc
            initAppInfo()
            // init user preferences for setting up things like changing download path, ytdlp config file,...etc
            await initUserPref(config)
            // check for update
            if (config.general.autoUpdate) initAppUpdate()
            // init window controls
            initWindowControls()
            // init app controls
            initAppControls()
            // init navigation
            initNavigation()
            // init menus
            initMenus()
            // init jobs
            initJobs()

            console.log('setup complete')
            complete()
          } catch (err) {
            console.error('async setup failed', err)
            error({
              payload: {
                cause: err instanceof Error ? err.message : String(err)
              }
            })
            app.exit(0)
          }
        })
        .catch((err) => {
          console.error('i18n init failed', err)
          error({
            payload: {
              cause: err instanceof Error ? err.message : String(err)
            }
          })
          app.exit(0)
        })
    }
  } catch (err) {
    console.error('setup failed', err)
    error({
      payload: {
        cause: err instanceof Error ? err.message : String(err)
      }
    })
    app.exit(0) // at this point in time, any error thrown in the main process will cause the app to exit
    return
  }
}
