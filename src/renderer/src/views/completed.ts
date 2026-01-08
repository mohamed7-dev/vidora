export function renderCompleted(root: HTMLElement): void {
  void import('../components/completed-page/completed-page.component')
  root.innerHTML = `
    <completed-page></completed-page>
  `
}
