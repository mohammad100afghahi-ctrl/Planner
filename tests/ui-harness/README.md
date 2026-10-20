# مدار UI harness

Local-only checks for the interface built from the approved UX Pilot screens
(desktop page `mH0ZsrpvMbhWW6yWbrGc`, phone page `PdVsvpfrFUmm9hQ6mY3p`).
Nothing here talks to Supabase: `mock.js` replaces supabase-js, reads come from
`fixture.js` (sample content shaped like the design's own samples) and writes
are only collected in `window.__writes` so flows can be checked.

    MADAR_DESIGN_REFS=/path/to/madar-design python3 tests/ui-harness/serve.py

- `/app?view=<view>&edit=<taskId>` — the app on sample data (no service worker).
- `/compare.html?ref=/refs/desktop/<id>.html&app=/app%3Fview%3D<view>&s=0.5&x=640&w=400&h=450`
  — reference (left) and app (right) cropped to the same region; desktop pages
  are 1440×900, phone pages use `pw=375&ph=812&w=375&h=500`.
- `/tools/tailwind-build.html` — regenerates `tailwind.css` from the classes in
  the UI files (needed whenever a template uses a class not used before).

Compare against the exports with the previous run's injected QA styles removed
(every `<style>` after the first, the `qa-*` dialog/scripts and the extra
reminder section in the editor) — that is the UX Pilot output itself.
