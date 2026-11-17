import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { FOUR } from './fixtures/players';
import { TTR_END, TTR_TIE, TTR_TIEBREAK } from './fixtures/ticketToRide';

const points = (page: Page, name: string) => page.getByLabel(`${name} route points`);
const trains = (page: Page, name: string) => page.getByLabel(`${name} trains left`);

test('a full game: routes, the final round, an edited turn, end-of-game scoring (FR-7)', async ({ page }) => {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Ticket to Ride/ }).click();
  for (const n of ['Alex', 'Sam']) await page.getByRole('button', { name: n, exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();

  await expect(trains(page, 'Alex')).toHaveText('45'); // AC-3
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: 'Claim a 6-route' }).click(); // Alex: +15, −6 trains (AC-2)
    await page.getByRole('button', { name: 'Draw train cards' }).click(); // Sam
  }
  await expect(points(page, 'Alex')).toHaveText('105');
  await expect(trains(page, 'Alex')).toHaveText('3');
  await expect(page.getByRole('button', { name: 'Claim a 4-route' })).toBeDisabled(); // not enough trains (A-10)
  await page.getByRole('button', { name: 'Claim a 1-route' }).click();

  // Alex ended a turn with 2 trains: everyone, Alex included, gets one more turn (AC-5).
  await expect(page.getByText(/Final round: Alex is down to 2 trains\. 2 turns left\./)).toBeVisible();

  // Edit a logged turn (AC-4): Sam's first turn was really a 2-route.
  await page.getByRole('button', { name: 'Turn log' }).click();
  await page.getByRole('button', { name: /^Turn 2:/ }).click();
  await page.getByRole('button', { name: '2-route', exact: true }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(points(page, 'Sam')).toHaveText('2');

  await page.getByRole('button', { name: 'Claim a 3-route' }).click(); // Sam's last turn
  await expect(page.getByText(/1 turn left/)).toBeVisible();
  await page.getByRole('button', { name: 'Draw tickets' }).click(); // Alex's last turn

  // End-of-game scoring (AC-6, AC-7).
  await expect(page.getByRole('heading', { name: 'Final scoring' })).toBeVisible();
  const addTicket = async (value: string, completed = true) => {
    await page.getByRole('button', { name: 'Add ticket' }).click();
    for (const d of value) await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: completed ? `Completed +${value}` : `Failed −${value}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  };
  await addTicket('13');
  await addTicket('8', false); // Failed from the keypad (FR-7 AC-6)
  await expect(page.getByRole('radio', { name: 'Failed −8' })).toHaveAttribute('aria-checked', 'true');
  // The row toggle still changes it later.
  await page.getByRole('radio', { name: 'Done +8' }).click();
  await page.getByRole('radio', { name: 'Failed −8' }).click();
  await page.getByRole('button', { name: 'Longest path: Alex' }).click();
  await expect(page.getByLabel('Alex final total')).toHaveText(String(106 + 13 - 8 + 10));
  await page.getByRole('button', { name: 'Next: Sam' }).click();
  await addTicket('20');
  await expect(page.getByLabel('Sam final total')).toHaveText(String(2 + 4 + 20));
  await page.getByRole('button', { name: 'See results' }).click();

  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
  await page.getByRole('button', { name: 'Finalize' }).click();
  await expect(page.getByRole('heading', { name: 'Game Night' })).toBeVisible();

  // AC-8: the turn log is gone; the breakdown is kept.
  const saved = await page.evaluate(async () => {
    const req = indexedDB.open('game-score-tracker');
    const dbh: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const all = <T,>(store: string) =>
      new Promise<T[]>((r) => {
        const q = dbh.transaction(store).objectStore(store).getAll();
        q.onsuccess = () => r(q.result);
      });
    const logs = await all<{ deletedAt: number | null; entries: unknown[] }>('turnLogs');
    const mps = await all<{ finalScore: number; details: Record<string, unknown> }>('matchPlayers');
    return { logs: logs.map((l) => [l.deletedAt !== null, l.entries.length]), mps: mps.map((m) => [m.finalScore, m.details]).sort((a, b) => (b[0] as number) - (a[0] as number)) };
  });
  expect(saved.logs).toEqual([[true, 0]]);
  expect(saved.mps).toEqual([
    [121, { routePoints: 106, tickets: [{ value: 13, completed: true }, { value: 8, completed: false }], longestPath: true }],
    [26, { routePoints: 6, tickets: [{ value: 20, completed: true }], longestPath: false }],
  ]);

  // History detail shows the breakdown; editing changes only the breakdown (A-11).
  await page.getByRole('link', { name: 'History' }).click();
  await page.getByRole('main').getByRole('listitem').first().getByRole('button').click();
  await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem').first()).toContainText('106 routes · 1/2 tickets · longest path');
  await page.getByRole('button', { name: 'Edit scores' }).click();
  await page.getByRole('textbox', { name: 'Alex route points' }).fill('100');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem').first()).toContainText('115');
});

test('a tie on total goes to the most completed tickets (FR-11 AC-2)', async ({ page }) => {
  await openApp(page, `#/play/${TTR_TIEBREAK.matches[0]!.id}/final`, TTR_TIEBREAK);
  const addTicket = async (value: string, completed = true) => {
    await page.getByRole('button', { name: 'Add ticket' }).click();
    for (const d of value) await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: completed ? `Completed +${value}` : `Failed −${value}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  };
  await addTicket('10'); // Sam: one 10
  await page.getByRole('button', { name: 'Next: Alex' }).click();
  await addTicket('4'); // Alex: 4 + 6
  await addTicket('6');
  await page.getByRole('button', { name: 'See results' }).click();
  // Both 116; Alex has 2 completed tickets to Sam's 1.
  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
});

test('a tie that remains opens the tie screen (FR-11 AC-3)', async ({ page }) => {
  await openApp(page, `#/play/${TTR_TIE.matches[0]!.id}/results`, TTR_TIE);
  const tie = page.getByRole('dialog', { name: "It's a tie" });
  await expect(tie).toContainText('are tied on total, completed tickets and the longest path.');
  await tie.getByRole('button', { name: 'Pick the tie-breaker winner' }).click();
  await tie.getByRole('button', { name: 'Sam' }).click();
  await expect(page.getByRole('heading', { name: 'Sam wins' })).toBeVisible();
});

test('Add ticket stays open for back-to-back entry, lists the tickets with a total, and only Done closes it (FR-7 AC-6)', async ({ page }) => {
  await openApp(page, `#/play/${TTR_END.matches[0]!.id}/final`, TTR_END);
  await page.getByRole('tab', { name: 'Alex' }).click();
  await page.getByRole('button', { name: 'Add ticket' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add ticket' });
  const list = dialog.getByRole('region', { name: "Alex's tickets" }).getByRole('listitem');
  await expect(dialog.getByText('No tickets yet.')).toBeVisible();
  const enter = async (value: string, completed: boolean) => {
    for (const d of value) await dialog.getByRole('button', { name: d, exact: true }).click();
    await dialog.getByRole('button', { name: completed ? `Completed +${value}` : `Failed −${value}` }).click();
    await expect(dialog).toBeVisible(); // stays open
    await expect(dialog.getByLabel('Ticket value value')).toHaveValue(''); // cleared
  };
  await enter('12', true);
  await enter('7', true);
  await enter('9', false);
  await expect(list).toHaveCount(3);
  await expect(list.nth(0)).toHaveText(/\+12\s*Completed/);
  await expect(list.nth(1)).toHaveText(/\+7\s*Completed/);
  await expect(list.nth(2)).toHaveText(/−9\s*Failed/);
  await expect(dialog.getByLabel('Tickets total')).toHaveText('+10');

  // A mistake can be removed from the list.
  await enter('4', true);
  await dialog.getByRole('button', { name: 'Remove completed ticket 4' }).click();
  await expect(list).toHaveCount(3);
  await expect(dialog.getByLabel('Tickets total')).toHaveText('+10');

  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toHaveCount(0);
  const rows = page.getByRole('list', { name: 'Tickets' }).getByRole('listitem');
  await expect(rows).toHaveCount(3);
  await expect(page.getByRole('radiogroup', { name: 'Ticket 9' }).getByRole('radio', { name: 'Failed −9' })).toHaveAttribute('aria-checked', 'true');
  // Tapping outside closes it too.
  await page.getByRole('button', { name: 'Add ticket' }).click();
  await page.mouse.click(10, 10);
  await expect(dialog).toHaveCount(0);
});
