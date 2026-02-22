import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InterestDomain =
  | "web_dev"
  | "data_ai"
  | "mobile"
  | "cloud_devops"
  | "ui_ux"
  | "cybersecurity"
  | "other";

type CurrentStatus = "student" | "working" | "job_seeker";
type CareerGoal = "get_job_fast" | "switch_career" | "upskill" | "freelance";

type ProfileInput = {
  name?: string;
  phone?: string | null;
  educationLevel?: string;
  currentStatus?: CurrentStatus;
  interestDomain?: InterestDomain;
  careerGoal?: CareerGoal;
  budgetRange?: string;
  specificCourse?: string | null;
};

type CourseRow = {
  id: string;
  domain: string;
  title: string;
  level: string;
  weeks: number;
  outline: string;
  job_roles: string[] | null;
};

type RecommendationPayload = {
  program: {
    id: string;
    title: string;
    duration: string;
    priceBand: string | null;
    why: string;
  };
  durationWeeks: number;
  timeline_bullets: string[];
  timelineWeeks: Array<{ week: number; focus: string }>;
  jobRoles: string[];
  job_plan_summary: string;
  nextSteps: string[];
  summary_text: string;
  selectedCourses: Array<{
    id: string;
    title: string;
    level: string;
    weeks: number;
  }>;
};

export type RecommendationResult = {
  recommendation: RecommendationPayload;
  source: "grok" | "fallback" | "fallback_no_courses";
  courses: CourseRow[];
};

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as unknown;
    const profile = normalizeProfileInput(body);
    const result = await recommendForProfile(profile);
    return Response.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("interestDomain is required") ||
      message.includes("supported profiling domains")
    ) {
      return Response.json({ error: message }, { status: 400 });
    }
    console.error("[api/recommend] unhandled error", error);
    return Response.json(
      {
        error: "Failed to generate recommendation.",
      },
      { status: 500 }
    );
  }
}

export async function recommendForProfile(
  profile: ProfileInput
): Promise<RecommendationResult> {
  if (!profile.interestDomain || profile.interestDomain === "other") {
    throw new Error(
      "interestDomain is required and must be one of the supported profiling domains."
    );
  }

  const supabase = getServerSupabase();
  const courses = await fetchCoursesByDomain(supabase, profile.interestDomain);

  if (courses.length === 0) {
    const fallback = fallbackRecommendation(profile, []);
    return {
      recommendation: fallback,
      source: "fallback_no_courses",
      courses: [],
    };
  }

  const aiRecommendation = await generateWithGrok(profile, courses);
  if (aiRecommendation) {
    return {
      recommendation: aiRecommendation,
      source: "grok",
      courses,
    };
  }

  const fallback = fallbackRecommendation(profile, courses);
  return {
    recommendation: fallback,
    source: "fallback",
    courses,
  };
}

export function normalizeRecommendProfileInput(raw: unknown): ProfileInput {
  return normalizeProfileInput(raw);
}

export type RecommendProfileInput = ProfileInput;

function normalizeProfileInput(raw: unknown): ProfileInput {
  const obj = asRecord(raw) ?? {};

  return {
    name: toOptionalString(obj.name),
    phone: toOptionalString(obj.phone) ?? null,
    educationLevel:
      toOptionalString(obj.educationLevel) ??
      toOptionalString(obj.education_level),
    currentStatus: normalizeCurrentStatus(
      toOptionalString(obj.currentStatus) ?? toOptionalString(obj.current_status)
    ),
    interestDomain: normalizeDomain(
      toOptionalString(obj.interestDomain) ?? toOptionalString(obj.interest_domain)
    ),
    careerGoal: normalizeCareerGoal(
      toOptionalString(obj.careerGoal) ?? toOptionalString(obj.career_goal)
    ),
    budgetRange:
      toOptionalString(obj.budgetRange) ?? toOptionalString(obj.budget_range),
    specificCourse:
      toOptionalString(obj.specificCourse) ??
      toOptionalString(obj.specific_course) ??
      null,
  };
}

function getServerSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchCoursesByDomain(
  supabase: SupabaseClient,
  domain: Exclude<InterestDomain, "other">
): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, domain, title, level, weeks, outline, job_roles")
    .eq("domain", domain)
    .limit(5);

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => ({
      id: String((row as Record<string, unknown>).id ?? ""),
      domain: String((row as Record<string, unknown>).domain ?? ""),
      title: String((row as Record<string, unknown>).title ?? ""),
      level: String((row as Record<string, unknown>).level ?? ""),
      weeks: Number((row as Record<string, unknown>).weeks ?? 0),
      outline: String((row as Record<string, unknown>).outline ?? ""),
      job_roles: Array.isArray((row as Record<string, unknown>).job_roles)
        ? ((row as Record<string, unknown>).job_roles as string[])
        : null,
    }))
    .filter((row) => row.id && row.title && row.weeks > 0);
}

async function generateWithGrok(
  profile: ProfileInput,
  courses: CourseRow[]
): Promise<RecommendationPayload | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const selected = pickCoursesForProfile(profile, courses);
  const defaultProgram = buildProgramTitle(profile, selected);
  const defaultWeeks = selected.reduce((sum, c) => sum + c.weeks, 0) || 6;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-2-latest",
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content:
              "You are a career pathway planner. Return STRICT JSON only with no markdown and no extra keys.",
          },
          {
            role: "user",
            content: [
              "Use ONLY these available courses to build the timeline.",
              JSON.stringify(selected),
              "",
              "Student profile:",
              JSON.stringify(profile),
              "",
              "Return STRICT JSON with this shape:",
              JSON.stringify({
                programTitle: defaultProgram,
                durationWeeks: defaultWeeks,
                timelineWeeks: [{ week: 1, focus: "Focus area" }],
                jobRoles: ["Role A", "Role B"],
                nextSteps: ["Action 1", "Action 2"],
              }),
            ].join("\n"),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[api/recommend] grok non-200", response.status);
      return null;
    }

    const raw = (await response.json()) as unknown;
    const jsonText = extractAssistantText(raw);
    if (!jsonText) return null;

    const parsed = safeParseJson(jsonText);
    if (!parsed) return null;

    return normalizeAiRecommendation(parsed, profile, selected);
  } catch (error: unknown) {
    console.error("[api/recommend] grok call failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackRecommendation(
  profile: ProfileInput,
  courses: CourseRow[]
): RecommendationPayload {
  const selected = pickCoursesForProfile(profile, courses);
  const title = buildProgramTitle(profile, selected);
  const totalWeeks = selected.reduce((sum, c) => sum + c.weeks, 0) || 6;
  const timelineWeeks = buildTimelineWeeks(selected, totalWeeks);
  const timelineBullets = timelineWeeks.slice(0, 4).map((item) => {
    const endWeek = Math.min(totalWeeks, item.week + 1);
    return `Weeks ${item.week}-${endWeek}: ${item.focus}`;
  });
  const jobRoles = uniqueStrings(
    selected.flatMap((course) => course.job_roles ?? [])
  ).slice(0, 4);
  const nextSteps = [
    "Complete weekly assignments and publish your progress.",
    "Build one portfolio project from the selected track.",
    "Apply to 5 relevant roles each week and iterate on feedback.",
  ];

  return {
    program: {
      id: slugify(title),
      title,
      duration: `${totalWeeks} weeks`,
      priceBand: profile.budgetRange ?? null,
      why:
        "This plan is grounded in available courses from your selected domain and structured for practical job outcomes.",
    },
    durationWeeks: totalWeeks,
    timeline_bullets: timelineBullets,
    timelineWeeks,
    jobRoles,
    job_plan_summary:
      "Build projects weekly, showcase outcomes publicly, and run consistent targeted applications.",
    nextSteps,
    summary_text: `Focused ${totalWeeks}-week path using available ${
      profile.interestDomain
    } courses.`,
    selectedCourses: selected.map((course) => ({
      id: course.id,
      title: course.title,
      level: course.level,
      weeks: course.weeks,
    })),
  };
}

function normalizeAiRecommendation(
  raw: unknown,
  profile: ProfileInput,
  selected: CourseRow[]
): RecommendationPayload {
  const obj = asRecord(raw) ?? {};

  const title =
    toOptionalString(obj.programTitle) ??
    buildProgramTitle(profile, selected);
  const durationWeeks = clampWeeks(Number(obj.durationWeeks), selected);

  const timelineWeeksRaw = Array.isArray(obj.timelineWeeks)
    ? (obj.timelineWeeks as unknown[])
    : [];
  const timelineWeeks = timelineWeeksRaw
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;
      const week = Number(record.week);
      const focus = toOptionalString(record.focus);
      if (!Number.isFinite(week) || !focus) return null;
      return { week: Math.max(1, Math.floor(week)), focus };
    })
    .filter((entry): entry is { week: number; focus: string } => Boolean(entry))
    .slice(0, 6);

  const normalizedTimelineWeeks =
    timelineWeeks.length > 0
      ? timelineWeeks
      : buildTimelineWeeks(selected, durationWeeks);

  const timelineBullets = normalizedTimelineWeeks.slice(0, 4).map((item) => {
    const endWeek = Math.min(durationWeeks, item.week + 1);
    return `Weeks ${item.week}-${endWeek}: ${item.focus}`;
  });

  const jobRoles = uniqueStrings(
    [
      ...toStringArray(obj.jobRoles),
      ...selected.flatMap((course) => course.job_roles ?? []),
    ].filter(Boolean)
  ).slice(0, 5);

  const nextSteps = uniqueStrings(toStringArray(obj.nextSteps)).slice(0, 4);
  const summaryText =
    toOptionalString(obj.summary) ??
    toOptionalString(obj.summaryText) ??
    `Focused ${durationWeeks}-week path using available ${profile.interestDomain} courses.`;

  return {
    program: {
      id: slugify(title),
      title,
      duration: `${durationWeeks} weeks`,
      priceBand: profile.budgetRange ?? null,
      why:
        "Generated from your profile and constrained to currently available courses in your selected domain.",
    },
    durationWeeks,
    timeline_bullets: timelineBullets,
    timelineWeeks: normalizedTimelineWeeks,
    jobRoles,
    job_plan_summary:
      "Follow the weekly timeline, build project artifacts, and run a focused application pipeline each week.",
    nextSteps:
      nextSteps.length > 0
        ? nextSteps
        : [
            "Complete each weekly milestone on schedule.",
            "Create one portfolio artifact per module.",
            "Apply and network weekly for target roles.",
          ],
    summary_text: summaryText,
    selectedCourses: selected.map((course) => ({
      id: course.id,
      title: course.title,
      level: course.level,
      weeks: course.weeks,
    })),
  };
}

function pickCoursesForProfile(profile: ProfileInput, courses: CourseRow[]): CourseRow[] {
  if (courses.length === 0) return [];

  const specific = normalizeToken(profile.specificCourse ?? "");
  if (specific) {
    const match = courses.find((course) =>
      normalizeToken(course.title).includes(specific)
    );
    if (match) return [match];
  }

  const sorted = [...courses].sort((a, b) => {
    const scoreA = courseScore(a, profile);
    const scoreB = courseScore(b, profile);
    return scoreB - scoreA;
  });

  const top = sorted.slice(0, 2);
  return top.length > 0 ? top : [courses[0]];
}

function courseScore(course: CourseRow, profile: ProfileInput): number {
  let score = 0;
  const level = normalizeToken(course.level);

  if (profile.careerGoal === "get_job_fast" && level === "career") score += 6;
  if (profile.careerGoal === "switch_career" && level === "intermediate") score += 4;
  if (profile.currentStatus === "student" && level === "beginner") score += 3;
  if (profile.currentStatus === "job_seeker" && level === "career") score += 4;
  if (profile.specificCourse) {
    if (normalizeToken(course.title).includes(normalizeToken(profile.specificCourse))) {
      score += 10;
    }
  }

  score += Math.max(0, 10 - course.weeks);
  return score;
}

function buildProgramTitle(profile: ProfileInput, selected: CourseRow[]): string {
  if (profile.specificCourse) {
    return `Guided Plan: ${profile.specificCourse}`;
  }
  if (selected.length === 1) return selected[0].title;
  if (selected.length >= 2) return `${selected[0].title} + ${selected[1].title}`;
  return "Personalized Learning Program";
}

function buildTimelineWeeks(
  selected: CourseRow[],
  durationWeeks: number
): Array<{ week: number; focus: string }> {
  if (selected.length === 0) {
    return [
      { week: 1, focus: "Set baseline skills and define learning goals." },
      { week: 3, focus: "Build core technical skills with guided practice." },
      { week: 5, focus: "Ship project artifacts and prepare for interviews." },
    ];
  }

  const timeline: Array<{ week: number; focus: string }> = [];
  let cursor = 1;
  for (const course of selected) {
    timeline.push({
      week: cursor,
      focus: `${course.title}: ${course.outline}`,
    });
    cursor += Math.max(2, Math.floor(course.weeks / 2));
    if (cursor > durationWeeks) break;
  }

  if (timeline.length === 1) {
    timeline.push({
      week: Math.min(durationWeeks, timeline[0].week + 2),
      focus: "Create portfolio-ready project deliverables and document outcomes.",
    });
  }

  return timeline.slice(0, 6);
}

function clampWeeks(value: number, courses: CourseRow[]): number {
  if (Number.isFinite(value) && value > 0) {
    return Math.max(4, Math.min(24, Math.floor(value)));
  }
  const sum = courses.reduce((acc, c) => acc + c.weeks, 0);
  return Math.max(4, Math.min(24, sum || 6));
}

function extractAssistantText(raw: unknown): string | null {
  const root = asRecord(raw);
  if (!root) return null;

  const choices = Array.isArray(root.choices) ? root.choices : [];
  const first = choices[0];
  const choiceRecord = asRecord(first);
  if (!choiceRecord) return null;

  const message = asRecord(choiceRecord.message);
  if (message) {
    const direct = toOptionalString(message.content);
    if (direct) return direct;

    const content = message.content;
    if (Array.isArray(content)) {
      const textParts = content
        .map((part) => {
          const partRecord = asRecord(part);
          if (!partRecord) return "";
          return toOptionalString(partRecord.text) ?? "";
        })
        .filter(Boolean);
      if (textParts.length) return textParts.join("\n");
    }
  }

  return null;
}

function safeParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeDomain(value?: string): InterestDomain | undefined {
  if (!value) return undefined;
  const token = normalizeToken(value);
  const map: Record<string, InterestDomain> = {
    web_dev: "web_dev",
    webdev: "web_dev",
    web: "web_dev",
    data_ai: "data_ai",
    dataai: "data_ai",
    data: "data_ai",
    ai: "data_ai",
    mobile: "mobile",
    cloud_devops: "cloud_devops",
    clouddevops: "cloud_devops",
    cloud: "cloud_devops",
    devops: "cloud_devops",
    ui_ux: "ui_ux",
    uiux: "ui_ux",
    ui: "ui_ux",
    ux: "ui_ux",
    cybersecurity: "cybersecurity",
    cyber: "cybersecurity",
    other: "other",
  };
  return map[token];
}

function normalizeCurrentStatus(value?: string): CurrentStatus | undefined {
  if (!value) return undefined;
  const token = normalizeToken(value);
  if (token === "student") return "student";
  if (token === "working" || token === "employed") return "working";
  if (token === "jobseeker" || token === "job seeker") return "job_seeker";
  return undefined;
}

function normalizeCareerGoal(value?: string): CareerGoal | undefined {
  if (!value) return undefined;
  const token = normalizeToken(value);
  if (token === "getjobfast" || token === "get job fast") return "get_job_fast";
  if (token === "switchcareer" || token === "switch career") return "switch_career";
  if (token === "upskill") return "upskill";
  if (token === "freelance") return "freelance";
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "");
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
