# Blockit

An iOS attention pause built with Expo 58 and Apple's Screen Time APIs. No Shortcuts automation is required by the new flow.

- System FamilyActivityPicker chooses individual apps, including apps outside the old catalog.
- ManagedSettings shields the selected apps while the host is closed.
- Shield action starts a persisted 20-second pause. Tap again after the deadline to request a 15-minute session, or open Blockit through a local notification for a reflection/typing task.
- Native code checks the deadline, request ID, authorization and challenge. DeviceActivity restores shields when access ends; iOS callback timing is not exact.
- One shared policy and one active app session. No billing, server or fabricated saved-time statistics.

## Validate

npm run typecheck
npm run lint
npm test -- --runInBand
node scripts/check-screen-time.cjs
npx expo export --platform web

The structural script verifies three generated extension targets, embedding, capabilities, dependencies, source paths and idempotence using Expo's actual template. It does not compile Swift. Browser/Expo Go cannot perform Screen Time blocking.

## Build and install

Generate iOS through Expo CNG on macOS, then build with Xcode or a configured EAS profile. The existing macOS GitHub workflow builds unsigned artifacts and checks all three extensions; unsigned artifacts cannot prove device blocking works.

Provision the host and all three extension bundle IDs with Family Controls and App Group group.com.hridzhak.blockit. Distribution requires Apple's approval for Family Controls on each target. Existing free-account sideload steps do not establish support for these entitlements.

Do not label this version production ready until the signed real-device checks in spec/SCREEN_TIME_QA.md pass. In particular, Swift compilation, notification cold start, app selection and automatic re-shielding have not been verified on Windows.

Existing Shortcuts automations must be disabled manually. Old user data is preserved; legacy intervention URLs do not grant Screen Time access.

## References

- https://developer.apple.com/documentation/familycontrols
- https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement
- https://developer.apple.com/documentation/managedsettings/shieldactionresponse
- https://developer.apple.com/videos/play/wwdc2021/10123/
