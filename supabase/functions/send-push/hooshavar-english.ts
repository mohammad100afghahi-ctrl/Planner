import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* ---------- هوشاور › یه تمرین انگلیسی ----------
   The every-minute `hooshavar-english-push` cron ({action:"hooshavar-english"}).
   Once a day, at the time set on the card (hooshavar_english_prefs.notify_at,
   default 16:30 Baghdad), says «یه تمرین انگلیسی» — unless that day already
   has a record. The day runs 07:00 → 07:00 as in the app, so a time before
   07:00 belongs to the night after. pushed_day keeps it to once.
   Remove with the exercise: this file, its import and its `action` line in index.ts. */

const TZ_OFFSET_HOURS = 3;
const DAY_START_H = 7;
const DEFAULT_AT = "16:30";

type Send = (sb: SupabaseClient, uid: string, payload: any) => Promise<{ devices: number; sent: number }>;

export async function hooshavarEnglishRun(sb: SupabaseClient, sendTo: Send) {
  const results: any[] = [];
  const { data: subs, error } = await sb.from("push_subscriptions").select("user_id");
  if (error) throw error;
  const users = [...new Set((subs || []).map((r: any) => r.user_id as string))];
  if (!users.length) return { results };
  const { data: prefs, error: e2 } = await sb.from("hooshavar_english_prefs").select("user_id, notify_at, pushed_day").in("user_id", users);
  if (e2) throw e2;
  const byUser = new Map((prefs || []).map((p: any) => [p.user_id, p]));

  // local clock written as UTC, so date maths needs no timezone library
  const local = Date.now() + TZ_OFFSET_HOURS * 3600_000;
  const day = new Date(local - DAY_START_H * 3600_000).toISOString().slice(0, 10);
  for (const uid of users) {
    try {
      const p: any = byUser.get(uid);
      if (p?.pushed_day === day) continue;
      const [h, m] = String(p?.notify_at || DEFAULT_AT).split(":").map(Number);
      const due = Date.parse(day + "T00:00:00Z") + ((h < DAY_START_H ? 24 : 0) + h) * 3600_000 + m * 60_000;
      if (local < due) continue;
      const { data: done, error: e3 } = await sb.from("hooshavar_english_logs").select("id").eq("user_id", uid).eq("day", day).limit(1);
      if (e3) throw e3;
      if (!done?.length) {
        results.push(await sendTo(sb, uid, {
          title: "یه تمرین انگلیسی",
          body: "قبل از اینستا و یوتیوب: فقط یه تمرین انگلیسی. بعدش آزادی.",
          tag: "medar-hv-english", view: "hooshavar",
        }));
      }
      const { error: e4 } = await sb.from("hooshavar_english_prefs").upsert({ user_id: uid, pushed_day: day }, { onConflict: "user_id" });
      if (e4) throw e4;
    } catch (e) {
      console.error(e);
      results.push({ error: String((e as any)?.message ?? e) });
    }
  }
  return { results };
}
