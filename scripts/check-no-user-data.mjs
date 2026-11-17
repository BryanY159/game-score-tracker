// R-10 guard: the repo is public, so no backup export may be committed.
// Fails if a tracked JSON file looks like an export, outside test fixtures.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '*.json'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const offenders = files.filter((f) => {
  if (f.startsWith('e2e/fixtures/')) return false;
  try {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    return data && typeof data === 'object' && 'schemaVersion' in data && 'tables' in data;
  } catch {
    return false;
  }
});
if (offenders.length) {
  console.error(`Backup exports must never be committed (repo is public):\n${offenders.join('\n')}`);
  process.exit(1);
}
console.log(`No user data in ${files.length} tracked JSON files.`);
