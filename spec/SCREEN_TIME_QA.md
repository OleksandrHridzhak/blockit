# Release gates

Do not call this release production ready until the signed device checks below pass.

- Build all three configurations on macOS. Verify all three `.appex` bundles, Swift source membership, extension point IDs and entitlements. An unsigned IPA alone cannot prove Screen Time works.
- Provision `com.hridzhak.blockit`, `.BlockitShield`, `.BlockitAction`, `.BlockitMonitor` with Family Controls and `group.com.hridzhak.blockit`. Request distribution entitlement for all targets when distributing. A free sideload signature is not proof of these capabilities.
- Existing Shortcuts automations must be disabled manually; the new app does not edit them. Legacy URL parameters never grant access.
- Fresh install: permission not determined, deny, retry, authorize. Revoke permission externally and return; home must stop reporting active protection.
- Picker: select individual applications across categories; cancel must preserve selection. Save zero clears protection. Select categories/domains only: no false protected count. Reopen and verify persistence. Test selecting Blockit itself (system should exclude the host); do not release if self-blocking is possible.
- Countdown: repeated primary taps reuse the request; no reset. Ready button only grants after native deadline. Background, force quit and reopen during pause. Wait on shield and tap again; shield has no live countdown. Set clock/time zone forward/back during a request; assess clock tampering before any parental-control positioning.
- Task: notification opens host into current request, including cold start. With notifications denied or Focus enabled, manual launch finds the request. Repeated taps replace notifications. Expired/replaced notification cannot grant stale access.
- Exact phrase and allowlisted reflection choice are checked natively. Forged URL, early finish, reused request ID, malformed mode, disabled policy, removed target and revoked authorization must fail.
- Grant: register monitor before removing shield. Simulate registration failure; app remains shielded and error offers retry. Force quit host immediately; check re-shield after ~15 minutes. Document delay on target OS. Reboot during grant. Test midnight, DST and time zone changes.
- Only one grant at a time: granting app B re-shields app A. Changing rule/selection, disabling protection or ending access cancels requests, notifications and monitors. Delayed callback for A must not end B.
- Rapid taps, opening picker twice, switching app during grant commit, memory pressure and concurrent extension callbacks need device stress testing.
- VoiceOver, largest text size, 320 pt screen, light/dark, keyboard open on phrase task. All actions remain reachable by scrolling. Back navigation cannot grant access.

## Local evidence
TypeScript, lint, unit tests, generated Xcode structure and browser UI can be checked on Windows. They do not validate Apple entitlements, Swift compilation, shield delivery, app switching or monitor scheduling.
