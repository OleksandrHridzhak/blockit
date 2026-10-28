import type { ReactNode } from 'react';

export interface QuickActionRowProps {
  children: ReactNode; name: string; status?: string; suspended: boolean; disabled?: boolean;
  onPause: () => void; onResume: () => void; onDisable: () => void; onDelete: () => void; onMore: () => void;
}
