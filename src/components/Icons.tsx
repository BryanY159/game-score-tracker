import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const HomeIcon = (p: P) => (
  <svg {...base(p)} strokeWidth={2.4}>
    <path d="M4 11l8-7 8 7v9H4z" />
  </svg>
);
export const HistoryIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </svg>
);
export const StatsIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 20V10M12 20V4M19 20v-7" />
  </svg>
);
export const PlayersIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 4.5a3.5 3.5 0 010 7M21 20c0-2.8-1.6-5-4-5.7" />
  </svg>
);
export const SettingsIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
);
export const BackIcon = (p: P) => (
  <svg {...base(p)} width={20} height={20} strokeWidth={2.2}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)} strokeWidth={2.6}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
