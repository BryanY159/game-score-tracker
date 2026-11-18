import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';
import { FOUR } from './fixtures/players';

async function startMonopoly(page: Page, names = ['Alex', 'Sam', 'Jordan']) {
  await openApp(page, '#/', { players: FOUR });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /Monopoly/ }).click();
  for (const n of names) await page.getByRole('button', { name: n, exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('heading', { name: 'Monopoly' })).toBeVisible();
}

async function typeWorth(page: Page, values: string[]) {
  for (const v of values) {
    for (const d of v) await page.getByRole('button', { name: d, exact: true }).click();
    await page.getByRole('button', { name: /Next player|Rank players/ }).click();
  }
}

const finished = (page: Page) =>
  page.evaluate(async () => {
    const req = indexedDB.open('game-score-tracker');
    const dbh: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const all = <T,>(store: string) =>
      new Promise<T[]>((r) => {
        const q = dbh.transaction(store).objectStore(store).getAll();
        q.onsuccess = () => r(q.result);
      });
    const [m] = await all<{ status: string; endedEarly: boolean; endedAt: number }>('matches');
    const players = await all<{ id: string; name: string }>('players');
    const mps = await all<{ playerId: string; placement: number; isWinner: boolean; details: Record<string, number> }>('matchPlayers');
    const name = (id: string) => players.find((p) => p.id === id)!.name;
    return {
      status: m!.status,
      endedEarly: m!.endedEarly,
      seats: mps
        .map((x) => [name(x.playerId), x.placement, x.isWinner, x.details.netWorth ?? null, 'bankruptAt' in x.details])
        .sort((a, b) => (a[1] as number) - (b[1] as number) || String(a[0]).localeCompare(String(b[0]))),
    };
  });

test('play to the last player standing (FR-10 AC-1, AC-2)', async ({ page }) => {
  await startMonopoly(page, ['Alex', 'Sam', 'Jordan', 'Riley']);
  const bankrupt = (n: string) => page.getByRole('listitem').filter({ hasText: n }).getByRole('button', { name: 'Bankrupt' });
  await bankrupt('Sam').click();
  await expect(page.getByText(/Bankrupt at/)).toBeVisible();
  await bankrupt('Riley').click();
  await page.getByRole('button', { name: 'Undo' }).click(); // FR-5 AC-4: Riley is back in
  await expect(page.getByText(/Bankrupt at/)).toHaveCount(1);
  await bankrupt('Riley').click();
  await bankrupt('Jordan').click();
  await expect(page.getByRole('heading', { name: 'Alex wins' })).toBeVisible();
  await expect(page.getByText('Last one standing')).toBeVisible();
  await page.getByRole('button', { name: 'Finalize' }).click();
  expect(await finished(page)).toEqual({
    status: 'finished',
    endedEarly: false,
    seats: [
      ['Alex', 1, true, null, false],
      ['Jordan', 2, false, null, true],
      ['Riley', 3, false, null, true],
      ['Sam', 4, false, null, true],
    ],
  });
});

test('end early by net worth, with a drag to reorder (FR-10 AC-3, AC-4)', async ({ page }) => {
  await startMonopoly(page, ['Alex', 'Sam', 'Jordan', 'Riley']);
  await page.getByRole('listitem').filter({ hasText: 'Riley' }).getByRole('button', { name: 'Bankrupt' }).click();
  await page.getByRole('button', { name: 'End game' }).click();
  await typeWorth(page, ['1500', '3200', '800']);
  const ranked = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: /^Drag/ }) });
  await expect(ranked).toHaveText([/Sam.*\$3,200/, /Alex.*\$1,500/, /Jordan.*\$800/]);
  // Keyboard drag: move Jordan above Alex.
  const grip = page.getByRole('button', { name: 'Drag Jordan to reorder' });
  await grip.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  await page.keyboard.press('Space');
  await expect(ranked).toHaveText([/Sam/, /Jordan/, /Alex/]);
  await page.getByRole('button', { name: 'See results' }).click();
  await expect(page.getByRole('heading', { name: 'Sam wins' })).toBeVisible();
  await expect(page.getByText('Ended early · highest net worth')).toBeVisible();
  await expect(page.getByText('$3,200').first()).toBeVisible(); // Results in dollars (FR-10 AC-3)
  await page.getByRole('button', { name: 'Finalize' }).click();
  expect(await finished(page)).toEqual({
    status: 'finished',
    endedEarly: true,
    seats: [
      ['Sam', 1, true, 3200, false],
      ['Jordan', 2, false, 800, false],
      ['Alex', 3, false, 1500, false],
      ['Riley', 4, false, null, true],
    ],
  });
  await expect(page.getByText('Sam won · ended early')).toBeVisible();
});

test('a net-worth tie opens the tie screen: shared win (FR-11 AC-3)', async ({ page }) => {
  await startMonopoly(page);
  await page.getByRole('button', { name: 'End game' }).click();
  await typeWorth(page, ['2000', '2000', '500']);
  await page.getByRole('button', { name: 'See results' }).click();
  const tie = page.getByRole('dialog', { name: "It's a tie" });
  await expect(tie).toContainText('Alex and Sam have the same net worth ($2,000).');
  await tie.getByRole('button', { name: 'Shared win' }).click();
  await expect(page.getByRole('heading', { name: 'Shared win' })).toBeVisible();
  await expect(page.getByText('Alex and Sam', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finalize' }).click();
  const r = await finished(page);
  expect(r.seats.map((s) => [s[0], s[1], s[2]])).toEqual([
    ['Alex', 1, true],
    ['Sam', 1, true],
    ['Jordan', 3, false],
  ]);
  await expect(page.getByText('Shared win · Alex and Sam')).toBeVisible();
});

test('a net-worth tie settled by an outside tie-breaker', async ({ page }) => {
  await startMonopoly(page);
  await page.getByRole('button', { name: 'End game' }).click();
  await typeWorth(page, ['2000', '2000', '500']);
  await page.getByRole('button', { name: 'See results' }).click();
  await page.getByRole('button', { name: 'Pick the tie-breaker winner' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sam' }).click();
  await expect(page.getByRole('heading', { name: 'Sam wins' })).toBeVisible();
});

test('the iOS number pad can be used instead of the keypad (FR-18 AC-3)', async ({ page }) => {
  await startMonopoly(page, ['Alex', 'Sam']);
  await page.getByRole('button', { name: 'End game' }).click();
  const input = page.getByRole('textbox', { name: "Alex's net worth value" });
  await expect(input).toHaveAttribute('inputmode', 'numeric');
  await input.fill('4,25x0');
  await expect(page.getByRole('button', { name: /Alex/ })).toContainText('$4,250');
  await expect(input).toHaveValue('$4,250'); // shown as dollars, stored as 4250
});

test('edit a finished Monopoly game from History', async ({ page }) => {
  await startMonopoly(page);
  await page.getByRole('listitem').filter({ hasText: 'Sam' }).getByRole('button', { name: 'Bankrupt' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Jordan' }).getByRole('button', { name: 'Bankrupt' }).click();
  await page.getByRole('button', { name: 'Finalize' }).click();
  await page.getByRole('link', { name: 'History' }).click();
  await page.getByRole('main').getByRole('listitem').first().getByRole('button').click();
  await page.getByRole('button', { name: 'Edit scores' }).click();
  await page.getByRole('button', { name: 'Undo' }).click(); // Jordan back in
  await page.getByRole('button', { name: 'End early by net worth' }).click();
  await typeWorth(page, ['100', '900']);
  await page.getByRole('button', { name: 'See results' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('list', { name: 'Players' }).getByRole('listitem')).toHaveText([/Jordan1st · Winner\$900/, /Alex2nd\$100/, /Sam3rdBankrupt/]);
});
