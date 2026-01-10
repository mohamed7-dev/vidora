import { LocaleCode } from '../../shared/i18n/config'
import { AppConfig } from '../../shared/ipc/app-config'
import { DeepPartial } from '../../shared/types'
import { loadAndBroadcastDict } from '../i18n'
import { refreshTrayMenu, isTrayEnabled, useTray } from '../user-pref/tray'

export async function performSideEffects(patch: DeepPartial<AppConfig>): Promise<void> {
  if (typeof patch.general?.closeToTray === 'boolean') {
    useTray(patch.general.closeToTray)
  }
  if (patch.general?.language) {
    await loadAndBroadcastDict(patch.general.language as LocaleCode)
    if (isTrayEnabled()) {
      refreshTrayMenu()
    }
  }
}
