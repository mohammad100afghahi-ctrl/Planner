import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* مرور هفته: once a week, due on Friday (the daily cron runs at 17:00 Baghdad,
   so it lands Friday evening; a missed Friday is caught up the next day), this
   prepares one ai_reports row whose `ritual` the app walks the user through:
   last week's commitment, the stuck tasks, placing the week on days, and one
   new commitment. Nothing here changes a task: the AI's day proposals wait in
   `replan` for step 3, and stay untouched if the user never does the ritual.
   The same function also answers {action:'break', task_id}: the «بشکنش» button
   in step 2, which asks for the first ten-minute step of a stuck task. */
const REPORT_PERIOD_DAYS = 7;
const REVIEW_WEEKDAY = 5; // Friday
const TZ_OFFSET_HOURS = 3; // Asia/Baghdad, matches the rest of the app's assumed timezone
const PRIORITY_FA: Record<string, string> = { high: "بالا", medium: "متوسط", low: "پایین" };
// «گیرکرده»: postponed this many times, or untouched this many days
const STUCK_MOVES = 3;
const STUCK_IDLE_DAYS = 28;
const STUCK_MAX = 6;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function dk(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// task notes can be long free text; the prompt only needs a hint of what the task is
function clip(text: string, max: number): string {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max) + '…' : flat;
}

/* ---------- هوشواره health ----------
   Turns a failed Anthropic call into a kind the app can act on, with a Persian
   message the user can actually follow, and records it in ai_health so the app
   can show a banner instead of silently going quiet. Kept identical in
   english-plan/index.ts. */
class AIError extends Error {
  constructor(public kind: string, message: string) { super(message); }
}
const AI_ERROR_FA: Record<string, string> = {
  credit: "اعتبار هوشواره تموم شده. از console.anthropic.com بخش Billing شارژش کن؛ بعدش مرور هفته دوباره پیش‌نویس می‌چینه.",
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Who is this call for? Either the signed-in user whose token came with the
// request (the app's "generate now" button), or — for the daily pg_cron job,
// which proves itself with x-cron-secret — every account. The public anon key
// alone gets nothing: it would otherwise let anyone spend the Anthropic credit.
async function resolveUserIds(req: Request, sb: SupabaseClient): Promise<string[] | null> {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret) {
    const { data: ok } = await sb.rpc("check_cron_secret", { s: cronSecret });
    if (!ok) return null;
    const { data, error } = await sb.auth.admin.listUsers();
    if (error) throw error;
    return data.users.map((u) => u.id);
  }
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await sb.auth.getUser(token);
  return user ? [user.id] : null;
}


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    let body: any = {};
    try {
      body = (await req.json()) || {};
    } catch (_e) {
      // no body / not JSON — fine, treat as scheduled (non-forced) call
    }
    const force = !!body.force;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const sb = createClient(supabaseUrl, serviceKey);

    const userIds = await resolveUserIds(req, sb);
    if (!userIds) return json({ error: "برای این کار باید وارد حسابت شده باشی." }, 401);
    const cronSecret = req.headers.get("x-cron-secret");

    if (body.action === "break") {
      if (cronSecret || userIds.length !== 1) return json({ error: "bad request" }, 400);
      if (!apiKey) {
        const err = new AIError("key", AI_ERROR_FA.key);
        await recordAIHealth(sb, userIds[0], err);
        return json({ error: err.message }, 500);
      }
      try {
        return json(await breakTask(sb, userIds[0], String(body.task_id || ""), apiKey));
      } catch (e) {
        console.error(e);
        if (e instanceof AIError) await recordAIHealth(sb, userIds[0], e);
        return json({ error: e instanceof AIError ? e.message : String((e as any)?.message ?? e) }, 500);
      }
    }

    // one account's failure must not stop the cron from reaching the others.
    // No API key still prepares the ritual — only the day proposals are missing.
    const results: any[] = [];
    for (const uid of userIds) {
      try {
        const r: any = await prepareReview(sb, uid, force, apiKey);
        // the scheduled review pings the phone; a manual one happens with the app open
        if (r.ok && cronSecret) await notifyReview(uid, cronSecret);
        results.push(r);
      } catch (e) {
        console.error(e);
        results.push({ error: String((e as any)?.message ?? e) });
      }
    }
    // a single-user call answers with that user's result, as the app expects
    if (results.length === 1) return json(results[0], results[0].error ? 500 : 200);
    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

// Runs with the service-role client, which bypasses RLS — so every query below
// is filtered to uid by hand, and the inserted row is stamped with it.
async function prepareReview(sb: SupabaseClient, uid: string, force: boolean, apiKey: string | undefined) {
  const today = localDayKey();
  const periodStart = addDays(today, -(REPORT_PERIOD_DAYS - 1));

  // Due once this week's Friday has come and no review covers it yet, unless
  // explicitly forced (the app's «شروع مرور» button)
  if (!force) {
    const lastFriday = addDays(today, -((new Date(today + "T00:00:00Z").getUTCDay() - REVIEW_WEEKDAY + 7) % 7));
    const { data: lastReport } = await sb
      .from("ai_reports")
      .select("period_end")
      .eq("user_id", uid)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastReport && lastReport.period_end >= lastFriday) {
      return { skipped: true, reason: "not due yet" };
    }
  }

  const { data: open, error: openErr } = await sb
    .from("tasks")
    .select("id, title, notes, date, priority, duration_min, created_at, updated_at, recurring_template_id, task_tags(tag_id)")
    .eq("user_id", uid)
    .eq("done", false)
    .is("shelved_at", null);
  if (openErr) throw openErr;
  const openTasks = (open || []).filter((t: any) => !t.recurring_template_id);

  // a postponement is a date moved later, or taken off the calendar
  const { data: dateChanges } = await sb
    .from("task_date_changes")
    .select("task_id, old_date, new_date")
    .eq("user_id", uid);
  const rescheduleCounts: Record<string, number> = {};
  const postponeCounts: Record<string, number> = {};
  (dateChanges || []).forEach((c: any) => {
    rescheduleCounts[c.task_id] = (rescheduleCounts[c.task_id] || 0) + 1;
    if (c.old_date && (!c.new_date || c.new_date > c.old_date)) postponeCounts[c.task_id] = (postponeCounts[c.task_id] || 0) + 1;
  });

  // step 2: postponed again and again, or sitting untouched in «بعداً» / overdue
  const stuck = openTasks
    .map((t: any) => ({
      t,
      moved: postponeCounts[t.id] || 0,
      idle: daysBetween(dayKeyOf(t.updated_at || t.created_at), today),
    }))
    .filter(({ t, moved, idle }) => moved >= STUCK_MOVES || ((!t.date || t.date < today) && idle >= STUCK_IDLE_DAYS))
    .sort((a, b) => b.moved - a.moved || b.idle - a.idle)
    .slice(0, STUCK_MAX)
    .map(({ t, moved, idle }) => ({ task_id: t.id, title: t.title, moved, idle_days: idle, decision: null, step_task_id: null }));

  // step 1: the commitment from the last finished ritual
  const { data: lastDone } = await sb
    .from("ai_reports")
    .select("ritual")
    .eq("user_id", uid)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevCommitment = lastDone?.ritual?.commitment || null;

  // step 3: هوشواره pre-places the week; without a key (or if it fails) the
  // user just places it by hand
  let replan = null;
  if (apiKey) {
    try {
      replan = await proposeWeek(sb, uid, { today, openTasks, rescheduleCounts, apiKey, stuckIds: new Set(stuck.map((s) => s.task_id)) });
      await recordAIHealth(sb, uid, null);
    } catch (e) {
      console.error("proposeWeek", e);
      if (e instanceof AIError) await recordAIHealth(sb, uid, e);
    }
  } else {
    await recordAIHealth(sb, uid, new AIError("key", AI_ERROR_FA.key));
  }

  const { data: inserted, error: insertErr } = await sb.from("ai_reports").insert({
    user_id: uid,
    period_start: periodStart,
    period_end: today,
    report_text: "",
    replan,
    ritual: { step: 0, prev_commitment: prevCommitment, prev_kept: null, blocker: null, blocker_note: "", stuck, commitment: null },
  }).select("id").single();
  if (insertErr) throw insertErr;
  // a newer ritual replaces an unfinished older one
  await expirePending(sb, uid, inserted.id);

  return { ok: true, id: inserted.id };
}

/* ---------- step 3: day proposals ----------
   هوشواره places the overdue tasks and the «بعداً» ones worth doing this week
   onto the next REPLAN_HORIZON_DAYS days, within the user's real daily
   capacity. Each change is stored with its before-values and status 'pending';
   the app shows them pre-placed and the user confirms or moves them. Recurring
   instances are never touched: they roll forward on their own. */
const REPLAN_HORIZON_DAYS = 7;
const REPLAN_DEFAULT_CAPACITY = 180;
const DEFAULT_TASK_MIN = 30;
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function dayKeyOf(iso: string): string {
  return dk(new Date(new Date(iso).getTime() + TZ_OFFSET_HOURS * 3600000));
}
function addDays(key: string, n: number): string {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return dk(d);
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}
function localDayKey(): string {
  return dk(new Date(Date.now() + TZ_OFFSET_HOURS * 3600000));
}

async function proposeWeek(sb: SupabaseClient, uid: string, ctx: any) {
  const { today, openTasks, rescheduleCounts, apiKey, stuckIds } = ctx;

  // capacity from the user's own good days: 75th percentile of the minutes they
  // actually finished on active days over the last four weeks, planned at 80%
  // so the new plan is one they can beat rather than fall behind on again.
  // The app's «ظرفیت» bar (dailyCapacity in index.html) uses the same formula.
  const { data: recentDone } = await sb
    .from("tasks")
    .select("completed_at, actual_min, duration_min")
    .eq("user_id", uid)
    .eq("done", true)
    .gte("completed_at", new Date(Date.now() - 28 * 86400000).toISOString());
  const perDay: Record<string, number> = {};
  (recentDone || []).forEach((t: any) => {
    const day = dayKeyOf(t.completed_at);
    perDay[day] = (perDay[day] || 0) + (t.actual_min > 0 ? t.actual_min : t.duration_min || DEFAULT_TASK_MIN);
  });
  const dayMins = Object.values(perDay).sort((a, b) => a - b);
  const capacity = dayMins.length >= 3
    ? Math.min(480, Math.max(60, Math.round(dayMins[Math.floor((dayMins.length - 1) * 0.75)] * 0.8)))
    : REPLAN_DEFAULT_CAPACITY;

  const horizonEnd = addDays(today, REPLAN_HORIZON_DAYS - 1);
  const { data: recurringInWeek } = await sb
    .from("tasks")
    .select("date, duration_min, recurring_template_id")
    .eq("user_id", uid)
    .eq("done", false)
    .not("recurring_template_id", "is", null)
    .gte("date", today)
    .lte("date", horizonEnd);
  const { data: recurring } = await sb.from("recurring_templates").select("*").eq("user_id", uid);

  // fixed load per day: recurring instances already created plus the habits
  // that will be generated on that weekday
  const fixedLoad: Record<string, number> = {};
  for (let i = 0; i < REPLAN_HORIZON_DAYS; i++) {
    const key = addDays(today, i);
    const weekday = new Date(key + "T00:00:00Z").getUTCDay();
    const existing = (recurringInWeek || []).filter((t: any) => t.date === key);
    let mins = existing.reduce((s: number, t: any) => s + (t.duration_min || DEFAULT_TASK_MIN), 0);
    (recurring || []).forEach((r: any) => {
      if (!r.active || !(r.weekdays || []).includes(weekday)) return;
      if (existing.some((t: any) => t.recurring_template_id === r.id)) return;
      mins += r.duration_min || DEFAULT_TASK_MIN;
    });
    fixedLoad[key] = mins;
  }

  // overdue and this week's tasks first, then «بعداً» by priority; the stuck
  // ones are decided in step 2, not here
  const rank = (t: any) => (t.date ? 0 : 1) * 10 + (PRIORITY_RANK[t.priority] ?? 3);
  const movable = openTasks
    .filter((t: any) => !stuckIds.has(t.id) && (!t.date || t.date <= horizonEnd))
    .sort((a: any, b: any) => rank(a) - rank(b) || String(a.date || "").localeCompare(String(b.date || "")))
    .slice(0, 80);
  if (!movable.length) return null;
  const byId = new Map(movable.map((t: any) => [t.id, t]));

  // how the user treated the last proposals: mostly saying no means propose less
  const { data: lastPlans } = await sb
    .from("ai_reports")
    .select("replan")
    .eq("user_id", uid)
    .not("replan", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastChanges = lastPlans?.[0]?.replan?.changes || [];
  const lastRejected = lastChanges.filter((c: any) => c.status === "rejected").length;
  const trustNote = lastRejected && lastRejected * 2 >= lastChanges.length
    ? '\nتوجه: دفعه‌ی قبل بیشتر پیشنهادهات رو رد کرد. پس فقط تغییرهای واقعاً لازم رو پیشنهاد بده.'
    : '';

  const taskLines = movable.map((t: any) => {
    const when = !t.date ? 'بعداً (بی‌تاریخ)' : t.date < today ? `${t.date}، ${daysBetween(t.date, today)} روز عقب‌افتاده` : t.date;
    const moved = rescheduleCounts[t.id] ? `، ${rescheduleCounts[t.id]} بار جابه‌جا شده` : '';
    return `- id=${t.id} | "${t.title}" | تاریخ ${when} | اولویت ${t.priority ? PRIORITY_FA[t.priority] : 'ندارد'} | ${t.duration_min ? `${t.duration_min} دقیقه` : 'مدت ثبت نشده'}${t.notes ? ` | توضیحات: ${clip(t.notes, 160)}` : ''}${moved}`;
  }).join('\n');

  const loadLines = Object.entries(fixedLoad).map(([k, m]) => {
    const planned = movable.filter((t: any) => t.date === k).reduce((s: number, t: any) => s + (t.duration_min || DEFAULT_TASK_MIN), 0);
    return `${k}: عادت‌ها ${m} دقیقه، کارهای فعلی ${planned} دقیقه`;
  }).join('\n');

  const { data: reminders } = await sb
    .from("reminders")
    .select("title, kind, date")
    .eq("user_id", uid)
    .eq("done", false)
    .gte("date", today)
    .lte("date", horizonEnd)
    .order("date", { ascending: true });
  const reminderLines = (reminders || []).map((r: any) => `- ${r.title} (${r.date}${r.kind === 'deadline' ? '، ددلاین' : ''})`).join('\n') || 'موردی نیست';

  const prompt = `تو هوشواره‌ی یه اپ برنامه‌ریزی شخصی هستی. کاربر الان داره هفته‌ی بعدش رو می‌چینه و تو باید پیش‌نویس چیدمان رو آماده کنی؛ خودش روی هر کار یه روز رو تأیید می‌کنه یا عوضش می‌کنه.

امروز: ${today}
ظرفیت واقعی روزانه‌اش (از روزهای خوب خودش، با کمی حاشیه): ${capacity} دقیقه${trustNote}

کارهای باز (غیرتکراری):
${taskLines}

بار هر روز در ${REPLAN_HORIZON_DAYS} روز آینده:
${loadLines}

یادآورها و ددلاین‌های نزدیک:
${reminderLines}

قواعد:
- هر کار عقب‌افتاده رو یا به یه روز مشخص ببر یا به «بعداً» (new_date = null)؛ همه رو روی امروز نریز. اولویت بالا و ددلاین‌دارها زودتر.
- از کارهای «بعداً» فقط اون‌هایی رو بیار توی این هفته که مهم‌ترن و جا دارن؛ بقیه رو نفرست.
- مجموع «عادت‌ها + کارها» هیچ روزی از ظرفیت روزانه بیشتر نشه. اگه برنامه‌ی فعلی یه روز منطقیه، به کارهاش دست نزن.
- اگه لازمه، مدت‌زمان کارها رو واقع‌بینانه‌تر کن (new_duration_min). مدت ثبت‌نشده ≈ ${DEFAULT_TASK_MIN} دقیقه حساب کن.
- تاریخ‌ها فقط بین ${today} و ${horizonEnd}.
- فقط کارهایی رو بفرست که عوض می‌شن. why هر تغییر یه جمله‌ی خیلی کوتاه فارسی خطاب به خود کاربر باشه.`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      // thinking shares this budget with the answer
      max_tokens: 16000,
      // fitting tasks under each day's capacity is the hard part: let it think
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        // a JSON answer in exactly this shape (Sonnet 5.5 refuses a forced tool call)
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              changes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task_id: { type: "string" },
                    new_date: { anyOf: [{ type: "string" }, { type: "null" }], description: "YYYY-MM-DD، یا null یعنی «بعداً». اگه تاریخ عوض نمی‌شه نفرستش." },
                    new_duration_min: { type: "integer" },
                    why: { type: "string" },
                  },
                  required: ["task_id", "why"],
                  additionalProperties: false,
                },
              },
            },
            required: ["changes"],
            additionalProperties: false,
          },
        },
      },
      // a safety refusal is retried on another model instead of failing
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!aiRes.ok) throw await aiErrorFrom(aiRes);
  const aiData = await aiRes.json();
  let decision: any = null;
  try { decision = JSON.parse(aiData.content?.find((b: any) => b.type === "text")?.text || ""); } catch { /* no plan */ }
  if (!decision) return null;

  // validate every proposal against the tasks we actually offered
  const seen = new Set<string>();
  const changes: any[] = [];
  for (const c of Array.isArray(decision.changes) ? decision.changes : []) {
    const t: any = byId.get(c?.task_id);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    const before: { date: string | null; priority: string | null; duration_min: number | null } =
      { date: t.date ?? null, priority: t.priority ?? null, duration_min: t.duration_min ?? null };
    const after = { ...before };
    if ("new_date" in c) {
      if (c.new_date === null) {
        if (t.date && t.date < today) after.date = null;
      } else if (typeof c.new_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.new_date) &&
                 c.new_date >= today && c.new_date <= horizonEnd) {
        after.date = c.new_date;
      }
    }
    if (Number.isInteger(c.new_duration_min) && c.new_duration_min >= 5 && c.new_duration_min <= 480) {
      after.duration_min = c.new_duration_min;
    }
    if (after.date === before.date && after.duration_min === before.duration_min) continue;
    changes.push({ task_id: t.id, title: t.title, why: String(c.why || '').slice(0, 200), before, after, status: "pending" });
  }
  return changes.length ? { capacity_min: capacity, changes } : null;
}

// a newer ritual replaces an unfinished older one: its proposals are void
async function expirePending(sb: SupabaseClient, uid: string, keepId: string) {
  const { data: open } = await sb
    .from("ai_reports")
    .select("id, replan")
    .eq("user_id", uid)
    .neq("id", keepId)
    .not("replan", "is", null)
    .is("completed_at", null);
  for (const r of open || []) {
    const changes = r.replan?.changes || [];
    if (!changes.some((c: any) => c.status === "pending")) continue;
    changes.forEach((c: any) => { if (c.status === "pending") c.status = "expired"; });
    const { error } = await sb.from("ai_reports").update({ replan: r.replan }).eq("id", r.id);
    if (error) console.error("expirePending", r.id, error);
  }
}

/* ---------- step 2: «بشکنش» ----------
   The first concrete step of a stuck task, small enough for ten minutes. The
   app adds it as a new task; the stuck task itself stays as it is. */
async function breakTask(sb: SupabaseClient, uid: string, taskId: string, apiKey: string) {
  const { data: t } = await sb
    .from("tasks")
    .select("title, notes, duration_min")
    .eq("id", taskId)
    .eq("user_id", uid)
    .maybeSingle();
  if (!t) return { error: "این کار پیدا نشد." };

  const prompt = `کاربر یه کار داره که مدت‌هاست عقبش می‌ندازه:
«${t.title}»${t.notes ? `\nتوضیحاتش: ${clip(t.notes, 400)}` : ''}

اولین قدم کاملاً مشخص و فیزیکیِ این کار رو بنویس که توی ۱۰ دقیقه یا کمتر انجام بشه و بعدش کار راه بیفته (مثلاً «شماره‌ی تعمیرکار رو پیدا کن و ذخیره کن»، نه «تحقیق کن»). فقط خود قدم رو بنویس: یه جمله‌ی کوتاه فارسی، بدون مقدمه، بدون نقل‌قول، بدون عدد.`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 200,
      // one short sentence: no thinking (Sonnet 5.5's "off" is between_tools; there are no tools here)
      thinking: { type: "between_tools" },
      output_config: { effort: "low" },
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!aiRes.ok) throw await aiErrorFrom(aiRes);
  await recordAIHealth(sb, uid, null);
  const aiData = await aiRes.json();
  const step = String(aiData.content?.find((b: any) => b.type === "text")?.text || "")
    .replace(/\s+/g, " ").replace(/^["«»'\s]+|["«»'\s]+$/g, "").trim().slice(0, 160);
  if (!step) return { error: "هوشواره قدمی پیشنهاد نداد؛ دوباره امتحان کن." };
  return { step };
}

// «مرور هفته آماده‌ست» on the phone, through send-push (which holds the VAPID keys)
async function notifyReview(uid: string, cronSecret: string) {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        "x-cron-secret": cronSecret,
      },
      body: JSON.stringify({
        action: "notify",
        user_id: uid,
        title: "مدار — مرور هفته آماده‌ست",
        body: "۵ دقیقه: هفته‌ی بعد رو بچین و یه تعهد انتخاب کن.",
        tag: "medar-review",
      }),
    });
    if (!res.ok) console.error("notifyReview", res.status, await res.text());
  } catch (e) {
    console.error("notifyReview", e);
  }
}
