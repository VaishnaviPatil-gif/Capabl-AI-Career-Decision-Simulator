const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "_frames");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const W = 1200, H = 800;

const cards = [
  { x: 70,  title: "Quick Wins",      target: 5,  bar: "#16a34a", dot: "#16a34a", sub: "~1 week · low effort",   l1: "Finish what you're",   l2: "closest to mastering", tag: "Momentum",      tagBg: "#e8f8ef", tagFg: "#16794a", start: 0 },
  { x: 430, title: "Critical Gaps",   target: 17, bar: "#e11d48", dot: "#e11d48", sub: "~3 weeks · high impact", l1: "Close the skills this", l2: "role demands most",    tag: "Biggest levers", tagBg: "#fde7ec", tagFg: "#b4123c", start: 4 },
  { x: 790, title: "Balanced Sprint", target: 27, bar: "#2563eb", dot: "#2563eb", sub: "~5 weeks · best ROI",    l1: "Most score gained",    l2: "per week invested",    tag: "Efficient",     tagBg: "#e6efff", tagFg: "#1d4ed8", start: 8 },
];

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const TOTAL = 22;     // frames
const DUR = 8;        // frames each card takes to animate in
const CARD_W = 340, CARD_H = 320, CY = 400;

function frameSVG(f) {
  let cardsSvg = "";
  for (const c of cards) {
    const t = smooth(clamp01((f - c.start) / DUR));
    const op = clamp01((f - c.start) / 3);
    const dy = (1 - op) * 14;
    const num = Math.round(c.target * t);
    const barW = CARD_W * t;
    cardsSvg += `
    <g transform="translate(${c.x},${CY + dy})" opacity="${op.toFixed(3)}">
      <rect width="${CARD_W}" height="${CARD_H}" rx="28" fill="#ffffff"/>
      <rect width="${barW.toFixed(1)}" height="8" rx="4" fill="${c.bar}"/>
      <circle cx="40" cy="58" r="7" fill="${c.dot}"/>
      <text x="62" y="65" fill="#1d1d1f" font-size="26" font-weight="800">${c.title}</text>
      <text x="32" y="150" fill="${c.bar}" font-size="72" font-weight="800">+${num}%</text>
      <text x="32" y="188" fill="#9a9a9a" font-size="20" font-weight="600">${c.sub}</text>
      <line x1="32" y1="214" x2="308" y2="214" stroke="#eee7db" stroke-width="2"/>
      <text x="32" y="252" fill="#444" font-size="19" font-weight="600">${c.l1}</text>
      <text x="32" y="278" fill="#444" font-size="19" font-weight="600">${c.l2}</text>
      <g transform="translate(32,294)">
        <rect x="0" y="0" rx="13" ry="13" width="150" height="26" fill="${c.tagBg}"/>
        <text x="14" y="18" fill="${c.tagFg}" font-size="14" font-weight="700">${c.tag}</text>
      </g>
    </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif">
  <rect width="${W}" height="${H}" fill="#f4efe7"/>
  <rect x="0" y="0" width="${W}" height="250" fill="#1d1d1f"/>
  <rect x="0" y="246" width="${W}" height="6" fill="#77410e"/>

  <!-- brand mark -->
  <g transform="translate(70,58)">
    <polyline points="11,13 20,13 20,23 29,23 29,33 39,33" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="square" stroke-linejoin="miter"/>
    <text x="64" y="34" fill="#ffffff" font-size="38" font-weight="700" letter-spacing="0.5">Capabl</text>
  </g>

  <!-- eyebrow -->
  <g transform="translate(70,120)">
    <rect x="0" y="0" rx="16" ry="16" width="442" height="34" fill="#3a342f"/>
    <text x="20" y="23" fill="#e7d3b3" font-size="16" font-weight="700" letter-spacing="2">AI-POWERED CAREER DECISION SUPPORT</text>
  </g>

  <text x="70" y="200" fill="#ffffff" font-size="48" font-weight="800" letter-spacing="-0.5">AI Career Decision Simulator</text>
  <text x="70" y="232" fill="#e7d3b3" font-size="18" font-weight="500">Evidence-Based Career Readiness &amp; Path Simulation</text>

  <text x="70" y="312" fill="#1d1d1f" font-size="27" font-weight="600">Compare real paths. See the tradeoffs.</text>
  <text x="70" y="350" fill="#6b6b6b" font-size="23" font-weight="500">Evidence-based readiness — </text>
  <text x="362" y="350" fill="#77410e" font-size="23" font-weight="700">you decide, not the AI.</text>

  ${cardsSvg}
</svg>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:${W}px;height:${H}px;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`;
}

for (let f = 0; f < TOTAL; f++) {
  const name = String(f).padStart(2, "0");
  fs.writeFileSync(path.join(OUT, `frame_${name}.html`), frameSVG(f));
}
console.log(`Wrote ${TOTAL} frames to _frames/`);
