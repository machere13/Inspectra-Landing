import Lenis from "lenis";

import { initBackground } from "./background";
import { initCursor } from "./cursor";
import { gsap, ScrollTrigger } from "./gsap";
import { initHeroBg } from "./heroBg";

const RAIL_GLYPHS = "ABCDEFGHKLMNPRSTUVXZ0123456789#%&*<>/\\{}[]();=:.";

interface RailState {
  track: HTMLElement;
  lines: HTMLElement[];
  originals: string[];
  n: number;
  period: number;
  dir: number;
  pos: number;
  inited: boolean;
}

function scrambleLine(orig: string): string {
  let out = "";
  for (let c = 0; c < orig.length; c++) {
    const ch = orig[c];
    out += ch !== " " && Math.random() < 0.06 ? RAIL_GLYPHS[(Math.random() * RAIL_GLYPHS.length) | 0] : ch;
  }
  return out;
}

function initRails(): void {
  if (reduced) return;
  const tracks = Array.from(document.querySelectorAll<HTMLElement>("[data-rail]"));
  if (!tracks.length) return;
  const SPEED = 42;

  const rails: RailState[] = tracks.map(track => {
    const lines = Array.from(track.querySelectorAll<HTMLElement>("[data-rail-line]"));
    const copies = Math.max(1, parseInt(track.dataset.railCopies || "4", 10));
    const n = Math.max(1, Math.round(lines.length / copies));
    return {
      track,
      lines,
      originals: lines.map(l => l.textContent || ""),
      n,
      period: 0,
      dir: track.dataset.rail === "down" ? -1 : 1,
      pos: 0,
      inited: false,
    };
  });

  const measure = (): void => {
    for (const r of rails) {
      r.period = r.lines.length > r.n ? r.lines[r.n].offsetTop - r.lines[0].offsetTop : 0;
      if (!r.inited) {
        r.pos = r.dir === -1 ? r.period : 0;
        r.inited = true;
      }
    }
  };
  measure();
  window.addEventListener("resize", measure);

  let lastT = performance.now();
  let frame = 0;
  const tick = (now: number): void => {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    for (const r of rails) {
      if (r.period <= 0) continue;
      r.pos = (((r.pos + SPEED * dt * r.dir) % r.period) + r.period) % r.period;
      r.track.style.transform = `translateY(${-r.pos}px)`;
    }

    if (frame % 4 === 0) {
      for (const r of rails) {
        const copies = Math.round(r.lines.length / r.n);
        for (let j = 0; j < r.n; j++) {
          const scrambled = scrambleLine(r.originals[j]);
          for (let k = 0; k < copies; k++) {
            const el = r.lines[j + k * r.n];
            if (el) el.textContent = scrambled;
          }
        }
      }
    }

    frame++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initScrollProgress(): void {
  const bar = document.querySelector<HTMLElement>("[data-progress-bar]");
  const num = document.querySelector<HTMLElement>("[data-progress-num]");
  const apply = (p: number): void => {
    if (bar) bar.style.transform = `scaleY(${p})`;
    if (num) num.textContent = String(Math.round(p * 100)).padStart(2, "0");
  };
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: self => apply(self.progress) });
  apply(0);
}

function initLenis(): Lenis | null {
  if (reduced) return null;

  const lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 1.05,
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time: number) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.2 });
    });
  });

  return lenis;
}

function initReveals(): void {
  const items = gsap.utils.toArray<HTMLElement>("[data-reveal]");
  if (reduced) {
    items.forEach(el => el.classList.add("isInview"));
    return;
  }
  ScrollTrigger.batch(items, {
    start: "top 86%",
    once: true,
    onEnter: batch =>
      batch.forEach((el, i) =>
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay: i * 0.07,
          ease: "power3.out",
          onStart: () => el.classList.add("isInview"),
        }),
      ),
  });
}

function initParallax(): void {
  if (reduced) return;
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach(el => {
    const depth = parseFloat(el.dataset.parallax || "0.15");
    gsap.to(el, {
      yPercent: -depth * 100,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });
}

function initCounters(): void {
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach(el => {
    const target = parseFloat(el.dataset.count || "0");
    if (reduced) {
      el.textContent = String(target);
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toString();
      },
    });
  });
}

function initHeroIntro(): void {
  const hero = document.querySelector("[data-hero]");
  if (!hero || reduced) return;
  const meta = hero.querySelectorAll("[data-hero-meta]");
  gsap.from(meta, {
    opacity: 0,
    y: 18,
    duration: 0.8,
    stagger: 0.08,
    delay: 0.5,
    ease: "power3.out",
  });
}

function initScramble(): void {
  const els = gsap.utils.toArray<HTMLElement>("[data-scramble]");
  const glyphs = "ABCDEFGHKLMNPRSTUVXZ0123456789#%&*<>/\\{}[]";
  els.forEach((el, idx) => {
    const final = (el.textContent || "").trim();
    if (reduced) {
      el.textContent = final;
      return;
    }
    const total = 26;
    const startDelay = idx * 10;
    let frame = 0;
    const tick = (): void => {
      if (frame < startDelay) {
        el.textContent = "";
        frame++;
        requestAnimationFrame(tick);
        return;
      }
      const p = (frame - startDelay) / total;
      let out = "";
      for (let i = 0; i < final.length; i++) {
        if (final[i] === " ") {
          out += " ";
        } else if (i < p * final.length) {
          out += final[i];
        } else {
          out += glyphs[Math.floor(Math.random() * glyphs.length)];
        }
      }
      el.textContent = out;
      if (p < 1) {
        frame++;
        requestAnimationFrame(tick);
      } else {
        el.textContent = final;
      }
    };
    requestAnimationFrame(tick);
  });
}

function initKaraoke(): void {
  const els = gsap.utils.toArray<HTMLElement>("[data-karaoke]");
  els.forEach(el => {
    const text = (el.textContent || "").trim();
    el.textContent = "";
    const spans: HTMLElement[] = [];
    text.split(/(\s+)/).forEach(part => {
      if (/^\s+$/.test(part)) {
        el.appendChild(document.createTextNode(" "));
        return;
      }
      const s = document.createElement("span");
      s.textContent = part;
      s.style.color = "rgba(255, 255, 255, 0.22)";
      s.style.transition = "none";
      el.appendChild(s);
      spans.push(s);
    });
    if (reduced) {
      spans.forEach(s => (s.style.color = "rgba(255, 255, 255, 1)"));
      return;
    }
    gsap.to(spans, {
      color: "rgba(255, 255, 255, 1)",
      ease: "none",
      stagger: 0.4,
      scrollTrigger: {
        trigger: el,
        start: "top 82%",
        end: "top 38%",
        scrub: 0.4,
      },
    });
  });
}

function initSteps(): void {
  const scene = document.querySelector<HTMLElement>("[data-steps]");
  if (!scene) return;
  const steps = gsap.utils.toArray<HTMLElement>("[data-step]", scene);
  const progress = scene.querySelector<HTMLElement>("[data-steps-progress]");
  if (!steps.length) return;

  const setActive = (idx: number): void => {
    steps.forEach((s, i) => s.classList.toggle("isActive", i === idx));
  };
  setActive(0);

  if (reduced) {
    steps.forEach(s => s.classList.add("isActive"));
    if (progress) progress.style.transform = "scaleY(1)";
    return;
  }

  ScrollTrigger.create({
    trigger: scene,
    start: "top top",
    end: () => "+=" + steps.length * 70 + "%",
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: self => {
      if (progress) progress.style.transform = `scaleY(${self.progress})`;
      const idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
      setActive(idx);
    },
  });
}

function initNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  if (!nav) return;
  let last = 0;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle("isScrolled", y > 40);
      if (!reduced) nav.classList.toggle("isHidden", y > last && y > 240);
      last = y;
    },
  });
}

function boot(): void {
  document.documentElement.classList.add("isReady");

  const canvas = document.querySelector<HTMLCanvasElement>("[data-bg-canvas]");
  if (canvas) initBackground(canvas);
  const heroCanvas = document.querySelector<HTMLCanvasElement>("[data-hero-canvas]");
  if (heroCanvas) initHeroBg(heroCanvas);
  initCursor();
  initRails();
  initScrollProgress();

  initLenis();
  initNav();
  initHeroIntro();
  initScramble();
  initKaraoke();
  initReveals();
  initParallax();
  initCounters();
  initSteps();

  const ready = (document as Document).fonts?.ready ?? Promise.resolve();
  void ready.then(() => ScrollTrigger.refresh());
}

if (document.readyState !== "loading") boot();
else document.addEventListener("DOMContentLoaded", boot);
