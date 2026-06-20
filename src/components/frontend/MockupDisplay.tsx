import React from 'react';

export interface Feature {
  id: string;
  slug: string;
}

interface MockupDisplayProps {
  feature: Feature;
}

/* Shared card chrome used across scenes for visual consistency */
const Card: React.FC<{ x: number; y: number; w: number; h: number; rotate?: number; children: React.ReactNode }> = ({
  x, y, w, h, rotate = 0, children,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
    <rect
      width={w}
      height={h}
      rx={14}
      className="fill-background stroke-border"
      strokeWidth={1}
      style={{ filter: 'drop-shadow(0 10px 24px rgb(0 0 0 / 0.12))' }}
    />
    {children}
  </g>
);

/* ---------- 1. Locations: map pins, floating cards, connection lines ---------- */
const LocationsScene = () => (
  <svg viewBox="0 0 400 500" className="w-full h-full">

    {/* connection lines between pins */}
    <path d="M120 180 L210 260 L290 160" className="stroke-primary/35" strokeWidth="2" strokeDasharray="4 5" fill="none" />
    <path d="M210 260 L150 360" className="stroke-primary/35" strokeWidth="2" strokeDasharray="4 5" fill="none" />

    {/* pins */}
    {[
      { x: 120, y: 180, big: false },
      { x: 290, y: 160, big: true },
      { x: 210, y: 260, big: false },
      { x: 150, y: 360, big: false },
    ].map((p, i) => (
      <g key={i} transform={`translate(${p.x} ${p.y})`}>
        <circle r={p.big ? 20 : 14} className="fill-primary/10" />
        <circle r={p.big ? 9 : 6} className="fill-primary" />
        <path
          d={p.big ? 'M0 -22 C12 -22 12 -2 0 14 C-12 -2 -12 -22 0 -22 Z' : 'M0 -16 C9 -16 9 -1 0 10 C-9 -1 -9 -16 0 -16 Z'}
          className="fill-primary"
          style={{ filter: 'drop-shadow(0 4px 8px rgb(0 0 0 / 0.18))' }}
        />
        <circle r={p.big ? 4 : 2.5} cy={p.big ? -10 : -7} className="fill-background" />
      </g>
    ))}

    {/* floating location card */}
    <Card x={40} y={395} w={200} h={76}>
      <circle cx={22} cy={38} r={14} className="fill-primary/15" />
      <path d="M22 30 C28 30 28 38 22 46 C16 38 16 30 22 30 Z" className="fill-primary" />
      <rect x={48} y={22} width="130" height="9" rx={4} className="fill-foreground/80" />
      <rect x={48} y={38} width="90" height="7" rx={3.5} className="fill-muted-foreground/50" />
      <rect x={48} y={52} width="60" height="7" rx={3.5} className="fill-emerald-500/70" />
    </Card>

    <Card x={250} y={70} w={120} h={56} rotate={-3}>
      <rect x={14} y={14} width="92" height="8" rx={4} className="fill-foreground/80" />
      <rect x={14} y={30} width="60" height="7" rx={3.5} className="fill-muted-foreground/50" />
    </Card>
  </svg>
);

/* ---------- 2. Rank Tracking: upward graph, keyword cards, ranking badges ---------- */
const RankTrackingScene = () => (
  <svg viewBox="0 0 400 500" className="w-full h-full">

    {/* axis grid */}
    {[1, 2, 3, 4].map((i) => (
      <line key={i} x1="40" x2="360" y1={130 + i * 60} y2={130 + i * 60} className="stroke-border" strokeWidth="1" />
    ))}

    {/* upward trend line */}
    <defs>
      <linearGradient id="rank-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0.28" />
        <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M50 360 L110 330 L170 300 L230 250 L290 170 L350 110 L350 400 L50 400 Z" fill="url(#rank-fill)" />
    <path
      d="M50 360 L110 330 L170 300 L230 250 L290 170 L350 110"
      className="stroke-primary"
      strokeWidth="3.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: 'drop-shadow(0 4px 10px rgb(0 0 0 / 0.15))' }}
    />
    {[
      [50, 360], [110, 330], [170, 300], [230, 250], [290, 170], [350, 110],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={5} className="fill-background stroke-primary" strokeWidth="3" />
    ))}

    {/* ranking badge near top of curve */}
    <g transform="translate(300 90)" style={{ filter: 'drop-shadow(0 6px 14px rgb(16 185 129 / 0.35))' }}>
      <rect width="76" height="32" rx="16" className="fill-emerald-500" />
      <text x="38" y="21" textAnchor="middle" className="fill-white text-[14px] font-semibold">#1 ↑12</text>
    </g>

    {/* keyword cards */}
    <Card x={40} y={415} w={150} h={62}>
      <rect x={14} y={14} width="100" height="8" rx={4} className="fill-foreground/80" />
      <rect x={14} y={32} width="60" height="7" rx={3.5} className="fill-muted-foreground/50" />
      <circle cx={128} cy={31} r={12} className="fill-emerald-500/15" />
      <text x="128" y="35" textAnchor="middle" className="fill-emerald-600 text-[10px] font-bold">#3</text>
    </Card>
    <Card x={210} y={415} w={150} h={62}>
      <rect x={14} y={14} width="100" height="8" rx={4} className="fill-foreground/80" />
      <rect x={14} y={32} width="60" height="7" rx={3.5} className="fill-muted-foreground/50" />
      <circle cx={128} cy={31} r={12} className="fill-primary/15" />
      <text x="128" y="35" textAnchor="middle" className="fill-primary text-[10px] font-bold">#1</text>
    </Card>
  </svg>
);

/* ---------- 3. Geo Grid Tracking: grid with colored dots + heatmap ---------- */
const GeoGridScene = () => {
  const cols = 7;
  const rows = 7;
  const cell = 38;
  const offsetX = 50;
  const offsetY = 90;

  const colorFor = (cx: number, cy: number) => {
    const dist = Math.hypot(cx - 3, cy - 3);
    if (dist < 1.3) return 'fill-emerald-500';
    if (dist < 2.4) return 'fill-amber-500';
    return 'fill-rose-500/80';
  };

  return (
    <svg viewBox="0 0 400 500" className="w-full h-full">
      <defs>
        <radialGradient id="heat-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" className="text-emerald-500" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" className="text-emerald-500" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={offsetX + (cols * cell) / 2} cy={offsetY + (rows * cell) / 2} r={150} fill="url(#heat-glow)" />

      {/* center business pin */}
      <g transform={`translate(${offsetX + (cols * cell) / 2} ${offsetY + (rows * cell) / 2 - 18})`}>
        <circle r={18} className="fill-foreground/10" />
        <path d="M0 -14 C10 -14 10 2 0 16 C-10 2 -10 -14 0 -14 Z" className="fill-foreground" style={{ filter: 'drop-shadow(0 4px 8px rgb(0 0 0 / 0.2))' }} />
        <circle r={3.5} cy={-7} className="fill-background" />
      </g>

      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={offsetX + c * cell}
            cy={offsetY + r * cell}
            r={6}
            className={colorFor(c, r)}
            opacity={0.92}
            style={{ filter: 'drop-shadow(0 2px 4px rgb(0 0 0 / 0.15))' }}
          />
        )),
      )}

      <Card x={70} y={420} w={260} h={56}>
        <rect x={16} y={14} width="130" height="8" rx={4} className="fill-foreground/80" />
        <rect x={16} y={32} width="90" height="7" rx={3.5} className="fill-muted-foreground/50" />
        <circle cx={220} cy={28} r={5} className="fill-emerald-500" />
        <circle cx={238} cy={28} r={5} className="fill-amber-500" />
        <circle cx={256} cy={28} r={5} className="fill-rose-500/80" />
      </Card>
    </svg>
  );
};

/* ---------- 4. Reviews & AI Reply: review cards, AI chat bubble, stars ---------- */
const Stars: React.FC<{ x: number; y: number; count?: number }> = ({ x, y, count = 5 }) => (
  <g transform={`translate(${x} ${y})`}>
    {Array.from({ length: count }).map((_, i) => (
      <path
        key={i}
        transform={`translate(${i * 16} 0) scale(0.6)`}
        d="M10 0 L13 7 L20 7 L14.5 11.5 L16.5 19 L10 14.5 L3.5 19 L5.5 11.5 L0 7 L7 7 Z"
        className="fill-amber-400"
      />
    ))}
  </g>
);

const ReviewsScene = () => (
  <svg viewBox="0 0 400 500" className="w-full h-full">

    <Card x={36} y={60} w={250} h={110} rotate={-2}>
      <circle cx={28} cy={30} r={14} className="fill-primary/20" />
      <rect x={50} y={22} width="80" height="8" rx="4" className="fill-foreground/80" />
      <Stars x={50} y={36} count={5} />
      <rect x={20} y={60} width="210" height="7" rx="3.5" className="fill-muted-foreground/40" />
      <rect x={20} y={74} width="170" height="7" rx="3.5" className="fill-muted-foreground/40" />
      <rect x={20} y={88} width="120" height="7" rx="3.5" className="fill-muted-foreground/40" />
    </Card>

    <Card x={70} y={195} w={250} h={100} rotate={2}>
      <circle cx={28} cy={28} r={14} className="fill-primary/20" />
      <rect x={50} y={20} width="70" height="8" rx="4" className="fill-foreground/80" />
      <Stars x={50} y={34} count={4} />
      <rect x={20} y={56} width="210" height="7" rx="3.5" className="fill-muted-foreground/40" />
      <rect x={20} y={70} width="140" height="7" rx="3.5" className="fill-muted-foreground/40" />
    </Card>

    {/* AI reply bubble */}
    <g transform="translate(60 330)" style={{ filter: 'drop-shadow(0 12px 28px rgb(0 0 0 / 0.18))' }}>
      <path
        d="M16 0 H264 a16 16 0 0 1 16 16 V96 a16 16 0 0 1 -16 16 H40 L16 132 V112 H16 a16 16 0 0 1 -16 -16 V16 A16 16 0 0 1 16 0 Z"
        className="fill-primary"
      />
      <g transform="translate(20 18)">
        <circle r={9} className="fill-white/20" />
        <path d="M-4 -1 L0 -6 L4 -1 L1 -1 L1 6 L-1 6 L-1 -1 Z" className="fill-white" />
      </g>
      <rect x={20} y={42} width="220" height="8" rx="4" className="fill-white/85" />
      <rect x={20} y={58} width="180" height="8" rx="4" className="fill-white/60" />
      <rect x={20} y={74} width="140" height="8" rx="4" className="fill-white/60" />
    </g>
  </svg>
);

/* ---------- 5. Posts Automation: calendar + content cards + flow arrows ---------- */
const PostsAutomationScene = () => (
  <svg viewBox="0 0 400 500" className="w-full h-full">

    {/* calendar */}
    <Card x={40} y={50} w={170} h={170}>
      <rect x={14} y={14} width="142" height="26" rx="6" className="fill-primary/15" />
      <rect x={22} y={22} width="46" height="9" rx="4" className="fill-primary" />
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => {
          const filled = (row === 1 && col === 2) || (row === 2 && col === 0);
          return (
            <rect
              key={`${row}-${col}`}
              x={20 + col * 28}
              y={56 + row * 26}
              width={20}
              height={18}
              rx={4}
              className={filled ? 'fill-primary' : 'fill-muted-foreground/15'}
            />
          );
        }),
      )}
    </Card>

    {/* flow arrows */}
    <path d="M215 110 H260" className="stroke-primary/50" strokeWidth="2.5" markerEnd="url(#arrow)" fill="none" />
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0 0 L8 4 L0 8 Z" className="fill-primary/50" />
      </marker>
    </defs>

    {/* content cards stacked, scheduled */}
    <Card x={265} y={70} w={100} h={80} rotate={3}>
      <rect x={10} y={10} width="80" height="36" rx="6" className="fill-primary/15" />
      <rect x={10} y={54} width="60" height="7" rx="3.5" className="fill-foreground/70" />
      <rect x={10} y={66} width="40" height="6" rx="3" className="fill-muted-foreground/40" />
    </Card>

    <Card x={60} y={260} w={130} h={92} rotate={-2}>
      <rect x={12} y={12} width="106" height="44" rx="6" className="fill-amber-500/20" />
      <rect x={12} y={64} width="80" height="7" rx="3.5" className="fill-foreground/70" />
      <rect x={12} y={78} width="50" height="6" rx="3" className="fill-muted-foreground/40" />
    </Card>
    <Card x={210} y={250} w={130} h={92} rotate={3}>
      <rect x={12} y={12} width="106" height="44" rx="6" className="fill-emerald-500/20" />
      <rect x={12} y={64} width="80" height="7" rx="3.5" className="fill-foreground/70" />
      <rect x={12} y={78} width="50" height="6" rx="3" className="fill-muted-foreground/40" />
    </Card>

    <path d="M150 260 V200 H260 V250" className="stroke-primary/40" strokeWidth="2" strokeDasharray="4 5" fill="none" />

    {/* status pill */}
    <g transform="translate(140 390)" style={{ filter: 'drop-shadow(0 6px 14px rgb(16 185 129 / 0.35))' }}>
      <rect width="120" height="32" rx="16" className="fill-emerald-500" />
      <circle cx={20} cy={16} r={5} className="fill-white" />
      <text x="68" y="21" textAnchor="middle" className="fill-white text-[12px] font-semibold">Scheduled</text>
    </g>
  </svg>
);

/* ---------- 6. AI Poster Generator: poster templates, sparkle, image cards ---------- */
const Sparkle: React.FC<{ x: number; y: number; s?: number; className?: string }> = ({ x, y, s = 1, className }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className={className}>
    <path d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" />
  </g>
);

const AIPosterScene = () => (
  <svg viewBox="0 0 400 500" className="w-full h-full">

    {/* secondary image cards behind */}
    <Card x={50} y={100} w={90} h={120} rotate={-10}>
      <rect x={10} y={10} width="70" height="100" rx="6" className="fill-rose-400/20" />
    </Card>
    <Card x={300} y={140} w={90} h={120} rotate={10}>
      <rect x={10} y={10} width="70" height="100" rx="6" className="fill-sky-400/20" />
    </Card>

    {/* main poster template */}
    <Card x={110} y={60} w={180} h={240} rotate={0}>
      <rect x={14} y={14} width="152" height="120" rx="8" className="fill-primary/15" />
      <circle cx={60} cy={60} r={18} className="fill-amber-400/70" />
      <path d="M14 130 L70 90 L110 115 L166 80 V134 H14 Z" className="fill-primary/25" />
      <rect x={14} y={146} width="110" height="10" rx="5" className="fill-foreground/80" />
      <rect x={14} y={164} width="80" height="8" rx="4" className="fill-muted-foreground/50" />
      <rect x={14} y={196} width="152" height="28" rx="8" className="fill-primary" />
      <text x={90} y={214} textAnchor="middle" className="fill-white text-[11px] font-semibold">Get Offer</text>
    </Card>

    {/* sparkles */}
    <Sparkle x={300} y={70} s={0.9} className="fill-primary" />
    <Sparkle x={80} y={70} s={0.6} className="fill-amber-400" />
    <Sparkle x={330} y={310} s={0.7} className="fill-primary/70" />

    {/* prompt bar */}
    <Card x={50} y={420} w={300} h={48}>
      <Sparkle x={28} y={24} s={0.45} className="fill-primary" />
      <rect x={48} y={18} width="180" height="8" rx="4" className="fill-muted-foreground/50" />
      <rect x={250} y={12} width="36" height="24" rx="8" className="fill-primary" />
    </Card>
  </svg>
);

const SCENES: Record<string, React.FC> = {
  locations: LocationsScene,
  'rank-tracking': RankTrackingScene,
  'geo-grid-tracking': GeoGridScene,
  'reviews-ai-reply': ReviewsScene,
  'posts-automation': PostsAutomationScene,
  'ai-poster-generator': AIPosterScene,
};

const MockupDisplay: React.FC<MockupDisplayProps> = ({ feature }) => {
  const Scene = SCENES[feature.slug] || LocationsScene;

  return (
    <div className="w-full max-w-[340px] mx-auto aspect-[4/5] rounded-2xl overflow-hidden text-foreground">
      <Scene />
    </div>
  );
};

export default MockupDisplay;