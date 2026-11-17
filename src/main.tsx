import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { registerServiceWorker } from './pwa/register';
import { requestPersistentStorage } from './pwa/storage';
import { db } from './db/schema';
import { getSettings } from './db/repos/settings';

async function boot() {
  if (import.meta.env.MODE === 'test') {
    // Test-only hooks for Playwright seeding. Never part of the production bundle.
    const { installTestHooks } = await import('./dev/testHooks');
    installTestHooks();
  }
  await getSettings(db);
  void requestPersistentStorage();
  registerServiceWorker();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
