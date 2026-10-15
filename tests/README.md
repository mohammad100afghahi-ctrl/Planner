# Living UI regression checks

The app has no build step. Generate an isolated preview from the current production files:

```sh
python3 tests/build-living-preview.py
python3 -m http.server 8881 --bind 127.0.0.1
```

Then run `node tests/living-redesign-check.cjs` with Playwright available. Set `NODE_PATH` when using a bundled runtime. `CHROME_PATH` selects a Chrome executable; `MEDAR_TEST_URL` overrides the preview URL (default `http://127.0.0.1:8881/artifacts/living-redesign/`).

The preview replaces service calls with mocks, removes live credentials and the service worker, and isolates browser storage. The test blocks unexpected network requests. It covers 18 screen states at eight widths (320–1440px), task capture/edit/completion, full calendar modes, module tabs, goals, long titles, reminders and keyboard dialog behavior. Screenshots and results are generated under `artifacts/living-redesign/`.

These checks exercise frontend workflows with sample data. Live authentication/database writes, AI, phone push, offline/realtime synchronization and backup restore are not certified by this harness.
