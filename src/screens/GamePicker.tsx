import { useNavigate } from 'react-router-dom';
import { GameHeader } from '../components/GameChrome';
import { ChevronIcon, GameIcons } from '../components/Icons';
import { NoWrap } from '../components/NoWrap';
import { GAMES, rangeLabel } from '../games/registry';

/** FR-3 step 1. */
export function GamePicker() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <GameHeader title="Choose a game" />
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 px-4 pb-6 md:grid-cols-2">
        {GAMES.map((g) => {
          const Icon = GameIcons[g.key]!;
          return (
            <li key={g.key}>
              <button
                type="button"
                disabled={!g.available}
                onClick={() => navigate(`/new/${g.key}`)}
                className="flex min-h-[84px] w-full items-center gap-3.5 rounded-[20px] border-[1.5px] border-border px-4 py-3.5 text-left text-text disabled:opacity-45"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-surface">
                  <Icon />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <NoWrap truncate className="text-lg font-extrabold">
                    {g.name}
                  </NoWrap>
                  <NoWrap truncate className="text-[14px] text-text-2">
                    {g.available ? `${g.tagline} · ${rangeLabel(g)}` : 'Coming soon'}
                  </NoWrap>
                </span>
                {g.available && <ChevronIcon className="shrink-0 text-text-2" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
