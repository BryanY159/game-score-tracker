import { ALEX, JORDAN, RILEY, SAM } from './players';
import { match, pawns, NOW } from './matches';

const seats = [
  { player: ALEX, color: 'red' as const },
  { player: SAM, color: 'blue' as const },
  { player: JORDAN, color: 'green' as const },
  { player: RILEY, color: 'gold' as const },
];

/** The mockup's state: Riley placed 1st, Alex 3, Jordan 2, Sam 1. */
export const PARCHEESI_MID = match('parcheesi', seats, {
  log: [...pawns(RILEY.id, 4), ...pawns(ALEX.id, 3), ...pawns(JORDAN.id, 2), ...pawns(SAM.id, 1)],
});

/** Finished order: Riley, Jordan, Alex, Sam (placed automatically). */
export const PARCHEESI_DONE = match('parcheesi', seats, {
  log: [...pawns(RILEY.id, 4), ...pawns(JORDAN.id, 4), ...pawns(SAM.id, 2), ...pawns(ALEX.id, 4, NOW - 1000)],
});
