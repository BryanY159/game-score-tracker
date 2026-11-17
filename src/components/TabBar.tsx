import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { HistoryIcon, HomeIcon, PlayersIcon, StatsIcon } from './Icons';
import { NoWrap } from './NoWrap';

const TABS: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Home', icon: <HomeIcon /> },
  { to: '/history', label: 'History', icon: <HistoryIcon /> },
  { to: '/stats', label: 'Stats', icon: <StatsIcon /> },
  { to: '/players', label: 'Players', icon: <PlayersIcon /> },
];

export function TabBar() {
  return (
    <nav aria-label="App sections" className="pb-safe sticky bottom-0 z-10 border-t border-border bg-bg">
      <div className="mx-auto flex max-w-3xl px-3 pt-2 pb-2">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-xs no-underline ${
                isActive ? 'font-extrabold text-text' : 'font-bold text-text-2'
              }`
            }
          >
            {t.icon}
            <NoWrap>{t.label}</NoWrap>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
