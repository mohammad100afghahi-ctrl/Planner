# Planner project context

## Confirmed setup — 2026-10-14

- Repository: https://github.com/mohammad100afghahi-ctrl/Planner
- Published frontend: https://mohammad100afghahi-ctrl.github.io/Planner/
- Frontend title: مدار
- Supabase project: Planner, ref byqowlvyupcusjjyxwaf. The frontend URL matches this project; project listing reported ACTIVE_HEALTHY.
- GitHub and Supabase connectors are available in the current chat. Future sessions should verify connector availability.
- Claude checkout: /Users/m.b.a/Documents/Planner, branch main.
- Codex checkout: /Users/m.b.a/Documents/Codex/2026-10-14/ld-o/Planner, initial branch codex/planner-workspace.
- This is an independent local clone, not a Git worktree. The origin remote points to GitHub. It started at commit 172ed06 from Claude's committed checkout; remote freshness has not been checked.
- Claude's untracked .claude/ and auth.sql were not copied. No tracked files in the original checkout were modified.

## Source map

- index.html: main frontend HTML, styles, and JavaScript; approximately 495 KB.
- sw.js: service worker.
- manifest.json and PNG icons: web app installation assets.
- Root SQL files: feature-specific schema scripts; their presence does not establish that they have been applied to the live database.
- supabase/functions/: english-plan, generate-ai-report, send-push, daily-encouragement.
- No package.json, README.md, AGENTS.md, or CLAUDE.md was found in the source checkout during initial inspection. Build and test procedures have not yet been established.

## Current scope

The user wants a stable folder-based workflow with durable project context, alongside Claude. The user requested a simple graphical map explaining app sections, capabilities, connections, and assistant work visibility. Initialization has made no live database or production changes.

## Collaboration

Read current files rather than assuming stored notes remain current. Reconcile upstream changes before each implementation. Maintain these notes for future chats. Sharing these documents with Claude or publishing them to GitHub has not yet occurred.

## App map — 2026-10-14

- Branch: codex/app-map. Fetched origin before edits; origin/main had no commits beyond HEAD.
- Added a read-only «نقشهٔ مدار» entry under مرور. app-map.js contains the curated section map and rendering; app-map.css contains scoped responsive styles.
- All 14 existing sections have plain Persian descriptions, capabilities, navigable connections, and expandable technical references. These describe repository code, not verified live database schema or service health. No database changes.
- Assistant work panel is explicitly a dated manual report, not live monitoring. Claude status stays unknown until a trusted report source is connected. No access to Claude's checkout was used.
- map-preview.html is an independent local preview of the same map with no account/data access; its destination buttons explain the preview limitation.
- Service worker bumped to v45 and caches both new assets. No publication or merge performed.
- Verification: JavaScript syntax, section/connection integrity and render output; local browser selection, linked navigation, technical disclosure; mobile layout checked without horizontal overflow. Authenticated app end-to-end behavior remains untested.

## Task-owned reminders — 2026-10-14

- User authorized implementation and publication. Confirmed Claude is not editing concurrently; origin/main checked before edits and release preparation.
- Branch: codex/task-reminders. Added task-reminders.js; task create/edit/copy, realtime updates, today alert and task badges use task-owned reminders. The standalone reminders navigation entry is removed; old navigation redirects to tasks.
- Reminder timestamps are UTC instants, edited in the device timezone with a Jalali date picker. Weekly template alarm times explicitly use Asia/Baghdad. A minute-based server cron delivers due alarms with claims, retry on failed delivery and stable per-task push tags. Phone notifications must already be enabled through existing settings.
- Live schema inspected first. Added reminder metadata to tasks and weekly templates. Migrated the one existing reminder with its notes, date, kind, completion state and lead days; original reminders table remains for backup recovery. Original rows are marked migrated to suppress duplicate legacy digests. Past imported alarms are marked delivered to avoid an initial notification flood; they still appear in the task reminder card.
- Annual completed tasks remain in the archive; send-push computes the next Jalali anniversary and a server-only atomic RPC clones the next occurrence with tags/subtasks. The next occurrence appears within the next minute. An unfinished annual task stays overdue until completed.
- Added a unique recurring-template/date index after verifying no duplicates; concurrent client/server generation reloads the existing occurrence instead of leaving a phantom task.
- Applied live migrations: task_owned_reminders, reminder_clone_ownership, schedule_task_reminders. Feature SQL files document the final schema and scheduler; do not reapply them blindly. Existing RLS ownership policies retained. New service RPCs are unavailable to anon/authenticated. Existing backup functions automatically include new columns; normalization triggers support old backups missing new fields.
- send-push updated from the fetched live version (12) to version 13, preserving existing notification behavior. New task-reminders cron runs every minute and reuses the existing protected push invocation without exporting its credentials.
- Verification: all inline/frontend JS and stripped TypeScript parse; mobile browser checks with mocked writes cover earlier alarm, create/edit/disable, completion badge and removed tab. Transactional live SQL tests rolled back all fixtures and passed claim deduplication, reschedule, completed-task exclusion, annual cloning/ownership and RPC permissions. Security advisors reported only pre-existing backup/auth warnings. Actual delivery to the user's phone has not been tested.
- Release packaging excludes the pre-existing uncommitted app-map UI changes/assets while retaining them in this checkout. The service worker release is v46 and caches task-reminders.js.

## Redesign reverted — 2026-10-15

- Claude's redesign (3ed5a17: new theme, four-tab nav, «بخش‌ها» hub, week view) was reverted at the user's request; the previous look and grouped navigation are back.
- Kept: the service worker stays cache-first for instant launch, and the page reloads into a new release once it installs (or when the app goes to background mid-edit). Install bypasses the HTTP cache.

## Redesign rollback — 2026-10-16

- User explicitly requested undoing the redesign work from this conversation and restoring the previous interface, including the published site.
- Reverted Living release 5b844c0 (PR #3), restoring the exact application files from f8bd496: original dark theme, grouped navigation, Today layout and complete existing pages. Removed the redesign presentation assets, design documents and regression fixtures added by that release.
- Service worker cache is v55 so installed apps update to the restored UI instead of continuing to show cached v54. All prior update guards remain. No database, user data, schema or backend service changes. Earlier task-reminder/settings features are part of the pre-redesign baseline and remain.

## UX Pilot faithful implementation — 2026-10-20 (Claude, branch claude/uxpilot-faithful, not published)

- Rebuilt the whole interface from the approved UX Pilot exports (desktop page mH0ZsrpvMbhWW6yWbrGc, mobile PdVsvpfrFUmm9hQ6mY3p; local export in ~/.codex/visualizations/…/madar-design). The previous run's uxpilot.js/uxpilot.css/design-qa.md and its fixtures were removed; they were not a faithful reference.
- UI now lives in ui-shell.js (helpers, nav, frames, render), ui-today.js, ui-tasks.js (tasks, editor, calendar), ui-pages.js (English, repairs, purchases, subscriptions, ideas, prompts, wins, mother), ui-system.js (settings, archive, AI reports). index.html keeps state, data, Supabase, realtime, reminders, backups, push; its old render functions and <style> are gone. Load order: ui.css → tailwind.css; task-reminders.js and ui-*.js before the main inline script (auth callback needs renderLogin).
- tailwind.css is a static build of every class in the sources — regenerate with tools/tailwind-build.html (in a browser, via tests/ui-harness/serve.py) whenever new Tailwind classes are used. Icons: Font Awesome 6.4.0 (cdnjs), font Vazirmatn.
- Desktop layout from 1200px, phone layout below (JS media query, two separate templates). Every open editor carries .modal-overlay so SW reload and reminder refresh wait.
- Small logic additions only: quickAddTodayTask, rejectAllChanges, purchases.createdAt mapped, state.userEmail. No database, auth, backup, push or reminder logic changes. sw.js cache v57.
- tests/ui-harness: mock Supabase + sample fixture + side-by-side compare page; no backend access.

## 2026-10-21 — Larger text on the phone layout
- The phone reference's 8–11px labels were too small to read. ui.css now raises every Tailwind text size (text-[8px]…text-xl, icons inherit) inside #app below 1200px; desktop is unchanged. Checked all 14 phone views at 375px: no horizontal overflow. sw.js cache v58.
- Phone pages could not scroll their last row (e.g. «خروج از حساب کاربری» in settings) out from under the tab bar: tailwind.css loads after ui.css, so a page's p-4 overrode .safe-area-bottom's padding. The rule is now #app-scoped and keeps 104px + safe-area under every page. sw.js cache v59.
- Phone tab bar: «بیشتر» replaced by «بخش‌ها» in the middle of the bar. It opens a flat sheet (no groups) showing six tabs, scroll for the rest; «ویرایش» swaps any two tabs by tapping (bar ↔ sheet, or within either). Order is a per-phone preference in localStorage (medar-tab-order-v1); first four = bar. tailwind.css rebuilt. sw.js cache v60.
- Phone back button: a single history "guard" entry exists while «back» has something to undo (syncBackGuard after every render). popstate closes the «بخش‌ها» sheet, then the mobile task editor, then the topmost .modal-overlay (its «بازگشت»/«بستن» button, else its backdrop), then returns to the previous tab (viewHistory, filled by setView). With nothing left, «back» leaves the app as before. sw.js cache v61.
- امروز: the separate filter and sort icons (both opened the same panel) are one «فیلتر و ترتیب» button with the active-choice count, phone and desktop. sw.js cache v62.
