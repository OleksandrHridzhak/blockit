export type Locale = 'en' | 'uk';

export interface Translations {
  homeTitle: string;
  homeSubtitle: string;
  attemptsToday: string;
  mindfulExits: string;
  estSaved: string;
  guardedApps: string;
  pauseButton: string;
  interventionStyle: string;
  baseDuration: string;
  dailyOpenLimit: string;
  unlimited: string;
  strictBlockWhenLimit: string;
  workHoursSchedule: string;
  takeABreath: string;
  inhaleSlowly: string;
  exhaleGently: string;
  strictLimitActive: string;
  blocked: string;
  ready: string;
  aboutToOpen: (app: string) => string;
  dontOpen: (app: string) => string;
  continueFor: (mins: number) => string;
  waitSeconds: (sec: number) => string;
}

export const STRINGS: Record<Locale, Translations> = {
  en: {
    homeTitle: 'Blockit',
    homeSubtitle: 'Mindful pause before distracting apps',
    attemptsToday: 'Attempts today',
    mindfulExits: 'Mindful exits',
    estSaved: 'Est. saved',
    guardedApps: 'Guarded Apps',
    pauseButton: 'Pause',
    interventionStyle: 'Intervention style',
    baseDuration: 'Base duration (seconds)',
    dailyOpenLimit: 'Daily open limit',
    unlimited: 'Unlimited',
    strictBlockWhenLimit: 'Strict block when daily limit reached',
    workHoursSchedule: 'Work hours schedule (Mon–Fri 09:00–17:00)',
    takeABreath: 'Take a breath',
    inhaleSlowly: 'Inhale slowly…',
    exhaleGently: 'Exhale gently…',
    strictLimitActive: 'Strict limit active',
    blocked: 'Blocked',
    ready: 'Ready',
    aboutToOpen: (app) => `You are about to open ${app}`,
    dontOpen: (app) => `Don't open ${app}`,
    continueFor: (mins) => `Continue (${mins}m)`,
    waitSeconds: (sec) => `Wait ${sec}s`,
  },
  uk: {
    homeTitle: 'Blockit',
    homeSubtitle: 'Усвідомлена пауза перед відкриттям застосунків',
    attemptsToday: 'Спроб сьогодні',
    mindfulExits: 'Відмов',
    estSaved: 'Збережено',
    guardedApps: 'Захищені застосунки',
    pauseButton: 'Пауза',
    interventionStyle: 'Тип інтервенції',
    baseDuration: 'Базова затримка (секунди)',
    dailyOpenLimit: 'Денний ліміт відкриттів',
    unlimited: 'Без ліміту',
    strictBlockWhenLimit: 'Жорсткий блок після вичерпання ліміту',
    workHoursSchedule: 'Робочі години (Пн–Пт 09:00–17:00)',
    takeABreath: 'Зроби вдих',
    inhaleSlowly: 'Повільний вдих…',
    exhaleGently: 'Плавний видих…',
    strictLimitActive: 'Активний жорсткий ліміт',
    blocked: 'Заблоковано',
    ready: 'Готово',
    aboutToOpen: (app) => `Ти збираєшся відкрити ${app}`,
    dontOpen: (app) => `Не відкривати ${app}`,
    continueFor: (mins) => `Продовжити (${mins} хв)`,
    waitSeconds: (sec) => `Зачекай ${sec}с`,
  },
};

export function getTranslations(locale: Locale = 'en'): Translations {
  return STRINGS[locale] ?? STRINGS.en;
}
