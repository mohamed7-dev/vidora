import { AppConfig, DeepPartial } from '../../shared/types'
import { loadAndBroadcastDict } from '../i18n'
import { useTray } from '../user-pref/tray'

export async function performSideEffects(patch: DeepPartial<AppConfig>): Promise<void> {
  if (typeof patch.general?.closeToTray === 'boolean') {
    useTray(patch.general.closeToTray)
    // success(
    //   'configTray',
    //   patch.general.closeToTray ? 'status.config.tray.enabled' : 'status.config.tray.disabled'
    // )
  }
  if (patch.general?.language) {
    await loadAndBroadcastDict(patch.general.language)
  }
}
