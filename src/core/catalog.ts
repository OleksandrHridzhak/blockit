export interface GuardedAppCatalogEntry {
  id: string;
  name: string;
  category: 'social' | 'video' | 'messaging' | 'news';
  iosScheme: string;
  appStoreId: string;
  accentColor: string;
}

export const APP_CATALOG: readonly GuardedAppCatalogEntry[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    iosScheme: 'instagram://',
    appStoreId: '389801252',
    accentColor: '#E1306C',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'video',
    iosScheme: 'snssdk1233://',
    appStoreId: '835599320',
    accentColor: '#FE2C55',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'video',
    iosScheme: 'youtube://',
    appStoreId: '544007664',
    accentColor: '#FF0000',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    category: 'social',
    iosScheme: 'twitter://',
    appStoreId: '333903271',
    accentColor: '#1D9BF0',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'news',
    iosScheme: 'reddit://',
    appStoreId: '1064216828',
    accentColor: '#FF4500',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'social',
    iosScheme: 'fb://',
    appStoreId: '284882215',
    accentColor: '#1877F2',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'messaging',
    iosScheme: 'tg://',
    appStoreId: '686449807',
    accentColor: '#26A5E4',
  },
  {
    id: 'threads',
    name: 'Threads',
    category: 'social',
    iosScheme: 'barcelona://',
    appStoreId: '6446901002',
    accentColor: '#8A8A8E',
  },
];

const BY_ID: ReadonlyMap<string, GuardedAppCatalogEntry> = new Map(
  APP_CATALOG.map((entry) => [entry.id, entry])
);

export function getCatalogApp(appId: string): GuardedAppCatalogEntry | null {
  return BY_ID.get(appId.trim().toLowerCase()) ?? null;
}

export function getAppDisplayName(appId: string): string {
  const entry = getCatalogApp(appId);
  if (entry) return entry.name;
  const clean = appId.trim();
  if (!clean) return 'Unknown App';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
