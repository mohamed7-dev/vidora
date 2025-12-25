import { app } from 'electron'
import { initConfig } from '../app-config/init-config'
import { initAppControls } from '../app-controls'
import { initAppUpdate } from '../app-update'
import { initMenus } from '../context-menus'
import { initFFmpeg } from '../ffmpeg'
import { initI18n } from '../i18n'
import { initJobs } from '../download-jobs'
import { initUserPref } from '../user-pref'
import { initWindowControls } from '../window-controls'
import { initYtdlp } from '../ytdlp'
import { complete, error } from './setup-status-bus'

export function setupApp(): void {
  try {
    // first: initialize config files
    const { appConfig: config } = initConfig()
    if (config) {
      // second: initialize i18n
      initI18n(config.general.language).then(async () => {
        // third: anything else

        // init ffmpeg
        initFFmpeg()
        // init ytdlp
        await initYtdlp()
        // init user preferences for setting up things like changing download path, ytdlp config file,...etc
        await initUserPref(config)
        // check for update
        if (config.general.autoUpdate) initAppUpdate()
        // init window controls
        initWindowControls()
        // init app controls
        initAppControls()
        // init menus
        initMenus()
        // init jobs
        initJobs()
      })
    }
  } catch (err) {
    console.error('setup failed', err)
    error({
      cause: err instanceof Error ? err.message : String(err)
    })
    app.exit(0) // at this point in time, any error thrown in the main process will cause the app to exit
    return
  }
  console.log('setup complete')
  complete()
}
