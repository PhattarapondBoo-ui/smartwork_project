/** Local class joiner (Brand is used by server components, so it must not import the client-side ui module). */
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Four-point "sparkle" star centred at (x, y). */
function sparkle(x: number, y: number, r: number) {
  const k = r * 0.22;
  return `M${x} ${y - r} C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y} C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r} C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y} C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
}

/** Clean Dee mark: a soft sky-blue tile with a sparkle. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <defs>
        <linearGradient id="cd-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-brand-50)" />
          <stop offset="1" stopColor="var(--color-brand-100)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#cd-mark)" />
      <path d={sparkle(18, 21, 11)} fill="var(--color-brand-600)" />
      <path d={sparkle(29, 11, 4.5)} fill="var(--color-accent-700)" />
    </svg>
  );
}

/**
 * Minimal graphic for the header bands: two quiet concentric rings, a small
 * dot grid and a single sparkle. Kept deliberately subtle so it never feels
 * busy. Sits on the right of the band; `preserveAspectRatio` keeps it anchored.
 */
export function HeroPattern({ className }: { className?: string }) {
  const dots: { x: number; y: number }[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) dots.push({ x: 196 + c * 16, y: 44 + r * 16 });
  return (
    <svg viewBox="0 0 440 260" preserveAspectRatio="xMaxYMid slice" className={className} aria-hidden>
      {/* two thin concentric rings */}
      <circle cx="370" cy="130" r="110" fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="14" />
      <circle cx="370" cy="130" r="64" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.5" />

      {/* small dot grid */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="1.5" fill="#ffffff" opacity="0.16" />
      ))}

      {/* one sparkle */}
      <path d={sparkle(318, 92, 12)} fill="var(--color-accent-500)" opacity="0.9" />
    </svg>
  );
}

/** "Clean Dee" wordmark. */
export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg tracking-tight text-gray-900", className)}>
      <span className="font-light">Clean</span>
      <span className="font-semibold text-brand-700"> Dee</span>
    </span>
  );
}

/**
 * Hand-drawn (SVG) illustration of a bright, freshly cleaned living room:
 * sunny window, tidy sofa, plant, shiny floor and sparkles. No external image,
 * so it is crisp at any size, loads instantly and has no licensing concerns.
 */
export function CleanRoomIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="ภาพห้องนั่งเล่นที่สะอาดสดใส">
      <defs>
        <linearGradient id="cd-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="var(--color-brand-50)" />
        </linearGradient>
        <linearGradient id="cd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-brand-200)" />
          <stop offset="1" stopColor="var(--color-brand-50)" />
        </linearGradient>
        <linearGradient id="cd-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-brand-100)" />
          <stop offset="1" stopColor="var(--color-brand-50)" />
        </linearGradient>
        <linearGradient id="cd-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* wall */}
      <rect width="320" height="200" fill="url(#cd-wall)" />

      {/* window with sky, sun and clouds */}
      <rect x="38" y="20" width="96" height="100" rx="12" fill="#ffffff" />
      <rect x="45" y="27" width="82" height="86" rx="7" fill="url(#cd-sky)" />
      <circle cx="106" cy="50" r="10" fill="#ffffff" opacity="0.95" />
      <path d="M45 100 q12 -14 26 -6 q10 -12 24 -2 q10 -8 22 0 q6 -2 10 2 v19 h-82z" fill="#ffffff" opacity="0.75" />
      <rect x="84.8" y="27" width="2.4" height="86" fill="#ffffff" />
      <rect x="45" y="68.8" width="82" height="2.4" fill="#ffffff" />
      {/* sunlight falling into the room */}
      <path d="M45 113 L127 113 L190 150 L60 150 Z" fill="url(#cd-light)" opacity="0.6" />

      {/* wall frame */}
      <rect x="196" y="34" width="44" height="34" rx="6" fill="#ffffff" stroke="var(--color-brand-100)" strokeWidth="2" />
      <path d="M202 62 l10 -12 l8 8 l6 -6 l8 10z" fill="var(--color-brand-100)" />

      {/* floor */}
      <rect x="0" y="150" width="320" height="50" fill="url(#cd-floor)" />
      <rect x="0" y="149" width="320" height="2" fill="#ffffff" />
      <ellipse cx="214" cy="174" rx="78" ry="7" fill="#ffffff" opacity="0.65" />
      <ellipse cx="60" cy="182" rx="40" ry="4" fill="#ffffff" opacity="0.5" />

      {/* sofa */}
      <rect x="164" y="98" width="118" height="38" rx="16" fill="#ffffff" />
      <rect x="154" y="116" width="138" height="32" rx="14" fill="#ffffff" stroke="var(--color-brand-100)" strokeWidth="2" />
      <rect x="176" y="92" width="44" height="28" rx="11" fill="var(--color-brand-100)" />
      <rect x="226" y="92" width="44" height="28" rx="11" fill="var(--color-brand-200)" />
      <rect x="164" y="148" width="6" height="8" rx="2" fill="var(--color-brand-300)" />
      <rect x="276" y="148" width="6" height="8" rx="2" fill="var(--color-brand-300)" />

      {/* side table with vase */}
      <rect x="128" y="128" width="20" height="22" rx="4" fill="#ffffff" stroke="var(--color-brand-100)" strokeWidth="2" />
      <rect x="133" y="116" width="10" height="12" rx="4" fill="var(--color-brand-300)" />
      <circle cx="138" cy="111" r="5" fill="#ffffff" stroke="var(--color-brand-200)" strokeWidth="2" />

      {/* plant */}
      <ellipse cx="26" cy="112" rx="7" ry="16" transform="rotate(-22 26 112)" fill="#a5d6a7" />
      <ellipse cx="40" cy="108" rx="7" ry="18" transform="rotate(14 40 108)" fill="#81c784" />
      <ellipse cx="33" cy="104" rx="6" ry="17" fill="#a5d6a7" />
      <path d="M20 150 l4 -26 h20 l4 26z" fill="#ffffff" stroke="var(--color-brand-100)" strokeWidth="2" />

      {/* sparkles & bubbles */}
      <path d={sparkle(156, 52, 9)} fill="var(--color-accent-500)" />
      <path d={sparkle(292, 70, 7)} fill="#ffffff" stroke="var(--color-brand-200)" strokeWidth="1.5" />
      <path d={sparkle(176, 76, 4.5)} fill="var(--color-brand-300)" />
      <path d={sparkle(300, 28, 5)} fill="var(--color-accent-500)" />
      <path d={sparkle(262, 172, 5)} fill="#ffffff" />
      <circle cx="278" cy="46" r="6" fill="none" stroke="var(--color-brand-200)" strokeWidth="1.5" />
      <circle cx="268" cy="30" r="3.5" fill="none" stroke="var(--color-brand-100)" strokeWidth="1.5" />
      <circle cx="152" cy="86" r="3" fill="none" stroke="var(--color-brand-200)" strokeWidth="1.5" />
    </svg>
  );
}
