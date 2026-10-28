This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck after code or configuration changes before declaring the task done. Documentation-only edits and requests to start an unchanged project do not require them.

## Fast development startup

For requests to start or preview the project, follow [spec/DEV_QUICK_START.md](spec/DEV_QUICK_START.md). Reuse an existing server and dependencies. Default to web for a browser preview, or the installed development client for an iPhone request. Do not run installs, builds, prebuild, cache clearing, or full validation as a routine startup prerequisite. Verify the requested preview actually loads and report its URL.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Icons

- Use Apple's SF Symbols for interface icons on iOS through the existing `expo-symbols` package. Use matching Material Symbols for Android and web via platform-specific names, and verify that icons remain visible on each supported platform.
- Prefer a consistent symbol style and appropriate filled or outline states. Avoid introducing emoji, text glyphs, or separate icon libraries for interface icons unless the user explicitly requests them or no suitable symbol exists.
- Choose SF Symbols supported by the app's minimum iOS version and keep accessibility labels on interactive controls.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Ощадне використання контексту та ліміту

Працюй ощадно: виконуй запит повністю, але обирай найкоротший обґрунтований шлях.

- Починай із конкретного симптому та пов’язаних файлів. Не перечитуй весь проєкт, історію чату чи всі логи.
- Спочатку шукай назви файлів і потрібні збіги. Читай лише відповідні фрагменти.
- Обмежуй результат кожного читання 150 рядками або 8 000 символами. Великі логи спочатку фільтруй за помилкою, часом і потрібним процесом.
- Не виводь цілком minified-файли, bundles, lock-файли, згенерований код або сторонні бібліотеки.
- Не повторюй уже успішні перевірки без нових змін чи нових підстав. Обов’язкові перевірки проєкту виконуй.
- Після двох невдалих спроб одного підходу переглянь гіпотезу. Не запускай третю майже однакову спробу.
- Під час зовнішньої збірки використовуй очікування завершення; перевіряй лише статус. Логи читай при помилці.
- Не додавай необов’язкові покращення й нову інфраструктуру. Якщо потрібен суттєво ширший обхідний шлях, спочатку коротко поясни додатковий обсяг роботи.
- Не запускай субагентів без прямого прохання.
- Відповідай стисло: результат, перевірка, що залишилося.
