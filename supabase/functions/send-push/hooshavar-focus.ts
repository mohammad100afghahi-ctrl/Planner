import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* ---------- هوشاور › جلسهٔ تمرکز ----------
   The every-minute `hooshavar-focus-push` cron ({action:"hooshavar-focus"}).
   Two notifications, both opening the هوشاور page:
     - at the time in today's «ساعت …، در …، … رو انجام می‌دم» (within 15 minutes
       of it, once a day — hooshavar_focus_plan.pushed_on);
     - when a running session reaches 25 minutes (hooshavar_focus_sessions.end_pushed).
   The session itself is closed by the app, not here.
   Remove with the exercise: this file, its import and its `action` line in index.ts. */

const TZ_OFFSET_HOURS = 3; // Asia/Baghdad, as in index.ts
const FOCUS_MIN = 25;
const LATE_WINDOW_MIN = 15; // a plan saved after its time has passed doesn't ring
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const fa = (s: string) => s.replace(/\d/g, (d) => FA_DIGITS[+d]);

type Send = (sb: SupabaseClient, uid: string, payload: any) => Promise<{ devices: number; sent: number }>;

export async function hooshavarFocusRun(sb: SupabaseClient, sendTo: Send) {
  const local = new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000);
  const today = local.toISOString().slice(0, 10);
  const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
  const results: any[] = [];

  const { data: plans, error } = await sb.from("hooshavar_focus_plan").select("*").eq("weekday", local.getUTCDay());
  if (error) throw error;
  for (const p of plans || []) {
    if (p.pushed_on === today) continue;
    const [h, m] = p.at_time.split(":").map(Number);
    const at = h * 60 + m;
    if (nowMin < at || nowMin >= at + LATE_WINDOW_MIN) continue;
    const { count } = await sb.from("hooshavar_focus_sessions").select("id", { count: "exact", head: true })
      .eq("user_id", p.user_id).is("ended_at", null);
    if (count) continue; // already in a session
    const r = await sendTo(sb, p.user_id, {
      title: "وقت جلسهٔ تمرکزه",
      body: `ساعت ${fa(p.at_time)}، در ${p.place || "…"}، ${p.task || "…"} رو انجام می‌دم.`,
      tag: "medar-hv-focus",
      view: "hooshavar",
    });
    if (r.sent > 0) await sb.from("hooshavar_focus_plan").update({ pushed_on: today }).eq("user_id", p.user_id).eq("weekday", p.weekday);
    results.push(r);
  }

  const due = new Date(Date.now() - FOCUS_MIN * 60_000).toISOString();
  const stale = new Date(Date.now() - 3 * 3600_000).toISOString(); // a session left open for hours isn't news
  const { data: sessions, error: e2 } = await sb.from("hooshavar_focus_sessions").select("id, user_id")
    .is("ended_at", null).eq("end_pushed", false).lte("started_at", due).gte("started_at", stale);
  if (e2) throw e2;
  for (const s of sessions || []) {
    await sb.from("hooshavar_focus_sessions").update({ end_pushed: true }).eq("id", s.id);
    results.push(await sendTo(sb, s.user_id, {
      title: "۲۵ دقیقه تموم شد",
      body: "اضطرابت الان از ۰ تا ۱۰ چنده؟",
      tag: "medar-hv-focus",
      view: "hooshavar",
    }));
  }
  return { results };
}
