import { useEffect, useRef, useState } from 'react';
import { useCelebrate } from '../components/Celebration';
import { leadChange, standings } from '../domain/motion';

/**
 * Rounds games (FR-19 AC-1, AC-2): rows are shown in standings order once a
 * round is confirmed (so they slide when the ranking changes), the leader has a
 * crown, and a new leader gets a mini celebration.
 */
export function useStandings(
  seats: { playerId: string; name: string; total: number; target: number }[],
  confirmedCount: number,
) {
  const celebrate = useCelebrate();
  const s = standings(seats);
  const order = confirmedCount === 0 ? seats.map((x) => x.playerId) : s.order;
  const prev = useRef<{ count: number; leaders: string[] } | null>(null);
  const [popFor, setPopFor] = useState<string | null>(null);
  const leadersKey = s.leaders.join(',');

  useEffect(() => {
    const before = prev.current;
    const leaders = leadersKey ? leadersKey.split(',') : [];
    if (before && confirmedCount > before.count) {
      const who = leadChange(before.leaders, leaders);
      if (who) {
        celebrate('leadChange', seats.find((x) => x.playerId === who)?.name ?? '');
        setPopFor(who);
      }
    }
    prev.current = { count: confirmedCount, leaders };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedCount, leadersKey]);

  return { order, leaders: s.leaders.length === 1 ? s.leaders : [], popFor };
}
