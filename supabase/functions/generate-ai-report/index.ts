import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* مرور هفتگی: one report a week, due on Friday (the daily cron runs at 17:00
   Baghdad, so it lands Friday evening; a missed Friday is caught up the next
   day). Its reshuffle waits for the user in the review, and whatever is still
   undecided after REVIEW_GRACE_DAYS is applied by the cron on its own. */
const REPORT_PERIOD_DAYS = 7;
const REVIEW_WEEKDAY = 5; // Friday
const REVIEW_GRACE_DAYS = 2;
const TZ_OFFSET_HOURS = 3; // Asia/Baghdad, matches the rest of the app's assumed timezone
const DIFFICULTY_FA: Record<string, string> = { easy: "راحت", medium: "معمولی", hard: "سخت" };
const PRIORITY_FA: Record<string, string> = { high: "بالا", medium: "متوسط", low: "پایین" };

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
function notesHint(t: any): string {
  return t.notes ? ` (${clip(t.notes, 80)})` : '';
}

/* ---------- هوشواره health ----------
   Turns a failed Anthropic call into a kind the app can act on, with a Persian
   message the user can actually follow, and records it in ai_health so the app
   can show a banner instead of silently going quiet. Kept identical in
   daily-encouragement/index.ts. */
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
    let force = false;
    try {
      const body = await req.json();
      force = !!body?.force;
    } catch (_e) {
      // no body / not JSON — fine, treat as scheduled (non-forced) call
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const sb = createClient(supabaseUrl, serviceKey);

    const userIds = await resolveUserIds(req, sb);
    if (!userIds) return json({ error: "برای این کار باید وارد حسابت شده باشی." }, 401);
    const cronSecret = req.headers.get("x-cron-secret");

    // proposals nobody decided on in time get applied first — this needs no AI
    for (const uid of userIds) {
      try { await applyDueProposals(sb, uid); } catch (e) { console.error("applyDueProposals", uid, e); }
    }

    if (!apiKey) {
      const err = new AIError("key", AI_ERROR_FA.key);
      for (const uid of userIds) await recordAIHealth(sb, uid, err);
      return json({ error: err.message }, 500);
    }

    // one account's failure must not stop the cron from reaching the others
    const results: any[] = [];
    for (const uid of userIds) {
      try {
        const r: any = await reportFor(sb, uid, force, apiKey);
        // the scheduled review pings the phone; a manual one happens with the app open
        if (r.ok && cronSecret) await notifyReview(uid, r.pending, cronSecret);
        results.push(r);
      } catch (e) {
        console.error(e);
        if (e instanceof AIError) await recordAIHealth(sb, uid, e);
        results.push({ error: e instanceof AIError ? e.message : String((e as any)?.message ?? e) });
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
// is filtered to uid by hand, and the inserted report is stamped with it.
async function reportFor(sb: SupabaseClient, uid: string, force: boolean, apiKey: string) {
  const periodEnd = new Date();
  periodEnd.setHours(0, 0, 0, 0);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - (REPORT_PERIOD_DAYS - 1));
  const prevPeriodEnd = new Date(periodStart);
  prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
  const prevPeriodStart = new Date(prevPeriodEnd);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - (REPORT_PERIOD_DAYS - 1));
  const today = dk(periodEnd);
  const weekAhead = new Date(periodEnd);
  weekAhead.setDate(weekAhead.getDate() + 7);

  // Due once this week's Friday has come and no report covers it yet, unless
  // explicitly forced (manual "generate now" button)
  if (!force) {
    const localToday = localDayKey();
    const lastFriday = addDays(localToday, -((new Date(localToday + "T00:00:00Z").getUTCDay() - REVIEW_WEEKDAY + 7) % 7));
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

  // tasks scheduled in either period
  const { data: tasks, error: tasksErr } = await sb
    .from("tasks")
    .select("*, task_tags(tag_id)")
    .eq("user_id", uid)
    .gte("date", dk(prevPeriodStart))
    .lte("date", today);
  if (tasksErr) throw tasksErr;

  // tasks finished in either period, whatever day they were scheduled for
  const { data: completions } = await sb
    .from("tasks")
    .select("id, title, date, completed_at")
    .eq("user_id", uid)
    .eq("done", true)
    .gte("completed_at", prevPeriodStart.toISOString());

  const { data: overdueOpen } = await sb
    .from("tasks")
    .select("id, title, notes, date, done, priority, duration_min, created_at, recurring_template_id")
    .eq("user_id", uid)
    .eq("done", false)
    .lt("date", today)
    .order("date", { ascending: true });

  const { data: tags } = await sb.from("tags").select("*").eq("user_id", uid);
  const { data: goals } = await sb.from("tag_goals").select("*").eq("user_id", uid);
  const { data: recurring } = await sb.from("recurring_templates").select("*").eq("user_id", uid);

  const { data: dateChanges } = await sb
    .from("task_date_changes")
    .select("task_id, changed_at")
    .eq("user_id", uid);

  const { data: reminders } = await sb
    .from("reminders")
    .select("title, kind, date")
    .eq("user_id", uid)
    .eq("done", false)
    .gte("date", today)
    .lte("date", dk(weekAhead))
    .order("date", { ascending: true });

  const { count: ideasCount } = await sb
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .gte("created_at", periodStart.toISOString());

  // «تونستم»: wins the user wrote down by hand, by the day they happened
  const { data: wins } = await sb
    .from("wins")
    .select("title, hardship, happened_on")
    .eq("user_id", uid)
    .gte("happened_on", dk(prevPeriodStart))
    .lte("happened_on", today)
    .order("happened_on", { ascending: false });

  // «تعمیرات خونه»: what's still broken, what got fixed and what it cost, and upkeep that's slipping
  const { data: homeRepairs } = await sb
    .from("home_repairs")
    .select("title, urgency, status, est_cost, actual_cost, created_at, done_at")
    .eq("user_id", uid);
  const { data: homeMaint } = await sb
    .from("home_maintenance")
    .select("title, next_due")
    .eq("user_id", uid)
    .lte("next_due", dk(weekAhead))
    .order("next_due", { ascending: true });

  // how the user handled last week's review: which proposals they took, and
  // whether the priorities they picked actually got done
  const { data: prevReview } = await sb
    .from("ai_reports")
    .select("replan, focus")
    .eq("user_id", uid)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tagName = (id: string) => tags?.find((t: any) => t.id === id)?.name || id;
  const hrs = (min: number) => Math.round(min / 6) / 10;
  // completed_at is UTC; shift it into the user's day before bucketing
  const localDate = (iso: string) => new Date(new Date(iso).getTime() + TZ_OFFSET_HOURS * 3600000);

  function summarize(fromKey: string, toKey: string) {
    const inRange = (tasks || []).filter((t: any) => t.date >= fromKey && t.date <= toKey);
    const done = inRange.filter((t: any) => t.done);
    const byTagMinutes: Record<string, number> = {};
    const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const byPriority: Record<string, { total: number; done: number }> = {};
    let planned = 0, actual = 0;
    inRange.forEach((t: any) => {
      const mins = t.actual_min && t.actual_min > 0 ? t.actual_min : t.done ? t.duration_min || 0 : 0;
      (t.task_tags || []).forEach((tt: any) => {
        byTagMinutes[tt.tag_id] = (byTagMinutes[tt.tag_id] || 0) + mins;
      });
      if (t.done && t.difficulty && byDifficulty[t.difficulty] !== undefined) byDifficulty[t.difficulty]++;
      if (t.priority) {
        byPriority[t.priority] ??= { total: 0, done: 0 };
        byPriority[t.priority].total++;
        if (t.done) byPriority[t.priority].done++;
      }
      // estimate accuracy only where both numbers are real
      if (t.done && t.actual_min > 0 && t.duration_min > 0) {
        planned += t.duration_min;
        actual += t.actual_min;
      }
    });
    const finished = (completions || []).filter((c: any) => {
      const d = dk(localDate(c.completed_at));
      return d >= fromKey && d <= toKey;
    });
    const activeDays = new Set(finished.map((c: any) => dk(localDate(c.completed_at)))).size;
    return { total: inRange.length, completed: done.length, byTagMinutes, byDifficulty, byPriority, planned, actual, finished, activeDays };
  }

  const curr = summarize(dk(periodStart), today);
  const prev = summarize(dk(prevPeriodStart), dk(prevPeriodEnd));

  const fmtTagMinutes = (m: Record<string, number>) =>
    Object.entries(m)
      .map(([id, min]) => `${tagName(id)}: ${hrs(min as number)} ساعت`)
      .join('، ') || 'چیزی ثبت نشده';

  const fmtDifficulty = (d: Record<string, number>) => {
    const parts = Object.entries(d)
      .filter(([, c]) => c > 0)
      .map(([k, c]) => `${DIFFICULTY_FA[k]}: ${c}`);
    return parts.length ? parts.join('، ') : 'ثبت نشده';
  };

  const fmtPriority = (p: Record<string, { total: number; done: number }>) => {
    const parts = ["high", "medium", "low"]
      .filter((k) => p[k])
      .map((k) => `${PRIORITY_FA[k]}: ${p[k].done} از ${p[k].total}`);
    return parts.length ? parts.join('، ') : 'اولویتی تعیین نشده';
  };

  const estimateLine = curr.planned > 0
    ? `برای کارهایی که زمان واقعی‌شون ثبت شده: ${hrs(curr.planned)} ساعت تخمین زده بود و ${hrs(curr.actual)} ساعت واقعاً طول کشید`
    : 'زمان واقعی برای کاری ثبت نشده';

  // time of day, from when tasks were actually ticked off
  const buckets: Record<string, number> = { "صبح (۵-۱۲)": 0, "بعدازظهر (۱۲-۱۷)": 0, "عصر/شب (۱۷-۲۴)": 0, "شب دیروقت (۰-۵)": 0 };
  curr.finished.forEach((c: any) => {
    const h = localDate(c.completed_at).getUTCHours();
    let bucket = "شب دیروقت (۰-۵)";
    if (h >= 5 && h < 12) bucket = "صبح (۵-۱۲)";
    else if (h >= 12 && h < 17) bucket = "بعدازظهر (۱۲-۱۷)";
    else if (h >= 17) bucket = "عصر/شب (۱۷-۲۴)";
    buckets[bucket]++;
  });
  const timeOfDayLine = Object.entries(buckets)
    .filter(([, n]) => n > 0)
    .map(([b, n]) => `${b}: ${n} کار`)
    .join('، ') || 'کاری در این بازه تیک نخورده';

  const lateFinished = curr.finished.filter((c: any) => c.date && dk(localDate(c.completed_at)) > c.date).length;

  const overdueLine = (overdueOpen || []).length
    ? `${overdueOpen!.length} کار (قدیمی‌ترین‌ها: ${overdueOpen!.slice(0, 3).map((t: any) => `"${t.title}"${notesHint(t)} از ${t.date}`).join('، ')})`
    : 'هیچ';

  // reschedule/avoidance signal: tasks moved multiple times, plus how much moving happened this period
  const rescheduleCounts: Record<string, number> = {};
  (dateChanges || []).forEach((c: any) => {
    rescheduleCounts[c.task_id] = (rescheduleCounts[c.task_id] || 0) + 1;
  });
  const movesThisPeriod = (dateChanges || []).filter((c: any) => c.changed_at >= periodStart.toISOString()).length;
  const knownTasks = [...(tasks || []), ...(overdueOpen || [])];
  const avoidedTasks = Object.entries(rescheduleCounts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([taskId, c]) => {
      const t = knownTasks.find((x: any) => x.id === taskId);
      return t && !t.done ? `"${t.title}" (${c} بار جابه‌جا شده)` : null;
    })
    .filter(Boolean)
    .slice(0, 3);
  const avoidedLine = avoidedTasks.length ? avoidedTasks.join('، ') : 'کاری به وضوح چندبار جابه‌جا نشده';

  // The review's proposals: nothing is changed here — the user decides in the
  // app, and the cron applies whatever is left after REVIEW_GRACE_DAYS.
  const plan = await proposeWeek(sb, uid, {
    today, curr, overdueOpen: overdueOpen || [], rescheduleCounts, tagName, apiKey,
    reminders: reminders || [], recurring: recurring || [], tasks: tasks || [],
    goalsTxt: (goals || []).length
      ? `اهداف هفتگی‌اش: ${(goals || []).map((g: any) => `${tagName(g.tag_id)} ${Math.round(g.weekly_minutes / 60)} ساعت${g.reason ? ` (چون: ${g.reason})` : ''}`).join('، ')}`
      : '',
  });
  const replan = plan?.replan ?? null;
  const focus = plan?.focus ?? null;
  const fmtDay = (d: string | null) => d ?? "بعداً (بی‌تاریخ)";
  const replanBlock = replan
    ? `\n\nمهم: برای هفته‌ی بعد ${replan.changes.length} پیشنهاد جابه‌جایی آماده کردی که منتظر تأیید خودشه (هنوز هیچی عوض نشده). دلیل: ${replan.reason}
ظرفیت روزانه‌ای که بر اساس روزهای خوب خودش در نظر گرفتی: ${hrs(replan.capacity_min)} ساعت
نمونه‌ها: ${replan.changes.slice(0, 6).map((c: any) => `"${c.title}": ${fmtDay(c.before.date)} ← ${fmtDay(c.after.date)}`).join('، ')}
توی گزارش کوتاه بگو منطق پیشنهادها چیه، و یادش بنداز که زیر همین گزارش می‌تونه هر کدوم رو قبول یا رد کنه یا تاریخ دیگه بذاره؛ اگه تا ${REVIEW_GRACE_DAYS} روز تصمیم نگیره، خودت اعمالشون می‌کنی.`
    : '';
  const focusBlock = focus?.suggested?.length
    ? `\nبرای «سه اولویت هفته‌ی بعد» این‌ها رو پیشنهاد دادی تا خودش انتخاب کنه: ${focus.suggested.map((f: any) => `"${f.title}"`).join('، ')}. در یه جمله بهش اشاره کن.`
    : '';

  // last review's outcome, so the report can notice what the user trusts and what they ignore
  let prevReviewLine = 'مرور هفتگی قبلی‌ای نبوده';
  const prevChanges = (prevReview?.replan?.changes || []).filter((c: any) => c.status);
  const prevChosen: string[] = prevReview?.focus?.chosen || [];
  if (prevChanges.length || prevChosen.length) {
    const count = (s: string) => prevChanges.filter((c: any) => c.status === s).length;
    const parts: string[] = [];
    if (prevChanges.length) {
      parts.push(`از ${prevChanges.length} پیشنهاد جابه‌جایی: ${count('accepted')} قبول، ${count('edited')} با تاریخ دلخواه خودش، ${count('rejected')} رد، ${count('auto')} رو خودش تصمیم نگرفت و خودکار اعمال شد`);
    }
    if (prevChosen.length) {
      const { data: focusTasks } = await sb.from("tasks").select("title, done").eq("user_id", uid).in("id", prevChosen);
      parts.push(`اولویت‌هایی که خودش برای این هفته انتخاب کرده بود: ${(focusTasks || []).map((t: any) => `"${t.title}" (${t.done ? 'انجام شد' : 'انجام نشد'})`).join('، ') || 'حذف شدن'}`);
    }
    prevReviewLine = parts.join('؛ ');
  }

  const goalLines =
    (goals || [])
      .map((g: any) => {
        const perPeriodTarget = hrs((g.weekly_minutes / 7) * REPORT_PERIOD_DAYS);
        const actualHrs = hrs(curr.byTagMinutes[g.tag_id] || 0);
        return `- ${tagName(g.tag_id)}: هدف تقریبی این بازه ${perPeriodTarget} ساعت (از هدف هفتگی ${Math.round(g.weekly_minutes / 60)} ساعته)، واقعی: ${actualHrs} ساعت${g.reason ? `، دلیلی که خودش نوشته: ${g.reason}` : ''}`;
      })
      .join('\n') || 'هدفی تنظیم نشده';

  // how the recurring habits held up this period
  const recurringLines =
    (recurring || [])
      .map((r: any) => {
        const inst = (tasks || []).filter((t: any) => t.recurring_template_id === r.id && t.date >= dk(periodStart));
        const status = r.active ? '' : ' (متوقف‌شده)';
        return `- ${r.title}${status}: ${inst.length ? `${inst.filter((t: any) => t.done).length} از ${inst.length} بار انجام شد` : 'نمونه‌ای در این بازه نداشت'}`;
      })
      .join('\n') || 'موردی نیست';

  const winsCurr = (wins || []).filter((w: any) => w.happened_on >= dk(periodStart));
  const winsPrevCount = (wins || []).length - winsCurr.length;
  const winsLine = winsCurr.length
    ? `${winsCurr.length} مورد (بازه‌ی قبل: ${winsPrevCount})؛ نمونه‌ها: ${winsCurr.slice(0, 5).map((w: any) => `"${w.title}"${w.hardship ? ` با اینکه ${w.hardship}` : ''}`).join('، ')}`
    : `چیزی ثبت نشده (بازه‌ی قبل: ${winsPrevCount})`;

  const repairsOpen = (homeRepairs || []).filter((r: any) => r.status !== 'done');
  const fixedBetween = (fromKey: string, toKey: string) => (homeRepairs || []).filter((r: any) => {
    if (r.status !== 'done' || !r.done_at) return false;
    const d = dk(localDate(r.done_at));
    return d >= fromKey && d <= toKey;
  });
  const fixedCurr = fixedBetween(dk(periodStart), today);
  const fixedPrevCount = fixedBetween(dk(prevPeriodStart), dk(prevPeriodEnd)).length;
  const spentCurr = fixedCurr.reduce((s: number, r: any) => s + (Number(r.actual_cost) || 0), 0);
  const ageDays = (iso: string) => Math.floor((periodEnd.getTime() - new Date(iso).getTime()) / 86400000);
  const staleUrgent = repairsOpen.filter((r: any) => r.urgency === 'urgent' && ageDays(r.created_at) >= 7);
  const countUrgency = (u: string) => repairsOpen.filter((r: any) => r.urgency === u).length;
  const estLeft = repairsOpen.reduce((s: number, r: any) => s + (Number(r.est_cost) || 0), 0);
  const maintLate = (homeMaint || []).filter((m: any) => m.next_due < today);
  const maintSoon = (homeMaint || []).filter((m: any) => m.next_due >= today);
  const repairParts: string[] = [];
  if ((homeRepairs || []).length) {
    repairParts.push(`کارهای باز: ${repairsOpen.length} (فوری ${countUrgency('urgent')}، به‌زودی ${countUrgency('soon')}، هر وقت شد ${countUrgency('whenever')})${estLeft ? `، هزینه‌ی تخمینی باقی‌مونده ${estLeft.toLocaleString('en')} تومان` : ''}`);
    repairParts.push(`این بازه درست شد: ${fixedCurr.length} مورد${fixedCurr.length ? ` (${fixedCurr.slice(0, 4).map((r: any) => `"${r.title}"`).join('، ')})` : ''}، بازه‌ی قبل: ${fixedPrevCount}${spentCurr ? `؛ خرج این بازه ${spentCurr.toLocaleString('en')} تومان` : ''}`);
    if (staleUrgent.length) {
      repairParts.push(`فوری‌هایی که بیشتر از یه هفته‌ست مونده‌ن: ${staleUrgent.slice(0, 3).map((r: any) => `"${r.title}" (${ageDays(r.created_at)} روز)`).join('، ')}`);
    }
  }
  if (maintLate.length) repairParts.push(`نگهداری دوره‌ای که موعدش گذشته: ${maintLate.map((m: any) => `"${m.title}" (از ${m.next_due})`).join('، ')}`);
  if (maintSoon.length) repairParts.push(`نگهداری دوره‌ای هفت روز آینده: ${maintSoon.map((m: any) => `"${m.title}" (${m.next_due})`).join('، ')}`);
  const repairsLine = repairParts.length ? repairParts.join('\n') : 'موردی ثبت نشده';

  const reminderLines =
    (reminders || []).map((r: any) => `- ${r.title} (${r.date}${r.kind === 'deadline' ? '، ددلاین' : ''})`).join('\n') || 'موردی نیست';

  const prompt = `تو دستیار بازخورد شخصی یه اپ برنامه‌ریزی کارهای شخصی هستی. هر چیزی درباره‌ی اهداف کاربر می‌دونی از همین داده‌هاست (مخصوصاً دلیل‌هایی که برای اهدافش نوشته)؛ چیزی از خودت فرض نکن.

بازه‌ی فعلی (${dk(periodStart)} تا ${today}): ${curr.completed} از ${curr.total} کارِ برنامه‌ریزی‌شده تکمیل شد.
روزهایی که حداقل یه کار تیک خورد: ${curr.activeDays} از ${REPORT_PERIOD_DAYS} روز
زمان صرف‌شده به‌تفکیک تگ: ${fmtTagMinutes(curr.byTagMinutes)}
تکمیل به‌تفکیک اولویت: ${fmtPriority(curr.byPriority)}
سختی کارهای تکمیل‌شده (به انتخاب خود کاربر): ${fmtDifficulty(curr.byDifficulty)}
دقت تخمین زمان: ${estimateLine}
ساعت‌هایی از روز که کارها تیک خوردن: ${timeOfDayLine}
کارهایی که بعد از روز برنامه‌ریزی‌شده‌شون تموم شدن: ${lateFinished}
ایده‌های تازه‌ی ثبت‌شده: ${ideasCount ?? 0}
موفقیت‌هایی که خودش توی بخش «تونستم» ثبت کرده (کارهایی که با وجود سختی انجامشون داده): ${winsLine}

بازه‌ی قبلی (${dk(prevPeriodStart)} تا ${dk(prevPeriodEnd)}) برای مقایسه: ${prev.completed} از ${prev.total} کار تکمیل شد، ${prev.activeDays} روز فعال.
زمان صرف‌شده به‌تفکیک تگ: ${fmtTagMinutes(prev.byTagMinutes)}

کارهای عقب‌افتاده‌ی باز (تاریخشون گذشته و تموم نشدن): ${overdueLine}
جابه‌جایی تاریخ کارها در این بازه: ${movesThisPeriod} بار
کارهایی که چندبار جابه‌جا شدن (احتمالاً داره ازشون فرار می‌کنه): ${avoidedLine}

اهداف هفتگی و پیشرفت نسبیِ همین بازه:
${goalLines}

کارهای تکرارشونده (عادت‌ها) و وضعیتشون در این بازه:
${recurringLines}

یادآورها و ددلاین‌های هفت روز آینده:
${reminderLines}

تعمیرات و نگهداری خونه (از بخش «تعمیرات خونه»):
${repairsLine}

مرور هفتگی قبلی و تصمیم‌هایی که خودش گرفت: ${prevReviewLine}

این گزارش «مرور هفتگی» کاربره: هر جمعه عصر می‌خونتش و بعدش هفته‌ی بعد رو می‌چینه.
یه گزارش کوتاه (حداکثر ۲۰۰ کلمه)، فارسی، صمیمی ولی صادق و مستقیم بنویس: این بازه رو با بازه‌ی قبل مقایسه کن، به مهم‌ترین الگوهایی که توی این عددها می‌بینی اشاره کن (نه همه‌شون)، و ۱ تا ۲ پیشنهاد عملی و مشخص برای بازه‌ی بعدی بده که اگه ددلاین نزدیکی هست اون رو هم در نظر بگیره. لحن انتقادیِ سازنده باشه، نه صرفاً تشویقی؛ از کلی‌گویی بپرهیز و به عددهای واقعی همین گزارش اشاره کن. اگه یه بخش داده‌ای نداره، فقط ازش بگذر و درباره‌ی نبودنش نصیحت نکن. اگه موفقیتی توی «تونستم» ثبت کرده، به یکی‌شون مشخصاً اشاره کن، چون اینا شواهدیه که خودش جمع می‌کنه تا به خودش ثابت کنه می‌تونه. اگه مرور قبلی داده داره (مثلاً اولویت‌هایی که انتخاب کرده بود انجام نشدن، یا همیشه پیشنهادها رو بی‌تصمیم رها می‌کنه)، کوتاه بهش اشاره کن. اگه تعمیر فوری‌ای مدت‌هاست مونده یا موعد نگهداری دوره‌ای گذشته، در یه جمله بگو و پیشنهاد کن یه روز مشخص از هفته‌ی بعد براش بذاره.${replanBlock}${focusBlock}`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 900,
      // Sonnet 5 thinks by default, which would eat this small token budget
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!aiRes.ok) throw await aiErrorFrom(aiRes);
  await recordAIHealth(sb, uid, null);
  const aiData = await aiRes.json();
  const reportText = aiData.content?.find((b: any) => b.type === "text")?.text || "گزارشی تولید نشد.";

  const { data: inserted, error: insertErr } = await sb.from("ai_reports").insert({
    user_id: uid,
    period_start: dk(periodStart),
    period_end: today,
    report_text: reportText,
    replan,
    replan_apply_after: replan ? new Date(Date.now() + REVIEW_GRACE_DAYS * 86400000).toISOString() : null,
    focus,
  }).select("id").single();
  if (insertErr) throw insertErr;
  // this review covers the same tasks — older undecided proposals are void
  if (replan) await expirePending(sb, uid, inserted.id);

  return { ok: true, pending: replan?.changes.length || 0 };
}

/* ---------- مرور هفتگی: proposals ----------
   Every weekly report comes with proposals, and none of them is applied here:
   - a reshuffle of the overdue tasks (and of next week, if it's overloaded),
     each change stored with its before-values and status 'pending';
   - up to FOCUS_MAX_SUGGESTED candidates for next week's three priorities.
   The user accepts, edits or rejects each change in the app. Whatever is still
   pending after REVIEW_GRACE_DAYS is applied by applyDueProposals() on a later
   cron run. Recurring instances are never touched: they roll forward on their own. */
const REPLAN_HORIZON_DAYS = 14;
const REPLAN_DEFAULT_CAPACITY = 180;
const DEFAULT_TASK_MIN = 30;
const FOCUS_MAX_SUGGESTED = 5;

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
  const { today, curr, overdueOpen, rescheduleCounts, tagName, apiKey, reminders, recurring } = ctx;
  const overdue = overdueOpen.filter((t: any) => !t.recurring_template_id);

  // capacity from the user's own good days: 75th percentile of the minutes they
  // actually finished on active days over the last four weeks, planned at 80%
  // so the new plan is one they can beat rather than fall behind on again
  const { data: recentDone } = await sb
    .from("tasks")
    .select("completed_at, actual_min, duration_min")
    .eq("user_id", uid)
    .eq("done", true)
    .gte("completed_at", new Date(Date.now() - 28 * 86400000).toISOString());
  const perDay: Record<string, number> = {};
  (recentDone || []).forEach((t: any) => {
    const day = dk(new Date(new Date(t.completed_at).getTime() + TZ_OFFSET_HOURS * 3600000));
    perDay[day] = (perDay[day] || 0) + (t.actual_min > 0 ? t.actual_min : t.duration_min || DEFAULT_TASK_MIN);
  });
  const dayMins = Object.values(perDay).sort((a, b) => a - b);
  const capacity = dayMins.length >= 3
    ? Math.min(480, Math.max(60, Math.round(dayMins[Math.floor((dayMins.length - 1) * 0.75)] * 0.8)))
    : REPLAN_DEFAULT_CAPACITY;

  const horizonEnd = addDays(today, REPLAN_HORIZON_DAYS - 1);
  const { data: upcoming } = await sb
    .from("tasks")
    .select("id, title, notes, date, done, priority, duration_min, created_at, recurring_template_id, task_tags(tag_id)")
    .eq("user_id", uid)
    .eq("done", false)
    .gte("date", today)
    .lte("date", horizonEnd);

  // fixed load per day: recurring instances already created plus the habits
  // that will be generated on that weekday
  const fixedLoad: Record<string, number> = {};
  for (let i = 0; i < REPLAN_HORIZON_DAYS; i++) {
    const key = addDays(today, i);
    const weekday = new Date(key + "T00:00:00Z").getUTCDay();
    const existing = (upcoming || []).filter((t: any) => t.recurring_template_id && t.date === key);
    let mins = existing.reduce((s: number, t: any) => s + (t.duration_min || DEFAULT_TASK_MIN), 0);
    (recurring || []).forEach((r: any) => {
      if (!r.active || !(r.weekdays || []).includes(weekday)) return;
      if (existing.some((t: any) => t.recurring_template_id === r.id)) return;
      mins += r.duration_min || DEFAULT_TASK_MIN;
    });
    fixedLoad[key] = mins;
  }

  const movable = [...overdue, ...(upcoming || []).filter((t: any) => !t.recurring_template_id)].slice(0, 80);
  if (!movable.length) return null;
  const byId = new Map(movable.map((t: any) => [t.id, t]));

  // how the user treated the last proposals: undoing them or mostly saying no
  // means propose less this time
  const { data: lastPlans } = await sb
    .from("ai_reports")
    .select("replan, replan_reverted_at")
    .eq("user_id", uid)
    .not("replan", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastPlan = lastPlans?.[0];
  const lastChanges = lastPlan?.replan?.changes || [];
  const lastRejected = lastChanges.filter((c: any) => c.status === "rejected").length;
  const trustNote = lastPlan?.replan_reverted_at
    ? '\nتوجه: دفعه‌ی قبل که برنامه‌ش رو عوض کردی، خودش همه رو برگردوند. پس فقط تغییرهای واقعاً لازم رو پیشنهاد بده.'
    : lastRejected && lastRejected * 2 >= lastChanges.length
      ? '\nتوجه: دفعه‌ی قبل بیشتر پیشنهادهات رو رد کرد. پس فقط تغییرهای واقعاً لازم رو پیشنهاد بده.'
      : '';

  const goalsTxt = ctx.goalsTxt || '';
  const taskLines = movable.map((t: any) => {
    const late = t.date < today ? `، ${daysBetween(t.date, today)} روز عقب‌افتاده` : '';
    const moved = rescheduleCounts[t.id] ? `، ${rescheduleCounts[t.id]} بار جابه‌جا شده` : '';
    const tagsTxt = (t.task_tags || []).map((tt: any) => tagName(tt.tag_id)).join('/');
    return `- id=${t.id} | "${t.title}" | تاریخ ${t.date} | اولویت ${t.priority ? PRIORITY_FA[t.priority] : 'ندارد'} | ${t.duration_min ? `${t.duration_min} دقیقه` : 'مدت ثبت نشده'}${tagsTxt ? ` | تگ: ${tagsTxt}` : ''}${t.notes ? ` | توضیحات: ${clip(t.notes, 160)}` : ''}${late}${moved}`;
  }).join('\n');

  const loadLines = Object.entries(fixedLoad).map(([k, m]) => {
    const planned = (upcoming || []).filter((t: any) => !t.recurring_template_id && t.date === k)
      .reduce((s: number, t: any) => s + (t.duration_min || DEFAULT_TASK_MIN), 0);
    return `${k}: عادت‌ها ${m} دقیقه، کارهای فعلی ${planned} دقیقه`;
  }).join('\n');

  const reminderLines = reminders.map((r: any) => `- ${r.title} (${r.date}${r.kind === 'deadline' ? '، ددلاین' : ''})`).join('\n') || 'موردی نیست';

  const prompt = `تو هوشواره‌ی یه اپ برنامه‌ریزی شخصی هستی و داری «مرور هفتگی» کاربر رو آماده می‌کنی. دو کار داری و هر دو فقط پیشنهادن؛ خود کاربر یکی‌یکی تأییدشون می‌کنه:
۱. برای کارهای عقب‌افتاده (و اگه روزهای آینده از ظرفیتش شلوغ‌ترن، برای همون کارها) پیشنهاد جابه‌جایی بده.
۲. از بین کارهای باز، حداکثر ${FOCUS_MAX_SUGGESTED} نامزد برای «سه اولویت هفته‌ی بعد» پیشنهاد بده.

عملکرد ${REPORT_PERIOD_DAYS} روز اخیر: ${curr.completed} از ${curr.total} کار تکمیل شد، ${curr.activeDays} از ${REPORT_PERIOD_DAYS} روز فعال. کارهای عقب‌افتاده‌ی باز: ${overdue.length}
امروز: ${today}
ظرفیت واقعی روزانه‌اش (از روزهای خوب خودش، با کمی حاشیه): ${capacity} دقیقه${trustNote}
${goalsTxt}
کارهای باز (غیرتکراری):
${taskLines}

بار هر روز در ${REPLAN_HORIZON_DAYS} روز آینده:
${loadLines}

یادآورها و ددلاین‌های نزدیک:
${reminderLines}

قواعد جابه‌جایی:
- هر کار عقب‌افتاده رو یا به یه روز مشخص ببر یا به «بعداً» (new_date = null)؛ همه رو روی امروز نریز. اولویت بالا و ددلاین‌دارها زودتر.
- مجموع «عادت‌ها + کارها» هیچ روزی از ظرفیت روزانه بیشتر نشه. اگه برنامه‌ی آینده منطقیه، به کارهای آینده دست نزن.
- کارهایی که خیلی کهنه‌ان یا چندبار جابه‌جا شدن و اولویت بالا ندارن رو می‌تونی به «بعداً» ببری. چیزی پاک نمی‌شه.
- اگه لازمه، مدت‌زمان کارها رو واقع‌بینانه‌تر کن (new_duration_min) یا اولویتشون رو اصلاح کن (new_priority). مدت ثبت‌نشده ≈ ${DEFAULT_TASK_MIN} دقیقه حساب کن.
- تاریخ‌ها فقط بین ${today} و ${horizonEnd}.
- فقط فیلدهایی رو بفرست که عوض می‌شن. why هر تغییر یه جمله‌ی کوتاه فارسی خطاب به خود کاربر باشه.
قواعد نامزدهای اولویت:
- کارهایی که بیشترین اثر رو دارن: اولویت بالا، ددلاین نزدیک، مرتبط با اهدافش، یا مهم‌هایی که مدت‌هاست ازشون فرار می‌کنه. why یه جمله‌ی کوتاه خطاب به خودش.
reason یه جمله‌ی کوتاه فارسی درباره‌ی منطق کلی پیشنهادهای جابه‌جایی (اگه تغییری لازم نیست، همینو بگو).`;

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      thinking: { type: "disabled" },
      tools: [{
        name: "submit_week_plan",
        description: "پیشنهادهای مرور هفتگی: جابه‌جایی کارها و نامزدهای اولویت هفته‌ی بعد",
        input_schema: {
          type: "object",
          properties: {
            reason: { type: "string" },
            changes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  new_date: { type: ["string", "null"], description: "YYYY-MM-DD، یا null یعنی «بعداً». اگه تاریخ عوض نمی‌شه نفرستش." },
                  new_priority: { type: "string", enum: ["high", "medium", "low"] },
                  new_duration_min: { type: "integer" },
                  why: { type: "string" },
                },
                required: ["task_id", "why"],
              },
            },
            focus: {
              type: "array",
              items: {
                type: "object",
                properties: { task_id: { type: "string" }, why: { type: "string" } },
                required: ["task_id", "why"],
              },
            },
          },
          required: ["reason", "changes", "focus"],
        },
      }],
      tool_choice: { type: "tool", name: "submit_week_plan" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!aiRes.ok) {
    // the report still matters more than the proposals — don't fail it here; a
    // credit/key problem will fail the report call right after and get recorded
    await aiErrorFrom(aiRes);
    return null;
  }
  const aiData = await aiRes.json();
  const decision = aiData.content?.find((b: any) => b.type === "tool_use")?.input;
  if (!decision) return null;

  // validate every proposal against the tasks we actually offered
  const seen = new Set<string>();
  const changes: any[] = [];
  for (const c of Array.isArray(decision.changes) ? decision.changes : []) {
    const t: any = byId.get(c?.task_id);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    const before: { date: string | null; priority: string | null; duration_min: number | null } =
      { date: t.date, priority: t.priority ?? null, duration_min: t.duration_min ?? null };
    const after = { ...before };
    if ("new_date" in c) {
      if (c.new_date === null) {
        if (t.date < today || (rescheduleCounts[t.id] || 0) >= 2) after.date = null;
      } else if (typeof c.new_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.new_date) &&
                 c.new_date >= today && c.new_date <= horizonEnd) {
        after.date = c.new_date;
      }
    }
    if (["high", "medium", "low"].includes(c.new_priority)) after.priority = c.new_priority;
    if (Number.isInteger(c.new_duration_min) && c.new_duration_min >= 5 && c.new_duration_min <= 480) {
      after.duration_min = c.new_duration_min;
    }
    if (after.date === before.date && after.priority === before.priority && after.duration_min === before.duration_min) continue;
    changes.push({ task_id: t.id, title: t.title, why: String(c.why || '').slice(0, 300), before, after, status: "pending" });
  }

  const focusSeen = new Set<string>();
  const suggested: any[] = [];
  for (const f of Array.isArray(decision.focus) ? decision.focus : []) {
    const t: any = byId.get(f?.task_id);
    if (!t || focusSeen.has(t.id) || suggested.length >= FOCUS_MAX_SUGGESTED) continue;
    focusSeen.add(t.id);
    suggested.push({ task_id: t.id, title: t.title, why: String(f.why || '').slice(0, 200) });
  }

  return {
    replan: changes.length ? { reason: String(decision.reason || '').slice(0, 400), capacity_min: capacity, changes } : null,
    focus: suggested.length ? { suggested, chosen: [] } : null,
  };
}

async function expirePending(sb: SupabaseClient, uid: string, keepId: string) {
  const { data: open } = await sb
    .from("ai_reports")
    .select("id, replan")
    .eq("user_id", uid)
    .neq("id", keepId)
    .not("replan_apply_after", "is", null);
  for (const r of open || []) {
    const changes = r.replan?.changes || [];
    if (!changes.some((c: any) => c.status === "pending")) continue;
    changes.forEach((c: any) => { if (c.status === "pending") c.status = "expired"; });
    const { error } = await sb.from("ai_reports").update({ replan: r.replan }).eq("id", r.id);
    if (error) console.error("expirePending", r.id, error);
  }
}

/* The user had REVIEW_GRACE_DAYS to decide; whatever is still pending gets
   applied now — but only onto a task that is still open and still exactly as
   the proposal found it, so a hand edit in the meantime always wins. A date
   that has already passed moves to today. */
async function applyDueProposals(sb: SupabaseClient, uid: string) {
  const { data: due, error } = await sb
    .from("ai_reports")
    .select("id, replan")
    .eq("user_id", uid)
    .not("replan", "is", null)
    .lte("replan_apply_after", new Date().toISOString());
  if (error) throw error;
  const today = localDayKey();
  for (const r of due || []) {
    const pending = (r.replan?.changes || []).filter((c: any) => c.status === "pending");
    if (!pending.length) continue;
    const { data: rows } = await sb
      .from("tasks")
      .select("id, date, priority, duration_min, done")
      .eq("user_id", uid)
      .in("id", pending.map((c: any) => c.task_id));
    const byId = new Map((rows || []).map((t: any) => [t.id, t]));
    for (const c of pending) {
      const t: any = byId.get(c.task_id);
      const untouched = t && !t.done &&
        (t.date ?? null) === c.before.date &&
        (t.priority ?? null) === c.before.priority &&
        (t.duration_min ?? null) === c.before.duration_min;
      if (!untouched) { c.status = "skipped"; continue; }
      const after = { ...c.after };
      if (after.date && after.date < today) after.date = today;
      const { error: upErr } = await sb
        .from("tasks")
        .update({ date: after.date, priority: after.priority, duration_min: after.duration_min })
        .eq("id", t.id)
        .eq("user_id", uid);
      if (upErr) { console.error("auto-apply failed", t.id, upErr); continue; } // stays pending, retried tomorrow
      c.after = after;
      c.status = "auto";
    }
    const { error: saveErr } = await sb.from("ai_reports").update({ replan: r.replan }).eq("id", r.id);
    if (saveErr) console.error("auto-apply save failed", r.id, saveErr);
  }
}

// «مرور هفتگی آماده‌ست» on the phone, through send-push (which holds the VAPID keys)
async function notifyReview(uid: string, pending: number, cronSecret: string) {
  const fa = (n: number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
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
        title: "مدار — مرور هفتگی آماده‌ست",
        body: pending
          ? `${fa(pending)} پیشنهاد برای هفته‌ی بعد منتظر تصمیم توئه. اگه تا ${fa(REVIEW_GRACE_DAYS)} روز تصمیم نگیری، خودم اعمالشون می‌کنم.`
          : "گزارش این هفته آماده‌ست؛ سه اولویت هفته‌ی بعد رو انتخاب کن.",
        tag: "medar-review",
      }),
    });
    if (!res.ok) console.error("notifyReview", res.status, await res.text());
  } catch (e) {
    console.error("notifyReview", e);
  }
}
