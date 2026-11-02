import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../theme.js";

const GLYPHS = "∇∂∫∑∆≈±×∞λσ01#%&$@<>/\\|";

// Each character resolves at its own threshold, left to right with jitter.
const hash = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const threshold = (i, len) => (i / len) * 0.7 + 0.3 * hash(i);

export default function Scramble({ text, play = true, duration = 900, delay = 0 }) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (!play || prefersReducedMotion()) return;
    let raf;
    const start = performance.now() + delay;
    const tick = (now) => {
      const p = (now - start) / duration;
      if (p >= 1) return setOut(text);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        s += ch === " " || p >= threshold(i, text.length) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setOut(s);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, play, duration, delay]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{out}</span>
    </>
  );
}
