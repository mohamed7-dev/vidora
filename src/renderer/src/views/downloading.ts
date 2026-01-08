export function renderDownloading(root: HTMLElement): void {
  void import('../components/downloading-page/downloading-page.component')
  root.innerHTML = `
    <downloading-page></downloading-page>
  `
}
