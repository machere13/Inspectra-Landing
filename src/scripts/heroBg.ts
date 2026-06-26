interface Ripple {
  x: number;
  y: number;
  start: number;
}

export function initHeroBg(canvas: HTMLCanvasElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let mx = -1;
  let my = -1;
  const LINES = 24;
  const ripples: Ripple[] = [];
  let nextRipple = 1.5;

  const RIPPLE_LIFE = 2.4;
  const RIPPLE_SPEED = 360;
  const RIPPLE_WIDTH = 150;
  const RIPPLE_AMP = 46;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const rippleOffset = (x: number, baseY: number, t: number): number => {
    let off = 0;
    for (const rp of ripples) {
      const age = t - rp.start;
      const radius = age * RIPPLE_SPEED;
      const dx = x - rp.x;
      const dy = baseY - rp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - radius;
      if (Math.abs(delta) > RIPPLE_WIDTH) continue;
      const fade = 1 - age / RIPPLE_LIFE;
      const bump = Math.cos((delta / RIPPLE_WIDTH) * (Math.PI / 2));
      const dir = dy >= 0 ? 1 : -1;
      off += dir * bump * RIPPLE_AMP * fade * fade;
    }
    return off;
  };

  const render = (time: number): void => {
    const t = time * 0.001;
    ctx.clearRect(0, 0, w, h);

    if (t > nextRipple) {
      ripples.push({ x: Math.random() * w, y: Math.random() * h, start: t });
      nextRipple = t + 1.2 + Math.random() * 2.2;
    }
    while (ripples.length && t - ripples[0].start > RIPPLE_LIFE) ripples.shift();

    const step = 12;
    for (let i = 0; i < LINES; i++) {
      const ny = i / (LINES - 1);
      const baseY = ny * h;
      const centerBoost = 1 - Math.abs(ny - 0.5) * 1.4;
      const alpha = 0.1 + Math.max(0, centerBoost) * 0.32;

      ctx.beginPath();
      for (let x = 0; x <= w + step; x += step) {
        const k = x / w;
        let y =
          baseY +
          Math.sin(k * 5 + t * 0.6 + i * 0.45) * (18 + 34 * Math.sin(t * 0.18 + i * 0.5)) +
          Math.sin(k * 12 - t * 0.9 + i) * 10;

        if (mx >= 0) {
          const dx = x - mx;
          const dyc = baseY - my;
          const d2 = dx * dx + dyc * dyc;
          const r = 320;
          if (d2 < r * r) {
            const f = 1 - Math.sqrt(d2) / r;
            y -= (my - baseY) * f * f;
          }
        }

        y += rippleOffset(x, baseY, t);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const rp of ripples) {
      const age = t - rp.start;
      const radius = age * RIPPLE_SPEED;
      const fade = 1 - age / RIPPLE_LIFE;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 * fade})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  let raf = 0;
  const loop = (ts: number): void => {
    render(ts);
    raf = requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
  });
  window.addEventListener("mouseout", () => {
    mx = -1;
    my = -1;
  });
  window.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || x > w || y < 0 || y > h) return;
    ripples.push({ x, y, start: performance.now() * 0.001 });
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
