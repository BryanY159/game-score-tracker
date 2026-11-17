import { EmptyState, ScreenHeader } from '../components/Screen';

export function Stats() {
  return (
    <>
      <ScreenHeader title="Stats" />
      <EmptyState title="No stats yet" body="Win rates and records appear once players have played a few games." />
    </>
  );
}
