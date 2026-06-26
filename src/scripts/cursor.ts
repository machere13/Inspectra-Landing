export function initCursor(): void {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const dot = document.querySelector<HTMLElement>("[data-cursor-dot]");
  const ring = document.querySelector<HTMLElement>("[data-cursor-ring]");
  if (!dot || !ring) return;

  document.documentElement.classList.add("hasCustomCursor");

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener("mousemove", e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
  });

  const loop = (): void => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const interactive = 'a, button, [data-cursor="hover"], input, textarea';
  document.addEventListener("mouseover", e => {
    if ((e.target as HTMLElement).closest(interactive)) {
      document.documentElement.classList.add("cursorHover");
    }
  });
  document.addEventListener("mouseout", e => {
    if ((e.target as HTMLElement).closest(interactive)) {
      document.documentElement.classList.remove("cursorHover");
    }
  });

  document.addEventListener("mousedown", () => document.documentElement.classList.add("cursorDown"));
  document.addEventListener("mouseup", () => document.documentElement.classList.remove("cursorDown"));
  document.addEventListener("mouseleave", () => document.documentElement.classList.add("cursorHidden"));
  document.addEventListener("mouseenter", () => document.documentElement.classList.remove("cursorHidden"));
}
