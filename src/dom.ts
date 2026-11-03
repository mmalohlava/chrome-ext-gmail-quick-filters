export const setStyle = (
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
) => {
  Object.assign(el.style, styles);
};
