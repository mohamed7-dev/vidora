export function renderHome(root: HTMLElement): void {
  root.innerHTML = `
    <home-page></home-page>
  `
  void Promise.all([import('../components/home-page/index')])
}
