import { EmptyState, ScreenHeader } from '../components/Screen';

export function Home() {
  return (
    <>
      <ScreenHeader title="Game night" />
      <EmptyState title="No games yet" body="Games you play will show up here. Game setup arrives in the next update." />
    </>
  );
}
