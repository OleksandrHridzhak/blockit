# React Native Reusables experiment

Baseline: bd204db. Settings theme selector uses the official NativeWind ToggleGroup and Toggle source, with optional Lucide icon helpers omitted and colors connected to the existing Blockit palette. NativeWind v4 configuration is shared; Tailwind preflight is disabled to preserve existing web styling.

Sources: https://reactnativereusables.com/r/nativewind/toggle-group.json and https://reactnativereusables.com/r/nativewind/toggle.json (MIT).

Validation: lint and typecheck passed. Browser at localhost:8082/explore loaded; light/dark switching and persistence after reload verified. Native iPhone behavior has not been verified. Original dirty checkout is preserved in Git stash: Before importing current Blockit workspace 2026-10-31.

