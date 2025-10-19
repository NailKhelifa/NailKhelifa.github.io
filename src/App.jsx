import React from "react";

// ==== Profile ====
const PROFILE = {
  name: "Naïl B. Khelifa",
  shortName: "Naïl Khelifa",
  tagline:
    "Trinity College, University of Cambridge · G-Research Scholar · Probabilistic Machine Learning",
  scholar: "https://scholar.google.com/citations?user=vOo9y_cAAAAJ&hl=fr",
  github: "https://github.com/NailKhelifa",
  linkedin: "https://www.linkedin.com/in/nailkhelifa",
  photo: "/portrait.jpg",
  intro: `Hi, I’m Naïl — a first-year PhD student at the Department of Engineering, University of Cambridge. I am fortunate to be supervised by Prof. Ramji Venkataramanan (Probabilistic Systems, Information and Inference Group) and advised by Prof. Rich Turner (Machine Learning Group). My research focuses on the theoretical foundations of diffusion models, seeking to understand their collapse phenomena, and more broadly on the study of probability flows — encompassing diffusion processes, flow-based generative models, and optimal transport. I am recipient of the G-Research Trinity College PhD Scholarship.`,
};

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

        {/* === Introduction Paragraph === */}
        <p
          className="mt-6 text-[15px] md:text-base text-gray-700 leading-relaxed max-w-2xl mx-auto"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {PROFILE.intro}
        </p>

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
