# Release gates

Do not call this release production ready until the signed device checks below pass.

- Build all three configurations on macOS. Verify all three `.appex` bundles, Swift source membership, extension point IDs and entitlements. An unsigned IPA alone cannot prove Screen Time works.
- Provision `com.hridzhak.blockit.2WT689Y795`, `.BlockitShield`, `.BlockitAction`, `.BlockitMonitor` with Family Controls and `group.com.hridzhak.blockit.2WT689Y795`. Request distribution entitlement for all targets when distributing. A free sideload signature is not proof of these capabilities.
- Existing Shortcuts automations must be disabled manually; the new app does not edit them. Legacy URL parameters never grant access.
- Fresh install: permission not determined, deny, retry, authorize. Revoke permission externally and return; home must stop reporting active protection.
- Picker: select individual applications across categories; cancel must preserve selection. Save zero clears protection. Select categories/domains only: no false protected count. Reopen and verify persistence. Test selecting Blockit itself (system should exclude the host); do not release if self-blocking is possible.
- Countdown: tap once and remain on the shield; one notification reports the remaining duration and DeviceActivity intervalDidStart removes the shield automatically after the persisted deadline. There is no live shield counter. Repeat taps must not reset the deadline, extend the grant or duplicate the notification. If the callback is delayed, the button can activate the same scheduled grant after its deadline. Background/force quit the host, cancel/replace the request, change policy or selection during scheduling, and verify stale callbacks do not unlock anything. Test integer/fractional second deadlines, midnight, clock/time zone changes and late callbacks; record actual iOS latency.
- Task: notification opens host into current request, including cold start. With notifications denied or Focus enabled, manual launch finds the request. Repeated taps replace notifications. Expired/replaced notification cannot grant stale access.
- Exact phrase and allowlisted reflection choice are checked natively. Forged URL, early finish, reused request ID, malformed mode, disabled policy, removed target and revoked authorization must fail.
- Grant: register monitor before removing shield, without holding the App Group file lock across DeviceActivity IPC. Simulate registration failure; app remains shielded and a clear failure appears on the shield, notification and home screen. Force quit host immediately; check re-shield after ~15 minutes. Document delay on target OS. Reboot during grant. Test midnight, DST and time zone changes.
- Only one grant at a time: granting app B re-shields app A. Changing rule/selection, disabling protection or ending access cancels requests, notifications and monitors. Delayed callback for A must not end B.
- Rapid taps, opening picker twice, switching app during grant commit, memory pressure and concurrent extension callbacks need device stress testing.
- VoiceOver, largest text size, 320 pt screen, light/dark, keyboard open on phrase task. All actions remain reachable by scrolling. Back navigation cannot grant access.

## Local evidence
TypeScript, lint, unit tests, generated Xcode structure and browser UI can be checked on Windows. They do not validate Apple entitlements, Swift compilation, shield delivery, app switching or monitor scheduling.

## Short access and automatic return regression
- Start a fresh one-minute grant after installing the new build. Remain in the guarded app for at least 90 seconds without opening Blockit. Check that the shield returns, then repeat with two minutes, host force-quit, device lock/unlock, and a different selected app.
- After a failure, open Settings → Діагностика блокування. Share the local report. `usage-threshold`, `interval-start`, and `shield-restored` distinguish absent callbacks from an early callback or a shield update failure. The report never contains application tokens.
- Select the correct return destination on the real pause screen once. With Blockit in the foreground, countdown completion must grant access before opening that destination. Preview never launches another app. Failed grant never launches the destination. Failed app launch keeps the granted access and provides manual recovery.
- Re-enter Blockit after a new interception while the previous success screen remains mounted. The new request must replace the success state. Cancelled/expired/replaced requests must never cause an automatic launch.
- Automatic return is supported for the allowlisted destinations shown in the picker. A Screen Time token cannot be used to infer a URL scheme.

