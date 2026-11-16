import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* مدار MCP — lets any AI that speaks MCP (Claude, Gemini, ChatGPT…) read and
   change the planner as the signed-in user.

   Auth: Supabase Auth's OAuth 2.1 server. A request without a valid token gets
   401 + WWW-Authenticate pointing at this function's protected-resource
   metadata, which names <project>/auth/v1 as the authorization server; the AI
   registers itself, sends the user to oauth-consent.html on the site, and comes
   back with an access token for that user. Every query runs with that token, so
   the same owner-only RLS as the app applies — this function never uses the
   service role.

   Transport: MCP streamable HTTP, stateless, plain JSON responses (no SSE).

   KEEP IN STEP WITH THE APP: a new data-bearing feature gets a SECTIONS entry
   (and enrich/hooks if it has side effects in the app), a removed one loses it. */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PUBLIC_URL = `${SUPABASE_URL}/functions/v1/madar-mcp`;
const TZ_OFFSET_HOURS = 3; // Asia/Baghdad, matches send-push and generate-ai-report
const TRASH_KEEP_DAYS = 30;
const DEFAULT_TAG_COLOR = "#e24e50";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

/* ---------- dates ---------- */
const nowLocal = () => new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000);
const todayKey = () => nowLocal().toISOString().slice(0, 10);
const localDayOf = (iso: string) => new Date(Date.parse(iso) + TZ_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
function addDays(key: string, n: number) {
  const d = new Date(key + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
function addMonths(key: string, n: number) {
  const d = new Date(key + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + (n || 0)); return d.toISOString().slice(0, 10);
}
const startOfLocalDayUTC = (key: string) => new Date(Date.parse(key + "T00:00:00Z") - TZ_OFFSET_HOURS * 3600_000).toISOString();

/* ---------- sections ----------
   key: the column that identifies one row besides user_id ('id' for most;
   null = one settings row per user). children are snapshotted on delete so a
   restore brings them back; refs are rows elsewhere that only point here
   (ON DELETE SET NULL) and get re-pointed on restore. */
type Section = {
  table: string;
  label: string;
  about: string;
  key: string | null;
  fields: Record<string, string>;
  order: [string, boolean];
  search?: string[];
  readOnly?: boolean;
  hide?: string[];
  tags?: { link: string; fk: string };
  children?: { table: string; fk: string }[];
  refs?: { table: string; fk: string }[];
};

const PRIORITY = "'high' | 'medium' | 'low' | null";
const SECTIONS: Record<string, Section> = {
  tasks: {
    table: "tasks", label: "کارها", key: "id", order: ["date", true], search: ["title", "notes"],
    about: "The to-do list (امروز / کارها). A task with date = a day is planned for that day; date null = «بعداً» (unscheduled). shelved_at set = «کنار گذاشته» (parked, hidden from lists). Setting done=true also ticks its subtasks and finishes a linked home repair / upkeep, like the app does. Changing date is logged as a postponement.",
    fields: {
      title: "text, required", notes: "text", date: "YYYY-MM-DD or null (unscheduled)", priority: PRIORITY,
      duration_min: "planned minutes", actual_min: "minutes actually spent", done: "boolean", completed_at: "timestamp (auto when done changes)",
      difficulty: "'easy' | 'medium' | 'hard' | null (how it felt, set after finishing)",
      reminder_at: "timestamptz for a push reminder", reminder_kind: "'once' | 'always' | 'deadline'", reminder_lead_days: "days before",
      shelved_at: "timestamp or null — set to park the task", recurring_template_id: "uuid of the recurring template that made it (read-only)",
      tags: "array of tag NAMES (write: replaces the task's tags; unknown names are created)",
      subtasks: "on create only: array of subtask titles",
    },
    hide: ["reminder_sent_at", "reminder_claimed_at", "legacy_reminder_id", "annual_parent_id", "annual_renewed"],
    tags: { link: "task_tags", fk: "task_id" },
    children: [{ table: "subtasks", fk: "task_id" }, { table: "task_tags", fk: "task_id" }, { table: "task_date_changes", fk: "task_id" }],
    refs: [{ table: "home_repairs", fk: "task_id" }, { table: "home_maintenance", fk: "task_id" }],
  },
  subtasks: {
    table: "subtasks", label: "زیرکارها", key: "id", order: ["position", true], search: ["title"],
    about: "Checklist steps inside a task.",
    fields: { task_id: "uuid, required", title: "text, required", done: "boolean", position: "integer order" },
  },
  tags: {
    table: "tags", label: "تگ‌ها", key: "id", order: ["created_at", true], search: ["name"],
    about: "Labels for tasks, ideas and recurring tasks (e.g. work, study).",
    fields: { name: "text, required", color: "hex colour, required (e.g. #e24e50)" },
    children: [{ table: "task_tags", fk: "tag_id" }, { table: "idea_tags", fk: "tag_id" }, { table: "recurring_template_tags", fk: "tag_id" }, { table: "tag_goals", fk: "tag_id" }],
  },
  tag_goals: {
    table: "tag_goals", label: "هدف هفتگی تگ‌ها", key: "tag_id", order: ["created_at", true],
    about: "Weekly time goal per tag (one row per tag; its id is the tag_id).",
    fields: { tag_id: "uuid of the tag, required", weekly_minutes: "integer, required", reason: "text — why this goal matters" },
  },
  recurring_templates: {
    table: "recurring_templates", label: "کارهای تکراری", key: "id", order: ["created_at", true], search: ["title", "notes"],
    about: "Recurring tasks: the app creates a task from each active template on its weekdays when opened.",
    fields: {
      title: "text, required", notes: "text", priority: PRIORITY, duration_min: "minutes", weekdays: "int array, 0=Sunday … 6=Saturday",
      active: "boolean (false = paused)", reminder_time: "HH:MM or null", reminder_days_before: "integer", tags: "array of tag names",
    },
    tags: { link: "recurring_template_tags", fk: "template_id" },
    children: [{ table: "recurring_template_tags", fk: "template_id" }],
    refs: [{ table: "tasks", fk: "recurring_template_id" }],
  },
  ideas: {
    table: "ideas", label: "ایده‌ها", key: "id", order: ["created_at", false], search: ["body"],
    about: "Free-form idea notes. Images are listed as a count only.",
    fields: { body: "text, required", tags: "array of tag names" },
    tags: { link: "idea_tags", fk: "idea_id" },
    children: [{ table: "idea_tags", fk: "idea_id" }, { table: "idea_images", fk: "idea_id" }],
  },
  prompts: {
    table: "prompts", label: "پرامپت‌ها", key: "id", order: ["created_at", false], search: ["title", "body", "category", "note"],
    about: "Saved AI prompts.",
    fields: { title: "text", body: "text, required", category: "text", note: "text", favorite: "boolean" },
  },
  purchases: {
    table: "purchases", label: "خریدها", key: "id", order: ["created_at", false], search: ["title"],
    about: "Shopping list.",
    fields: { title: "text, required", priority: PRIORITY, price: "number (toman)", bought: "boolean", bought_at: "timestamp (auto when bought changes)" },
  },
  subscriptions: {
    table: "subscriptions", label: "اشتراک‌ها", key: "id", order: ["next_renewal", true], search: ["name", "note"],
    about: "Paid subscriptions and their renewal dates.",
    fields: { name: "text, required", cycle: "'monthly' | 'yearly'", next_renewal: "YYYY-MM-DD", active: "boolean", notify_days_before: "integer", note: "text" },
  },
  wins: {
    table: "wins", label: "بردها", key: "id", order: ["happened_on", false], search: ["title", "hardship", "why"],
    about: "Wins journal: things the user pulled off.",
    fields: { title: "text, required", hardship: "what made it hard", why: "why it matters", tag_ids: "uuid array", happened_on: "YYYY-MM-DD" },
  },
  mother_care: {
    table: "mother_care", label: "مادر — تنظیمات", key: null, order: ["updated_at", false],
    about: "Settings of the «مادر» page (caring for the user's mother). One row.",
    fields: { why: "text", remind_days: "int array of weekdays 0-6", show_on_today: "boolean", push: "boolean" },
  },
  mother_care_items: {
    table: "mother_care_items", label: "مادر — نکته‌ها", key: "id", order: ["created_at", true], search: ["body", "category"],
    about: "Do / don't tips for caring for the user's mother; the app rotates one a day.",
    fields: { kind: "'do' | 'dont'", category: "text, e.g. خستگی، گرما، حال دل، بدن و حرکت، حافظه و تمرکز، استرس و حرف زدن، کمک در کارها", body: "text, required" },
  },
  home_repairs: {
    table: "home_repairs", label: "تعمیرات خونه", key: "id", order: ["created_at", false], search: ["title", "room", "note", "trade"],
    about: "Home repairs. Setting status='done' also finishes the linked task (task_id) like the app does.",
    fields: {
      title: "text, required", room: "text", urgency: "'urgent' | 'soon' | 'whenever'", who: "'self' | 'pro'", trade: "which tradesperson",
      status: "'open' | 'waiting' | 'done'", est_cost: "integer toman", actual_cost: "integer toman", note: "text", task_id: "linked task uuid", done_at: "timestamp (auto)",
    },
    children: [{ table: "home_repair_parts", fk: "repair_id" }],
  },
  home_repair_parts: {
    table: "home_repair_parts", label: "قطعه‌های تعمیر", key: "id", order: ["created_at", true], search: ["name"],
    about: "Parts to buy for a repair.",
    fields: { repair_id: "uuid, required", name: "text, required", bought: "boolean" },
  },
  home_maintenance: {
    table: "home_maintenance", label: "نگهداری دوره‌ای خونه", key: "id", order: ["next_due", true], search: ["title", "room", "note"],
    about: "Periodic home upkeep (every N months).",
    fields: { title: "text, required", room: "text", every_months: "integer", next_due: "YYYY-MM-DD, required", last_done: "YYYY-MM-DD", who: "'self' | 'pro'", trade: "text", note: "text", task_id: "linked task uuid" },
  },
  english_homework: {
    table: "english_homework", label: "انگلیسی — تکلیف‌ها", key: "id", order: ["due_on", true], search: ["title", "unit"],
    about: "English class homework; each is split into daily chunks (english_chunks).",
    fields: { title: "text, required", unit: "text", assigned_on: "YYYY-MM-DD, required", due_on: "YYYY-MM-DD, required" },
    children: [{ table: "english_chunks", fk: "homework_id" }],
  },
  english_chunks: {
    table: "english_chunks", label: "انگلیسی — تکه‌های روزانه", key: "id", order: ["day", true], search: ["title"],
    about: "Daily pieces of an English homework, shown on امروز.",
    fields: {
      homework_id: "uuid, required", title: "text, required", minutes: "planned minutes", day: "YYYY-MM-DD, required", position: "order",
      done: "boolean", done_at: "timestamp (auto)", actual_min: "minutes", difficulty: "'easy' | 'medium' | 'hard'", skips: "json list of skip reasons",
    },
  },
  english_settings: {
    table: "english_settings", label: "انگلیسی — تنظیمات", key: null, order: ["updated_at", false],
    about: "English class schedule and practice settings. One row.",
    fields: { class_days: "int array 0-6", class_times: "json {weekday: 'HH:MM'}", class_minutes: "integer", practice_time: "HH:MM", push: "boolean", weekly_goal_min: "integer" },
    hide: ["pushed", "class_time"],
  },
  english_practice: {
    table: "english_practice", label: "انگلیسی — روزهای تمرین", key: "day", order: ["day", false],
    about: "Days the user practised English (the chain). One row per day; id = the day.",
    fields: { day: "YYYY-MM-DD, required" },
  },
  hooshavar_morning: {
    table: "hooshavar_morning", label: "هوشاور — لنگر صبح", key: "day", order: ["day", false],
    about: "Counsellor exercise: morning anchor log, one row per day (id = the day).",
    fields: { day: "YYYY-MM-DD", opened_at: "timestamp", washed_at: "timestamp", ate_at: "timestamp", done_at: "timestamp", woke_time: "HH:MM", phone: "text", skipped: "boolean", charge_place: "text" },
  },
  hooshavar_english_logs: {
    table: "hooshavar_english_logs", label: "هوشاور — یه تمرین انگلیسی", key: "id", order: ["day", false],
    about: "Counsellor exercise: daily English-practice log.",
    fields: { day: "YYYY-MM-DD, required", logged_at: "timestamp", before_phone: "boolean", minutes: "integer", note: "text" },
  },
  ai_reports: {
    table: "ai_reports", label: "گزارش‌های هوش مصنوعی", key: "id", order: ["created_at", false], readOnly: true,
    about: "Past AI weekly reports / reviews (read-only).",
    fields: { period_start: "date", period_end: "date", report_text: "text", focus: "json", ritual: "json", replan: "json" },
  },
};
const SECTION_NAMES = Object.keys(SECTIONS);

/* ---------- helpers ---------- */
class ToolError extends Error {}
const must = <T>(r: { data: T; error: any }, what: string): T => {
  if (r.error) throw new ToolError(`${what}: ${r.error.message}`);
  return r.data;
};
function sec(name: string): Section {
  const s = SECTIONS[name];
  if (!s) throw new ToolError(`unknown section «${name}». Sections: ${SECTION_NAMES.join(", ")}`);
  return s;
}
const COL = /^[a-z_][a-z0-9_]*$/;
function clean(s: Section, rec: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec || {})) {
    if (!COL.test(k) || k === "user_id" || k === "tags" || k === "subtasks") continue;
    if (s.hide?.includes(k)) continue;
    out[k] = v;
  }
  return out;
}
function strip(s: Section, row: any) {
  if (!row) return row;
  const r = { ...row };
  delete r.user_id;
  for (const h of s.hide || []) delete r[h];
  return r;
}

async function tagIdsFor(sb: SupabaseClient, names: unknown): Promise<string[]> {
  if (!Array.isArray(names)) throw new ToolError("tags must be an array of tag names");
  const all = must(await sb.from("tags").select("id,name"), "tags") as any[];
  const ids: string[] = [];
  for (const raw of names) {
    const name = String(raw).trim();
    if (!name) continue;
    let t = all.find((x) => x.name.trim().toLowerCase() === name.toLowerCase());
    if (!t) {
      t = must(await sb.from("tags").insert({ name, color: DEFAULT_TAG_COLOR }).select("id,name").single(), "create tag");
      all.push(t);
    }
    if (!ids.includes(t.id)) ids.push(t.id);
  }
  return ids;
}
async function setTags(sb: SupabaseClient, s: Section, id: string, names: unknown) {
  if (!s.tags) throw new ToolError(`${s.table} has no tags`);
  const ids = await tagIdsFor(sb, names);
  must(await sb.from(s.tags.link).delete().eq(s.tags.fk, id), "clear tags");
  if (ids.length) must(await sb.from(s.tags.link).insert(ids.map((tag_id) => ({ [s.tags!.fk]: id, tag_id }))), "set tags");
}

/* query results get the bits the app shows next to a row */
async function enrich(sb: SupabaseClient, name: string, rows: any[]) {
  if (!rows.length) return rows;
  const s = SECTIONS[name];
  const ids = rows.map((r) => r.id).filter(Boolean);
  if (s.tags && ids.length) {
    const links = must(await sb.from(s.tags.link).select(`${s.tags.fk},tag_id`).in(s.tags.fk, ids), "tags") as any[];
    const tags = must(await sb.from("tags").select("id,name"), "tags") as any[];
    const nameOf = Object.fromEntries(tags.map((t) => [t.id, t.name]));
    for (const r of rows) r.tags = links.filter((l) => l[s.tags!.fk] === r.id).map((l) => nameOf[l.tag_id]).filter(Boolean);
  }
  if (name === "tasks") {
    const subs = must(await sb.from("subtasks").select("id,task_id,title,done,position").in("task_id", ids).order("position"), "subtasks") as any[];
    for (const r of rows) r.subtasks = subs.filter((x) => x.task_id === r.id).map(({ task_id: _t, ...x }) => x);
  }
  if (name === "ideas") {
    const imgs = must(await sb.from("idea_images").select("idea_id").in("idea_id", ids), "idea images") as any[];
    for (const r of rows) r.image_count = imgs.filter((x) => x.idea_id === r.id).length;
  }
  if (name === "home_repairs") {
    const parts = must(await sb.from("home_repair_parts").select("id,repair_id,name,bought").in("repair_id", ids), "parts") as any[];
    for (const r of rows) r.parts = parts.filter((x) => x.repair_id === r.id).map(({ repair_id: _r, ...x }) => x);
  }
  if (name === "english_homework") {
    const ch = must(await sb.from("english_chunks").select("id,homework_id,title,day,minutes,done").in("homework_id", ids).order("day"), "chunks") as any[];
    for (const r of rows) r.chunks = ch.filter((x) => x.homework_id === r.id).map(({ homework_id: _h, ...x }) => x);
  }
  return rows;
}

/* ---------- side effects the app performs on the same change ---------- */
async function afterTaskDone(sb: SupabaseClient, ids: string[], done: boolean) {
  if (!ids.length) return;
  must(await sb.from("subtasks").update({ done }).in("task_id", ids), "subtasks");
  const now = new Date().toISOString();
  const reps = must(await sb.from("home_repairs").select("id,status").in("task_id", ids), "repairs") as any[];
  for (const r of reps) {
    if ((r.status === "done") === done) continue;
    must(await sb.from("home_repairs").update({ status: done ? "done" : "open", done_at: done ? now : null }).eq("id", r.id), "repair");
  }
  if (done) {
    const today = todayKey();
    const ms = must(await sb.from("home_maintenance").select("id,every_months").in("task_id", ids), "upkeep") as any[];
    for (const m of ms) {
      must(await sb.from("home_maintenance").update({ last_done: today, next_due: addMonths(today, m.every_months) }).eq("id", m.id), "upkeep");
    }
  }
}
async function updateRows(sb: SupabaseClient, name: string, ids: string[], changesIn: Record<string, unknown>) {
  const s = sec(name);
  if (s.readOnly) throw new ToolError(`${name} is read-only`);
  const changes = clean(s, changesIn);
  const tagNames = (changesIn as any)?.tags;
  const now = new Date().toISOString();
  if (name === "tasks" && "done" in changes && !("completed_at" in changes)) changes.completed_at = changes.done ? now : null;
  if (name === "purchases" && "bought" in changes && !("bought_at" in changes)) changes.bought_at = changes.bought ? now : null;
  if (name === "english_chunks" && "done" in changes && !("done_at" in changes)) changes.done_at = changes.done ? now : null;
  if (name === "home_repairs" && "status" in changes && !("done_at" in changes)) changes.done_at = changes.status === "done" ? now : null;

  let before: any[] = [];
  if (name === "tasks" && "date" in changes) {
    before = must(await sb.from("tasks").select("id,date").in("id", ids), "tasks") as any[];
  }

  let rows: any[] = [];
  if (Object.keys(changes).length) {
    let q = sb.from(s.table).update(changes);
    if (s.key) q = q.in(s.key, ids);
    else q = q.not("user_id", "is", null);
    rows = must(await q.select(), `update ${name}`) as any[];
    if (s.key && !rows.length) throw new ToolError(`no ${name} row matched ${ids.join(", ")}`);
  }
  if (tagNames !== undefined) for (const id of ids) await setTags(sb, s, id, tagNames);

  if (name === "tasks") {
    if ("date" in changes) {
      const moved = before.filter((b) => (b.date || null) !== (changes.date || null));
      if (moved.length) must(await sb.from("task_date_changes").insert(moved.map((b) => ({ task_id: b.id, old_date: b.date, new_date: changes.date || null }))), "log date change");
    }
    if ("done" in changes) await afterTaskDone(sb, ids, !!changes.done);
  }
  if (name === "home_repairs" && "status" in changes) {
    const done = changes.status === "done";
    const taskIds = rows.map((r) => r.task_id).filter(Boolean);
    if (taskIds.length) must(await sb.from("tasks").update({ done, completed_at: done ? now : null }).in("id", taskIds), "linked task");
  }
  if (!rows.length && s.key) rows = must(await sb.from(s.table).select("*").in(s.key, ids), name) as any[];
  return (await enrich(sb, name, rows)).map((r) => strip(s, r));
}

async function createRows(sb: SupabaseClient, name: string, records: any[]) {
  const s = sec(name);
  if (s.readOnly) throw new ToolError(`${name} is read-only`);
  if (!Array.isArray(records) || !records.length) throw new ToolError("records must be a non-empty array");
  const out: any[] = [];
  for (const rec of records) {
    const row = clean(s, rec);
    if (name === "tasks") { row.done ??= false; if (row.done && !row.completed_at) row.completed_at = new Date().toISOString(); }
    if (name === "home_repairs") { row.status ??= "open"; row.who ??= "self"; row.urgency ??= "soon"; }
    if (name === "tags") row.color ??= DEFAULT_TAG_COLOR;
    let created: any;
    if (s.key === null) {
      created = must(await sb.from(s.table).upsert(row, { onConflict: "user_id" }).select().single(), `save ${name}`);
    } else {
      created = must(await sb.from(s.table).insert(row).select().single(), `create ${name}`);
    }
    if (rec.tags !== undefined && s.tags) await setTags(sb, s, created.id, rec.tags);
    if (name === "tasks" && Array.isArray(rec.subtasks) && rec.subtasks.length) {
      must(await sb.from("subtasks").insert(rec.subtasks.map((t: any, i: number) => ({ task_id: created.id, title: String(t?.title ?? t), done: false, position: i }))), "subtasks");
    }
    out.push(created);
  }
  return (await enrich(sb, name, out)).map((r) => strip(s, r));
}

async function queryRows(sb: SupabaseClient, a: any) {
  const name = a.section;
  const s = sec(name);
  const limit = Math.min(Math.max(Number(a.limit) || 50, 1), 500);
  const cols = s.table === "idea_images" ? "id,idea_id,position,created_at" : "*";
  let q: any = sb.from(s.table).select(cols, { count: "exact" });
  for (const [col, cond] of Object.entries(a.filters || {})) {
    if (!COL.test(col)) throw new ToolError(`bad column ${col}`);
    if (col === "tags" && s.tags) {
      const want = (Array.isArray(cond) ? cond : [cond]).map((n) => String(n).trim().toLowerCase());
      const ids = (must(await sb.from("tags").select("id,name"), "tags") as any[]).filter((t) => want.includes(t.name.trim().toLowerCase())).map((t) => t.id);
      const links = must(await sb.from(s.tags.link).select(s.tags.fk).in("tag_id", ids), "tags") as any[];
      q = q.in("id", links.map((l) => l[s.tags!.fk]).concat(["00000000-0000-0000-0000-000000000000"]));
      continue;
    }
    if (cond === null) { q = q.is(col, null); continue; }
    if (typeof cond === "object" && !Array.isArray(cond)) {
      const { op, value } = cond as any;
      const ops = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "contains"];
      if (!ops.includes(op)) throw new ToolError(`op must be one of ${ops.join(", ")}`);
      q = op === "in" ? q.in(col, value) : q[op](col, value);
      continue;
    }
    q = Array.isArray(cond) ? q.in(col, cond) : q.eq(col, cond);
  }
  if (a.search && s.search?.length) {
    const term = String(a.search).replace(/[,()*%]/g, " ").trim();
    if (term) q = q.or(s.search.map((c) => `${c}.ilike.*${term}*`).join(","));
  }
  const orderCol = a.order_by && COL.test(a.order_by) ? a.order_by : s.order[0];
  const asc = a.ascending ?? (a.order_by ? true : s.order[1]);
  q = q.order(orderCol, { ascending: !!asc, nullsFirst: false }).range(Number(a.offset) || 0, (Number(a.offset) || 0) + limit - 1);
  const r = await q;
  const rows = must(r, `query ${name}`) as any[];
  return { section: name, total: r.count, returned: rows.length, rows: (await enrich(sb, name, rows)).map((x) => strip(s, x)) };
}

/* ---------- delete → trash → restore ---------- */
async function deleteRows(sb: SupabaseClient, name: string, ids: string[], client: string | null) {
  const s = sec(name);
  if (s.readOnly) throw new ToolError(`${name} is read-only`);
  if (!s.key) throw new ToolError(`${name} is a settings row; update it instead of deleting`);
  if (!Array.isArray(ids) || !ids.length) throw new ToolError("ids must be a non-empty array");
  const rows = must(await sb.from(s.table).select("*").in(s.key, ids), name) as any[];
  if (!rows.length) throw new ToolError(`no ${name} row matched`);
  const trashed: any[] = [];
  for (const row of rows) {
    const children: Record<string, any[]> = {};
    for (const c of s.children || []) children[c.table] = must(await sb.from(c.table).select("*").eq(c.fk, row[s.key]), c.table) as any[];
    const refs: Record<string, string[]> = {};
    for (const r of s.refs || []) refs[r.table] = (must(await sb.from(r.table).select("id").eq(r.fk, row[s.key]), r.table) as any[]).map((x) => x.id);
    const label = row.title || row.name || row.body?.slice?.(0, 60) || row.day || row[s.key];
    const t = must(await sb.from("mcp_trash").insert({ section: name, label, client, data: { row, children, refs } }).select("id").single(), "trash");
    trashed.push({ trash_id: t.id, id: row[s.key], label });
  }
  must(await sb.from(s.table).delete().in(s.key, rows.map((r) => r[s.key!])), `delete ${name}`);
  await sb.from("mcp_trash").delete().lt("deleted_at", new Date(Date.now() - TRASH_KEEP_DAYS * 86400_000).toISOString());
  return { deleted: trashed, note: `Kept in the trash for ${TRASH_KEEP_DAYS} days — restore_deleted with trash_id brings it back.` };
}
async function restoreRows(sb: SupabaseClient, trashIds: string[]) {
  const items = must(await sb.from("mcp_trash").select("*").in("id", trashIds).is("restored_at", null), "trash") as any[];
  if (!items.length) throw new ToolError("nothing to restore (unknown trash_id or already restored)");
  const out: any[] = [];
  for (const it of items) {
    const s = sec(it.section);
    const { row, children, refs } = it.data;
    const pk = s.key === "id" || s.key === "tag_id" ? s.key : `user_id,${s.key}`;
    must(await sb.from(s.table).upsert(row, { onConflict: pk }), `restore ${it.section}`);
    const problems: string[] = [];
    for (const [table, rows] of Object.entries(children || {}) as [string, any[]][]) {
      if (!rows.length) continue;
      const { error } = await sb.from(table).upsert(rows);
      if (error) problems.push(`${table}: ${error.message}`);
    }
    for (const [table, ids] of Object.entries(refs || {}) as [string, string[]][]) {
      const fk = s.refs!.find((r) => r.table === table)!.fk;
      if (ids.length) await sb.from(table).update({ [fk]: row[s.key!] }).in("id", ids);
    }
    must(await sb.from("mcp_trash").update({ restored_at: new Date().toISOString() }).eq("id", it.id), "trash");
    out.push({ trash_id: it.id, section: it.section, label: it.label, ...(problems.length ? { partly: problems } : {}) });
  }
  return { restored: out };
}

/* ---------- overview & report ---------- */
async function today(sb: SupabaseClient, day?: string) {
  const d = day || todayKey();
  const soon = addDays(d, 14);
  const [tasksDay, overdue, unscheduled, reminders, subs, repairs, upkeep, chunks, purchases] = await Promise.all([
    sb.from("tasks").select("*").eq("date", d).is("shelved_at", null).order("done").order("priority"),
    sb.from("tasks").select("id,title,date,priority,duration_min").lt("date", d).eq("done", false).is("shelved_at", null).order("date"),
    sb.from("tasks").select("id,title,priority,duration_min", { count: "exact" }).is("date", null).eq("done", false).is("shelved_at", null).order("priority").limit(15),
    sb.from("tasks").select("id,title,reminder_at,reminder_kind,date").eq("done", false).gte("reminder_at", startOfLocalDayUTC(d)).lt("reminder_at", startOfLocalDayUTC(addDays(d, 8))).order("reminder_at"),
    sb.from("subscriptions").select("id,name,cycle,next_renewal").eq("active", true).lte("next_renewal", soon).order("next_renewal"),
    sb.from("home_repairs").select("id,title,room,urgency,status").neq("status", "done").order("created_at"),
    sb.from("home_maintenance").select("id,title,room,next_due").lte("next_due", soon).order("next_due"),
    sb.from("english_chunks").select("id,title,minutes,done,homework_id").eq("day", d).order("position"),
    sb.from("purchases").select("id,title,priority,price").eq("bought", false).eq("priority", "high"),
  ]);
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const dayTasks = (await enrich(sb, "tasks", must(tasksDay, "tasks") as any[]))
    .sort((a, b) => Number(a.done) - Number(b.done) || (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
  const done = dayTasks.filter((t) => t.done);
  return {
    date: d,
    today_local: todayKey(),
    tasks: dayTasks.map((t) => strip(SECTIONS.tasks, t)),
    summary: {
      planned: dayTasks.length, done: done.length,
      planned_minutes: dayTasks.reduce((a, t) => a + (t.duration_min || 0), 0),
      actual_minutes_done: done.reduce((a, t) => a + (t.actual_min || t.duration_min || 0), 0),
    },
    overdue: must(overdue, "overdue"),
    unscheduled: { count: unscheduled.count, top: must(unscheduled, "unscheduled") },
    reminders_next_7_days: must(reminders, "reminders"),
    subscriptions_renewing_14_days: must(subs, "subscriptions"),
    open_home_repairs: must(repairs, "repairs"),
    home_upkeep_due_14_days: must(upkeep, "upkeep"),
    english_today: must(chunks, "english"),
    high_priority_purchases: must(purchases, "purchases"),
  };
}

async function activity(sb: SupabaseClient, from?: string, to?: string) {
  const end = to || todayKey();
  const start = from || addDays(end, -6);
  const fromTs = startOfLocalDayUTC(start), toTs = startOfLocalDayUTC(addDays(end, 1));
  const [doneR, createdR, movesR, tagsR, goalsR, chunksR, winsR, repairsR, practiceR, openR] = await Promise.all([
    sb.from("tasks").select("id,title,completed_at,duration_min,actual_min,priority,difficulty,date").eq("done", true).gte("completed_at", fromTs).lt("completed_at", toTs),
    sb.from("tasks").select("id", { count: "exact", head: true }).gte("created_at", fromTs).lt("created_at", toTs),
    sb.from("task_date_changes").select("task_id,old_date,new_date,changed_at").gte("changed_at", fromTs).lt("changed_at", toTs),
    sb.from("tags").select("id,name"),
    sb.from("tag_goals").select("tag_id,weekly_minutes"),
    sb.from("english_chunks").select("id,minutes,actual_min,done,day").gte("day", start).lte("day", end),
    sb.from("wins").select("title,happened_on").gte("happened_on", start).lte("happened_on", end),
    sb.from("home_repairs").select("title,actual_cost,done_at").eq("status", "done").gte("done_at", fromTs).lt("done_at", toTs),
    sb.from("english_practice").select("day").gte("day", start).lte("day", end),
    sb.from("tasks").select("id,title,date,priority").eq("done", false).is("shelved_at", null).lt("date", todayKey()),
  ]);
  const done = must(doneR, "tasks") as any[];
  const byDay: Record<string, { done: number; minutes: number }> = {};
  for (let k = start; k <= end; k = addDays(k, 1)) byDay[k] = { done: 0, minutes: 0 };
  for (const t of done) {
    const k = localDayOf(t.completed_at);
    byDay[k] ??= { done: 0, minutes: 0 };
    byDay[k].done++; byDay[k].minutes += t.actual_min || t.duration_min || 0;
  }
  const tags = must(tagsR, "tags") as any[];
  const links = done.length ? must(await sb.from("task_tags").select("task_id,tag_id").in("task_id", done.map((t) => t.id)), "tags") as any[] : [];
  const goals = must(goalsR, "goals") as any[];
  const days = Object.keys(byDay).length;
  const byTag = tags.map((tag) => {
    const ts = done.filter((t) => links.some((l) => l.task_id === t.id && l.tag_id === tag.id));
    const g = goals.find((x) => x.tag_id === tag.id);
    return { tag: tag.name, tasks_done: ts.length, minutes: ts.reduce((a, t) => a + (t.actual_min || t.duration_min || 0), 0), goal_minutes_for_period: g ? Math.round(g.weekly_minutes * days / 7) : null };
  }).filter((x) => x.tasks_done || x.goal_minutes_for_period);
  const moves = must(movesR, "moves") as any[];
  const moveCount: Record<string, number> = {};
  for (const m of moves) moveCount[m.task_id] = (moveCount[m.task_id] || 0) + 1;
  const movedIds = Object.keys(moveCount);
  const movedTasks = movedIds.length ? must(await sb.from("tasks").select("id,title,date,done").in("id", movedIds), "moved") as any[] : [];
  const chunks = must(chunksR, "english") as any[];
  return {
    period: { from: start, to: end, days },
    tasks_done: done.length,
    tasks_created: createdR.count,
    per_day: byDay,
    by_tag: byTag,
    difficulty: ["easy", "medium", "hard"].map((k) => ({ difficulty: k, count: done.filter((t) => t.difficulty === k).length })),
    postponed: movedTasks.map((t) => ({ ...t, times_moved: moveCount[t.id] })).sort((a, b) => b.times_moved - a.times_moved).slice(0, 15),
    currently_overdue: must(openR, "overdue"),
    english: { chunks_planned: chunks.length, chunks_done: chunks.filter((c) => c.done).length, practice_days: (must(practiceR, "practice") as any[]).length },
    wins: must(winsR, "wins"),
    repairs_done: must(repairsR, "repairs"),
    completed_tasks: done.map(({ id, title, completed_at, actual_min, duration_min }) => ({ id, title, completed_on: localDayOf(completed_at), minutes: actual_min || duration_min || null })),
  };
}

/* ---------- MCP tools ---------- */
const sectionEnum = { type: "string", enum: SECTION_NAMES };
const TOOLS = [
  {
    name: "get_today",
    description: "Snapshot of a day in مدار (default: today in the user's timezone): that day's tasks with subtasks/tags, overdue tasks, unscheduled backlog, reminders in the next week, renewals, open home repairs, upkeep due, English homework pieces, top purchases. Start here for «what's on my plate».",
    inputSchema: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD, default today" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "activity_report",
    description: "Review what the user actually did over a period (default: last 7 days): tasks done per day and minutes, time per tag vs weekly tag goals, difficulty, most-postponed tasks, overdue tasks, English practice, wins, finished repairs. Use for «review my week/activity».",
    inputSchema: { type: "object", properties: { from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD, default today" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "describe_sections",
    description: "Lists every section (table) of مدار with what it is for and its fields/allowed values. Call this before creating or updating something you haven't touched yet.",
    inputSchema: { type: "object", properties: { section: { ...sectionEnum, description: "optional: just one section" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "query",
    description: "Read rows from any section. filters: {column: value} for equality, {column: [a,b]} for any-of, {column: null} for empty, or {column: {op, value}} with op in eq, neq, gt, gte, lt, lte, like, ilike, is, in, contains. For tasks/ideas/recurring_templates you can filter {tags: ['name']}. search does a case-insensitive text search over the main text fields.",
    inputSchema: {
      type: "object", required: ["section"],
      properties: {
        section: sectionEnum, filters: { type: "object" }, search: { type: "string" },
        order_by: { type: "string" }, ascending: { type: "boolean" },
        limit: { type: "integer", description: "default 50, max 500" }, offset: { type: "integer" },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "create",
    description: "Add rows to a section, e.g. new tasks (with tags by name and subtasks), ideas, purchases, repairs. For one-row settings sections it saves the settings. Returns the created rows with their ids.",
    inputSchema: { type: "object", required: ["section", "records"], properties: { section: sectionEnum, records: { type: "array", items: { type: "object" } } } },
  },
  {
    name: "update",
    description: "Change rows. ids: the rows' ids (for english_practice / hooshavar_morning the day, for tag_goals the tag_id; omit for one-row settings sections). changes: the fields to set. Side effects match the app: tasks done → completed_at, subtasks and linked repair/upkeep; tasks date → logged as postponement; purchases bought → bought_at; repairs status done → linked task; tags: [names] replaces tags.",
    inputSchema: {
      type: "object", required: ["section", "changes"],
      properties: { section: sectionEnum, ids: { type: "array", items: { type: "string" } }, changes: { type: "object" } },
    },
  },
  {
    name: "complete_tasks",
    description: "Tick tasks done (or un-done with done=false), optionally recording minutes actually spent and how hard it felt.",
    inputSchema: {
      type: "object", required: ["ids"],
      properties: {
        ids: { type: "array", items: { type: "string" } }, done: { type: "boolean", default: true },
        actual_min: { type: "integer" }, difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
      },
    },
  },
  {
    name: "plan_tasks",
    description: "Schedule tasks onto days (planning / rescheduling). Each item: {id, date} with date YYYY-MM-DD, or null to move back to «بعداً». Every move is logged as a postponement like in the app. Check get_today / query first so the plan respects the user's existing load.",
    inputSchema: {
      type: "object", required: ["plan"],
      properties: { plan: { type: "array", items: { type: "object", required: ["id"], properties: { id: { type: "string" }, date: { type: ["string", "null"] }, priority: { type: "string" }, duration_min: { type: "integer" } } } } },
    },
  },
  {
    name: "delete",
    description: "Delete rows (and what belongs to them, e.g. a task's subtasks). Nothing is lost for 30 days: each deletion goes to the trash and restore_deleted brings it back. Confirm with the user before deleting more than a few things.",
    inputSchema: { type: "object", required: ["section", "ids"], properties: { section: sectionEnum, ids: { type: "array", items: { type: "string" } } } },
    annotations: { destructiveHint: true },
  },
  {
    name: "list_deleted",
    description: "What was deleted through this connection in the last 30 days (the trash), newest first.",
    inputSchema: { type: "object", properties: { include_restored: { type: "boolean" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "restore_deleted",
    description: "Undo deletions: puts trashed rows (and their subtasks/tags/parts…) back.",
    inputSchema: { type: "object", required: ["trash_ids"], properties: { trash_ids: { type: "array", items: { type: "string" } } } },
  },
];

const INSTRUCTIONS = `مدار is the user's personal planner (Persian UI). The user speaks Persian — answer in Persian unless they write otherwise. Dates are Gregorian YYYY-MM-DD; the user's timezone is UTC+3, today is given by get_today. Tasks with date null are the «بعداً» backlog; shelved_at marks parked tasks. When planning, look at the day's existing load (planned minutes) before adding more. Deletions go to a 30-day trash (restore_deleted). Everything you change appears in the user's app immediately.`;

async function callTool(sb: SupabaseClient, name: string, a: any, client: string | null) {
  switch (name) {
    case "get_today": return today(sb, a.date);
    case "activity_report": return activity(sb, a.from, a.to);
    case "describe_sections": {
      const pick = a.section ? { [a.section]: sec(a.section) } : SECTIONS;
      return Object.fromEntries(Object.entries(pick).map(([k, s]) => [k, { label: s.label, about: s.about, id: s.key ?? "(one row — no id)", read_only: !!s.readOnly, fields: s.fields }]));
    }
    case "query": return queryRows(sb, a);
    case "create": return { created: await createRows(sb, a.section, a.records) };
    case "update": return { updated: await updateRows(sb, a.section, a.ids || [], a.changes || {}) };
    case "complete_tasks": {
      const changes: any = { done: a.done ?? true };
      if (a.actual_min != null) changes.actual_min = a.actual_min;
      if (a.difficulty) changes.difficulty = a.difficulty;
      return { updated: await updateRows(sb, "tasks", a.ids, changes) };
    }
    case "plan_tasks": {
      const out = [];
      for (const p of a.plan || []) {
        const ch: any = { date: p.date ?? null };
        if (p.priority) ch.priority = p.priority;
        if (p.duration_min != null) ch.duration_min = p.duration_min;
        const [row] = await updateRows(sb, "tasks", [p.id], ch);
        out.push({ id: row.id, title: row.title, date: row.date });
      }
      return { planned: out };
    }
    case "delete": return deleteRows(sb, a.section, a.ids, client);
    case "list_deleted": {
      let q = sb.from("mcp_trash").select("id,section,label,client,deleted_at,restored_at").order("deleted_at", { ascending: false }).limit(200);
      if (!a.include_restored) q = q.is("restored_at", null);
      return { trash: (must(await q, "trash") as any[]).map(({ id, ...r }) => ({ trash_id: id, ...r })) };
    }
    case "restore_deleted": return restoreRows(sb, a.trash_ids);
    default: throw new ToolError(`unknown tool ${name}`);
  }
}

/* ---------- HTTP / JSON-RPC ---------- */
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

function unauthorized(msg: string) {
  return json({ jsonrpc: "2.0", error: { code: -32001, message: msg }, id: null }, 401, {
    "WWW-Authenticate": `Bearer realm="madar", resource_metadata="${PUBLIC_URL}/.well-known/oauth-protected-resource"`,
  });
}
function claims(token: string): any {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  if (url.pathname.includes("/.well-known/oauth-protected-resource")) {
    return json({
      resource: PUBLIC_URL,
      authorization_servers: [`${SUPABASE_URL}/auth/v1`],
      bearer_methods_supported: ["header"],
      resource_name: "مدار",
    });
  }
  if (url.pathname.includes("/.well-known/oauth-authorization-server")) {
    // some clients look here first; hand them Supabase Auth's own metadata
    const r = await fetch(`${SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`);
    return json(await r.json(), r.status);
  }
  if (req.method !== "POST") return json({ error: "use POST (stateless MCP, no SSE stream)" }, 405, { Allow: "POST, OPTIONS" });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return unauthorized("sign in to مدار first");
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: uErr } = await sb.auth.getUser(token);
  if (uErr || !u?.user) return unauthorized("token invalid or expired");
  const client = claims(token).client_id || null;

  let body: any;
  try { body = await req.json(); } catch { return json({ jsonrpc: "2.0", error: { code: -32700, message: "parse error" }, id: null }, 400); }

  const handle = async (m: any) => {
    const id = m?.id;
    if (id === undefined || id === null) return null; // notification
    try {
      switch (m.method) {
        case "initialize":
          return {
            jsonrpc: "2.0", id, result: {
              protocolVersion: m.params?.protocolVersion || "2025-06-18",
              capabilities: { tools: { listChanged: false } },
              serverInfo: { name: "madar", title: "مدار", version: "1.0.0" },
              instructions: INSTRUCTIONS,
            },
          };
        case "ping": return { jsonrpc: "2.0", id, result: {} };
        case "tools/list": return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
        case "tools/call": {
          try {
            const res = await callTool(sb, m.params?.name, m.params?.arguments || {}, client);
            return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(res) }], structuredContent: res } };
          } catch (e) {
            return { jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }] } };
          }
        }
        case "resources/list": return { jsonrpc: "2.0", id, result: { resources: [] } };
        case "prompts/list": return { jsonrpc: "2.0", id, result: { prompts: [] } };
        default: return { jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${m.method}` } };
      }
    } catch (e) {
      return { jsonrpc: "2.0", id, error: { code: -32603, message: e instanceof Error ? e.message : String(e) } };
    }
  };

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers: cors });
  }
  const out = await handle(body);
  return out ? json(out) : new Response(null, { status: 202, headers: cors });
});
