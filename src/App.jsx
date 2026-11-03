import { useEffect, useRef, useState } from "react";
import AsciiPortrait from "./components/AsciiPortrait.jsx";
import Scramble from "./components/Scramble.jsx";
import { getTheme, onThemeChange, setTheme } from "./theme.js";

// ==== Profile ====
const PROFILE = {
  name: "Naïl B. Khelifa",
  tagline: "Department of Engineering · Trinity College, University of Cambridge",
  scholar: "https://scholar.google.com/citations?user=vOo9y_cAAAAJ&hl=fr",
  github: "https://github.com/NailKhelifa",
  linkedin: "https://www.linkedin.com/in/nailkhelifa",
  photo: "/portrait.jpg",
  cv: "/Khelifa_CV.pdf",
  email: ["nbk24", "cam.ac.uk"],
};

// ==== Papers ====
const PAPERS = [
  {
    id: "khelifa2026lim_recursively_trained",
    title: "Recursively Trained Diffusion Models: Limiting Collapse Distribution and Spectral Characterization",
    authors: "Naïl B. Khelifa, Richard E. Turner, Ramji Venkataramanan",
    venue: "The Fortieth Annual Conference on Neural Information Processing Systems (NeurIPS)",
    short: "NeurIPS",
    year: 2026,
    award: "Spotlight",
    link: "https://arxiv.org/abs/2606.13796",
    linkLabel: "arXiv",
  },
  {
    id: "khelifa2026div_free",
    title: "Diffusion Models Observe Only Gradients: A Geometric Perspective on Score Matching Errors",
    authors: "Naïl B. Khelifa, Richard E. Turner, Ramji Venkataramanan",
    venue: "The Fortieth Annual Conference on Neural Information Processing Systems (NeurIPS)",
    short: "NeurIPS",
    year: 2026,
    link: "https://arxiv.org/abs/2606.06179",
    linkLabel: "arXiv",
  },
  {
    id: "khelifa2026modelcollapse",
    title: "Quantifying Error Propagation and Model Collapse in Diffusion Models",
    authors: "Naïl B. Khelifa, Richard E. Turner, Ramji Venkataramanan",
    venue: "Forty-Third International Conference on Machine Learning (ICML)",
    short: "ICML",
    year: 2026,
    link: "https://arxiv.org/abs/2602.16601",
    linkLabel: "arXiv",
  },
  {
    id: "khelifa2025tweedie",
    title: "Enhanced Denoising and Convergent Regularisation Using Tweedie Scaling",
    authors: "Naïl B. Khelifa, Carola-Bibiane Schönlieb, Ferdia Sherry",
    venue: "Scale Space and Variational Methods in Computer Vision (SSVM)",
    short: "SSVM",
    year: 2025,
    link: "https://link.springer.com/chapter/10.1007/978-3-031-92366-1_15",
    linkLabel: "Springer",
  },
  {
    id: "khelifa2024portfolio",
    title: "Cluster-driven Hierarchical Representation of Large Asset Universes for Optimal Portfolio Construction",
    authors: "Naïl B. Khelifa, Jérôme Allier, Mihai Cucuringu",
    venue: "ACM International Conference on AI in Finance (ICAIF ’24)",
    short: "ICAIF",
    year: 2024,
    award: "Best Paper Award — Runner-up",
    link: "https://dl.acm.org/doi/10.1145/3677052.3698676",
    linkLabel: "ACM DL",
  },
];

const TRAJECTORY = [
  { from: "2025", to: null, what: "PhD, Department of Engineering", where: "University of Cambridge" },
  { from: "2024", to: "2025", what: "MSc Mathématiques, Vision, Apprentissage (MVA)", where: "ENS Paris-Saclay" },
  { from: "2022", to: "2023", what: "Master's in Mathematics", where: "Sorbonne Université" },
  { from: "2021", to: "2025", what: "Dual Degree", where: "ENSAE Paris & HEC Paris" },
  { from: "2019", to: "2021", what: "Preparatory Classes", where: "Lycée Henri IV" },
];

// ==== Helpers ====
const A = ({ href, children }) => (
  <a className="ink" href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

function toBibtex(p) {
  const authors = p.authors
    .split(", ")
    .map((a) => {
      const parts = a.split(" ");
      const last = parts.pop();
      return `${last}, ${parts.join(" ")}`;
    })
    .join(" and ");
  return [
    `@inproceedings{${p.id},`,
    `  title     = {${p.title}},`,
    `  author    = {${authors}},`,
    `  booktitle = {${p.venue}},`,
    `  year      = {${p.year}},`,
    `  url       = {${p.link}}`,
    `}`,
  ].join("\n");
}

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

// ==== Components ====
function ThemeToggle() {
  const [theme, set] = useState(getTheme);
  useEffect(() => onThemeChange(() => set(getTheme())), []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="bracket" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`}>
      {theme === "dark" ? "☾ nox" : "☼ lux"}
    </button>
  );
}

function Section({ id, title, meta, children }) {
  const [ref, seen] = useInView();
  return (
    <section id={id} ref={ref} className={`sec reveal${seen ? " in" : ""}`}>
      <header className="sec-head">
        <h2 className="sec-title">
          <Scramble text={title} play={seen} duration={700} />
        </h2>
        <span className="sec-rule" />
        {meta && <span className="sec-meta">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

const Authors = ({ list }) =>
  list.split(", ").map((a, i, all) => (
    <span key={a}>
      {a === PROFILE.name ? <span className="me">{a}</span> : a}
      {i < all.length - 1 && ", "}
    </span>
  ));

function Paper({ paper }) {
  const [bib, setBib] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = toBibtex(paper);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };
  return (
    <li className="pub">
      <span className="pub-idx" aria-hidden="true">
        &gt;&gt;
      </span>
      <div>
        <div className="pub-tags">
          <span className="tag">
            {paper.short} {paper.year}
          </span>
          {paper.award && <span className="tag award">★ {paper.award}</span>}
        </div>
        <h3 className="pub-title">
          <a href={paper.link} target="_blank" rel="noopener noreferrer">
            {paper.title}
          </a>
        </h3>
        <p className="pub-authors">
          <Authors list={paper.authors} />
        </p>
        <p className="pub-venue">
          {paper.venue}, {paper.year}
        </p>
        <div className="pub-actions">
          <a className="bracket" href={paper.link} target="_blank" rel="noopener noreferrer">
            {paper.linkLabel} ↗
          </a>
          <button type="button" className="bracket" aria-expanded={bib} onClick={() => setBib((b) => !b)}>
            {bib ? "− bibtex" : "+ bibtex"}
          </button>
          {bib && (
            <button type="button" className="bracket" onClick={copy}>
              {copied ? "copied ✓" : "copy"}
            </button>
          )}
        </div>
        {bib && <pre className="bib">{text}</pre>}
      </div>
    </li>
  );
}

export default function AcademicSite() {

  return (
    <>
      <div className="shell">
        <header className="topbar">
          <ThemeToggle />
        </header>

        <div className="layout">
          <aside className="aside">
            <AsciiPortrait src={PROFILE.photo} alt={`Portrait of ${PROFILE.name} drawn as a vector field`} />

            <h1 className="name">
              <Scramble text={PROFILE.name} duration={1400} delay={250} />
            </h1>
            <p className="tagline">{PROFILE.tagline}</p>

            <div className="links">
              <a className="bracket" href={PROFILE.cv} target="_blank" rel="noopener noreferrer">CV</a>
              <a className="bracket" href={PROFILE.scholar} target="_blank" rel="noopener noreferrer">Scholar</a>
              <a className="bracket" href={PROFILE.github} target="_blank" rel="noopener noreferrer">GitHub</a>
              <a className="bracket" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </aside>

          <main className="main">
            <Section id="preamble" title="Preamble">
              <div className="prose">
                <p className="dropcap">
                  Hi, I’m Naïl — a first-year PhD student at the <strong>Department of Engineering, University of Cambridge</strong>,
                  supervised by <A href="https://rv285.github.io">Prof. Ramji Venkataramanan</A> (Probabilistic Systems, Information and
                  Inference Group) and <A href="https://rich-turner-group.github.io">Prof. Rich Turner</A> (Machine Learning Group).
                </p>
                <p>
                  I am grateful to be the recipient of the <strong>G-Research Trinity College PhD Scholarship</strong>.
                </p>
              </div>
            </Section>

            <Section id="research" title="Research">
              <div className="prose">
                <p>
                  My research focuses on the theoretical foundations (geometry, structure of errors, sampling) of{" "}
                  <em>flow/diffusion-based models</em>. I am also interested in understanding how to train generative models on
                  synthetic data.
                </p>
              </div>
            </Section>

            <Section id="publications" title="Publications">
              <ol className="pubs">
                {PAPERS.map((p) => (
                  <Paper key={p.id} paper={p} />
                ))}
              </ol>
            </Section>

            <Section id="teaching" title="Teaching">
              <ul className="chev">
                <li>
                  <span className="chev-head">Supervisor, Trinity College</span>
                  <span className="chev-body">
                    Third-year engineers (Part IIA) — <em>Information Theory and Coding</em> (3F7) and <em>Inference</em> (3F8).
                  </span>
                </li>
                <li>
                  <span className="chev-head">Thesis co-supervisor, MPhil MLMI</span>
                  <span className="chev-body">
                    MPhil in Machine Learning and Machine Intelligence, Cambridge — “Learning Heavy-Tailed Distributions with
                    Diffusion Models”.
                  </span>
                </li>
              </ul>
            </Section>

            <Section id="trajectory" title="Previously…">
              <div className="prose">
                <p>
                  Before coming to Cambridge, I studied applied mathematics, literature, and geopolitics in the French preparatory
                  class system at Lycée Henri IV, before entering a dual degree program between HEC Paris and ENSAE Paris. I also
                  pursued a Master’s degree in Mathematics at Sorbonne Université, followed by a dual degree between École Normale
                  Supérieure Paris-Saclay (MSc Mathématiques, Vision, Apprentissage) and ENSAE’s specialization in Data Science,
                  Statistics, and Learning.
                </p>
                <p>
                  Throughout these formative years, I had the privilege of being guided by remarkable mentors — including{" "}
                  <A href="https://www.math.ucla.edu/~mihai/">Prof. Mihai Cucuringu</A> (Department of Mathematics, UCLA and
                  Department of Statistics, Oxford), <A href="https://ferdiasherry.com">Dr. Ferdia Sherry</A> (Department of Applied
                  Maths and Theoretical Physics, Cambridge),{" "}
                  <A href="https://perso.telecom-paristech.fr/fdalche/">Prof. Florence d'Alché-Buc</A> (LTCI, Télécom Paris) and{" "}
                  <A href="https://remi.flamary.com">Prof. Rémi Flamary</A> (CMAP, École Polytechnique) — whose influence
                  strengthened my resolve to dedicate myself fully to research.
                </p>
              </div>
              <ol className="traj">
                {TRAJECTORY.map((t) => (
                  <li key={t.what}>
                    <span className="yrs">
                      {t.from} — {t.to ?? <span className="cursor" aria-label="present" />}
                    </span>
                    <span>
                      <span className="what">{t.what}</span>
                      <span className="where">{t.where}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="traj-cv">
                Full record in the <A href={PROFILE.cv}>curriculum vitæ</A>.
              </p>
            </Section>

            <Section id="correspondence" title="Correspondence">
              <div className="contact">
                <span className="contact-addr">
                  {PROFILE.email[0]} <span className="at">(at)</span> {PROFILE.email[1]}
                </span>
              </div>
            </Section>
          </main>
        </div>

        <footer className="colophon">
          <p className="col-sign">
            © {PROFILE.name}
          </p>
        </footer>
      </div>
    </>
  );
}
