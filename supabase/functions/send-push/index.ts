import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/* ---------- اعلان روی گوشی ----------
   Three ways in:
     x-cron-secret + {action:"digest"}  — the 08:00 pg_cron job: every account's morning digest
     x-cron-secret + {action:"notify", user_id, title, body, tag}
                                        — generate-ai-report: the weekly review is ready
     x-cron-secret + {action:"english"}  — the every-10-minutes pg_cron job: «انگلیسی» nudges
                                          that are due right now (see englishFor)
     user JWT + {action:"publicKey"}     — the app asks for the VAPID public key before subscribing
     user JWT + {action:"test"}          — «ارسال اعلان آزمایشی»: the caller's digest right now
   The morning digest is up to four notifications, each with its own tag so one
   doesn't bury another: dated items + today's tasks, «مادر», مرور هفتگی, پشتیبان.
   Only the first one makes a sound.
   The VAPID pair is generated here on first use and kept in private.cron_secrets
   (via init_vapid_keys), so the private key never exists anywhere else. */

const TZ_OFFSET_HOURS = 3; // Asia/Baghdad, matches the rest of the app's assumed timezone
const VAPID_SUBJECT = "https://byqowlvyupcusjjyxwaf.supabase.co";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => FA_DIGITS[+d]);
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/* Persian digits are bidi class EN, so right after a Latin name they join its
   left-to-right run: «Claude Pro — ۱۴ روز» comes out as «۱۴ — Claude Pro روز».
   A right-to-left mark in front of each number cuts it loose from the name. */
const bidi = (text: string) => String(text || "").replace(/[۰-۹]+/g, "\u200F$&");
const clip = (text: string, max: number) => text.length > max ? text.slice(0, max - 1) + "…" : text;
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function localToday(): string {
  return new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
}
function addDaysKey(day: string, n: number): string {
  return new Date(Date.parse(day + "T00:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
}
function daysUntil(dateStr: string, today: string): number {
  return Math.round((Date.parse(dateStr + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400_000);
}

async function vapidKeys(sb: SupabaseClient): Promise<{ publicKey: string; privateKey: string }> {
  const { data, error } = await sb.rpc("get_vapid_keys");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.public_key && row?.private_key) return { publicKey: row.public_key, privateKey: row.private_key };

  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = b64url(new Uint8Array([4, ...fromB64url(jwk.x!), ...fromB64url(jwk.y!)]));
  const { data: stored, error: e2 } = await sb.rpc("init_vapid_keys", { pub, priv: jwk.d });
  if (e2) throw e2;
  const s = Array.isArray(stored) ? stored[0] : stored; // another call may have won the race — use what's stored
  return { publicKey: s.public_key, privateKey: s.private_key };
}

/* Mirrors the app's reminderVisible / reminderDueLabel and subState / subDueLabel,
   so the notification says exactly what the امروز page would. */
function reminderLabel(r: any, n: number): string {
  if (r.kind === "deadline") {
    if (n < 0) return `${fa(-n)} روز از مهلتش گذشته`;
    if (n === 0) return "امروز آخرین مهلته";
    if (n === 1) return "فردا مهلتش تموم می‌شه";
    return `${fa(n)} روز تا تموم شدن مهلت`;
  }
  if (n < 0) return `${fa(-n)} روز گذشته`;
  if (n === 0) return "همین امروزه";
  if (n === 1) return "فرداست";
  return `${fa(n)} روز مونده`;
}
function subLabel(n: number): string {
  if (n < 0) return `${fa(-n)} روز از تمدیدش گذشته`;
  if (n === 0) return "امروز تمدید می‌شه";
  if (n === 1) return "فردا تمدید می‌شه";
  return `${fa(n)} روز تا تمدید`;
}

type Payload = { title: string; body: string; tag: string; silent?: boolean };

/* «مادر»: on the chosen weekdays, one consideration for Mom (MS). Same count
   as the app's motherItemForDay — reminder days since 1970-01-01, walking the
   list in order — so the push and the امروز card show the same one. */
function motherNote(care: any, items: any[], today: string): Payload | null {
  if (!care?.push || !items.length) return null;
  const days: number[] = (care.remind_days || []).map(Number);
  const e = Math.round(Date.parse(today + "T00:00:00Z") / 86400_000);
  if (!days.includes((e + 4) % 7)) return null;
  let n = Math.floor(e / 7) * days.length;
  for (let x = e - (e % 7); x <= e; x++) if (days.includes((x + 4) % 7)) n++;
  const it = items[(n - 1) % items.length];
  return {
    title: it.kind === "dont" ? "مادر — این کار رو نکن" : "مادر — یادت باشه",
    body: clip(it.body, 140),
    tag: "medar-mother",
    silent: true,
  };
}

/* «تعمیرات خونه»: urgent repairs nag every morning until they're fixed; upkeep
   shows up from MAINT_LEAD_DAYS before it's due, alongside the reminders. */
const MAINT_LEAD_DAYS = 7;
function maintLabel(n: number): string {
  if (n < 0) return `${fa(-n)} روز از موعدش گذشته`;
  if (n === 0) return "موعدش امروزه";
  if (n === 1) return "موعدش فرداست";
  return `${fa(n)} روز تا موعدش`;
}
function urgentRepairsLine(repairs: any[]): string {
  if (!repairs.length) return "";
  const names = repairs.slice(0, 2).map((r) => clip(r.title, 30)).join("، ");
  return repairs.length === 1
    ? `تعمیر فوری: ${names}`
    : `${fa(repairs.length)} تعمیر فوری مونده: ${names}${repairs.length > 2 ? " و…" : ""}`;
}

/* ---------- «انگلیسی» ----------
   Three nudges, each at its own time of day, so they can't ride the 08:00
   digest. The `english-push` cron calls in every 10 minutes and englishFor()
   sends whatever has just come due:
     after    — the class just ended and no homework is written down for today
     practice — the daily practice time, unless today is already done
     eve      — 21:00 the night before a class, while chunks are still open
   english_settings.pushed remembers the day each one last went out, so a nudge
   goes once a day however often the cron runs; ENGLISH_WINDOW_MIN stops a late
   cron from ringing in the middle of the night. */
const ENGLISH_WINDOW_MIN = 120;
const ENGLISH_EVE_MIN = 21 * 60;
const hhmmToMin = (t: string) => { const [h, m] = String(t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const weekdayOf = (day: string) => new Date(day + "T00:00:00Z").getUTCDay();
const localDayOf = (iso: string) => new Date(Date.parse(iso) + TZ_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);

// each class day can start at its own time (class_times); a day without one uses class_time
const classTimeOn = (s: any, day: string) => (s.class_times || {})[weekdayOf(day)] || s.class_time;

async function englishData(sb: SupabaseClient, uid: string, today: string) {
  const [chunks, practice] = await Promise.all([
    sb.from("english_chunks").select("title, minutes, day, done, done_at, homework_id, position").eq("user_id", uid)
      .or(`done.eq.false,done_at.gte.${new Date(Date.parse(addDaysKey(today, -3) + "T00:00:00Z")).toISOString()}`)
      .order("day", { ascending: true }).order("position", { ascending: true }),
    sb.from("english_practice").select("day").eq("user_id", uid).gte("day", addDaysKey(today, -2)),
  ]);
  if (chunks.error) throw chunks.error;
  if (practice.error) throw practice.error;
  const practiced = new Set<string>((practice.data || []).map((p: any) => p.day));
  for (const c of chunks.data || []) if (c.done && c.done_at) practiced.add(localDayOf(c.done_at));
  const open = (chunks.data || []).filter((c: any) => !c.done);
  return { open, practiced };
}

// the 08:00 digest's one line about English: what's on today, and whether it's a class day
async function englishDigestLine(sb: SupabaseClient, uid: string, today: string): Promise<string> {
  const { data: s } = await sb.from("english_settings").select("class_days, class_time, class_times").eq("user_id", uid).maybeSingle();
  const { open } = await englishData(sb, uid, today);
  const due = open.filter((c: any) => c.day <= today);
  const classToday = !!s && (s.class_days || []).map(Number).includes(weekdayOf(today));
  const mins = due.reduce((n: number, c: any) => n + (c.minutes || 0), 0);
  if (classToday && open.length) return `انگلیسی: امروز ساعت ${fa(classTimeOn(s, today))} کلاس داری و ${fa(open.length)} تکه از تکلیف مونده`;
  if (due.length) return `انگلیسی: ${fa(due.length)} تکه برای امروز (${fa(mins)} دقیقه)`;
  if (classToday) return `انگلیسی: امروز ساعت ${fa(classTimeOn(s, today))} کلاس داری`;
  return "";
}

async function englishFor(sb: SupabaseClient, uid: string): Promise<Payload[]> {
  const { data: s, error } = await sb.from("english_settings").select("*").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  if (!s || !s.push) return [];
  const local = new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000);
  const today = local.toISOString().slice(0, 10);
  const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
  const days: number[] = (s.class_days || []).map(Number);
  const pushed: Record<string, string> = { ...(s.pushed || {}) };
  const classToday = days.includes(weekdayOf(today));
  const classStart = hhmmToMin(classTimeOn(s, today));
  const classEnd = Math.min(classStart + (s.class_minutes || 90), 23 * 60 + 50);
  const practiceAt = hhmmToMin(s.practice_time);
  const inWindow = (at: number) => nowMin >= at && nowMin < at + ENGLISH_WINDOW_MIN;

  const wantAfter = classToday && inWindow(classEnd) && pushed.after !== today;
  const inClass = classToday && nowMin >= classStart && nowMin < classEnd;
  const wantPractice = inWindow(practiceAt) && !inClass && pushed.practice !== today;
  const wantEve = days.includes(weekdayOf(addDaysKey(today, 1))) && nowMin >= ENGLISH_EVE_MIN && pushed.eve !== today;
  if (!wantAfter && !wantPractice && !wantEve) return [];

  const { open, practiced } = await englishData(sb, uid, today);
  const out: Payload[] = [];

  if (wantAfter) {
    pushed.after = today;
    const { count } = await sb.from("english_homework").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("assigned_on", today);
    if (!count) out.push({
      title: "انگلیسی — تکلیف امروز چی بود؟",
      body: "تا یادته ثبتش کن؛ خودم خردش می‌کنم و می‌ذارمش روی روزهات.",
      tag: "medar-english-class",
    });
  }

  let eveSent = false;
  if (wantEve) {
    pushed.eve = today;
    if (open.length) {
      const mins = open.reduce((n: number, c: any) => n + (c.minutes || 0), 0);
      out.push({
        title: "انگلیسی — فردا کلاس داری",
        body: `${fa(open.length)} تکه مونده، حدود ${fa(mins)} دقیقه وقت می‌بره. همین امشب با «${clip(open[0].title, 40)}» شروع کن.`,
        tag: "medar-english",
      });
      eveSent = true;
    }
  }

  if (wantPractice) {
    pushed.practice = today;
    // the night-before warning already says what's left — don't ring twice
    if (!eveSent && !practiced.has(today)) {
      const due = open.filter((c: any) => c.day <= today);
      // yesterday slipped (class days don't count either way): the chain breaks on a second miss
      const y = addDaysKey(today, -1);
      const missedYesterday = !practiced.has(y) && !days.includes(weekdayOf(y));
      const tail = missedYesterday ? " دیروز جا افتاد؛ نذار دوتا بشه." : "";
      out.push(due.length
        ? {
          title: "انگلیسی — فقط همین یه تکه",
          body: `«${clip(due[0].title, 60)}» — ${fa(due[0].minutes)} دقیقه${due.length > 1 ? ` (و ${fa(due.length - 1)} تکه‌ی دیگه)` : ""}.${tail}`,
          tag: "medar-english",
        }
        : {
          title: "انگلیسی — ۵ دقیقه‌ی امروز",
          body: `تکه‌ای برای امروز نداری؛ ۵ دقیقه مرور کن تا زنجیره‌ت نشکنه.${tail}`,
          tag: "medar-english",
        });
    }
  }

  const { error: e2 } = await sb.from("english_settings").update({ pushed }).eq("user_id", uid);
  if (e2) throw e2; // without the mark the same nudge would go out again in 10 minutes
  return out;
}

async function digestFor(sb: SupabaseClient, uid: string): Promise<Payload[]> {
  const today = localToday();
  const [rem, subs, tasks, backups, review, care, careItems, repairs, maint] = await Promise.all([
    sb.from("reminders").select("title, kind, date, lead_days").eq("user_id", uid).eq("done", false).neq("kind", "always").not("date", "is", null),
    sb.from("subscriptions").select("name, next_renewal, notify_days_before").eq("user_id", uid).eq("active", true).not("next_renewal", "is", null),
    sb.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("date", today).eq("done", false),
    sb.from("backups").select("kind, created_at").eq("user_id", uid).order("created_at", { ascending: true }),
    sb.from("ai_reports").select("replan, replan_apply_after").eq("user_id", uid).gt("replan_apply_after", new Date().toISOString()),
    sb.from("mother_care").select("remind_days, push").eq("user_id", uid).maybeSingle(),
    sb.from("mother_care_items").select("kind, body").eq("user_id", uid).order("created_at", { ascending: true }).order("id", { ascending: true }),
    sb.from("home_repairs").select("title").eq("user_id", uid).eq("urgency", "urgent").neq("status", "done").order("created_at", { ascending: true }),
    sb.from("home_maintenance").select("title, next_due").eq("user_id", uid).lte("next_due", addDaysKey(today, MAINT_LEAD_DAYS)),
  ]);
  for (const r of [rem, subs, tasks]) if (r.error) throw r.error;

  const reminders = (rem.data || [])
    .map((r: any) => ({ r, n: daysUntil(r.date, today) }))
    .filter(({ r, n }) => n <= (r.lead_days || 0))
    .sort((a, b) => a.n - b.n);
  const renewals = (subs.data || [])
    .map((s: any) => ({ s, n: daysUntil(s.next_renewal, today) }))
    .filter(({ s, n }) => n <= (s.notify_days_before ?? 3))
    .sort((a, b) => a.n - b.n);
  const taskCount = tasks.count || 0;

  /* The server's own copies don't survive losing the project, only a downloaded
     file does. 30 days after the last download (or after backups began, if
     there's never been one) say so — then once a week, not every morning. */
  let backupNote: Payload | null = null;
  if (!backups.error && backups.data?.length) {
    const downloads = backups.data.filter((b: any) => b.kind === "download");
    const since = (downloads.length ? downloads[downloads.length - 1] : backups.data[0]).created_at;
    const gap = daysUntil(today, since.slice(0, 10));
    if (gap >= 30 && (gap - 30) % 7 === 0) {
      backupNote = {
        title: downloads.length ? `مدار — ${fa(gap)} روزه پشتیبان نگرفتی` : "مدار — هنوز پشتیبان نگرفتی",
        body: "از منوی «پشتیبان» یه نسخه دانلود کن.",
        tag: "medar-backup",
        silent: true,
      };
    }
  }

  // مرور هفتگی still has undecided proposals — they auto-apply at replan_apply_after
  let reviewNote: Payload | null = null;
  for (const r of review.data || []) {
    const pending = (r.replan?.changes || []).filter((c: any) => c.status === "pending").length;
    if (!pending) continue;
    const hoursLeft = (Date.parse(r.replan_apply_after) - Date.now()) / 3600_000;
    // same tag as generate-ai-report's «مرور هفتگی آماده‌ست», so this takes its place
    reviewNote = {
      title: `مرور هفتگی — ${fa(pending)} پیشنهاد منتظر تصمیمته`,
      body: `${hoursLeft <= 24 ? "تا فردا" : "تا دو روز دیگه"} خودکار اعمال می‌شن.`,
      tag: "medar-review",
      silent: true,
    };
  }

  /* One short line each, so a line stays a line on the lock screen. */
  const items = [
    ...reminders.map(({ r, n }) => ({ n, line: `• ${clip(r.title, 30)} — ${reminderLabel(r, n)}` })),
    ...renewals.map(({ s, n }) => ({ n, line: `• ${clip(s.name, 30)} — ${subLabel(n)}` })),
    ...(maint.error ? [] : maint.data || []).map((m: any) => {
      const n = daysUntil(m.next_due, today);
      return { n, line: `• ${clip(m.title, 30)} — ${maintLabel(n)}` };
    }),
  ].sort((a, b) => a.n - b.n);
  const repairLine = repairs.error ? "" : urgentRepairsLine(repairs.data || []);
  let englishLine = "";
  try { englishLine = await englishDigestLine(sb, uid, today); } catch (e) { console.error("english digest", e); }

  const out: Payload[] = [];
  if (items.length || taskCount || repairLine || englishLine) {
    const lines: string[] = [];
    if (taskCount) lines.push(`${fa(taskCount)} کار برای امروز داری`);
    lines.push(...items.slice(0, 3).map((i) => i.line));
    if (items.length > 3) lines.push(`و ${fa(items.length - 3)} مورد دیگه`);
    if (repairLine) lines.push(repairLine);
    if (englishLine) lines.push(englishLine);
    out.push({
      title: items.some((i) => i.n <= 0) ? "مدار — امروز یادت نره" : "مدار — صبح بخیر",
      body: lines.join("\n"),
      tag: "medar-digest",
    });
  }
  const mother = care.error || careItems.error ? null : motherNote(care.data, careItems.data || [], today);
  for (const note of [mother, reviewNote, backupNote]) if (note) out.push(note);
  if (out.length) out[0].silent = false; // whichever comes first is the one that rings
  return out;
}

/* Several notifications for one account: the endpoints are read once per send,
   so a device that died on the first is already gone for the second. */
async function sendAll(sb: SupabaseClient, uid: string, payloads: Payload[]) {
  let last = { devices: 0, sent: 0 };
  for (const p of payloads) last = await sendTo(sb, uid, p);
  return { ...last, notifications: payloads.length };
}

async function sendTo(sb: SupabaseClient, uid: string, payload: Payload) {
  const message = JSON.stringify({ ...payload, title: bidi(payload.title), body: bidi(payload.body) });
  const { data: subs, error } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", uid);
  if (error) throw error;
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        message,
        { TTL: 12 * 3600 },
      );
      sent++;
      await sb.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e: any) {
      // the device unsubscribed or the browser data was cleared — this endpoint is dead for good
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await sb.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.error("push failed", s.endpoint.slice(0, 60), e?.statusCode, e?.body ?? e?.message);
      }
    }
  }
  return { devices: (subs || []).length, sent };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let action = "digest";
    let body: any = null;
    try { body = await req.json(); action = body?.action || action; } catch (_e) { /* no body */ }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const keys = await vapidKeys(sb);
    webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);

    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret) {
      const { data: ok } = await sb.rpc("check_cron_secret", { s: cronSecret });
      if (!ok) return json({ error: "unauthorized" }, 401);
      // generate-ai-report: «مرور هفتگی آماده‌ست» for one account
      if (action === "notify") {
        if (!body?.user_id || !body?.title) return json({ error: "user_id and title required" }, 400);
        return json(await sendTo(sb, body.user_id, { title: body.title, body: body.body || "", tag: body.tag || "medar-notify" }));
      }
      const { data: rows, error } = await sb.from("push_subscriptions").select("user_id");
      if (error) throw error;
      if (action !== "digest" && action !== "english") return json({ error: "unknown action" }, 400);
      const results: any[] = [];
      // one account's failure must not stop the cron from reaching the others
      for (const uid of new Set((rows || []).map((r: any) => r.user_id as string))) {
        try {
          const d = action === "english" ? await englishFor(sb, uid) : await digestFor(sb, uid);
          results.push(d.length ? await sendAll(sb, uid, d) : { skipped: "nothing today" });
        } catch (e) {
          console.error(e);
          results.push({ error: String((e as any)?.message ?? e) });
        }
      }
      return json({ results });
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "برای این کار باید وارد حسابت شده باشی." }, 401);

    if (action === "publicKey") return json({ publicKey: keys.publicKey });
    if (action === "test") {
      const d = await digestFor(sb, user.id);
      if (d.length) return json(await sendAll(sb, user.id, d));
      return json(await sendTo(sb, user.id, { title: "مدار", body: "اعلان‌ها روشنه ✓ هر روز ساعت ۸ صبح یادآوری‌ها و کارهای امروزت رو اینجا می‌بینی.", tag: "medar-test" }));
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
