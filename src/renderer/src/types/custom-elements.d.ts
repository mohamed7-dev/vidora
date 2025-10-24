import type { AppHeader } from '../components/app-header/index'
import type { USheet } from '../components/ui/sheet/index'
import type { UDialog } from '../components/ui/dialog/index'
import type { UIDropdown } from '../components/ui/dropdown/index'
import type { UIButton } from '../components/ui/button/index'
import type { UITabs } from '../components/ui/tabs/index'
import type { AppSidebar } from '../components/app-sidebar/index'
import type { AppSidebarContent } from '../components/app-sidebar/content/index'
import type { PreferencesDialog } from '../components/preferences-dialog/index'

declare global {
  interface HTMLElementTagNameMap {
    'app-header': AppHeader
    'app-sidebar': AppSidebar
    'app-sidebar-content': AppSidebarContent
    'preferences-dialog': PreferencesDialog
    'ui-sheet': USheet
    'ui-dialog': UDialog
    'ui-dropdown': UIDropdown
    'ui-button': UIButton
    'ui-tabs': UITabs
  }
}

export {}
