import { screenTime } from '@/features/screen-time/client';

export async function finishCuriositySession(requestId: string | undefined, preview: boolean): Promise<void> {
  if (preview || !requestId) return;
  const pending = await screenTime.pending();
  if (pending?.id === requestId) await screenTime.cancel();
}
