# Blockit

An iOS attention pause built with Expo 58 and Apple's Screen Time APIs. No Shortcuts automation is required by the new flow.

- System FamilyActivityPicker chooses individual apps, including apps outside the old catalog.
- ManagedSettings shields the selected apps while the host is closed.
- Shield action starts a persisted pause and sends one notification with the remaining duration. Access has a persisted custom deadline. DeviceActivity usage thresholds and a calendar expiry monitor attempt to restore shielding without opening the host; callback delivery must be verified on a real device. Local diagnostics record monitor delivery and shielding decisions.
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

Generate iOS through Expo CNG on macOS, then build with Xcode or a configured EAS profile. The macOS GitHub workflow has unsigned checks and a manually triggered signed App Store build. Unsigned artifacts cannot prove device blocking works.

### Signed GitHub build

Run `ios-build.yml` on the release source branch with `testflight=true` and an unused `build_number`. The signed job validates all four existing distribution profiles, archives with Xcode, and exports `Blockit.ipa` as a one-day artifact. The build runs on GitHub and does not consume EAS Build cloud quota.

Signing uses the temporary repository secret `BLOCKIT_IOS_SIGNING`: Base64 of gzip-compressed JSON keyed by target name, with each target containing `profile` (Base64), `certificate` (Base64 PKCS#12), and `password`. Transfer of these sensitive credentials to GitHub requires the user's explicit permission. Never commit `credentials.json`, the `credentials/` directory, passwords, certificates, or profiles. Remove the repository secret after the release attempt and verify its removal. The runner also deletes its temporary signing keychain.

Download the signed artifact and upload from the authenticated release computer:

```powershell
npx eas-cli@latest submit --platform ios --profile production --path outputs/github-ipa-20/Blockit.ipa --no-auto-testflight-setup --non-interactive --wait
```

The IPA already contains its build number. Keep the remote EAS build number in sync after submission so a later EAS build does not reuse it. Submission success confirms delivery to Apple; TestFlight processing and tester availability are separate checks.

Provision the host and all three extension bundle IDs with Family Controls and App Group group.com.hridzhak.blockit.2WT689Y795. Distribution requires Apple's approval for Family Controls on each target. Existing free-account sideload steps do not establish support for these entitlements.

Enable **Family Controls (Distribution)** explicitly on each of the four App IDs in Apple Developer. EAS capability sync can enable only the Development checkbox for newly registered extensions; an App Store profile generated at that point will omit the entitlement. After enabling Distribution, regenerate the affected Blockit extension profiles. Reusing the existing distribution certificate does not revoke it or alter other apps.

Do not label this version production ready until the signed real-device checks in spec/SCREEN_TIME_QA.md pass. In particular, Swift compilation, notification cold start, app selection and automatic re-shielding have not been verified on Windows.

Existing Shortcuts automations must be disabled manually. Old user data is preserved; legacy intervention URLs do not grant Screen Time access.

## References

- https://developer.apple.com/documentation/familycontrols
- https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement
- https://developer.apple.com/documentation/managedsettings/shieldactionresponse
- https://developer.apple.com/videos/play/wwdc2021/10123/
