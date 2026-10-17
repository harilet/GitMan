export function autofocus(node: HTMLElement) {
  requestAnimationFrame(() => node.focus());
}
