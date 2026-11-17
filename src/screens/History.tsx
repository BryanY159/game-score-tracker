import { EmptyState, ScreenHeader } from '../components/Screen';

export function History() {
  return (
    <>
      <ScreenHeader title="History" />
      <EmptyState title="No finished games" body="Every game you finish is saved here, newest first." />
    </>
  );
}
