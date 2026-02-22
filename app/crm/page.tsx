import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  created_at: string | null;
  name: string | null;
  phone: string | null;
  education_level: string | null;
  current_status: string | null;
  interest_domain: string | null;
  career_goal: string | null;
  budget_range: string | null;
  specific_course: string | null;
};

type RecommendationRow = {
  id: string;
  profile_id: string | null;
  program_title: string | null;
  created_at: string | null;
};

type JobPostingRow = {
  id: string;
  title: string;
  company: string;
  domain: string;
  location: string | null;
  job_type: string | null;
  experience_level: string | null;
  min_education: string | null;
  salary_range: string | null;
  required_skills: string[] | null;
  is_active: boolean | null;
  created_at: string | null;
};

type ScoredJob = JobPostingRow & {
  jobScore: number;
};

type RankedMatch = {
  job: ScoredJob;
  score: number;
  reasons: string[];
};

type LeadView = {
  profile: ProfileRow;
  recommendationTitle: string | null;
  leadScore: number;
  matches: RankedMatch[];
};

const DOMAIN_LABELS: Record<string, string> = {
  web_dev: "Web Development",
  data_ai: "Data / AI",
  mobile: "Mobile",
  cloud_devops: "Cloud / DevOps",
  ui_ux: "UI/UX",
  cybersecurity: "Cybersecurity",
  other: "Other",
};

const BASELINE_JOBS: JobPostingRow[] = [
  {
    id: "baseline-1",
    title: "Junior Frontend Developer",
    company: "Northstar Labs",
    domain: "web_dev",
    location: "Remote",
    job_type: "full_time",
    experience_level: "entry",
    min_education: "high_school",
    salary_range: "$55k-$70k",
    required_skills: ["javascript", "react", "css", "git"],
    is_active: true,
    created_at: null,
  },
  {
    id: "baseline-2",
    title: "Data Analyst (SQL)",
    company: "Insight Orbit",
    domain: "data_ai",
    location: "New York, NY",
    job_type: "full_time",
    experience_level: "entry",
    min_education: "college",
    salary_range: "$65k-$82k",
    required_skills: ["sql", "dashboarding", "excel", "python"],
    is_active: true,
    created_at: null,
  },
  {
    id: "baseline-3",
    title: "SOC Analyst I",
    company: "Sentinel Ridge",
    domain: "cybersecurity",
    location: "Austin, TX",
    job_type: "full_time",
    experience_level: "entry",
    min_education: "college",
    salary_range: "$70k-$88k",
    required_skills: ["networking", "siem", "incident response", "linux"],
    is_active: true,
    created_at: null,
  },
];

export default async function CrmPage() {
  const data = await loadCrmData();
  const totalLeads = data.leads.length;
  const totalJobs = data.jobs.length;
  const matchedLeads = data.leads.filter((lead) => (lead.matches[0]?.score ?? 0) >= 40).length;
  const avgLeadScore =
    totalLeads > 0
      ? Math.round(
          data.leads.reduce((sum, lead) => sum + lead.leadScore, 0) / totalLeads
        )
      : 0;
  const avgTopMatchScore =
    totalLeads > 0
      ? Math.round(
          data.leads.reduce((sum, lead) => sum + (lead.matches[0]?.score ?? 0), 0) /
            totalLeads
        )
      : 0;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>Admissions CRM</h1>
            <p className={styles.subtitle}>
              Unified lead pipeline with profile quality scoring and role-fit ranking.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/profile" className={styles.linkBtn}>
              New Profile
            </Link>
            <Link href="/" className={styles.linkBtn}>
              Home
            </Link>
          </div>
        </div>

        <section className={styles.stats}>
          <StatCard label="Total Leads" value={String(totalLeads)} />
          <StatCard label="Open Roles" value={String(totalJobs)} />
          <StatCard label="Leads With Strong Match" value={String(matchedLeads)} />
          <StatCard label="Average Lead Score" value={`${avgLeadScore}%`} />
          <StatCard label="Average Top Match" value={`${avgTopMatchScore}%`} />
        </section>

        {data.warning && <p className={styles.warning}>{data.warning}</p>}

        <section className={styles.section}>
          <div className={styles.sectionHead}>Lead Pipeline</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Student</th>
                  <th className={styles.th}>Domain</th>
                  <th className={styles.th}>Goal</th>
                  <th className={styles.th}>Recommendation</th>
                  <th className={styles.th}>Lead Score</th>
                  <th className={styles.th}>Top Role Match</th>
                  <th className={styles.th}>Match Score</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((lead) => {
                  const top = lead.matches[0];
                  return (
                    <tr key={lead.profile.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.strong}>{lead.profile.name ?? "Unnamed"}</div>
                        <div className={styles.small}>{lead.profile.phone ?? "No phone"}</div>
                      </td>
                      <td className={styles.td}>{displayDomain(lead.profile.interest_domain)}</td>
                      <td className={styles.td}>{displayText(lead.profile.career_goal)}</td>
                      <td className={styles.td}>{lead.recommendationTitle ?? "-"}</td>
                      <td className={styles.td}>{lead.leadScore}%</td>
                      <td className={styles.td}>
                        {top ? `${top.job.title} @ ${top.job.company}` : "No role fit yet"}
                      </td>
                      <td className={styles.td}>{top ? `${top.score}%` : "-"}</td>
                    </tr>
                  );
                })}
                {data.leads.length === 0 && (
                  <tr>
                    <td className={styles.td} colSpan={7}>
                      No student profiles available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className={styles.rankingTitle}>Lead-to-Role Ranking</h2>
          <div className={styles.rankingGrid}>
            {data.leads.map((lead) => (
              <div key={`${lead.profile.id}-matches`} className={styles.leadCard}>
                <div className={styles.leadHead}>
                  <div>
                    <div className={styles.leadName}>
                      {lead.profile.name ?? "Unnamed Student"}
                    </div>
                    <div className={styles.leadMeta}>
                      {displayDomain(lead.profile.interest_domain)} |{" "}
                      {displayText(lead.profile.current_status)} |{" "}
                      {displayText(lead.profile.education_level)}
                    </div>
                  </div>
                  <div className={styles.leadMeta}>
                    Profile Score: <strong>{lead.leadScore}%</strong>
                  </div>
                </div>

                <div className={styles.matchList}>
                  {lead.matches.slice(0, 5).map((match) => (
                    <div
                      key={`${lead.profile.id}-${match.job.id}`}
                      className={styles.matchCard}
                    >
                      <div>
                        <div className={styles.matchTitle}>
                          {match.job.title} @ {match.job.company}
                        </div>
                        <div className={styles.matchMeta}>
                          {displayDomain(match.job.domain)} |{" "}
                          {displayText(match.job.location)} |{" "}
                          {displayText(match.job.salary_range)}
                        </div>
                        <div className={styles.matchReason}>
                          Why matched: {match.reasons.join(" | ")}
                        </div>
                      </div>
                      <div className={styles.score}>{match.score}%</div>
                    </div>
                  ))}
                  {lead.matches.length === 0 && (
                    <div className={styles.empty}>No ranked role matches available yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>Open Role Quality Scores</div>
          <div className={styles.jobsGrid}>
            {data.jobs.slice(0, 18).map((job) => (
              <div key={job.id} className={styles.jobCard}>
                <div className={styles.jobTitle}>{job.title}</div>
                <div className={styles.jobMeta}>
                  {job.company} | {displayDomain(job.domain)}
                </div>
                <div className={styles.jobMeta}>
                  {displayText(job.location)} | {displayText(job.salary_range)}
                </div>
                <div className={styles.jobScore}>Role Score: {job.jobScore}%</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

async function loadCrmData(): Promise<{
  leads: LeadView[];
  jobs: ScoredJob[];
  warning: string | null;
}> {
  const supabase = getServerSupabase();

  const [profilesRes, recsRes, jobsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, created_at, name, phone, education_level, current_status, interest_domain, career_goal, budget_range, specific_course"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("recommendations")
      .select("id, profile_id, program_title, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("job_postings")
      .select(
        "id, title, company, domain, location, job_type, experience_level, min_education, salary_range, required_skills, is_active, created_at"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (profilesRes.error) {
    throw new Error(`Failed to load profiles: ${profilesRes.error.message}`);
  }
  if (recsRes.error) {
    throw new Error(`Failed to load recommendations: ${recsRes.error.message}`);
  }

  const profiles = ((profilesRes.data ?? []) as ProfileRow[]).map((row) => ({
    ...row,
    name: row.name?.trim() || null,
  }));
  const recs = (recsRes.data ?? []) as RecommendationRow[];

  let warning: string | null = null;
  let jobs: JobPostingRow[] = [];

  if (jobsRes.error) {
    warning =
      "Role feed is initializing. Baseline role set is currently displayed.";
    jobs = BASELINE_JOBS;
  } else {
    jobs = (jobsRes.data ?? []) as JobPostingRow[];
    if (jobs.length === 0) {
      warning =
        "No active roles found yet. Baseline role set is currently displayed.";
      jobs = BASELINE_JOBS;
    }
  }

  const scoredJobs = jobs
    .map((job) => ({ ...job, jobScore: scoreJobPosting(job) }))
    .sort((a, b) => b.jobScore - a.jobScore);

  const latestRecByProfile = new Map<string, RecommendationRow>();
  for (const rec of recs) {
    if (!rec.profile_id) continue;
    if (!latestRecByProfile.has(rec.profile_id)) {
      latestRecByProfile.set(rec.profile_id, rec);
    }
  }

  const leads: LeadView[] = profiles.map((profile) => {
    const rec = latestRecByProfile.get(profile.id);
    const recommendationTitle = rec?.program_title ?? null;
    const matches = rankJobsForLead(profile, scoredJobs, recommendationTitle);
    const leadScore = computeLeadScore(
      profile,
      recommendationTitle,
      matches[0]?.score ?? 0
    );
    return {
      profile,
      recommendationTitle,
      leadScore,
      matches,
    };
  });

  return { leads, jobs: scoredJobs, warning };
}

function rankJobsForLead(
  profile: ProfileRow,
  jobs: ScoredJob[],
  recommendationTitle: string | null
): RankedMatch[] {
  return jobs
    .map((job) => scoreLeadForJob(profile, job, recommendationTitle))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function scoreLeadForJob(
  profile: ProfileRow,
  job: ScoredJob,
  recommendationTitle: string | null
): RankedMatch {
  let score = Math.round(job.jobScore * 0.16);
  const reasons: string[] = [];

  const leadDomain = normalizeToken(profile.interest_domain);
  const jobDomain = normalizeToken(job.domain);

  if (leadDomain && leadDomain === jobDomain) {
    score += 44;
    reasons.push("Strong domain match");
  } else if (isRelatedDomain(leadDomain, jobDomain)) {
    score += 20;
    reasons.push("Related domain alignment");
  }

  const status = normalizeToken(profile.current_status);
  const exp = normalizeToken(job.experience_level);
  if (status === "job seeker" && (exp === "entry" || exp === "junior")) {
    score += 16;
    reasons.push("Entry-fit for active job search");
  } else if (status === "student" && exp === "entry") {
    score += 12;
    reasons.push("Student-friendly level");
  } else if (status === "working" && (exp === "junior" || exp === "mid")) {
    score += 10;
    reasons.push("Strong upskill/switch fit");
  }

  const educationFitScore = computeEducationFit(
    normalizeToken(profile.education_level),
    normalizeToken(job.min_education)
  );
  if (educationFitScore > 0) {
    score += educationFitScore;
    reasons.push("Education alignment");
  }

  const searchableProfileText = [
    profile.specific_course ?? "",
    recommendationTitle ?? "",
    profile.career_goal ?? "",
  ].join(" ");
  const profileTokens = tokenize(searchableProfileText);
  const jobTokens = tokenize(`${job.title} ${(job.required_skills ?? []).join(" ")}`);
  const overlap = countOverlap(profileTokens, jobTokens);
  if (overlap > 0) {
    const skillScore = Math.min(14, overlap * 4);
    score += skillScore;
    reasons.push(`Skill/intent overlap (${overlap})`);
  }

  if (normalizeToken(job.location).includes("remote")) {
    score += 4;
    reasons.push("Remote flexibility");
  }

  score = Math.max(0, Math.min(100, score));
  if (reasons.length === 0) reasons.push("General baseline fit");

  return { job, score, reasons };
}

function scoreJobPosting(job: JobPostingRow): number {
  let score = 42;

  const exp = normalizeToken(job.experience_level);
  if (exp === "entry") score += 14;
  if (exp === "junior") score += 10;
  if (exp === "mid") score += 6;

  const salaryTop = parseSalaryUpper(job.salary_range ?? "");
  if (salaryTop >= 100000) score += 14;
  else if (salaryTop >= 85000) score += 11;
  else if (salaryTop >= 70000) score += 8;
  else if (salaryTop > 0) score += 5;

  const skillsCount = (job.required_skills ?? []).length;
  if (skillsCount >= 4) score += 11;
  else if (skillsCount >= 2) score += 7;
  else if (skillsCount === 1) score += 4;

  if (normalizeToken(job.location).includes("remote")) score += 8;
  if (normalizeToken(job.job_type) === "full_time") score += 6;

  if (DOMAIN_LABELS[job.domain]) score += 7;
  if (job.is_active) score += 6;

  return Math.max(0, Math.min(100, score));
}

function computeLeadScore(
  profile: ProfileRow,
  recommendationTitle: string | null,
  topMatchScore: number
): number {
  const profileFields = [
    profile.name,
    profile.phone,
    profile.education_level,
    profile.current_status,
    profile.interest_domain,
    profile.career_goal,
    profile.budget_range,
  ];

  const completion = profileFields.filter((value) => Boolean(value)).length;
  let score = Math.round((completion / profileFields.length) * 55);

  if (profile.specific_course) score += 8;
  if (recommendationTitle) score += 20;
  if (normalizeToken(profile.current_status) === "job seeker") score += 5;
  score += Math.round(topMatchScore * 0.17);

  return Math.max(0, Math.min(100, score));
}

function parseSalaryUpper(value: string): number {
  const normalized = value.toLowerCase();
  const matches = normalized.match(/\d+(?:\.\d+)?\s*k?/g) ?? [];
  if (matches.length === 0) return 0;

  const nums = matches.map((entry) => {
    const trimmed = entry.trim();
    const isK = trimmed.endsWith("k");
    const n = Number.parseFloat(trimmed.replace("k", ""));
    if (!Number.isFinite(n)) return 0;
    return isK ? n * 1000 : n;
  });

  return Math.max(...nums, 0);
}

function computeEducationFit(lead: string, required: string): number {
  if (!lead || !required) return 0;

  const rank = (value: string): number => {
    if (value.includes("high_school")) return 1;
    if (value.includes("college")) return 2;
    if (value.includes("graduate")) return 3;
    return 1;
  };

  const leadRank = rank(lead);
  const reqRank = rank(required);

  if (leadRank >= reqRank) return 8;
  if (reqRank - leadRank === 1) return 3;
  return 0;
}

function isRelatedDomain(leadDomain: string, jobDomain: string): boolean {
  if (!leadDomain || !jobDomain) return false;
  const relatedPairs = new Set([
    "web_dev::mobile",
    "mobile::web_dev",
    "data_ai::cloud_devops",
    "cloud_devops::data_ai",
    "ui_ux::web_dev",
    "web_dev::ui_ux",
    "cybersecurity::cloud_devops",
    "cloud_devops::cybersecurity",
  ]);
  return relatedPairs.has(`${leadDomain}::${jobDomain}`);
}

function tokenize(value: string): string[] {
  return normalizeToken(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function countOverlap(source: string[], target: string[]): number {
  const sourceSet = new Set(source);
  const targetSet = new Set(target);
  let overlap = 0;
  for (const token of sourceSet) {
    if (targetSet.has(token)) overlap += 1;
  }
  return overlap;
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9_]+/g, " ").trim();
}

function displayDomain(domain: string | null): string {
  if (!domain) return "-";
  const key = domain.trim();
  return DOMAIN_LABELS[key] ?? key.replaceAll("_", " ");
}

function displayText(value: string | null): string {
  if (!value) return "-";
  return value.replaceAll("_", " ");
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
