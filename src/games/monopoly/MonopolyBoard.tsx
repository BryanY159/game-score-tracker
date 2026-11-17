import { NoWrap } from '../../components/NoWrap';
import { Avatar } from '../../components/PlayerPill';
import type { Seat } from '../../db/repos/matches';
import { COLOR_HEX } from '../../domain/colors';
import { ordinal } from '../../domain/placement';
import type { MonopolyState } from './scoring';

const time = (t: number) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** FR-10 AC-1: a Bankrupt button per player; bankrupt players show their place and time. */
export function MonopolyBoard({
  seats,
  state,
  onBankrupt,
  disabled = false,
}: {
  seats: Seat[];
  state: MonopolyState;
  onBankrupt: (playerId: string) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 md:grid-cols-2">
      {seats.map(({ player, mp }) => {
        const p = state.players.find((x) => x.playerId === player.id)!;
        const out = p.bankruptAt !== null;
        return (
          <li
            key={mp.id}
            className={`flex h-14 items-center gap-2.5 rounded-[28px] pr-2 pl-2 text-white ${out ? 'opacity-55' : ''}`}
            style={{ background: COLOR_HEX[mp.color] }}
          >
            <Avatar emoji={player.emoji} />
            <div className="flex min-w-0 flex-1 flex-col leading-[1.15]">
              <NoWrap truncate className="text-[17px] font-bold">
                {player.name}
              </NoWrap>
              <NoWrap truncate className="text-[13px]">
                {out ? `Bankrupt at ${time(p.bankruptAt!)}` : p.isWinner ? 'Last one standing' : 'Playing'}
              </NoWrap>
            </div>
            {p.placement !== null ? (
              <NoWrap className="tabular flex h-10 items-center rounded-[20px] bg-white px-4 text-lg font-extrabold text-[#1F2430]">
                {ordinal(p.placement)}
              </NoWrap>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onBankrupt(player.id)}
                className="h-11 rounded-[22px] border-2 border-white px-4 text-[15px] font-extrabold text-white disabled:opacity-40"
              >
                <NoWrap>Bankrupt</NoWrap>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
