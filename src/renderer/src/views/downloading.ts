export function renderDownloading(root: HTMLElement): void {
  void import('../components/downloading-page/index')
  root.innerHTML = `
    <downloading-page></downloading-page>
  `
}
