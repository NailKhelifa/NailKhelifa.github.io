// Theme helpers shared by the React tree and the canvas renderers.

export function getTheme() {
  const attr = document.documentElement.dataset.theme;
  return attr === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // storage unavailable (private mode etc.): the choice just won't persist
  }
}

export function onThemeChange(cb) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
