export type InterventionType = 'breathing' | 'countdown' | 'reflection' | 'typing';

export type ScheduleMode = 'intervene' | 'strict_block';

export interface ScheduleWindow {
  /** Days of week when window starts: 0 = Sunday .. 6 = Saturday */
  days: number[];
  /** Start minute from midnight (0..1439) */
  startMinute: number;
  /** End minute from midnight (0..1439). If < startMinute, wraps overnight into next day. */
  endMinute: number;
  mode: ScheduleMode;
}

export interface AppRuleConfig {
  appId: string;
  enabled: boolean;
  interventionType: InterventionType;
  baseDurationSec: number;
  escalationStepSec: number;
  maxDurationSec: number;
  defaultBypassMinutes: number;
  dailyOpenLimit: number | null;
  strictMode: boolean;
  schedules: ScheduleWindow[];
}

export interface AppUsageState {
  /** YYYY-MM-DD in user's local timezone */
  dayKey: string;
  attemptsToday: number;
  opensToday: number;
  dismissalsToday: number;
  bypassUntilMs: number | null;
}

export interface AppOpenEvent {
  appId: string;
}

export type AllowReason = 'disabled' | 'bypass_active' | 'outside_schedule';
export type BlockReason = 'strict_schedule' | 'daily_limit_reached';

export type Decision =
  | {
      kind: 'allow';
      reason: AllowReason;
      remainingBypassMs?: number;
    }
  | {
      kind: 'intervene';
      interventionType: InterventionType;
      durationSec: number;
      attemptNo: number;
      limitReached: boolean;
    }
  | {
      kind: 'block';
      reason: BlockReason;
      attemptNo: number;
    };
