import { useEffect, useRef } from "react";
import { cssVar, onThemeChange, prefersReducedMotion } from "../theme.js";

// Ink particles advected by a divergence-free field v = (∂ψ/∂y, −∂ψ/∂x),
// with the cursor acting as a (smoothed) point vortex, also divergence-free.

const TRAIL = 26;
const SCALE = 1 / 260;
const SPEED = 0.9;

function velocity(x, y, tau, mouse) {
  const X = x * SCALE;
  const Y = y * SCALE;
  const a = 1.0;
  const b = 1.3;
  const c = 0.6;
  const d = 0.9;
  const s1 = Math.sin(a * X + 0.3 * tau);
  const c1 = Math.cos(a * X + 0.3 * tau);
  const s2 = Math.sin(b * Y - 0.21 * tau);
  const c2 = Math.cos(b * Y - 0.21 * tau);
  const sp = Math.sin(c * X - d * Y + 0.17 * tau);
  // ψ = sin(aX) sin(bY) + 0.7 cos(cX − dY)
  let vx = SPEED * (b * s1 * c2 + 0.7 * d * sp);
  let vy = -SPEED * (a * c1 * s2 - 0.7 * c * sp);

  if (mouse.active) {
    const dx = x - mouse.x;
    const dy = y - mouse.y;
    const r2 = dx * dx + dy * dy;
    const f = (70 * Math.exp(-r2 / 40000)) / (r2 + 900);
    vx += -dy * f;
    vy += dx * f;
  }
  return [vx, vy];
}

export default function FlowField() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduced = prefersReducedMotion();
    const mouse = { x: 0, y: 0, active: false };
    let W = 0;
    let H = 0;
    let parts = [];
    let colors = { ink: "#888", accent: "#b02a1a" };
    let raf = 0;
    const t0 = performance.now();

    const readColors = () => {
      colors = { ink: cssVar("--ink-3"), accent: cssVar("--accent") };
    };

    function spawn(p, age = 0) {
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      p.n = 0;
      p.age = age;
      p.life = 220 + Math.random() * 420;
      p.accent = Math.random() < 0.07;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(80, Math.min(340, Math.round((W * H) / 6500)));
      parts = Array.from({ length: count }, () => {
        const p = { hx: new Float32Array(TRAIL), hy: new Float32Array(TRAIL) };
        spawn(p, Math.random() * 400);
        return p;
      });
    }

    function step(tau) {
      for (const p of parts) {
        const [vx, vy] = velocity(p.x, p.y, tau, mouse);
        p.x += vx;
        p.y += vy;
        p.age++;
        if (p.n < TRAIL) p.n++;
        p.hx.copyWithin(1, 0);
        p.hy.copyWithin(1, 0);
        p.hx[0] = p.x;
        p.hy[0] = p.y;
        if (p.age > p.life || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) spawn(p);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 0.8;
      ctx.lineCap = "round";
      // three alpha bands so trails fade in at birth and out at death
      for (const accent of [false, true]) {
        for (let band = 0; band < 3; band++) {
          ctx.beginPath();
          for (const p of parts) {
            if (p.accent !== accent || p.n < 2) continue;
            const k = Math.min(p.age / 60, (p.life - p.age) / 60, 1);
            if ((k < 0.33 ? 0 : k < 0.75 ? 1 : 2) !== band) continue;
            ctx.moveTo(p.hx[0], p.hy[0]);
            for (let j = 1; j < p.n; j++) ctx.lineTo(p.hx[j], p.hy[j]);
          }
          ctx.strokeStyle = accent ? colors.accent : colors.ink;
          ctx.globalAlpha = (accent ? 0.42 : 0.3) * [0.25, 0.6, 1][band];
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    const loop = (now) => {
      step((now - t0) / 1000);
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = e.pointerType === "mouse";
    };
    const onLeave = () => {
      mouse.active = false;
    };

    readColors();
    resize();
    window.addEventListener("resize", resize);
    const offTheme = onThemeChange(() => {
      readColors();
      if (reduced) draw();
    });

    if (reduced) {
      for (let i = 0; i < TRAIL; i++) step(0);
      draw();
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      offTheme();
    };
  }, []);

  return <canvas ref={ref} className="flow" aria-hidden="true" />;
}
