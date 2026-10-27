# Blockit

An iOS attention pause built with Expo 58 and Apple's Screen Time APIs. No Shortcuts automation is required by the new flow.

- System FamilyActivityPicker chooses individual apps, including apps outside the old catalog.
- ManagedSettings shields the selected apps while the host is closed.
- Shield action starts a persisted pause and sends one notification with the remaining duration. DeviceActivity's interval start removes the shield after the pause; interval end restores it after about 15 minutes. No live counter or repeated tap is required on the shield. iOS callback delivery can be delayed; the button also recovers an overdue scheduled grant.
- Native code checks the deadline, request ID and selection; reflection/typing still requires completing the challenge in Blockit. Stale or cancelled callbacks cannot grant access. DeviceActivity calls run outside the shared file lock, and failures are surfaced instead of silently leaving a dead button.
- One shared policy and one active app session. No billing, server or fabricated saved-time statistics.

## Validate

npm run typecheck
npm run lint
npm test -- --runInBand
node scripts/check-screen-time.cjs
npx expo export --platform web

The structural script verifies three generated extension targets, embedding, capabilities, dependencies, source paths and idempotence using Expo's actual template. It does not compile Swift. Browser/Expo Go cannot perform Screen Time blocking.

## Build and install

TestFlight project: https://appstoreconnect.apple.com/apps/6827022647
Expo project: https://expo.dev/accounts/sasha72/projects/blockit

The release host ID is `com.hridzhak.blockit.2WT689Y795`; its extensions append `.BlockitShield`, `.BlockitAction`, and `.BlockitMonitor`. All four targets share `group.com.hridzhak.blockit.2WT689Y795`. The config plugin declares the extensions to EAS before prebuild so each gets its own provisioning profile.

From this folder in PowerShell:

```powershell
$env:EAS_NO_VCS='1'
$env:EAS_PROJECT_ROOT=(Get-Location).Path
npx.cmd --yes eas-cli@latest build --platform ios --profile production --auto-submit
```

Apple login and any verification codes must be entered directly into the interactive terminal. Never put them in app config or source files. Successful EAS build/submission does not confirm processing or tester availability: verify the processed build in the `Blockit Device Testing` internal group before installing.

Generate iOS through Expo CNG on macOS, then build with Xcode or a configured EAS profile. The existing macOS GitHub workflow builds unsigned artifacts and checks all three extensions; unsigned artifacts cannot prove device blocking works.

Provision the host and all three extension bundle IDs with Family Controls and App Group group.com.hridzhak.blockit.2WT689Y795. Distribution requires Apple's approval for Family Controls on each target. Existing free-account sideload steps do not establish support for these entitlements.

Enable **Family Controls (Distribution)** explicitly on each of the four App IDs in Apple Developer. EAS capability sync can enable only the Development checkbox for newly registered extensions; an App Store profile generated at that point will omit the entitlement. After enabling Distribution, regenerate the affected Blockit extension profiles. Reusing the existing distribution certificate does not revoke it or alter other apps.

Do not label this version production ready until the signed real-device checks in spec/SCREEN_TIME_QA.md pass. In particular, Swift compilation, notification cold start, app selection and automatic re-shielding have not been verified on Windows.

Existing Shortcuts automations must be disabled manually. Old user data is preserved; legacy intervention URLs do not grant Screen Time access.

## References

- https://developer.apple.com/documentation/familycontrols
- https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement
- https://developer.apple.com/documentation/managedsettings/shieldactionresponse
- https://developer.apple.com/videos/play/wwdc2021/10123/
