import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

type RankedMatch = {
  job: JobPostingRow;
  score: number;
  reasons: string[];
};

type LeadView = {
  profile: ProfileRow;
  recommendationTitle: string | null;
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

const FALLBACK_JOBS: JobPostingRow[] = [
  {
    id: "mock-1",
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
    id: "mock-2",
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
    id: "mock-3",
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
  const matchedLeads = data.leads.filter((lead) => lead.matches.length > 0).length;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700 }}>Student CRM</h1>
          <p style={{ marginTop: 8, opacity: 0.82 }}>
            Leads from Supabase profiles + ranked job matches from job postings.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/profile"
            style={{
              padding: "10px 14px",
              border: "1px solid #3333",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            New Profile
          </Link>
          <Link
            href="/"
            style={{
              padding: "10px 14px",
              border: "1px solid #3333",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Home
          </Link>
        </div>
      </div>

      <section
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard label="Total Leads" value={String(totalLeads)} />
        <StatCard label="Active Jobs" value={String(totalJobs)} />
        <StatCard label="Leads With Matches" value={String(matchedLeads)} />
        <StatCard label="Job Source" value={data.jobSource} />
      </section>

      {data.warning && (
        <p style={{ marginTop: 14, color: "#d08b00" }}>{data.warning}</p>
      )}

      <section style={{ marginTop: 20, border: "1px solid #3333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 14, borderBottom: "1px solid #3333", fontWeight: 700 }}>Lead Pipeline</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#00000008" }}>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Domain</th>
                <th style={thStyle}>Goal</th>
                <th style={thStyle}>Latest Recommendation</th>
                <th style={thStyle}>Top Job Match</th>
                <th style={thStyle}>Score</th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map((lead) => {
                const top = lead.matches[0];
                return (
                  <tr key={lead.profile.id} style={{ borderTop: "1px solid #3332" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{lead.profile.name ?? "Unnamed"}</div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>{lead.profile.phone ?? "No phone"}</div>
                    </td>
                    <td style={tdStyle}>{displayDomain(lead.profile.interest_domain)}</td>
                    <td style={tdStyle}>{displayText(lead.profile.career_goal)}</td>
                    <td style={tdStyle}>{lead.recommendationTitle ?? "-"}</td>
                    <td style={tdStyle}>
                      {top ? `${top.job.title} @ ${top.job.company}` : "No match"}
                    </td>
                    <td style={tdStyle}>{top ? `${top.score}%` : "-"}</td>
                  </tr>
                );
              })}
              {data.leads.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={6}>
                    No student profiles found yet. Run profiling flow or use `sql/crm_mock_data.sql`.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Lead-to-Job Ranking</h2>
        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          {data.leads.map((lead) => (
            <div key={`${lead.profile.id}-matches`} style={{ border: "1px solid #3333", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{lead.profile.name ?? "Unnamed Student"}</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {displayDomain(lead.profile.interest_domain)} | {displayText(lead.profile.current_status)} | {displayText(lead.profile.education_level)}
                  </div>
                </div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  Recommendation: {lead.recommendationTitle ?? "Not available"}
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {lead.matches.slice(0, 3).map((match) => (
                  <div
                    key={`${lead.profile.id}-${match.job.id}`}
                    style={{
                      border: "1px solid #3332",
                      borderRadius: 10,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {match.job.title} @ {match.job.company}
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>
                        {displayDomain(match.job.domain)} | {displayText(match.job.location)} | {displayText(match.job.salary_range)}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                        Why matched: {match.reasons.join(" | ")}
                      </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{match.score}%</div>
                  </div>
                ))}
                {lead.matches.length === 0 && (
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    No ranked job matches yet. Add mock jobs with `sql/crm_mock_data.sql`.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #3333", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.72 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #3333",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  opacity: 0.8,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
};

async function loadCrmData(): Promise<{
  leads: LeadView[];
  jobs: JobPostingRow[];
  jobSource: string;
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
  let jobSource = "supabase";

  if (jobsRes.error) {
    jobSource = "fallback mock";
    warning =
      "Could not load `job_postings` from Supabase. Showing fallback mock jobs. Run `sql/crm_mock_data.sql` to enable DB-backed jobs.";
    jobs = FALLBACK_JOBS;
  } else {
    jobs = (jobsRes.data ?? []) as JobPostingRow[];
    if (jobs.length === 0) {
      jobSource = "fallback mock";
      warning =
        "No active job postings in Supabase yet. Showing fallback mock jobs. Run `sql/crm_mock_data.sql`.";
      jobs = FALLBACK_JOBS;
    }
  }

  const latestRecByProfile = new Map<string, RecommendationRow>();
  for (const rec of recs) {
    if (!rec.profile_id) continue;
    if (!latestRecByProfile.has(rec.profile_id)) {
      latestRecByProfile.set(rec.profile_id, rec);
    }
  }

  const leads: LeadView[] = profiles.map((profile) => {
    const rec = latestRecByProfile.get(profile.id);
    const matches = rankJobsForLead(profile, jobs, rec?.program_title ?? null);
    return {
      profile,
      recommendationTitle: rec?.program_title ?? null,
      matches,
    };
  });

  return { leads, jobs, jobSource, warning };
}

function rankJobsForLead(
  profile: ProfileRow,
  jobs: JobPostingRow[],
  recommendationTitle: string | null
): RankedMatch[] {
  return jobs
    .map((job) => scoreLeadForJob(profile, job, recommendationTitle))
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function scoreLeadForJob(
  profile: ProfileRow,
  job: JobPostingRow,
  recommendationTitle: string | null
): RankedMatch {
  let score = 0;
  const reasons: string[] = [];

  const leadDomain = normalizeToken(profile.interest_domain);
  const jobDomain = normalizeToken(job.domain);

  if (leadDomain && leadDomain === jobDomain) {
    score += 55;
    reasons.push("Strong domain match");
  } else if (isRelatedDomain(leadDomain, jobDomain)) {
    score += 24;
    reasons.push("Related domain");
  }

  const status = normalizeToken(profile.current_status);
  const exp = normalizeToken(job.experience_level);
  if (status === "job_seeker" && (exp === "entry" || exp === "junior")) {
    score += 16;
    reasons.push("Entry-fit for job seeker");
  } else if (status === "student" && exp === "entry") {
    score += 12;
    reasons.push("Student-friendly role level");
  } else if (status === "working" && (exp === "junior" || exp === "mid")) {
    score += 12;
    reasons.push("Good switch/upskill level");
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
  const skills = (job.required_skills ?? []).flatMap((skill) => tokenize(skill));
  const overlap = countOverlap(profileTokens, skills);
  if (overlap > 0) {
    const skillScore = Math.min(15, overlap * 5);
    score += skillScore;
    reasons.push(`Skill signal overlap (${overlap})`);
  }

  score = Math.max(0, Math.min(100, score));
  if (reasons.length === 0) reasons.push("Baseline fit");

  return { job, score, reasons };
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
