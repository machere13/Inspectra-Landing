const DOT_SIZE = 3;
const DOT_SPACING = 40;
const DOT_STEP = DOT_SIZE + DOT_SPACING;

interface LensResult {
  x: number;
  y: number;
}

function lens(
  x: number,
  y: number,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
): LensResult {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (!radius || dist > radius) return { x, y };
  const ratio = dist / radius;
  const strength = 1 - ratio * ratio;
  const factor = 1 + intensity * strength * strength;
  return { x: cx + dx * factor, y: cy + dy * factor };
}

export function initBackground(canvas: HTMLCanvasElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let row1 = "#4c4c4c";
  let row2 = "#282828";
  let mouseX: number | undefined;
  let mouseY: number | undefined;

  const state = { cx: 0, cy: 0, radius: 0, intensity: 0 };

  const readColors = (): void => {
    const cs = getComputedStyle(document.documentElement);
    row1 = cs.getPropertyValue("--color-border-secondary").trim() || row1;
    row2 = cs.getPropertyValue("--color-border-tertiary").trim() || row2;
  };

  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const render = (time: number): void => {
    ctx.clearRect(0, 0, w, h);
    const hasMouse = mouseX !== undefined && mouseY !== undefined;

    let tCx: number;
    let tCy: number;
    let tR: number;
    let tI: number;
    if (hasMouse) {
      tCx = w - (mouseX as number);
      tCy = h - (mouseY as number);
      tR = Math.max(w, h) * 0.35 + Math.sin(time * 0.6) * Math.min(w, h) * 0.03;
      tI = 0.5 + Math.sin(time * 0.8) * 0.04;
    } else {
      tCx = w * 0.5 + Math.sin(time * 0.25) * w * 0.1;
      tCy = h * 0.5 + Math.cos(time * 0.3) * h * 0.08;
      tR = Math.max(w, h) * 0.15 + Math.sin(time * 0.6) * Math.min(w, h) * 0.03;
      tI = 0.25 + Math.sin(time * 0.8) * 0.05;
    }

    const k = hasMouse ? 0.15 : 0.08;
    state.cx += (tCx - state.cx) * k;
    state.cy += (tCy - state.cy) * k;
    state.radius += (tR - state.radius) * k;
    state.intensity += (tI - state.intensity) * k;

    const secR = state.radius * 0.55;
    const secI = state.intensity * 1.4;

    for (let r = 0; r < Math.ceil(h / DOT_STEP) + 2; r++) {
      const by = r * DOT_STEP;
      ctx.fillStyle = r % 2 === 0 ? row1 : row2;
      for (let c = 0; c < Math.ceil(w / DOT_STEP) + 2; c++) {
        const bx = c * DOT_STEP;
        const p = lens(bx, by, state.cx, state.cy, state.radius, state.intensity);
        const s = lens(p.x, p.y, w - state.cx, h - state.cy, secR, secI);
        if (s.x >= -DOT_SIZE && s.x <= w + DOT_SIZE && s.y >= -DOT_SIZE && s.y <= h + DOT_SIZE) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, DOT_SIZE / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  let raf = 0;
  const loop = (ts: number): void => {
    render(ts * 0.001);
    raf = requestAnimationFrame(loop);
  };

  document.documentElement.classList.add("bgActive");
  resize();
  readColors();
  state.cx = w * 0.5;
  state.cy = h * 0.5;
  state.radius = Math.max(w, h) * 0.15;
  state.intensity = 0.25;

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  document.addEventListener("mouseleave", () => {
    mouseX = undefined;
    mouseY = undefined;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      raf = requestAnimationFrame(loop);
    }
  });

  raf = requestAnimationFrame(loop);
}
