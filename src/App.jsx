import React from "react";


// === Global link style (gold + subtle hover) ===
const linkStyle =
  "text-[#b38b1d] font-medium hover:underline hover:decoration-[#b38b1d]/70 transition";


// ==== Profile ====
const PROFILE = {
  name: "Naïl B. Khelifa",
  shortName: "Naïl Khelifa",
  tagline:
    "Trinity College, University of Cambridge · Department of Engineering · Probabilistic Machine Learning",
  scholar: "https://scholar.google.com/citations?user=vOo9y_cAAAAJ&hl=fr",
  github: "https://github.com/NailKhelifa",
  linkedin: "https://www.linkedin.com/in/nailkhelifa",
  photo: "/portrait.jpg",
  intro: `
<p>
Hi, I’m Naïl — a first-year PhD student at the Department of Engineering, University of Cambridge. 
I am fortunate to be supervised by <em>Prof. Ramji Venkataramanan</em> (Probabilistic Systems, Information and Inference Group) and advised by 
<em>Prof. Rich Turner</em> (Machine Learning Group).
</p>

<p>
My research focuses on the theoretical foundations of diffusion models, seeking to understand their collapse phenomena, 
and more broadly on the study of <em>probability flows</em> — encompassing diffusion processes, flow-based generative models, and optimal transport.
</p>

<p>
I am the recipient of the <em>G-Research Trinity College PhD Scholarship</em>.  
Beyond my core research, I maintain a broad interest in:
</p>

<ul>
  <li>Optimal transport and flow matching</li>
  <li>Stochastic differential equations and diffusion processes</li>
  <li>Bridging generative modeling and theoretical machine learning</li>
</ul>
`,
};

const INTRO_PARAS = [
  <>
    Hi, I’m Naïl — a first-year PhD student at the <strong>Department of Engineering, University of Cambridge</strong>. I am fortunate to be co-supervised by
    <a href="https://rv285.github.io" target="_blank" rel="noopener noreferrer" className={linkStyle}> Prof. Ramji Venkataramanan</a> (Probabilistic Systems, Information and
    Inference Group) and <a href="https://rich-turner-group.github.io" target="_blank" rel="noopener noreferrer" className={linkStyle}>Prof. Rich Turner</a> (Machine Learning Group).
  </>,
  <>
    I am grateful to be the recipient of the <strong>G-Research Trinity College PhD Scholarship</strong>.
  </>,
  <>
    <em>Research.</em> My research focuses on the theoretical foundations of diffusion models, seeking to understand their collapse phenomena, and more broadly on the study
    of <strong>probability flows</strong> — encompassing diffusion processes, flow-based generative models, and optimal transport.
  </>,
  <>
    <em>Teaching.</em> I supervise third year Trinity engineers (Part IIA) for <em>Information Theory and Coding</em> (3F7). 
  </>,
  <>
    <em>Past Life.</em> Before coming to Cambridge, I followed a rather unconventional path. After studying applied mathematics, literature, 
      and geopolitics during my preparatory classes at <strong>Lycée Henri IV</strong>, I entered a dual degree between <strong>HEC Paris</strong>, 
      a business school, and <strong>ENSAE Paris</strong>, an engineering school specializing in statistics. Over time, I found myself increasingly 
      drawn to the mathematical and statistical aspects of my studies. This curiosity led me first to pursue a Master’s degree in Mathematics 
      at <strong>Sorbonne Université</strong>, and later a research-oriented dual degree between <strong>École Normale Supérieure Paris-Saclay 
      (MSc Mathématiques, Vision, Apprentissage)</strong> and ENSAE’s Data Science, Statistics and Learning specialization track. 
      Throughout these formative years, I had the privilege of being guided by remarkable mentors — including <a href="https://www.math.ucla.edu/~mihai/" target="_blank" rel="noopener noreferrer" className={linkStyle}>Prof. Mihai Cucuringu </a> 
      (Department of Mathematics, UCLA and Department of Statistics, Oxford), <a href="https://ferdiasherry.com" target="_blank" rel="noopener noreferrer" className={linkStyle}>Dr. Ferdia Sherry</a> (Department of Applied Maths and Theoretical Physics, Cambridge), <a href="https://perso.telecom-paristech.fr/fdalche/" target="_blank" rel="noopener noreferrer" className={linkStyle}>Prof. Florence d'Alché-Buc</a> (LTCI, Télécom Paris)
      and <a href="https://remi.flamary.com" target="_blank" rel="noopener noreferrer" className={linkStyle}> Prof. Rémi Flamary</a> (Centre de Mathématiques Appliquées (CMAP), École Polytechnique) — whose influence strengthened my resolve to dedicate myself fully to research. In short, here is my background:

  </>,
];

const INTRO_BULLETS = [
  "2025-    : PhD Student, Department of Engineering, University of Cambridge",
  "2024-2025: MSc Mathématiques, Vision, Apprentissage (MVA), ENS Paris Saclay",
  "2022-2023: Master's in Mathematics, Sorbonne Université",
  "2021-2025: Dual Degree Between ENSAE Paris and HEC Paris",
  "2019-2021: Preparatory Classes, Lycée Henri IV"
];


// ==== Papers ====
const PAPERS = [
  {
    id: "khelifa2025tweedie",
    title: "Enhanced Denoising and Convergent Regularisation Using Tweedie Scaling",
    authors: "Naïl Khelifa, Carola-Bibiane Schönlieb, Ferdia Sherry",
    venue: "Scale Space and Variational Methods in Computer Vision (SSVM), 2025",
    link: "https://link.springer.com/chapter/10.1007/978-3-031-92366-1_15",
  },
  {
    id: "khelifa2024portfolio",
    title:
      "Cluster-driven Hierarchical Representation of Large Asset Universes for Optimal Portfolio Construction",
    authors: "Naïl Khelifa, Jérôme Allier, Mihai Cucuringu",
    venue: "ACM International Conference on AI in Finance (ICAIF ’24), 2024",
    award: "🏅 Best Paper Award — Runner-up",
    link: "https://dl.acm.org/doi/10.1145/3677052.3698676",
  },
];

// ==== Components ====
const LinkButton = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="border border-gray-400/40 px-4 py-1.5 rounded-sm text-[13px] text-gray-700 tracking-wide hover:bg-gray-100/50 transition"
  >
    {children}
  </a>
);

// === Highlight your name dynamically ===
const highlightName = (authors) => {
  const nameRegex = new RegExp(PROFILE.shortName, "gi");
  return authors.replace(nameRegex, `<strong>${PROFILE.shortName}*</strong>`);
};

const PaperCard = ({ paper }) => (
  <div className="border border-gray-200/60 rounded-md p-4 bg-white/80 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md">
    <h3 className="text-lg font-medium text-gray-800 font-serif">
      <a
        href={paper.link}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-yellow-700 transition"
      >
        {paper.title}
      </a>
    </h3>

    <p
      className="text-sm text-gray-600 mt-1"
      dangerouslySetInnerHTML={{ __html: highlightName(paper.authors) }}
    />

    <p className="text-sm text-gray-500 mt-1 italic">{paper.venue}</p>

    {paper.award && (
      <p
        className="text-sm mt-2 text-[#b38b1d] italic"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {paper.award}
      </p>
    )}
  </div>
);

export default function AcademicSite() {
  return (
    <div className="min-h-screen bg-[#f8f8f5] text-gray-800 font-serif">
      {/* Import Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <main className="max-w-3xl mx-auto px-6 py-24 text-center">
        {/* === Portrait === */}
        <div className="flex justify-center mb-6">
          <img
            src={PROFILE.photo}
            alt={PROFILE.name}
            className="w-36 h-36 rounded-full object-cover border-2 border-[#b38b1d]/60 shadow-md"
          />
        </div>

        {/* === Name === */}
        <h1
          className="text-6xl md:text-7xl font-semibold tracking-wide"
          style={{ color: "#b38b1d", fontFamily: "'Cormorant Garamond', serif" }}
        >
          {PROFILE.name}
        </h1>

        {/* === Tagline === */}
        <p
          className="mt-4 text-[15px] md:text-base text-gray-700 italic"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {PROFILE.tagline}
        </p>

       
        {/* === Introduction (justified, multi-paragraph + bullets) === */}
        <div
          className="mt-8 text-[15px] md:text-base text-gray-700 leading-relaxed text-justify max-w-2xl mx-auto"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {INTRO_PARAS.map((para, i) => (
            <p key={i} className="mb-4">{para}</p>
          ))}

          <ul className="list-disc ml-6 space-y-1 text-left">
            {INTRO_BULLETS.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          

          <p className="text-left text-gray-700 mt-4" style={{ textAlign: "justify" }}>
            <span className="italic text-[#b38b1d]">Contact:</span> nbk24(at)cam.ac.uk
          </p>

        </div>




        {/* === Links === */}
        <div className="mt-8 flex justify-center gap-4">
          <LinkButton href={PROFILE.scholar}>Google Scholar</LinkButton>
          <LinkButton href={PROFILE.linkedin}>LinkedIn</LinkButton>
          <LinkButton href={PROFILE.github}>GitHub</LinkButton>
        </div>

        {/* === Divider === */}
        <div className="w-16 h-px bg-gray-400/50 mx-auto my-16"></div>

        {/* === Papers === */}
        <section className="text-left">
          <h2
            className="text-2xl font-medium text-gray-800 mb-6 tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Selected Papers
          </h2>
          <div className="flex flex-col gap-5">
            {PAPERS.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </section>

        {/* === Footer === */}
        <footer className="mt-20 text-xs text-gray-500 italic">
          © {new Date().getFullYear()} {PROFILE.name}
        </footer>
      </main>
    </div>
  );
}
