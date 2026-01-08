export function renderHistory(root: HTMLElement): void {
  void import('../components/history-page/history-page.component')
  root.innerHTML = `
    <history-page></history-page>
  `
}
