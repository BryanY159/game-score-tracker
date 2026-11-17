import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { Home } from './screens/Home';
import { History } from './screens/History';
import { Stats } from './screens/Stats';
import { Players } from './screens/Players';
import { GamePicker } from './screens/GamePicker';
import { GameSetup } from './screens/GameSetup';
import { PlayMatch } from './screens/PlacementScoring';
import { Results } from './screens/Results';
import { Settings } from './screens/Settings';
import { MatchDetail } from './screens/MatchDetail';
import { EditFinished } from './screens/EditFinished';

/** Screens with the tab bar. Game screens (later milestones) render without it. */
function TabLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 pb-4">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

export function App() {
  return (
    // HashRouter: a relaunch on any route never 404s on GitHub Pages (plan R-8).
    <HashRouter>
      <Routes>
        <Route element={<TabLayout />}>
          <Route index element={<Home />} />
          <Route path="history" element={<History />} />
          <Route path="stats" element={<Stats />} />
          <Route path="players" element={<Players />} />
        </Route>
        <Route path="settings" element={<Settings />} />
        <Route path="history/:matchId" element={<MatchDetail />} />
        <Route path="history/:matchId/edit" element={<EditFinished />} />
        <Route path="new" element={<GamePicker />} />
        <Route path="new/:gameKey" element={<GameSetup />} />
        <Route path="play/:matchId" element={<PlayMatch />} />
        <Route path="play/:matchId/results" element={<Results />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
