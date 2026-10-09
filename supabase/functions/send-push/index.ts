import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/* ---------- اعلان روی گوشی ----------
   Three ways in:
     x-cron-secret + {action:"digest"}  — the 08:00 pg_cron job: every account's morning digest
     x-cron-secret + {action:"notify", user_id, title, body, tag}
                                        — generate-ai-report: the weekly review is ready
     user JWT + {action:"publicKey"}     — the app asks for the VAPID public key before subscribing
     user JWT + {action:"test"}          — «ارسال اعلان آزمایشی»: the caller's digest right now
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
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function localToday(): string {
  return new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
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
  if (n < 0) return `${fa(-n)} روز از تمدید گذشته`;
  if (n === 0) return "امروز تمدید می‌شه";
  if (n === 1) return "فردا تمدید می‌شه";
  return `${fa(n)} روز تا تمدید`;
}

async function digestFor(sb: SupabaseClient, uid: string) {
  const today = localToday();
  const [rem, subs, tasks, backups, review] = await Promise.all([
    sb.from("reminders").select("title, kind, date, lead_days").eq("user_id", uid).eq("done", false).neq("kind", "always").not("date", "is", null),
    sb.from("subscriptions").select("name, next_renewal, notify_days_before").eq("user_id", uid).eq("active", true).not("next_renewal", "is", null),
    sb.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("date", today).eq("done", false),
    sb.from("backups").select("kind, created_at").eq("user_id", uid).order("created_at", { ascending: true }),
    sb.from("ai_reports").select("replan, replan_apply_after").eq("user_id", uid).gt("replan_apply_after", new Date().toISOString()),
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
  let backupLine = "";
  if (!backups.error && backups.data?.length) {
    const downloads = backups.data.filter((b: any) => b.kind === "download");
    const since = (downloads.length ? downloads[downloads.length - 1] : backups.data[0]).created_at;
    const gap = daysUntil(today, since.slice(0, 10));
    if (gap >= 30 && (gap - 30) % 7 === 0) {
      backupLine = downloads.length
        ? `${fa(gap)} روزه پشتیبان دانلود نکردی — از منوی «پشتیبان» یکی بگیر`
        : "هنوز هیچ پشتیبانی دانلود نکردی — از منوی «پشتیبان» یکی بگیر";
    }
  }

  // مرور هفتگی still has undecided proposals — they auto-apply at replan_apply_after
  let reviewLine = "";
  for (const r of review.data || []) {
    const pending = (r.replan?.changes || []).filter((c: any) => c.status === "pending").length;
    if (!pending) continue;
    const hoursLeft = (Date.parse(r.replan_apply_after) - Date.now()) / 3600_000;
    reviewLine = `مرور هفتگی: ${fa(pending)} پیشنهاد منتظر تصمیمته — ${hoursLeft <= 24 ? "تا فردا" : "تا دو روز دیگه"} خودکار اعمال می‌شن`;
  }

  const items = [
    ...reminders.map(({ r, n }) => ({ n, line: `• ${r.title} — ${reminderLabel(r, n)}` })),
    ...renewals.map(({ s, n }) => ({ n, line: `• تمدید ${s.name} — ${subLabel(n)}` })),
  ].sort((a, b) => a.n - b.n);
  if (!items.length && !taskCount && !backupLine && !reviewLine) return null;

  const lines = items.slice(0, 3).map((i) => i.line);
  if (items.length > 3) lines.push(`و ${fa(items.length - 3)} مورد دیگه`);
  if (taskCount) lines.push(`امروز ${fa(taskCount)} کار برنامه‌ریزی‌شده داری`);
  if (reviewLine) lines.push(reviewLine);
  if (backupLine) lines.push(backupLine);
  const urgent = items.some((i) => i.n <= 0);
  return {
    title: urgent ? "مدار — امروز یادت نره" : "مدار — صبح بخیر",
    body: lines.join("\n"),
    tag: "medar-digest",
  };
}

async function sendTo(sb: SupabaseClient, uid: string, payload: object) {
  const { data: subs, error } = await sb.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", uid);
  if (error) throw error;
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
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
      const results: any[] = [];
      // one account's failure must not stop the cron from reaching the others
      for (const uid of new Set((rows || []).map((r: any) => r.user_id as string))) {
        try {
          const d = await digestFor(sb, uid);
          results.push(d ? await sendTo(sb, uid, d) : { skipped: "nothing today" });
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
      const payload = d || { title: "مدار", body: "اعلان‌ها روشنه ✓ هر روز ساعت ۸ صبح یادآوری‌ها و کارهای امروزت رو اینجا می‌بینی.", tag: "medar-test" };
      return json(await sendTo(sb, user.id, payload));
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
