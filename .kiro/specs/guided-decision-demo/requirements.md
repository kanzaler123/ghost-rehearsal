# Guided decision demo

Authored with Codex, 2026-11-15. This does not claim Kiro authorship.

1. A discoverable entry on first visit and in the workbench starts the synthetic Open House A/B/C guide without deleting existing user events.
2. Guide sequence: run A/B → follow the same recorded guest → first visible difference → inspect posts/resource evidence → create C with packingExperiment → compare B/C outcomes and resource cost → export C's operational arrangement and comparison evidence.
3. Show completed, unfinished, early departures, average/P90 waiting and resource costs. Do not promise B or C wins; the guide uses real results and exposes adverse outcomes. Parameter assumptions and multiple simultaneous A/B changes remain explicit.
4. Keep free editing. Users can exit the guide, reset its navigation and rerun its plans. Creating C is repeat-safe within a guide; reset must not delete edited plans. A fresh entry creates independent demo plans with unique IDs.
5. Extract the existing packing experiment into a pure reusable builder used by UI and tests. Only add a clone of packing staff with its actual shifts/unavailability and a packing post; preserve scenario, routes, service times and existing resources.
6. Real Chromium smoke tests execute the production Worker, including desktop and 390px, English/Chinese key paths, thresholds and cutoff/final, experiments, project import/export and readable arrangement export. Mock transport/static rendering alone is not acceptance.
