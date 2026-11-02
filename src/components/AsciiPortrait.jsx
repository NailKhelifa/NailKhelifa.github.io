import { useEffect, useRef } from "react";
import { cssVar, getTheme, hexToRgb, mixRgb, onThemeChange, prefersReducedMotion } from "../theme.js";

// The portrait is drawn as a vector field and "sampled" by a reverse diffusion
// on the 2-D vectors:
//   x_t = sqrt(ᾱ_t) · x_0 + sqrt(1 − ᾱ_t) · σε,   ᾱ_t = cos²(πt/2)
// with t running 1 → 0. Each x_0 points along v = ∇⊥L (the luminance rotated
// by 90°, hence divergence-free) with a length set by the ink at that cell.
// Hovering re-noises cells locally (forward process).

const COLS = 46;
const SUPERSAMPLE = 6;
const DURATION = 3400;
const T_STEPS = 1000;
const SIGMA = 0.6; // scale of the terminal noise relative to a full-ink vector
const RHO = 0.82; // temporal correlation of ε between frames (OU noise)
const DECAY = 0.93; // decay of local perturbations per frame
const CROP_TOP = 0.13; // empty sky above the head

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function gaussian() {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

// 3×3 box blur on a COLS × rows grid, clamped at the borders
function blur(src, rows) {
  const out = new Float32Array(src.length);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < COLS; q++) {
      let s = 0;
      let m = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dq = -1; dq <= 1; dq++) {
          const rr = r + dr;
          const qq = q + dq;
          if (rr < 0 || rr >= rows || qq < 0 || qq >= COLS) continue;
          s += src[rr * COLS + qq];
          m++;
        }
      }
      out[r * COLS + q] = s / m;
    }
  }
  return out;
}

// central-difference gradient of a COLS × rows grid
function gradient(f, rows) {
  const gx = new Float32Array(f.length);
  const gy = new Float32Array(f.length);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < COLS; q++) {
      const i = r * COLS + q;
      const qa = Math.max(0, q - 1);
      const qb = Math.min(COLS - 1, q + 1);
      const ra = Math.max(0, r - 1);
      const rb = Math.min(rows - 1, r + 1);
      gx[i] = (f[r * COLS + qb] - f[r * COLS + qa]) / (qb - qa);
      gy[i] = (f[rb * COLS + q] - f[ra * COLS + q]) / (rb - ra);
    }
  }
  return [gx, gy];
}

// Tone and flow of the portrait on a COLS × rows grid of square cells:
// supersampled, sharpened, contrast-stretched, and faded by an elliptical
// vignette so the face emerges from blank space rather than the background.
async function loadPortrait(src) {
  const img = new Image();
  img.src = src;
  await img.decode();

  const srcY = img.height * CROP_TOP;
  const srcH = img.height - srcY;
  const rows = Math.round(COLS * (srcH / img.width));
  const w = COLS * SUPERSAMPLE;
  const h = rows * SUPERSAMPLE;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  const n = COLS * rows;
  const lum = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const i = ((y / SUPERSAMPLE) | 0) * COLS + ((x / SUPERSAMPLE) | 0);
      lum[i] += (0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]) / 255;
    }
  }
  for (let i = 0; i < n; i++) lum[i] /= SUPERSAMPLE * SUPERSAMPLE;

  const box = blur(lum, rows);
  const sharp = new Float32Array(n);
  for (let i = 0; i < n; i++) sharp[i] = lum[i] + 0.8 * (lum[i] - box[i]);

  // direction: fine-scale gradient for features, coarse-scale for the
  // overall form, so flat regions still get a coherent orientation
  let coarse = box;
  for (let k = 0; k < 4; k++) coarse = blur(coarse, rows);
  const [fx, fy] = gradient(box, rows);
  const [cx, cy] = gradient(coarse, rows);
  const dirX = new Float32Array(n);
  const dirY = new Float32Array(n);
  const edge = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const gx = fx[i] + 1.5 * cx[i];
    const gy = fy[i] + 1.5 * cy[i];
    const g = Math.hypot(gx, gy);
    // rotate by 90°: v = (∂L/∂y, −∂L/∂x) runs along the isophotes
    dirX[i] = g > 1e-6 ? gy / g : 1;
    dirY[i] = g > 1e-6 ? -gx / g : 0;
    edge[i] = Math.hypot(fx[i], fy[i]);
  }
  const edges = Array.from(edge).sort((a, b) => a - b);
  const e95 = edges[Math.floor(n * 0.95)] || 1;
  for (let i = 0; i < n; i++) edge[i] = clamp01(edge[i] / e95);

  // head-and-shoulders silhouette: union of three soft ellipses
  const ell = (u, v, ex, ey, rx, ry) => Math.hypot((u - ex) / rx, (v - ey) / ry);
  const mask = new Float32Array(n);
  const face = [];
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < COLS; q++) {
      const u = (q + 0.5) / COLS;
      const v = CROP_TOP + ((1 - CROP_TOP) * (r + 0.5)) / rows; // in uncropped coordinates
      const head = ell(u, v, 0.485, 0.43, 0.25, 0.31);
      const neck = ell(u, v, 0.5, 0.8, 0.2, 0.12);
      const torso = ell(u, v, 0.5, 1.08, 0.6, 0.25);
      const d = Math.min(head, neck, torso);
      const i = r * COLS + q;
      mask[i] = 1 - smoothstep(0.82, 1.06, d);
      if (ell(u, v, 0.485, 0.5, 0.17, 0.2) < 1) face.push(i);
    }
  }

  // contrast is stretched over the face alone, so skin reads light and
  // features (brows, eyes, mouth) carry the ink
  const inside = face.map((i) => sharp[i]);
  inside.sort((a, b) => a - b);
  const lo = inside[Math.floor(inside.length * 0.02)];
  const hi = inside[Math.floor(inside.length * 0.9)];
  const tone = new Float32Array(n);
  for (let i = 0; i < n; i++) tone[i] = clamp01((sharp[i] - lo) / (hi - lo));

  return { rows, tone, edge, mask, dirX, dirY };
}

export default function AsciiPortrait({ src, alt }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tRef = useRef(null);
  const stepRef = useRef(null);
  const resampleRef = useRef(() => {});

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const st = {
      data: null,
      x0: null,
      y0: null,
      ex: null,
      ey: null,
      local: null,
      palette: [],
      sampling: false,
      start: 0,
      raf: 0,
      cell: 6,
    };
    let alive = true;

    function setInk() {
      const dark = getTheme() === "dark";
      const { tone, edge, mask, dirX, dirY } = st.data;
      for (let i = 0; i < tone.length; i++) {
        const ink = dark ? tone[i] : 1 - tone[i];
        const m = clamp01(Math.pow(ink, 1.15) + 0.35 * edge[i]) * mask[i];
        st.x0[i] = m * dirX[i];
        st.y0[i] = m * dirY[i];
      }
      const ink = hexToRgb(cssVar("--ink"));
      const accent = hexToRgb(cssVar("--accent"));
      st.palette = [0, 0.45, 0.8, 1].map((k) => mixRgb(ink, accent, k));
    }

    function size() {
      const w = wrapRef.current.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.cell = w / COLS;
      const h = st.cell * st.data.rows;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Advances one frame; returns whether anything is still moving.
    function frame(now) {
      const { x0, y0, ex, ey, local } = st;
      const n = x0.length;

      let gt = 0;
      if (st.sampling) {
        const p = clamp01((now - st.start) / DURATION);
        gt = Math.pow(1 - p, 1.6);
        if (p >= 1) st.sampling = false;
      }

      let busy = st.sampling;
      const sq = Math.sqrt(1 - RHO * RHO);
      for (let i = 0; i < n; i++) {
        ex[i] = RHO * ex[i] + sq * gaussian();
        ey[i] = RHO * ey[i] + sq * gaussian();
        local[i] *= DECAY;
        if (local[i] > 0.01) busy = true;
        else local[i] = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      const L = st.cell * 1.3; // a full-ink arrow slightly overlaps its neighbours
      // one path per (colour, stroke width) bucket
      const paths = Array.from({ length: 12 }, () => new Path2D());
      for (let i = 0; i < n; i++) {
        const ti = local[i] > gt ? local[i] : gt;
        let vx = x0[i];
        let vy = y0[i];
        if (ti > 0) {
          const c = Math.cos((Math.PI / 2) * ti);
          const s = Math.sqrt(1 - c * c) * SIGMA;
          vx = c * vx + s * ex[i];
          vy = c * vy + s * ey[i];
        }
        let m = Math.hypot(vx, vy);
        if (m < 0.06) continue;
        if (m > 1) {
          vx /= m;
          vy /= m;
          m = 1;
        }
        const cx = ((i % COLS) + 0.5) * st.cell;
        const cy = (((i / COLS) | 0) + 0.5) * st.cell;
        const hx = (vx * L) / 2;
        const hy = (vy * L) / 2;
        const b = ti < 0.06 ? 0 : ti < 0.3 ? 1 : ti < 0.6 ? 2 : 3;
        const wb = m < 0.35 ? 0 : m < 0.7 ? 1 : 2;
        const p = paths[b * 3 + wb];
        p.moveTo(cx - hx, cy - hy);
        p.lineTo(cx + hx, cy + hy);
        if (m > 0.3) {
          // arrowhead: two barbs at ±28° behind the tip
          const k = 0.36;
          const ca = 0.883;
          const sa = 0.469;
          const tx = cx + hx;
          const ty = cy + hy;
          p.moveTo(tx - k * (ca * 2 * hx - sa * 2 * hy), ty - k * (sa * 2 * hx + ca * 2 * hy));
          p.lineTo(tx, ty);
          p.lineTo(tx - k * (ca * 2 * hx + sa * 2 * hy), ty - k * (-sa * 2 * hx + ca * 2 * hy));
        }
      }
      for (let b = 0; b < 4; b++) {
        ctx.strokeStyle = st.palette[b];
        for (let wb = 0; wb < 3; wb++) {
          ctx.lineWidth = [0.55, 0.9, 1.3][wb] * Math.max(1, st.cell / 7);
          ctx.stroke(paths[b * 3 + wb]);
        }
      }

      const ab = Math.cos((Math.PI / 2) * gt) ** 2;
      tRef.current.textContent = `t = ${gt.toFixed(3)}  ᾱ = ${ab.toFixed(3)}`;
      const step = T_STEPS - Math.round(gt * T_STEPS);
      stepRef.current.textContent = `step ${String(step).padStart(4, "0")}/${T_STEPS}`;
      return busy;
    }

    const loop = (now) => {
      st.raf = frame(now) ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!st.raf && st.data) st.raf = requestAnimationFrame(loop);
    };

    function resample() {
      if (!st.data) return;
      if (reduced) return kick();
      for (let i = 0; i < st.ex.length; i++) {
        st.ex[i] = gaussian();
        st.ey[i] = gaussian();
      }
      st.sampling = true;
      st.start = performance.now();
      kick();
    }
    resampleRef.current = resample;

    function onMove(e) {
      if (reduced || !st.data) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const R = 3.2 * st.cell;
      const q0 = Math.max(0, Math.floor((px - 2 * R) / st.cell));
      const q1 = Math.min(COLS - 1, Math.ceil((px + 2 * R) / st.cell));
      const r0 = Math.max(0, Math.floor((py - 2 * R) / st.cell));
      const r1 = Math.min(st.data.rows - 1, Math.ceil((py + 2 * R) / st.cell));
      for (let r = r0; r <= r1; r++) {
        for (let q = q0; q <= q1; q++) {
          const dx = (q + 0.5) * st.cell - px;
          const dy = (r + 0.5) * st.cell - py;
          const v = 0.7 * Math.exp(-(dx * dx + dy * dy) / (R * R));
          const i = r * COLS + q;
          if (v > st.local[i]) st.local[i] = v;
        }
      }
      kick();
    }

    function onKey(e) {
      if (e.key !== "r" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
      resample();
    }

    const ro = new ResizeObserver(() => {
      if (!st.data) return;
      size();
      kick();
    });
    ro.observe(wrapRef.current);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("keydown", onKey);
    const offTheme = onThemeChange(() => {
      if (!st.data) return;
      setInk();
      resample();
    });

    (async () => {
      const data = await loadPortrait(src);
      if (!alive) return;
      const n = COLS * data.rows;
      Object.assign(st, {
        data,
        x0: new Float32Array(n),
        y0: new Float32Array(n),
        ex: new Float32Array(n),
        ey: new Float32Array(n),
        local: new Float32Array(n),
      });
      setInk();
      size();
      resample();
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(st.raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      offTheme();
    };
  }, [src]);

  return (
    <figure className="plate">
      <span className="crop tl" />
      <span className="crop tr" />
      <span className="crop bl" />
      <span className="crop br" />
      <div ref={wrapRef} className="plate-canvas">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={alt}
          title="Click to resample · hover to perturb"
          onClick={() => resampleRef.current()}
        />
      </div>
      <div className="plate-readout" aria-hidden="true">
        <span ref={tRef}>t = 1.000  ᾱ = 0.000</span>
        <span ref={stepRef}>step 0000/{T_STEPS}</span>
      </div>
    </figure>
  );
}
