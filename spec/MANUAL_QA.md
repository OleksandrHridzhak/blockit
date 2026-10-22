# Manual QA checklist (real iPhone via Sideloadly)

Install via **Sideloadly** from the latest `ios-build` workflow artifacts:
- `blockit-device-release`: standalone `.ipa` with embedded JS bundle
- `blockit-device-debug`: dev-client `.ipa` (connects to `npx expo start` on your Windows PC over Wi-Fi)

## Phase 0: Installation & Deep Link Smoke

- [ ] Release IPA installs via Sideloadly and launches (Settings → General → VPN & Device Management → trust your Apple ID; enable Developer Mode)
- [ ] Safari → `blockit://intervene?app=instagram` opens the intervention screen showing `Instagram`
- [ ] Dev-client IPA connects to `npx expo start` on Windows (same Wi-Fi) with hot reload

## Phase 2: iOS Shortcuts Interception & Native Bridge

- [ ] In Apple **Shortcuts** → **Automation** → `+` → **App** → select **Instagram**, **Is Opened**, **Run Immediately**
- [ ] Add action **Blockit → Should Intercept App** (`app = Instagram`)
- [ ] Add `If [Should Intercept App] is true` → **Open URLs** `blockit://intervene?app=instagram`
- [ ] Open Instagram from Home Screen → Blockit opens immediately with the countdown / breathing circle
- [ ] Tap **"Don't open Instagram"** → returns to Blockit, increments "Attempts today" and "Mindful exits"
- [ ] Open Instagram again → wait until timer reaches `Ready` → tap **"Continue (5m)"** → switches into Instagram without triggering a second intervention loop
- [ ] Close and reopen Instagram within 5 minutes → opens directly without any flicker (`ShouldInterceptIntent` returns `false`)
- [ ] After 5 minutes expire → opening Instagram triggers Blockit intervention again

## Phase 3 & 4: Interventions, Schedules, Daily Limits & Analytics

- [ ] Expand **Instagram** card on Home tab → switch style between **Breathing**, **Countdown**, **Reflection**, and **Typing**
- [ ] In **Reflection** mode, verify "Continue" buttons stay locked until both countdown finishes and a reason chip is selected
- [ ] In **Typing** mode, verify "Continue" buttons stay locked until `"I open this with intention"` is typed
- [ ] Set **Daily open limit** to `3/day` and enable **Strict block when daily limit reached** → after 3 continues, the 4th attempt shows `Blocked` with no Continue buttons
- [ ] Check **Insights & Setup** tab → verify Mindful rate %, Time saved, 7-day bar chart, and Recent Interceptions list update accurately
