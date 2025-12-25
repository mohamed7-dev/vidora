export function renderCompleted(root: HTMLElement): void {
  void import('../components/completed-page/index')
  root.innerHTML = `
    <completed-page></completed-page>
  `
}
