import { EmptyState, ScreenHeader } from '../components/Screen';

export function Players() {
  return (
    <>
      <ScreenHeader title="Players" />
      <EmptyState title="No players yet" body="Saved players keep their history and stats over time." />
    </>
  );
}
