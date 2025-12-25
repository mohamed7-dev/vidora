export function renderHome(root: HTMLElement): void {
  void import('../components/home-page/index')
  root.innerHTML = `
    <home-page></home-page>
  `
}
