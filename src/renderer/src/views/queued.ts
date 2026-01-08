export function renderQueued(root: HTMLElement): void {
  void import('../components/queued-page/queued-page.component')
  root.innerHTML = `
    <queued-page></queued-page>
  `
}
