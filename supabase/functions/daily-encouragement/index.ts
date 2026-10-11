import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const TZ_OFFSET_HOURS = 3; // Asia/Baghdad, matches the rest of the app's assumed timezone

function dk(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ---------- هوشواره health ----------
   Turns a failed Anthropic call into a kind the app can act on, with a Persian
   message the user can actually follow, and records it in ai_health so the app
   can show a banner instead of silently going quiet. Kept identical in
   generate-ai-report/index.ts. */
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

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const sb = createClient(supabaseUrl, serviceKey);

    // Only a signed-in user's token gets an answer — the public anon key alone
    // would let anyone spend the Anthropic credit. The service-role client
    // bypasses RLS, so every query below is filtered to this user by hand.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      await recordAIHealth(sb, user.id, new AIError("key", AI_ERROR_FA.key));
      return new Response(JSON.stringify({ error: AI_ERROR_FA.key }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // The server runs on UTC; the user's day starts 3 hours earlier. Build every
    // date from local time, or between 00:00 and 03:00 the line is about yesterday
    // and the app then caches it for the whole day.
    const nowLocal = new Date(Date.now() + TZ_OFFSET_HOURS * 3600000);
    const today = dk(nowLocal);
    const dayOffset = (n: number) => dk(new Date(nowLocal.getTime() + n * 86400000));
    const tomorrow = dayOffset(1);
    // weeks start on Saturday, as on the app's goals card
    const daysSinceSaturday = (nowLocal.getUTCDay() + 1) % 7;
    const weekStart = dayOffset(-daysSinceSaturday);
    const localMidnightIso = (key: string) => new Date(Date.parse(key + "T00:00:00Z") - TZ_OFFSET_HOURS * 3600000).toISOString();
    const localDay = (iso: string) => dk(new Date(Date.parse(iso) + TZ_OFFSET_HOURS * 3600000));

    // One text per day: once today's is written, every later call (a refresh,
    // another device) gets that same row back instead of a new generation.
    const { data: existing } = await sb
      .from("daily_lines")
      .select("text")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();
    if (existing?.text) {
      return new Response(JSON.stringify({ text: existing.text, date: today }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // the last two weeks' texts, so the same quote doesn't come back
    const { data: recentLines } = await sb
      .from("daily_lines")
      .select("text")
      .eq("user_id", user.id)
      .gte("date", dayOffset(-14))
      .order("date", { ascending: false });

    const { data: todayTasks } = await sb
      .from("tasks")
      .select("title, done, priority")
      .eq("user_id", user.id)
      .eq("date", today);

    const { count: overdue } = await sb
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("done", false)
      .lt("date", today);

    const { data: recentDone } = await sb
      .from("tasks")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("done", true)
      .gte("completed_at", localMidnightIso(dayOffset(-6)));

    // this week's tasks, for the goals: finished ones count toward the week they were finished in
    const { data: weekTasks } = await sb
      .from("tasks")
      .select("date, done, completed_at, duration_min, actual_min, task_tags(tag_id)")
      .eq("user_id", user.id)
      .or(`date.gte.${weekStart},completed_at.gte.${localMidnightIso(weekStart)}`);

    const { data: goals } = await sb.from("tag_goals").select("tag_id, weekly_minutes").eq("user_id", user.id);
    const { data: tags } = await sb.from("tags").select("id, name").eq("user_id", user.id);

    const { data: reminders } = await sb
      .from("reminders")
      .select("title, date")
      .eq("user_id", user.id)
      .eq("done", false)
      .gte("date", today)
      .lte("date", tomorrow);

    // one random past win from «تونستم», to lean on when the day looks heavy
    const { data: wins } = await sb
      .from("wins")
      .select("title, hardship")
      .eq("user_id", user.id)
      .order("happened_on", { ascending: false })
      .limit(50);
    const pastWin = wins && wins.length ? wins[Math.floor(Math.random() * wins.length)] : null;

    const rows = todayTasks || [];
    const todayCount = rows.length;
    const todayDone = rows.filter((t: any) => t.done).length;
    const openImportant = rows.filter((t: any) => !t.done && t.priority === "high").map((t: any) => t.title).slice(0, 3);
    const doneLastWeek = (recentDone || []).length;
    const activeDays = new Set((recentDone || []).map((t: any) => localDay(t.completed_at))).size;

    const goalLines = (goals || [])
      .filter((g: any) => g.weekly_minutes > 0)
      .map((g: any) => {
        const minutes = (weekTasks || [])
          .filter((t: any) => (t.task_tags || []).some((tt: any) => tt.tag_id === g.tag_id))
          .filter((t: any) => {
            const d = t.done && t.completed_at ? localDay(t.completed_at) : t.date;
            return d && d >= weekStart && d <= today;
          })
          .reduce((sum: number, t: any) => sum + (t.actual_min > 0 ? t.actual_min : t.done ? t.duration_min || 0 : 0), 0);
        const name = tags?.find((t: any) => t.id === g.tag_id)?.name || "";
        return `${name}: ${Math.round(minutes / 6) / 10} از ${Math.round(g.weekly_minutes / 6) / 10} ساعت`;
      });

    const reminderLine = (reminders || [])
      .map((r: any) => `${r.title} (${r.date === today ? "امروز" : "فردا"})`)
      .join("، ");

    const recentBlock = (recentLines || []).map((r: any) => `- ${String(r.text).replace(/\s*\n\s*/g, " / ")}`).join("\n");

    const prompt = `یه متن کوتاه فارسیِ دوخطی برای بالای صفحه‌ی امروزِ یه اپ برنامه‌ریزی شخصی بنویس: خط اول حرف خودت به کاربر، خط دوم یه جمله از یکی از بزرگان که به همون حرف می‌خوره.

وضعیت امروز کاربر:
- کارهای امروز: ${todayCount} تا، ${todayDone} تا انجام شده${openImportant.length ? `؛ کارهای باز با اولویت بالا: ${openImportant.join("، ")}` : ""}
- کارهای عقب‌افتاده‌ی باز: ${overdue ?? 0} تا
- کارهای تکمیل‌شده در هفت روز گذشته: ${doneLastWeek} تا، در ${activeDays} روز از ۷ روز
- هدف‌های این هفته (تا امروز، ${7 - daysSinceSaturday} روز از هفته مونده): ${goalLines.length ? goalLines.join("، ") : "هدفی تنظیم نشده"}
- یادآورهای امروز و فردا: ${reminderLine || "هیچ"}
- یکی از کارهایی که قبلاً تونسته و خودش ثبت کرده: ${pastWin ? `«${pastWin.title}»${pastWin.hardship ? ` با اینکه ${pastWin.hardship}` : ""}` : "هیچ"}

متن‌های روزهای قبل (تکرارشون نکن، نه جمله‌ی بزرگان رو و نه گوینده‌ی دیروز رو):
${recentBlock || "هیچ"}

قالب خروجی — دقیقاً دو خط، بدون هیچ توضیح اضافه:
خط اول: جمله‌ی خودت، حداکثر ۲۵ کلمه، بدون علامت نقل‌قول
خط دوم: «متنِ جمله» — نام گوینده

قواعد خط اول:
- فقط روی مهم‌ترین نکته‌ی همین داده‌ها تمرکز کن (مثلاً یه کار مهم امروز، هدفی که عقب مونده، یا یه یادآور نزدیک)، نه همه‌شون
- کلیشه‌های انگیزشی («هر روز یه قدم»، «تو می‌تونی») ممنوع
- صادق باش: اگه عقب‌افتاده زیاده، تشویق توخالی نکن؛ به‌جاش یه جمله‌ی واقع‌بینانه و آرام‌کننده بگو که شروع کردن رو ساده کنه
- اگه هفته‌ی خوبی داشته، خیلی ساده و بدون اغراق بهش اشاره کن
- اگه روزش سنگین به نظر میاد (عقب‌افتاده‌ی زیاد، هفته‌ی کم‌کار)، می‌تونی به همون کاری که قبلاً تونسته مشخصاً اشاره کنی؛ فقط وقتی به جمله کمک می‌کنه، نه هر روز
- لحن: دوستانه و بالغ، انگار یه رفیق باتجربه داره حرف می‌زنه، نه یه پوستر انگیزشی

قواعد خط دوم:
- یه جمله‌ی واقعی و انگیزه‌بخش از یه آدم بزرگ: شاعرها و حکیم‌های فارسی (سعدی، مولانا، حافظ، فردوسی، خیام، نظامی…)، فیلسوف‌ها، دانشمندها، نویسنده‌ها، ورزشکارها و آدم‌های اثرگذار ایران و جهان
- فقط جمله‌ای که مطمئنی واقعاً از همون آدمه؛ جمله‌ی ساختگی یا با انتسابِ مشکوک ممنوع. اگه شک داری، یکی دیگه رو انتخاب کن
- شعر فارسی رو عیناً و درست بیار (یک بیت یا یک مصراع)؛ جمله‌ی غیرفارسی رو روان و کوتاه ترجمه کن
- حداکثر ۳۰ کلمه، و به حال‌وهوای خط اول بخوره، نه یه جمله‌ی بی‌ربط
- گوینده‌ها رو متنوع نگه دار؛ هر روز از یه نفر و یه حوزه نباشه`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        // Sonnet 5 thinks by default, which would eat this small token budget
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      const err = await aiErrorFrom(aiRes);
      await recordAIHealth(sb, user.id, err);
      throw err;
    }
    await recordAIHealth(sb, user.id, null);

    const aiData = await aiRes.json();
    let text = (aiData.content?.find((b: any) => b.type === "text")?.text || "")
      .split("\n").map((l: string) => l.trim()).filter(Boolean).join("\n");

    // Keep it for the rest of the day. If a parallel call (two tabs opening at
    // once) got there first, its row wins and both show the same text.
    if (text) {
      const { error: saveErr } = await sb
        .from("daily_lines")
        .upsert({ user_id: user.id, date: today, text }, { onConflict: "user_id,date", ignoreDuplicates: true });
      if (saveErr) console.error("daily_lines write failed", saveErr);
      const { data: saved } = await sb
        .from("daily_lines")
        .select("text")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      if (saved?.text) text = saved.text;
    }

    return new Response(JSON.stringify({ text, date: today }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }
});
