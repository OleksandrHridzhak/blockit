# Dev journal

Capture starts in `index.js` before Router loads screens. It is enabled in development and in this testing configuration (`expo.extra.diagnostics: true`), including release-mode TestFlight. The Diagnostics screen can persistently enable or disable capture and clear both journals. Set that config flag to false for a public build that should default to no JS capture; the persisted user choice takes precedence. Native extensions use the shared `diagnosticsEnabled` preference, synchronized by the host at startup.

## Automatic coverage

- Console debug/log/info/warn/error; uncaught JS errors with stacks and causes; Hermes unhandled promises (also in release mode); late rejection handling; browser errors; React render failures through the Router error boundary.
- Every public Screen Time client operation: call ID, arguments, result/error, elapsed time, and a warning after 5 seconds without completion. Original errors and return values propagate. Answers and report payloads are excluded. Calls remain observable even when the screen catches an error.
- Startup/version/build/runtime, current route, app foreground/background, memory warnings, deep links, common action buttons and segmented controls, JS thread delays while active.
- Fetch request method/URL, response status, timing and failures. Headers and bodies are excluded. URL query values and recognized secret fields are redacted.
- Storage decode failures and recovery fallbacks for preferences, appearance, groups, quick actions, return targets, curiosity, learning and preview settings; target-app opening and external-link failures; learning v2 events without answer content.
- Native host/extension lifetime, lock failures and waits, transaction failures, storage encode/decode failures, request creation/reset, shield configuration/change/readback, notification submission results, monitor registration and callbacks, grants and expiry. Response-only shield probes retain their deliberate no-trace behavior.

## Storage and export

JS retains at most 2,000 entries and a conservative 2 MB serialized bound. Each entry has traversal, depth and text limits. Ordinary writes are batched for 750 ms; errors, state transitions and native mutations request an immediate flush. Native extension logs retain 512 atomic file slots per bundle/process role, independent of the protection-state lock. Slots continue across process restarts. Old events are overwritten; JS export counts dropped entries. These bounds avoid unlimited storage growth and disk work inside small iOS extensions.

“Поділитися повним звітом” exports the retained chronological JS/native timeline, session/process/build IDs and a non-mutating native snapshot: permissions, notification queue, rules, selected counts, overrides, pending/scheduled access, shields, monitors, time zone, power and thermal state. No Family Controls tokens are exported. Native sharing sends a JSON file; web downloads JSON; older installed native modules fall back to text sharing. Native snapshot timeout is 8 seconds, after which the JS report can still be shared. Full export remains available if native diagnostics fail or the React screen crashes. The short report remains an optional reduced view.

## Limits

This is local diagnostic capture, not arbitrary iOS system logging. Native crashes, jetsam/watchdog termination, events before JS/extension initialization, and unavailable OS callbacks require Apple's device/TestFlight crash reports. Pending batched writes can be lost on abrupt termination; UserDefaults flushing is also controlled by the OS. No crash handler blocks or replaces iOS fatal handling. Fetch capture does not inspect arbitrary third-party native networking, WebSockets or XHR. Explicitly handled errors in future code that do not pass through the instrumented clients still need a journal event. Redaction is best effort; review reports before sharing.

No build, upload or deployment is required to edit or locally test this implementation. Changes to Swift take effect with the next authorized native build; the currently installed TestFlight app is unchanged.
