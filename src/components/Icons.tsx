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
export const MinusIcon = (p: P) => (
  <svg {...base(p)} strokeWidth={3}>
    <path d="M5 12h14" />
  </svg>
);
export const UndoIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 010 12h-3" />
  </svg>
);
export const NotesIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);
export const MoreIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);
export const PauseIcon = (p: P) => (
  <svg {...base(p)} width={14} height={14} strokeWidth={3}>
    <path d="M8 5v14M16 5v14" />
  </svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const PencilIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)} strokeWidth={2.6}>
    <path d="M5 12l5 5 9-10" />
  </svg>
);
export const ShuffleIcon = (p: P) => (
  <svg {...base(p)} width={18} height={18}>
    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);
export const GripIcon = (p: P) => (
  <svg {...base(p)} strokeWidth={3}>
    <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
  </svg>
);
export const ChevronIcon = (p: P) => (
  <svg {...base(p)} width={18} height={18} strokeWidth={2.2}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const CrownIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
  </svg>
);

/** Game picker icons, from the mockup. */
export const GameIcons: Record<string, (p: P) => React.JSX.Element> = {
  flip7: (p) => (
    <svg {...base(p)}>
      <rect x="3" y="5" width="8" height="12" rx="2" />
      <rect x="13" y="7" width="8" height="12" rx="2" />
    </svg>
  ),
  dutchBlitz: (p) => (
    <svg {...base(p)}>
      <rect x="4" y="3" width="11" height="15" rx="2" />
      <path d="M9 21h9a2 2 0 002-2V8" />
    </svg>
  ),
  ticketToRide: (p) => (
    <svg {...base(p)}>
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
      <path d="M9 8V6M15 8V6" />
    </svg>
  ),
  parcheesi: (p) => (
    <svg {...base(p)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 12h16M12 4v16" />
    </svg>
  ),
  monopoly: (p) => (
    <svg {...base(p)}>
      <path d="M4 20V10l8-6 8 6v10z" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
};
export const RoundsIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={2.4} />
  </svg>
);
