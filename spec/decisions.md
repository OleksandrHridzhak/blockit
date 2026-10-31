
## 2026-10-26 · Групи з власними назвами й системним списком застосунків
- Decided by: user; native-label fallback by Codex.
- Why: користувач попросив зрозуміле керування обраними застосунками; системний Label дозволяє показати назву без читання її в JavaScript.
- Rejected: вигадані назви застосунків або порожній екран із самою кількістю.
- Rests on: user request; https://developer.apple.com/documentation/familycontrols/displayingactivitylabels

## 2026-10-26 · Статистика рахує лише спостережені події
- Decided by: Codex default.
- Why: немає вимірювання загального часу чи часу, який користувач витратив би без паузи.
- Rejected: початкові демонстраційні цифри, прирівнювання виходу без вибору до явної відмови, вигадана економія часу.
- Rests on: App Group history in ScreenTimeStore and native callback lifecycle.

## 2026-10-26 · Curiosity is an optional main-app route
- Decided by: user; route integration by Codex.
- Why: preserve the standard pause, existing design and native protection while offering finite discovery sessions.
- Rejected: interactive content in the system shield, automatic undocumented app launches, reading-based access grants, new AI APIs or dependencies.
- Rests on: existing pending-request routing, per-group opt-in preferences and public ShieldActionResponse capabilities.
