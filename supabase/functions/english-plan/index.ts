import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* «انگلیسی»: turns one homework from the class (free text, Top Notch) into
   small chunks spread over the days left until the next class. The app sends
   the homework and the days it may use; this only answers with the chunks —
   the app stores them itself, so they go through its offline queue like any
   other write. Why chunks were skipped lately (english_chunks.skips) is read
   here and shapes the plan: «سخت بود» → smaller chunks, «وقت نشد» → one a day… */

const TZ_OFFSET_HOURS = 3; // Asia/Baghdad, matches the rest of the app's assumed timezone
const MAX_CHUNKS = 14;
const WEEKDAYS_FA = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const SKIP_REASON_FA: Record<string, string> = { time: "وقت نشد", hard: "سخت بود", forgot: "یادم رفت", mood: "حوصله نداشتم" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

/* ---------- هوشواره health ----------
   Kept identical in generate-ai-report/index.ts and daily-encouragement/index.ts. */
class AIError extends Error {
  constructor(public kind: string, message: string) { super(message); }
}
const AI_ERROR_FA: Record<string, string> = {
  credit: "اعتبار هوشواره تموم شده. از console.anthropic.com بخش Billing شارژش کن؛ بعدش گزارش عقب‌افتاده خودش ساخته می‌شه.",
  key: "کلید API هوشواره نامعتبره یا تنظیم نشده. توی Supabase → Edge Functions → Secrets مقدار ANTHROPIC_API_KEY رو چک کن.",
  rate: "هوشواره الان بیش از حد درخواست گرفته؛ چند دقیقه دیگه دوباره امتحان کن.",
  overloaded: "سرویس هوش مصنوعی الان شلوغه؛ کمی بعد دوباره امتحان کن.",
  other: "هوشواره الان جواب نداد؛ کمی بعد دوباره امتحان کن.",
};
async function aiErrorFrom(res: Response): Promise<AIError> {
  const body = await res.text();
  console.error("AI API error", res.status, body);
  let kind = "other";
  // an empty balance comes back as a 400 whose message mentions the credit balance
  if (res.status === 402 || /credit balance|billing/i.test(body)) kind = "credit";
  else if (res.status === 401 || res.status === 403) kind = "key";
  else if (res.status === 429) kind = "rate";
  else if (res.status >= 500) kind = "overloaded";
  return new AIError(kind, AI_ERROR_FA[kind]);
}
async function recordAIHealth(sb: SupabaseClient, uid: string, err: AIError | null) {
  const now = new Date().toISOString();
  const row = err
    ? { user_id: uid, error_kind: err.kind, error_message: err.message, error_at: now }
    : { user_id: uid, ok_at: now };
  const { error } = await sb.from("ai_health").upsert(row, { onConflict: "user_id" });
  if (error) console.error("ai_health write failed", error);
}

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const weekdayOf = (day: string) => new Date(day + "T00:00:00Z").getUTCDay();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    // Only a signed-in user's token gets an answer — the public anon key alone
    // would let anyone spend the Anthropic credit.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "برای این کار باید وارد حسابت شده باشی." }, 401);

    const body = await req.json().catch(() => null);
    const title = String(body?.title || "").trim().slice(0, 1500);
    const unit = String(body?.unit || "").trim().slice(0, 120);
    const days: string[] = [...new Set((Array.isArray(body?.days) ? body.days : []).filter(isDay))].sort().slice(0, 21) as string[];
    const dueOn = isDay(body?.due_on) ? body.due_on : "";
    if (!title || !days.length) return json({ error: "title and days required" }, 400);

    if (!apiKey) {
      await recordAIHealth(sb, user.id, new AIError("key", AI_ERROR_FA.key));
      return json({ error: AI_ERROR_FA.key }, 500);
    }

    // what's already sitting on those days, and why chunks slipped in the last 30 days
    const since = new Date(Date.now() + TZ_OFFSET_HOURS * 3600000 - 30 * 86400000).toISOString().slice(0, 10);
    const { data: chunks } = await sb
      .from("english_chunks")
      .select("day, minutes, done, skips")
      .eq("user_id", user.id)
      .gte("day", since);
    const load: Record<string, number> = {};
    const reasons: Record<string, number> = {};
    const skippedWeekday: Record<number, number> = {};
    for (const c of chunks || []) {
      if (!c.done && days.includes(c.day)) load[c.day] = (load[c.day] || 0) + (c.minutes || 0);
      for (const s of Array.isArray(c.skips) ? c.skips : []) {
        if (!isDay(s?.day) || s.day < since) continue;
        reasons[s.reason] = (reasons[s.reason] || 0) + 1;
        skippedWeekday[weekdayOf(s.day)] = (skippedWeekday[weekdayOf(s.day)] || 0) + 1;
      }
    }
    const reasonLine = Object.entries(reasons).sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `«${SKIP_REASON_FA[r] || r}» ${n} بار`).join("، ");
    const weekdayLine = Object.entries(skippedWeekday).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])
      .map(([d, n]) => `${WEEKDAYS_FA[+d]} (${n} بار)`).join("، ");
    const dayLines = days.map((d) => `- ${d} (${WEEKDAYS_FA[weekdayOf(d)]})${load[d] ? ` — از قبل ${load[d]} دقیقه تکه‌ی انگلیسی روشه` : ""}`).join("\n");

    const prompt = `کاربر با معلم خصوصی و کتاب Top Notch انگلیسی می‌خونه. مشکلش اینه که تکلیف‌ها رو انجام نمی‌ده، چون شروع کردن براش سخته. این تکلیفِ جلسه‌ی آخرشه؛ به تکه‌های کوچیک خردش کن و بین روزهای مونده تا کلاس بعد پخشش کن.

تکلیف (به قلم خودش): ${title}
${unit ? `یونیت/درس: ${unit}\n` : ""}${dueOn ? `کلاس بعدی (مهلت): ${dueOn}\n` : ""}
روزهایی که می‌تونی استفاده کنی:
${dayLines}

${reasonLine ? `دلیل‌هایی که توی ۳۰ روز اخیر برای انجام ندادنِ تکه‌ها زده: ${reasonLine}\n` : ""}${weekdayLine ? `روزهایی از هفته که بیشتر جا می‌مونه: ${weekdayLine}\n` : ""}
قواعد:
- هر تکه ۱۰ تا ۱۵ دقیقه (هیچ‌وقت بیشتر از ۲۰). تکه یعنی یه کار مشخص که بشه همین الان شروعش کرد: دقیقاً بگو کدوم تمرین/صفحه/بخش، مثل «Workbook صفحه‌ی ۲۱، تمرین ۳ و ۴». عبارت‌های کلی مثل «ادامه‌ی تکلیف» ممنوع.
- فقط همون چیزی که خودش نوشته رو خرد کن؛ تمرین یا صفحه‌ای از خودت اضافه نکن. اگه جزئیات نداده، به نسبت تقسیم کن («نصف اولِ …»، «نصف دومِ …»).
- عنوان تکه‌ها فارسیِ خودمونی و کوتاه؛ اسم کتاب، تمرین و اصطلاح‌های انگلیسی همون‌طور که نوشته بمونن.
- روزی یک تکه؛ فقط اگه روزها کم‌ان، دو تا. اولین تکه آسون‌ترین و کوتاه‌ترین باشه تا شروع کنه.
- از روزهای اول شروع کن و کار رو جلو بنداز؛ آخرین روز قبل از کلاس سبک بمونه یا خالی. لازم نیست همه‌ی روزها پر بشن.
- روزی که از قبل تکه داره رو سبک‌تر بگیر. حداکثر ${Math.min(MAX_CHUNKS, days.length * 2)} تکه.
- اگه «سخت بود» زیاد زده: تکه‌ها رو کوچیک‌تر کن (۵ تا ۱۰ دقیقه). اگه «وقت نشد»: هیچ روزی بیشتر از یک تکه نذار. اگه «یادم رفت» یا «حوصله نداشتم»: تکه‌ی اول هر روز ۵ دقیقه‌ای باشه. روزهایی از هفته که بیشتر جا می‌مونه رو تا می‌شه خالی بذار.
- day فقط از همین روزهای بالا.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4000, // Persian titles are token-heavy; a cut-off answer has no usable chunks
        // Sonnet 5 thinks by default, which would eat this small token budget
        thinking: { type: "disabled" },
        tools: [{
          name: "submit_chunks",
          description: "تکه‌های تکلیف انگلیسی، هر کدوم روی یه روز",
          input_schema: {
            type: "object",
            properties: {
              chunks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    minutes: { type: "integer" },
                    day: { type: "string", description: "YYYY-MM-DD" },
                  },
                  required: ["title", "minutes", "day"],
                },
              },
            },
            required: ["chunks"],
          },
        }],
        tool_choice: { type: "tool", name: "submit_chunks" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      const err = await aiErrorFrom(aiRes);
      await recordAIHealth(sb, user.id, err);
      return json({ error: err.message }, 502);
    }
    await recordAIHealth(sb, user.id, null);

    const aiData = await aiRes.json();
    /* Every failure so far (2026-10-13) was a 502 after a healthy AI answer:
       the chunks were there but in a shape the old check dropped. So the
       answer is read leniently — the list may come back as a JSON string or
       under another key, a day with a time or slashes is cut to YYYY-MM-DD,
       and a day outside the offered ones moves to the nearest offered day
       instead of throwing the chunk away. */
    const tool = aiData.content?.find((b: any) => b.type === "tool_use")?.input;
    let raw: any = tool?.chunks ?? tool;
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = null; } }
    if (raw && !Array.isArray(raw) && typeof raw === "object") raw = Object.values(raw).find(Array.isArray);
    const normDay = (v: unknown) => String(v ?? "").trim().replace(/\//g, "-").slice(0, 10);
    const nearestDay = (d: string) => {
      if (days.includes(d)) return d;
      if (!isDay(d)) return days[0];
      return d < days[0] ? days[0] : d > days[days.length - 1] ? days[days.length - 1] : days.find((x) => x >= d)!;
    };
    // never trust the shape: only the days that were offered, sane lengths
    const chunks2 = (Array.isArray(raw) ? raw : [])
      .map((c: any) => ({
        title: String(c?.title || "").replace(/\s+/g, " ").trim().slice(0, 200),
        minutes: Math.min(20, Math.max(5, Math.round(Number(c?.minutes) || 10))),
        day: nearestDay(normDay(c?.day)),
      }))
      .filter((c: any) => c.title && c.day)
      .sort((a: any, b: any) => a.day.localeCompare(b.day))
      .slice(0, MAX_CHUNKS);
    if (!chunks2.length) {
      console.error("english-plan: no usable chunks", aiData.stop_reason, JSON.stringify(aiData.content).slice(0, 2000));
      return json({ error: AI_ERROR_FA.other }, 502);
    }
    return json({ chunks: chunks2 });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
