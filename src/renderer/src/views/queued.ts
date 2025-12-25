export function renderQueued(root: HTMLElement): void {
  void import('../components/queued-page/index')
  root.innerHTML = `
    <queued-page></queued-page>
  `
}
