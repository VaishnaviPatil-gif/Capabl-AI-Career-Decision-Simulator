// Capabl brand mark — three rising steps (staircase). One continuous stroke,
// square caps, no nodes. Uses `currentColor`, so the color follows the parent's
// text color (set it via the className, e.g. "text-[#1d1d1f]" or "text-white").
// Scales cleanly from a 16px favicon to a hero header.
export default function LogoMark({ className = "w-8 h-8" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <polyline points="10,22 34,22 34,48 58,48 58,74 86,74" />
    </svg>
  );
}
