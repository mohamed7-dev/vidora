export function renderHome(root: HTMLElement): void {
  void import('../components/home-page/home-page.component')
  root.innerHTML = `
    <home-page></home-page>
  `
}
