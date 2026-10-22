# Manual QA checklist (real iPhone)

Install via **Sideloadly** from the latest `ios-build` workflow artifacts
(`blockit-device-release` for standalone, `blockit-device-debug` for dev client).

## Phase 0: smoke

- [ ] Release IPA installs via Sideloadly and launches (Settings → General → VPN & Device Management → trust your Apple ID first)
- [ ] Safari → `blockit://intervene?app=instagram` opens the "Take a breath" screen showing `instagram`
- [ ] Dev-client IPA: `npx expo start` on Windows (same Wi-Fi), the dev client finds the server, an edit in `src/app/intervene.tsx` hot-reloads on the phone

## Phase 2: interception (TBD)

- [ ] Shortcuts automation "Instagram is opened → Run immediately → ShouldIntercept" created
- [ ] Opening Instagram shows the intervention
- [ ] "Continue 5 min" returns to Instagram, with no second intervention within 5 min
- [ ] After 5 min the intervention appears again
