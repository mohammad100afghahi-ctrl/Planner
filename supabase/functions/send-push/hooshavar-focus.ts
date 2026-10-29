import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* ---------- هوشاور › تمرکز ۲۵ دقیقه ----------
   The every-minute `hooshavar-focus-push` cron ({action:"hooshavar-focus"}).
   Two notifications, both opening the هوشاور page:
     - «وقت تمرکزه: [کار]» at the time in today's plan (within 15 minutes of
       it, once — hooshavar_focus_plan.pushed_on);
     - «۲۵ دقیقه تموم شد.» when a running session reaches 25 minutes. The
       session is closed here too (ended_at, 25 minutes, completed), so it
       counts even if the app isn't opened again that day.
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

  const { data: plans, error } = await sb.from("hooshavar_focus_plan").select("*").eq("day", today).is("pushed_on", null);
  if (error) throw error;
  for (const p of plans || []) {
    const [h, m] = p.at_time.split(":").map(Number);
    const at = h * 60 + m;
    if (nowMin < at || nowMin >= at + LATE_WINDOW_MIN) continue;
    const { count } = await sb.from("hooshavar_focus_sessions").select("id", { count: "exact", head: true })
      .eq("user_id", p.user_id).is("ended_at", null);
    if (count) continue; // already in a session
    const r = await sendTo(sb, p.user_id, {
      title: `وقت تمرکزه: ${p.task || "…"}`,
      body: `ساعت ${fa(p.at_time)}، در ${p.place || "…"}`,
      tag: "medar-hv-focus",
      view: "hooshavar",
    });
    if (r.sent > 0) await sb.from("hooshavar_focus_plan").update({ pushed_on: today }).eq("user_id", p.user_id).eq("day", p.day);
    results.push(r);
  }

  const due = new Date(Date.now() - FOCUS_MIN * 60_000).toISOString();
  const { data: sessions, error: e2 } = await sb.from("hooshavar_focus_sessions").select("id, user_id, started_at")
    .is("ended_at", null).lte("started_at", due);
  if (e2) throw e2;
  for (const s of sessions || []) {
    const ended = new Date(Date.parse(s.started_at) + FOCUS_MIN * 60_000).toISOString();
    const { data: closed } = await sb.from("hooshavar_focus_sessions")
      .update({ ended_at: ended, minutes: FOCUS_MIN, completed: true, end_pushed: true })
      .eq("id", s.id).is("ended_at", null).select("id");
    // a session left open for hours (the app was off) is closed quietly
    if (!closed?.length || Date.now() - Date.parse(ended) > 3600_000) continue;
    results.push(await sendTo(sb, s.user_id, {
      title: "۲۵ دقیقه تموم شد.",
      body: "",
      tag: "medar-hv-focus",
      view: "hooshavar",
    }));
  }
  return { results };
}
