import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  recommendForProfile,
  type RecommendProfileInput,
} from "@/app/api/recommend/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EducationLevel = "high_school" | "college" | "graduate" | "other";
type CurrentStatus = "student" | "working" | "job_seeker";
type InterestDomain =
  | "web_dev"
  | "data_ai"
  | "mobile"
  | "cloud_devops"
  | "ui_ux"
  | "cybersecurity"
  | "other";
type CareerGoal = "get_job_fast" | "switch_career" | "upskill" | "freelance";
type BudgetRange = "0_100" | "100_300" | "300_800" | "800_plus";

type ProfileAnswers = {
  name?: string;
  phone?: string | null;
  educationLevel?: EducationLevel;
  currentStatus?: CurrentStatus;
  interestDomain?: InterestDomain;
  careerGoal?: CareerGoal;
  budgetRange?: BudgetRange;
  specificCourse?: string | null;
};

type RecommendationSummary = {
  id?: string;
  programId: string;
  programTitle: string;
  programDuration: string | null;
  programPriceBand: string | null;
  programWhy: string | null;
  timelineBullets: string[];
  jobPlanSummary: string;
  summaryText: string;
  grokJson: unknown;
};

type ProfilingState = {
  initialized: boolean;
  stepIndex: number;
  completed: boolean;
  answers: ProfileAnswers;
  profileId?: string;
  recommendationId?: string;
  completedAt?: string;
};

type ConversationRow = {
  id: string;
  metadata: unknown;
};

type EnumOption<T extends string> = {
  value: T;
  label: string;
  aliases: string[];
};

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const FLOW_KEY = "whatsapp_profile_flow";
const FALLBACK_MESSAGE =
  "Thank you for contacting BHI Career Advisory. We are experiencing a temporary issue. Please reply again in a few moments.";

const STEPS = [
  "name",
  "phone",
  "education",
  "status",
  "domain",
  "goal",
  "budget",
  "specificCourse",
] as const;
type StepId = (typeof STEPS)[number];

const STEP_TO_PROFILE_KEY: Record<StepId, keyof ProfileAnswers> = {
  name: "name",
  phone: "phone",
  education: "educationLevel",
  status: "currentStatus",
  domain: "interestDomain",
  goal: "careerGoal",
  budget: "budgetRange",
  specificCourse: "specificCourse",
};

const EDUCATION_OPTIONS: EnumOption<EducationLevel>[] = [
  {
    value: "high_school",
    label: "High school",
    aliases: ["high school", "school", "hs", "12th", "k12"],
  },
  {
    value: "college",
    label: "College / Undergraduate",
    aliases: ["college", "undergraduate", "ug", "bachelor", "uni"],
  },
  {
    value: "graduate",
    label: "Graduate",
    aliases: ["graduate", "masters", "ms", "mba", "phd", "postgraduate"],
  },
  { value: "other", label: "Other", aliases: ["other", "na", "n/a"] },
];

const STATUS_OPTIONS: EnumOption<CurrentStatus>[] = [
  {
    value: "student",
    label: "Student",
    aliases: ["student", "studying", "college student"],
  },
  {
    value: "working",
    label: "Working",
    aliases: ["working", "employed", "job", "professional"],
  },
  {
    value: "job_seeker",
    label: "Job seeker",
    aliases: ["job seeker", "seeking", "looking", "unemployed"],
  },
];

const DOMAIN_OPTIONS: EnumOption<InterestDomain>[] = [
  {
    value: "web_dev",
    label: "Web Development",
    aliases: ["web", "web dev", "frontend", "backend", "fullstack"],
  },
  {
    value: "data_ai",
    label: "Data / AI",
    aliases: ["data", "ai", "machine learning", "analytics", "ml"],
  },
  {
    value: "mobile",
    label: "Mobile",
    aliases: ["mobile", "android", "ios", "flutter", "react native"],
  },
  {
    value: "cloud_devops",
    label: "Cloud / DevOps",
    aliases: ["cloud", "devops", "aws", "azure", "gcp", "sre"],
  },
  {
    value: "ui_ux",
    label: "UI/UX",
    aliases: ["ui", "ux", "design", "uiux", "product design"],
  },
  {
    value: "cybersecurity",
    label: "Cybersecurity",
    aliases: ["cyber", "security", "cybersecurity", "infosec"],
  },
  { value: "other", label: "Other", aliases: ["other"] },
];

const GOAL_OPTIONS: EnumOption<CareerGoal>[] = [
  {
    value: "get_job_fast",
    label: "Get a job fast",
    aliases: ["get job fast", "job fast", "quick job", "get hired"],
  },
  {
    value: "switch_career",
    label: "Switch career",
    aliases: ["switch", "career switch", "change career", "transition"],
  },
  {
    value: "upskill",
    label: "Upskill in current role",
    aliases: ["upskill", "grow", "promotion", "improve skills"],
  },
  {
    value: "freelance",
    label: "Freelance",
    aliases: ["freelance", "freelancer", "independent"],
  },
];

const BUDGET_OPTIONS: EnumOption<BudgetRange>[] = [
  {
    value: "0_100",
    label: "$0-$100",
    aliases: ["0-100", "$0-$100", "under 100", "free", "low"],
  },
  {
    value: "100_300",
    label: "$100-$300",
    aliases: ["100-300", "$100-$300", "mid", "medium"],
  },
  {
    value: "300_800",
    label: "$300-$800",
    aliases: ["300-800", "$300-$800", "high"],
  },
  {
    value: "800_plus",
    label: "$800+",
    aliases: ["800+", "$800+", "above 800", "premium"],
  },
];

const EMPTY_STATE: ProfilingState = {
  initialized: false,
  stepIndex: 0,
  completed: false,
  answers: {},
};

// Top-level POST handler guarded with a 14-second soft timeout to keep Twilio responses fast.
export async function POST(req: Request): Promise<Response> {
  const timeoutResponse = new Promise<Response>((resolve) => {
    setTimeout(() => resolve(xmlResponse(FALLBACK_MESSAGE)), 14_000);
  });

  const handlerResponse = handleWebhook(req).catch((error: unknown) => {
    console.error("[twilio/whatsapp] unhandled error", error);
    return xmlResponse(FALLBACK_MESSAGE);
  });

  return Promise.race([handlerResponse, timeoutResponse]);
}

// Main webhook flow: parse Twilio payload, persist inbound message, manage guided profiling, and return TwiML.
async function handleWebhook(req: Request): Promise<Response> {
  const formData = await req.formData();
  const from = toText(formData.get("From"));
  const body = toText(formData.get("Body")).trim();
  const messageSid = toText(formData.get("MessageSid"));
  const rawPayload = formDataToObject(formData);

  if (!from) {
    return xmlResponse(
      "We could not read your sender number. Please try sending your message again."
    );
  }

  const supabase = getServerSupabase();
  const conversation = await getOrCreateConversation(supabase, from);

  await persistInboundMessage(supabase, {
    conversationId: conversation.id,
    from,
    body,
    messageSid,
    rawPayload,
  });

  let state = readState(conversation.metadata);

  if (isRestartCommand(body)) {
    state = { ...EMPTY_STATE, initialized: true };
    await persistState(supabase, conversation.id, conversation.metadata, state);
    return xmlResponse(
      [
        "Your profile session has been reset.",
        "Let's begin again.",
        promptForStep("name"),
      ].join("\n")
    );
  }

  if (state.completed) {
    const cached = await getCachedRecommendation(supabase, state, conversation.id);
    if (cached) {
      if (!state.recommendationId && cached.id) {
        state.recommendationId = cached.id;
        await persistState(supabase, conversation.id, conversation.metadata, state);
      }
      return xmlResponse(formatRecommendationMessage(cached, true));
    }

    // If profile is complete but cache is missing, generate once and persist immediately.
    if (isProfileComplete(state.answers)) {
      const generated = await generateRecommendation(state.answers);
      const recommendationId = await persistRecommendationRow(supabase, {
        recommendation: generated,
        conversationId: conversation.id,
        profileId: state.profileId,
        externalUserId: from,
      });
      state.recommendationId = recommendationId;
      await persistState(supabase, conversation.id, conversation.metadata, state);
      return xmlResponse(
        formatRecommendationMessage({ ...generated, id: recommendationId }, false)
      );
    }
  }

  if (!state.initialized) {
    state.initialized = true;
    // Always send a standard first response before collecting step answers.
    await persistState(supabase, conversation.id, conversation.metadata, state);
    return xmlResponse(
      [
        "Welcome to BHI Career Advisory.",
        "I will collect a few details to prepare your personalized recommendation.",
        promptForStep("name"),
      ].join("\n")
    );
  }

  const currentStep = getCurrentStep(state);
  if (!body) {
    await persistState(supabase, conversation.id, conversation.metadata, state);
    return xmlResponse(
      ["I did not receive your response.", promptForStep(currentStep)].join("\n")
    );
  }

  const parsed = parseStepAnswer(currentStep, body);
  if (!parsed.ok) {
    await persistState(supabase, conversation.id, conversation.metadata, state);
    return xmlResponse([parsed.error, promptForStep(currentStep)].join("\n"));
  }

  state = applyAnswerToState(state, currentStep, parsed.value);

  if (!isProfileComplete(state.answers)) {
    await persistState(supabase, conversation.id, conversation.metadata, state);
    const nextStep = getCurrentStep(state);
    return xmlResponse(promptForStep(nextStep));
  }

  state.completed = true;
  state.completedAt = new Date().toISOString();

  if (!state.profileId) {
    state.profileId = await persistProfileRow(supabase, state.answers);
  }

  const cached = await getCachedRecommendation(supabase, state, conversation.id);
  if (cached) {
    state.recommendationId = state.recommendationId ?? cached.id;
    await persistState(supabase, conversation.id, conversation.metadata, state);
    return xmlResponse(formatRecommendationMessage(cached, false));
  }

  const generated = await generateRecommendation(state.answers);
  const recommendationId = await persistRecommendationRow(supabase, {
    recommendation: generated,
    conversationId: conversation.id,
    profileId: state.profileId,
    externalUserId: from,
  });

  state.recommendationId = recommendationId;
  await persistState(supabase, conversation.id, conversation.metadata, state);

  return xmlResponse(formatRecommendationMessage({ ...generated, id: recommendationId }, false));
}

function getServerSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for server-side webhook access."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toText(value: FormDataEntryValue | null): string {
  if (typeof value === "string") return value;
  if (value === null) return "";
  return value.name ?? "";
}

function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    out[key] = toText(value);
  }
  return out;
}

async function getOrCreateConversation(
  supabase: SupabaseClient,
  externalUserId: string
): Promise<ConversationRow> {
  const existing = await supabase
    .from("conversations")
    .select("id, metadata")
    .eq("external_user_id", externalUserId)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Failed to fetch conversation: ${existing.error.message}`);
  }

  if (existing.data) {
    return {
      id: String((existing.data as Record<string, unknown>).id),
      metadata: (existing.data as Record<string, unknown>).metadata ?? null,
    };
  }

  const payloads: Array<Record<string, unknown>> = [
    {
      external_user_id: externalUserId,
      channel: "whatsapp",
      metadata: { [FLOW_KEY]: EMPTY_STATE },
    },
    {
      external_user_id: externalUserId,
      metadata: { [FLOW_KEY]: EMPTY_STATE },
    },
  ];

  let lastError = "Unknown insert error";
  for (const payload of payloads) {
    const inserted = await supabase
      .from("conversations")
      .insert(payload)
      .select("id, metadata")
      .single();

    if (!inserted.error && inserted.data) {
      return {
        id: String((inserted.data as Record<string, unknown>).id),
        metadata: (inserted.data as Record<string, unknown>).metadata ?? null,
      };
    }

    lastError = inserted.error?.message ?? lastError;
  }

  throw new Error(`Failed to create conversation: ${lastError}`);
}

async function persistInboundMessage(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    from: string;
    body: string;
    messageSid: string;
    rawPayload: Record<string, string>;
  }
): Promise<void> {
  const payloads: Array<Record<string, unknown>> = [
    {
      conversation_id: input.conversationId,
      external_user_id: input.from,
      direction: "inbound",
      body: input.body,
      message_sid: input.messageSid || null,
      provider_message_sid: input.messageSid || null,
      raw_payload: input.rawPayload,
    },
    {
      conversation_id: input.conversationId,
      direction: "inbound",
      body: input.body,
      message_sid: input.messageSid || null,
      raw_payload: input.rawPayload,
    },
    {
      conversation_id: input.conversationId,
      body: input.body,
    },
  ];

  for (const payload of payloads) {
    const { error } = await supabase.from("messages").insert(payload);
    if (!error) return;
  }

  console.error("[twilio/whatsapp] failed to persist inbound message", {
    conversationId: input.conversationId,
    messageSid: input.messageSid,
  });
}

function readState(metadata: unknown): ProfilingState {
  if (!isRecord(metadata)) return { ...EMPTY_STATE };
  const maybeState = metadata[FLOW_KEY];
  if (!isRecord(maybeState)) return { ...EMPTY_STATE };

  const stepIndexRaw = maybeState.stepIndex;
  const clampedStep =
    typeof stepIndexRaw === "number"
      ? Math.max(0, Math.min(STEPS.length - 1, Math.floor(stepIndexRaw)))
      : 0;

  return {
    initialized: maybeState.initialized === true,
    stepIndex: clampedStep,
    completed: maybeState.completed === true,
    answers: isRecord(maybeState.answers)
      ? (maybeState.answers as ProfileAnswers)
      : {},
    profileId: toOptionalString(maybeState.profileId),
    recommendationId: toOptionalString(maybeState.recommendationId),
    completedAt: toOptionalString(maybeState.completedAt),
  };
}

async function persistState(
  supabase: SupabaseClient,
  conversationId: string,
  existingMetadata: unknown,
  state: ProfilingState
): Promise<void> {
  const root = isRecord(existingMetadata) ? { ...existingMetadata } : {};
  root[FLOW_KEY] = state;

  const { error } = await supabase
    .from("conversations")
    .update({ metadata: root })
    .eq("id", conversationId);

  if (error) {
    throw new Error(`Failed to persist profiling state: ${error.message}`);
  }
}

function getCurrentStep(state: ProfilingState): StepId {
  return STEPS[Math.max(0, Math.min(STEPS.length - 1, state.stepIndex))];
}

function applyAnswerToState(
  state: ProfilingState,
  step: StepId,
  value: string | null
): ProfilingState {
  const key = STEP_TO_PROFILE_KEY[step];
  const nextAnswers: ProfileAnswers = { ...state.answers, [key]: value };
  const nextStep = Math.min(state.stepIndex + 1, STEPS.length - 1);

  return {
    ...state,
    answers: nextAnswers,
    stepIndex: nextStep,
  };
}

function isProfileComplete(answers: ProfileAnswers): boolean {
  return Boolean(
    answers.name &&
      answers.educationLevel &&
      answers.currentStatus &&
      answers.interestDomain &&
      answers.careerGoal &&
      answers.budgetRange
  );
}

function parseStepAnswer(
  step: StepId,
  body: string
): ParseResult<string | null> {
  const text = body.trim();

  if (step === "name") {
    const name = text.replace(/\s+/g, " ").trim();
    if (name.length < 2 || !/[a-z]/i.test(name)) {
      return {
        ok: false,
        error: "Please share your full name (minimum 2 letters).",
      };
    }
    return { ok: true, value: name.slice(0, 100) };
  }

  if (step === "phone") {
    if (isSkipText(text) || text.length === 0) return { ok: true, value: null };
    const normalized = normalizePhone(text);
    if (!normalized) {
      return {
        ok: false,
        error: "Please share a valid phone number, or reply 'Skip'.",
      };
    }
    return { ok: true, value: normalized };
  }

  if (step === "education") {
    return parseEnum(text, EDUCATION_OPTIONS, "education level");
  }
  if (step === "status") {
    return parseEnum(text, STATUS_OPTIONS, "current status");
  }
  if (step === "domain") {
    return parseEnum(text, DOMAIN_OPTIONS, "interest domain");
  }
  if (step === "goal") {
    return parseEnum(text, GOAL_OPTIONS, "career goal");
  }
  if (step === "budget") {
    return parseEnum(text, BUDGET_OPTIONS, "budget range");
  }

  // specificCourse is optional and can be skipped.
  if (isSkipText(text) || text.length === 0) {
    return { ok: true, value: null };
  }
  return { ok: true, value: text.slice(0, 180) };
}

function parseEnum<T extends string>(
  input: string,
  options: EnumOption<T>[],
  label: string
): ParseResult<T> {
  const byNumber = Number.parseInt(input, 10);
  if (!Number.isNaN(byNumber) && byNumber >= 1 && byNumber <= options.length) {
    return { ok: true, value: options[byNumber - 1].value };
  }

  const normalizedInput = normalizeToken(input);
  const matched = options.find((option) => {
    const tokens = [option.label, option.value, ...option.aliases].map(normalizeToken);
    return tokens.includes(normalizedInput);
  });

  if (!matched) {
    return {
      ok: false,
      error: `Please choose one of the listed ${label} options by number.`,
    };
  }

  return { ok: true, value: matched.value };
}

function promptForStep(step: StepId): string {
  if (step === "name") return "To begin, please share your full name.";

  if (step === "phone") {
    return "Please share your phone number. You may reply 'Skip' if you prefer not to provide it.";
  }

  if (step === "education") {
    return [
      "Please select your education level (reply with number):",
      "1) High school",
      "2) College / Undergraduate",
      "3) Graduate",
      "4) Other",
    ].join("\n");
  }

  if (step === "status") {
    return [
      "Please select your current status (reply with number):",
      "1) Student",
      "2) Working",
      "3) Job seeker",
    ].join("\n");
  }

  if (step === "domain") {
    return [
      "Please select your primary interest domain (reply with number):",
      "1) Web Development",
      "2) Data / AI",
      "3) Mobile",
      "4) Cloud / DevOps",
      "5) UI/UX",
      "6) Cybersecurity",
      "7) Other",
    ].join("\n");
  }

  if (step === "goal") {
    return [
      "Please select your career goal (reply with number):",
      "1) Get a job fast",
      "2) Switch career",
      "3) Upskill in current role",
      "4) Freelance",
    ].join("\n");
  }

  if (step === "budget") {
    return [
      "Please select your budget range (reply with number):",
      "1) $0-$100",
      "2) $100-$300",
      "3) $300-$800",
      "4) $800+",
    ].join("\n");
  }

  return "Do you have a specific course in mind? Reply with the course name, or 'Skip'.";
}

function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return null;
  if (cleaned.startsWith("+")) return `+${digitsOnly}`;
  return `+${digitsOnly}`;
}

function normalizeToken(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isSkipText(input: string): boolean {
  const token = normalizeToken(input);
  return token === "skip" || token === "na" || token === "n a" || token === "none";
}

function isRestartCommand(input: string): boolean {
  const token = normalizeToken(input);
  return token === "restart" || token === "reset" || token === "start over";
}

async function persistProfileRow(
  supabase: SupabaseClient,
  answers: ProfileAnswers
): Promise<string | undefined> {
  const payload = {
    name: answers.name ?? null,
    phone: answers.phone ?? null,
    education_level: answers.educationLevel ?? null,
    current_status: answers.currentStatus ?? null,
    interest_domain: answers.interestDomain ?? null,
    career_goal: answers.careerGoal ?? null,
    budget_range: answers.budgetRange ?? null,
    specific_course: answers.specificCourse ?? null,
  };

  const inserted = await supabase
    .from("profiles")
    .insert(payload)
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    console.error("[twilio/whatsapp] failed to persist profile", inserted.error);
    return undefined;
  }

  return String((inserted.data as Record<string, unknown>).id);
}

async function generateRecommendation(
  answers: ProfileAnswers
): Promise<RecommendationSummary> {
  const profile: RecommendProfileInput = {
    name: answers.name,
    phone: answers.phone ?? null,
    educationLevel: answers.educationLevel,
    currentStatus: answers.currentStatus,
    interestDomain: answers.interestDomain,
    careerGoal: answers.careerGoal,
    budgetRange: answers.budgetRange,
    specificCourse: answers.specificCourse ?? null,
  };
  const result = await recommendForProfile(profile);
  return normalizeRecommendation(result);
}

function normalizeRecommendation(raw: unknown): RecommendationSummary {
  const root = asRecord(raw) ?? {};
  const recommendation = asRecord(root.recommendation) ?? root;
  const program = asRecord(recommendation.program) ?? recommendation;

  const programId =
    toOptionalString(program.id) ??
    toOptionalString(recommendation.program_id) ??
    "personalized-program";
  const programTitle =
    toOptionalString(program.title) ??
    toOptionalString(recommendation.program_title) ??
    "Personalized Program";
  const programDuration =
    toOptionalString(program.duration) ??
    toOptionalString(recommendation.program_duration) ??
    null;
  const programPriceBand =
    toOptionalString(program.priceBand) ??
    toOptionalString(program.price_band) ??
    toOptionalString(recommendation.program_price_band) ??
    null;
  const programWhy =
    toOptionalString(program.why) ??
    toOptionalString(recommendation.program_why) ??
    null;

  const timelineBullets = toStringArray(
    recommendation.timeline_bullets ??
      recommendation.timelineBullets ??
      root.timeline_bullets ??
      root.timelineBullets
  );

  const normalizedTimeline = ensureTimelineBullets(
    timelineBullets,
    programDuration,
    programTitle
  );

  const jobPlanSummary =
    toOptionalString(
      recommendation.job_plan_summary ??
        recommendation.jobPlanSummary ??
        root.job_plan_summary ??
        root.jobPlanSummary
    ) ??
    "Build projects consistently, document outcomes, and apply weekly to targeted roles.";

  const summaryText =
    toOptionalString(
      recommendation.summary_text ??
        recommendation.summaryText ??
        recommendation.summary ??
        root.summary_text ??
        root.summaryText ??
        root.summary
    ) ??
    programWhy ??
    `A focused program aligned to your ${programTitle} goal.`;

  return {
    programId,
    programTitle,
    programDuration,
    programPriceBand,
    programWhy,
    timelineBullets: normalizedTimeline,
    jobPlanSummary,
    summaryText,
    grokJson: raw,
  };
}

function ensureTimelineBullets(
  bullets: string[],
  duration: string | null,
  programTitle: string
): string[] {
  const cleaned = bullets
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 4);

  if (cleaned.length >= 3) return cleaned;

  const fallback = [
    `Week 1: set a realistic schedule and baseline assessment for ${programTitle}.`,
    "Weeks 2-3: build portfolio projects that match your target roles.",
    "Weeks 4-5: sharpen resume, LinkedIn, and interview stories.",
    duration
      ? `Keep momentum through ${duration} with weekly review checkpoints.`
      : "Keep momentum with weekly review checkpoints and applications.",
  ];

  return [...cleaned, ...fallback].slice(0, 4);
}

async function persistRecommendationRow(
  supabase: SupabaseClient,
  input: {
    recommendation: RecommendationSummary;
    conversationId: string;
    profileId?: string;
    externalUserId: string;
  }
): Promise<string> {
  const rec = input.recommendation;

  const payloads: Array<Record<string, unknown>> = [
    {
      profile_id: input.profileId ?? null,
      conversation_id: input.conversationId,
      external_user_id: input.externalUserId,
      program_id: rec.programId,
      program_title: rec.programTitle,
      program_duration: rec.programDuration,
      program_price_band: rec.programPriceBand,
      program_why: rec.programWhy,
      timeline_bullets: rec.timelineBullets,
      job_plan_summary: rec.jobPlanSummary,
      summary_text: rec.summaryText,
      grok_json: rec.grokJson,
    },
    {
      profile_id: input.profileId ?? null,
      conversation_id: input.conversationId,
      program_id: rec.programId,
      program_title: rec.programTitle,
      program_duration: rec.programDuration,
      program_price_band: rec.programPriceBand,
      program_why: rec.programWhy,
      grok_json: rec.grokJson,
    },
    {
      profile_id: input.profileId ?? null,
      program_id: rec.programId,
      program_title: rec.programTitle,
      program_duration: rec.programDuration,
      program_price_band: rec.programPriceBand,
      program_why: rec.programWhy,
      grok_json: rec.grokJson,
    },
  ];

  let lastError = "Unknown insert error";
  for (const payload of payloads) {
    const inserted = await supabase
      .from("recommendations")
      .insert(payload)
      .select("id")
      .single();

    if (!inserted.error && inserted.data) {
      return String((inserted.data as Record<string, unknown>).id);
    }

    lastError = inserted.error?.message ?? lastError;
  }

  throw new Error(`Failed to save recommendation: ${lastError}`);
}

async function getCachedRecommendation(
  supabase: SupabaseClient,
  state: ProfilingState,
  conversationId: string
): Promise<(RecommendationSummary & { id?: string }) | null> {
  if (state.recommendationId) {
    const byId = await supabase
      .from("recommendations")
      .select("*")
      .eq("id", state.recommendationId)
      .maybeSingle();

    if (!byId.error && byId.data) {
      return normalizeStoredRecommendation(byId.data as Record<string, unknown>);
    }
  }

  const byConversation = await supabase
    .from("recommendations")
    .select("*")
    .eq("conversation_id", conversationId)
    .limit(1)
    .maybeSingle();

  if (!byConversation.error && byConversation.data) {
    return normalizeStoredRecommendation(
      byConversation.data as Record<string, unknown>
    );
  }

  if (state.profileId) {
    const byProfile = await supabase
      .from("recommendations")
      .select("*")
      .eq("profile_id", state.profileId)
      .limit(1)
      .maybeSingle();

    if (!byProfile.error && byProfile.data) {
      return normalizeStoredRecommendation(byProfile.data as Record<string, unknown>);
    }
  }

  return null;
}

function normalizeStoredRecommendation(
  row: Record<string, unknown>
): RecommendationSummary & { id?: string } {
  const timeline = toStringArray(row.timeline_bullets);
  const normalizedTimeline = ensureTimelineBullets(
    timeline,
    toOptionalString(row.program_duration) ?? null,
    toOptionalString(row.program_title) ?? "Personalized Program"
  );

  const summary: RecommendationSummary & { id?: string } = {
    id: toOptionalString(row.id),
    programId: toOptionalString(row.program_id) ?? "personalized-program",
    programTitle: toOptionalString(row.program_title) ?? "Personalized Program",
    programDuration: toOptionalString(row.program_duration) ?? null,
    programPriceBand: toOptionalString(row.program_price_band) ?? null,
    programWhy: toOptionalString(row.program_why) ?? null,
    timelineBullets: normalizedTimeline,
    jobPlanSummary:
      toOptionalString(row.job_plan_summary) ??
      "Build projects consistently, document outcomes, and apply weekly to targeted roles.",
    summaryText:
      toOptionalString(row.summary_text) ??
      toOptionalString(row.program_why) ??
      "Personalized recommendation prepared from your profile.",
    grokJson: row.grok_json ?? {},
  };

  return summary;
}

function formatRecommendationMessage(
  recommendation: RecommendationSummary,
  isCached: boolean
): string {
  const bullets = ensureTimelineBullets(
    recommendation.timelineBullets,
    recommendation.programDuration,
    recommendation.programTitle
  ).slice(0, 4);

  const lines = [
    isCached
      ? "Welcome back. Here is your saved recommendation:"
      : "Thank you. Your personalized recommendation is ready:",
    `Program: ${recommendation.programTitle}`,
    "Timeline highlights:",
    ...bullets.map((item) => `- ${item}`),
    `Career plan: ${recommendation.jobPlanSummary}`,
    "Reply 'Restart' anytime to create a new profile.",
  ];

  return lines.join("\n");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : ""))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|•|- /g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function xmlResponse(message: string): Response {
  return new Response(buildTwiml(message), {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function buildTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message
  )}</Message></Response>`;
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
