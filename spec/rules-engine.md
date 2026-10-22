# Rules Engine Specification (`src/core`)

Pure deterministic rule engine with zero platform dependencies.

## Domain Model

- **AppOpenEvent**: `{ appId: string }`
- **InterventionType**: `'breathing' | 'countdown' | 'reflection' | 'typing'`
- **ScheduleWindow**:
  - `days`: `number[]` (0 = Sunday .. 6 = Saturday, in user's local timezone)
  - `startMinute`: `0..1439` (minutes from midnight, e.g. `9 * 60 = 540`)
  - `endMinute`: `0..1439` (supports overnight windows when `endMinute < startMinute`, e.g. 22:00 -> 07:00)
  - `mode`: `'intervene' | 'strict_block'`
- **AppRuleConfig**:
  - `appId`: normalized app ID
  - `enabled`: boolean
  - `interventionType`: `InterventionType`
  - `baseDurationSec`: number (e.g. 6)
  - `escalationStepSec`: number (e.g. 2 — each attempt today adds `escalationStepSec * attemptsToday`)
  - `maxDurationSec`: number (e.g. 60 — cap for escalated duration)
  - `defaultBypassMinutes`: number (e.g. 5)
  - `dailyOpenLimit`: `number | null` (max allowed opens/continues per day)
  - `strictMode`: boolean (when daily limit or strict schedule is hit, block completely with no "Continue" button)
  - `schedules`: `ScheduleWindow[]` (if non-empty, rules apply according to schedule; if empty, always active)
- **AppUsageState**:
  - `dayKey`: `'YYYY-MM-DD'` in user's local timezone
  - `attemptsToday`: number (total times interception triggered today)
  - `opensToday`: number (total times user chose "Continue" today)
  - `dismissalsToday`: number (total times user chose "Don't open" today)
  - `bypassUntilMs`: `number | null` (epoch ms until which interception is bypassed)

## Evaluation Order (`decide(event, config, state, nowMs, timeZone)`)

1. **Normalize day state**: compute `currentDayKey = formatDayKey(nowMs, timeZone)`. If `state.dayKey !== currentDayKey`, reset `attemptsToday = 0`, `opensToday = 0`, `dismissalsToday = 0` (keep `bypassUntilMs` if still in the future).
2. **Disabled check**: if `!config || !config.enabled`, return `Allow('disabled')`.
3. **Active bypass check**: if `state.bypassUntilMs !== null && nowMs < state.bypassUntilMs`, return `Allow('bypass_active', { remainingMs })`.
4. **Schedule check**:
   - If `config.schedules.length > 0`:
     - Find matching windows for local day-of-week & minute-of-day (including overnight windows from previous day).
     - If no window matches, return `Allow('outside_schedule')`.
     - If any matching window has `mode === 'strict_block'`, return `Block('strict_schedule')`.
5. **Daily limit check**:
   - If `config.dailyOpenLimit !== null && normalizedState.opensToday >= config.dailyOpenLimit`:
     - If `config.strictMode` is true, return `Block('daily_limit_reached')`.
     - Otherwise, proceed to `Intervene` with `limitReached: true`.
6. **Intervene**:
   - `attemptNo = normalizedState.attemptsToday + 1`
   - `rawDuration = config.baseDurationSec + config.escalationStepSec * normalizedState.attemptsToday`
   - `durationSec = Math.min(config.maxDurationSec, Math.max(1, rawDuration))`
   - Return `Intervene({ interventionType, durationSec, attemptNo, limitReached })`.

## State Transitions

- `recordInterveneTriggered(state, nowMs, timeZone)`: normalizes day, increments `attemptsToday`.
- `recordDismissed(state, nowMs, timeZone)`: normalizes day, increments `dismissalsToday`, clears expired bypass.
- `recordContinued(state, bypassMinutes, nowMs, timeZone)`: normalizes day, increments `opensToday`, sets `bypassUntilMs = nowMs + bypassMinutes * 60_000`.
