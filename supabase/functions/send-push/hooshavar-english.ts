import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* ---------- هوشاور › ۱۰ دقیقه انگلیسی ----------
   The every-minute `hooshavar-english-push` cron ({action:"hooshavar-english"}).
   Closes a timer that has run out, so it counts even if the app isn't opened
   again, and says so once (both notifications open the هوشاور page):
     - 10 minutes up: «تموم شد. می‌خوای ادامه بدی؟»
     - the 20 more up: «۲۰ دقیقه تموم شد.»
   Remove with the exercise: this file, its import and its `action` line in index.ts. */

const FIRST_MIN = 10;
const MORE_MIN = 20;
const QUIET_AFTER_MS = 3600_000; // a timer left open for hours (the app was off) is closed quietly

type Send = (sb: SupabaseClient, uid: string, payload: any) => Promise<{ devices: number; sent: number }>;

export async function hooshavarEnglishRun(sb: SupabaseClient, sendTo: Send) {
  const table = "hooshavar_english_sessions";
  const results: any[] = [];
  const before = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  const ring = async (uid: string, ended: string, title: string) => {
    if (Date.now() - Date.parse(ended) > QUIET_AFTER_MS) return;
    results.push(await sendTo(sb, uid, { title, body: "", tag: "medar-hv-english", view: "hooshavar" }));
  };

  const { data: first, error } = await sb.from(table).select("id, user_id, started_at")
    .is("ended_at", null).is("extended_at", null).lte("started_at", before(FIRST_MIN));
  if (error) throw error;
  for (const s of first || []) {
    const ended = new Date(Date.parse(s.started_at) + FIRST_MIN * 60_000).toISOString();
    const { data: closed } = await sb.from(table).update({ ended_at: ended, minutes: FIRST_MIN, completed: true })
      .eq("id", s.id).is("ended_at", null).is("extended_at", null).select("id");
    if (closed?.length) await ring(s.user_id, ended, "تموم شد. می‌خوای ادامه بدی؟");
  }

  const { data: more, error: e2 } = await sb.from(table).select("id, user_id, extended_at")
    .is("ended_at", null).not("extended_at", "is", null).lte("extended_at", before(MORE_MIN));
  if (e2) throw e2;
  for (const s of more || []) {
    const ended = new Date(Date.parse(s.extended_at) + MORE_MIN * 60_000).toISOString();
    const { data: closed } = await sb.from(table).update({ ended_at: ended, minutes: FIRST_MIN + MORE_MIN })
      .eq("id", s.id).is("ended_at", null).select("id");
    if (closed?.length) await ring(s.user_id, ended, "۲۰ دقیقه تموم شد.");
  }
  return { results };
}
