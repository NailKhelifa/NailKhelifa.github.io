import { useEffect, useRef, useState } from "react";
import { cssVar, getTheme, hexToRgb, mixRgb, onThemeChange, prefersReducedMotion } from "../theme.js";

// The portrait is drawn in glyphs and "sampled" by a reverse diffusion:
//   x_t = sqrt(ᾱ_t) · x_0 + sqrt(1 − ᾱ_t) · ε,   ᾱ_t = cos²(πt/2)
// with t running 1 → 0. Hovering re-noises cells locally (forward process).

const MONO = '"JetBrains Mono", "Apple Symbols", "Segoe UI Symbol", ui-monospace, monospace';

// Glyph pools; order doesn't matter, each glyph's ink coverage is measured
// in the browser and the pool is sorted into a tonal ramp.
const GLYPH_SETS = [
  { name: "astral", sample: "☉☽✶", font: (px) => `${px}px ${MONO}`, pool: "·⋅∘◦○◌⊙⊚☉☽✧✦✶✷✹❂◍◉●" },
  { name: "calculus", sample: "∂∇∫", font: (px) => `${px}px ${MONO}`, pool: "·∙∶∴∷∘∝∂∫∮∇∆∑∏∞≈≡⊕⊗⊛ΨΦΩ∰" },
  { name: "greek", sample: "ψξζ", font: (px) => `italic ${px * 1.08}px "EB Garamond", serif`, pool: "·ιιντυοσαερκχγφψξζβθδλμπΩΦΨΘΞ" },
  { name: "engraving", sample: "╱╳┼", font: (px) => `${px}px ${MONO}`, pool: "·┄╌─╴╱╲╳┼╋▖▞▚░▒▓" },
];

const COLS = 66;
const CELL_ASPECT = 0.6; // monospace advance / line height
const SUPERSAMPLE = 4;
const DURATION = 3400;
const T_STEPS = 1000;
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

// Sorts a glyph pool by measured ink coverage and builds a lookup from tone
// (0–255) to the run of glyphs whose coverage is close to that tone; each
// cell picks within the run with its own fixed jitter, so equal tones get
// varied but stable glyphs.
function buildRamp(set) {
  const S = 48;
  const W = Math.round(S * CELL_ASPECT);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.font = set.font(S);
  g.textAlign = "center";
  g.textBaseline = "middle";

  const measured = [];
  for (const ch of new Set(Array.from(set.pool))) {
    if (g.measureText(ch).width > W * 1.25) continue; // would spill over neighbours
    g.clearRect(0, 0, W, S);
    g.fillText(ch, W / 2, S / 2);
    const d = g.getImageData(0, 0, W, S).data;
    let s = 0;
    for (let k = 3; k < d.length; k += 4) s += d[k];
    if (s > 0) measured.push({ ch, cov: s / (255 * W * S) });
  }
  measured.sort((a, b) => a.cov - b.cov);
  const max = measured[measured.length - 1].cov;
  const glyphs = [" ", ...measured.map((m) => m.ch)];
  const cov = [0, ...measured.map((m) => m.cov / max)];

  // tone picks a rank (like a classic ASCII ramp); glyphs of near-equal
  // coverage around that rank are interchangeable
  const lo = new Uint8Array(256);
  const span = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    const best = Math.round(Math.pow(v / 255, 0.9) * (glyphs.length - 1));
    if (best === 0) continue;
    let a = best;
    let b = best;
    while (a > 1 && Math.abs(cov[a - 1] - cov[best]) < 0.06) a--;
    while (b < cov.length - 1 && Math.abs(cov[b + 1] - cov[best]) < 0.06) b++;
    lo[v] = a;
    span[v] = b - a + 1;
  }
  return { glyphs, lo, span };
}

// ?glyphs=<name> wins, then the viewer's last choice, then the first set
const loadGlyphSet = () => {
  let name = new URLSearchParams(location.search).get("glyphs");
  try {
    name ??= localStorage.getItem("glyphs");
  } catch {
    // storage unavailable
  }
  return Math.max(0, GLYPH_SETS.findIndex((g) => g.name === name));
};

// Tone of the portrait on a COLS × rows grid: supersampled, sharpened,
// contrast-stretched, and faded by an elliptical vignette so the face
// emerges from blank space rather than from the busy background.
async function loadPortrait(src) {
  const img = new Image();
  img.src = src;
  await img.decode();

  const srcY = img.height * CROP_TOP;
  const srcH = img.height - srcY;
  const rows = Math.round(COLS * (srcH / img.width) * CELL_ASPECT);
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

  const sharp = new Float32Array(n);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < COLS; q++) {
      let s = 0;
      let m = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dq = -1; dq <= 1; dq++) {
          const rr = r + dr;
          const qq = q + dq;
          if (rr < 0 || rr >= rows || qq < 0 || qq >= COLS) continue;
          s += lum[rr * COLS + qq];
          m++;
        }
      }
      const i = r * COLS + q;
      sharp[i] = lum[i] + 0.8 * (lum[i] - s / m);
    }
  }

  // head-and-shoulders silhouette: union of three soft ellipses
  const ell = (u, v, cx, cy, rx, ry) => Math.hypot((u - cx) / rx, (v - cy) / ry);
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

  return { rows, tone, mask };
}

export default function AsciiPortrait({ src, alt }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tRef = useRef(null);
  const stepRef = useRef(null);
  const resampleRef = useRef(() => {});
  const glyphRef = useRef(() => {});
  const [glyphSet, setGlyphSet] = useState(loadGlyphSet);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const st = {
      data: null,
      x0: null,
      eps: null,
      local: null,
      chars: null,
      jitter: null,
      buckets: null,
      set: loadGlyphSet(),
      ramp: null,
      counts: new Int32Array(4),
      palette: [],
      sampling: false,
      start: 0,
      raf: 0,
      cellW: 6,
      cellH: 10,
    };
    let alive = true;

    function setInk() {
      const dark = getTheme() === "dark";
      const { tone, mask } = st.data;
      for (let i = 0; i < tone.length; i++) {
        const ink = dark ? tone[i] : 1 - tone[i];
        st.x0[i] = 2 * Math.pow(ink, 1.15) * mask[i] - 1;
      }
      const ink = hexToRgb(cssVar("--ink"));
      const accent = hexToRgb(cssVar("--accent"));
      st.palette = [0, 0.45, 0.8, 1].map((k) => mixRgb(ink, accent, k));
    }

    function size() {
      const w = wrapRef.current.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.cellW = w / COLS;
      st.cellH = st.cellW / CELL_ASPECT;
      const h = st.cellH * st.data.rows;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Advances one frame; returns whether anything is still moving.
    function frame(now) {
      const { x0, eps, local, chars, jitter, buckets, counts } = st;
      const { glyphs, lo, span } = st.ramp;
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
        eps[i] = RHO * eps[i] + sq * gaussian();
        local[i] *= DECAY;
        if (local[i] > 0.01) busy = true;
        else local[i] = 0;
      }

      counts.fill(0);
      for (let i = 0; i < n; i++) {
        const ti = local[i] > gt ? local[i] : gt;
        let x = x0[i];
        if (ti > 0) {
          const c = Math.cos((Math.PI / 2) * ti);
          x = c * x + Math.sqrt(1 - c * c) * eps[i];
        }
        const v = (clamp01((x + 1) / 2) * 255) | 0;
        if (span[v] === 0) continue;
        chars[i] = lo[v] + ((jitter[i] * span[v]) | 0);
        const b = ti < 0.06 ? 0 : ti < 0.3 ? 1 : ti < 0.6 ? 2 : 3;
        buckets[b][counts[b]++] = i;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = GLYPH_SETS[st.set].font(st.cellH);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let b = 0; b < 4; b++) {
        ctx.fillStyle = st.palette[b];
        const list = buckets[b];
        for (let k = 0; k < counts[b]; k++) {
          const i = list[k];
          ctx.fillText(glyphs[chars[i]], ((i % COLS) + 0.5) * st.cellW, (((i / COLS) | 0) + 0.5) * st.cellH);
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
      for (let i = 0; i < st.eps.length; i++) st.eps[i] = gaussian();
      st.sampling = true;
      st.start = performance.now();
      kick();
    }
    resampleRef.current = resample;

    glyphRef.current = (k) => {
      st.set = k;
      st.ramp = buildRamp(GLYPH_SETS[k]);
      try {
        localStorage.setItem("glyphs", GLYPH_SETS[k].name);
      } catch {
        // the choice just won't persist
      }
      resample();
    };

    function onMove(e) {
      if (reduced || !st.data) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const R = 3.6 * st.cellH;
      const q0 = Math.max(0, Math.floor((px - 2 * R) / st.cellW));
      const q1 = Math.min(COLS - 1, Math.ceil((px + 2 * R) / st.cellW));
      const r0 = Math.max(0, Math.floor((py - 2 * R) / st.cellH));
      const r1 = Math.min(st.data.rows - 1, Math.ceil((py + 2 * R) / st.cellH));
      for (let r = r0; r <= r1; r++) {
        for (let q = q0; q <= q1; q++) {
          const dx = (q + 0.5) * st.cellW - px;
          const dy = (r + 0.5) * st.cellH - py;
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
      try {
        await Promise.all([
          document.fonts?.load('16px "JetBrains Mono"'),
          document.fonts?.load('italic 16px "EB Garamond"'),
        ]);
      } catch {
        // fall back to the system monospace
      }
      const data = await loadPortrait(src);
      if (!alive) return;
      const n = COLS * data.rows;
      Object.assign(st, {
        data,
        x0: new Float32Array(n),
        eps: new Float32Array(n),
        local: new Float32Array(n),
        chars: new Uint8Array(n),
        jitter: Float32Array.from({ length: n }, Math.random),
        ramp: buildRamp(GLYPH_SETS[st.set]),
        buckets: [0, 1, 2, 3].map(() => new Int32Array(n)),
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
      <figcaption>
        <span className="fig-no">Fig. 0</span> The author, drawn in{" "}
        <span className="fig-glyphs">{GLYPH_SETS[glyphSet].sample}</span> by reverse diffusion from 𝒩(0, I).
        <span className="fig-actions">
          <button type="button" className="bracket" onClick={() => resampleRef.current()}>
            resample
          </button>
          <button
            type="button"
            className="bracket"
            title="Change the glyphs the portrait is drawn with"
            onClick={() => {
              const next = (glyphSet + 1) % GLYPH_SETS.length;
              setGlyphSet(next);
              glyphRef.current(next);
            }}
          >
            glyphs: {GLYPH_SETS[glyphSet].name}
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
