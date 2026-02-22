"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          border: "1px solid #3333",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: "currentColor",
            opacity: 0.25,
          }}
        />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        {value}% complete
      </div>
    </div>
  );
}

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

type Profile = {
  name: string;
  phone?: string;
  educationLevel?: EducationLevel;
  currentStatus?: CurrentStatus;
  interestDomain?: InterestDomain;
  careerGoal?: CareerGoal;
  budgetRange?: BudgetRange;
  specificCourse?: string;
};

type Program = {
  id: string;
  title: string;
  why: string;
  duration: string;
  priceBand: BudgetRange | "varies";
};

const STEPS = [
  "name",
  "phone",
  "education",
  "status",
  "domain",
  "goal",
  "budget",
  "specificCourse",
  "result",
] as const;

type StepId = (typeof STEPS)[number];

function isValidPhone(input: string) {
  const cleaned = input.replace(/[^\d+]/g, "");
  return cleaned.length === 0 || cleaned.length >= 10;
}

function recommendProgram(profile: Profile): Program {
  const domain = profile.interestDomain;
  const goal = profile.careerGoal;
  const budget = profile.budgetRange;
  const status = profile.currentStatus;

  if (profile.specificCourse && profile.specificCourse.trim().length > 0) {
    return {
      id: "guided-course-plan",
      title: `Guided Plan for: ${profile.specificCourse.trim()}`,
      why: "You already have a course in mind—this plan helps you complete it faster with a weekly roadmap, projects, and interview prep aligned to your goal.",
      duration: "2–6 weeks (depends on course)",
      priceBand: "varies",
    };
  }

  if (status === "job_seeker" && goal === "get_job_fast") {
    if (domain === "web_dev") {
      return {
        id: "web-job-sprint",
        title: "Web Dev Job Sprint (Portfolio + Interview Prep)",
        why: "Fastest path to employability: build 2 portfolio projects, optimize resume/LinkedIn, and practice interviews.",
        duration: "4–6 weeks",
        priceBand: budget ?? "100_300",
      };
    }
    if (domain === "data_ai") {
      return {
        id: "data-analyst-sprint",
        title: "Data Analyst Sprint (SQL + Dashboards + Case Studies)",
        why: "High-signal hiring stack: SQL + analysis + 2 business case studies that you can present.",
        duration: "4–6 weeks",
        priceBand: budget ?? "100_300",
      };
    }
    return {
      id: "career-launchpad",
      title: "Career Launchpad (General Tech Hiring Kit)",
      why: "Covers fundamentals: resume, portfolio strategy, interview prep, and a starter project based on your domain.",
      duration: "3–5 weeks",
      priceBand: budget ?? "0_100",
    };
  }

  if (domain === "data_ai") {
    return {
      id: "data-ai-foundations",
      title: "Data + AI Foundations (SQL → Python → ML Basics)",
      why: "Strong foundation for analytics/AI roles. Practical projects to prove skills.",
      duration: "6–10 weeks",
      priceBand: budget ?? "300_800",
    };
  }

  if (domain === "cloud_devops") {
    return {
      id: "cloud-devops",
      title: "Cloud/DevOps Starter (Linux + Docker + CI/CD + Cloud)",
      why: "Build deployment skills that companies hire for—great for upskilling or switching.",
      duration: "6–10 weeks",
      priceBand: budget ?? "300_800",
    };
  }

  if (domain === "mobile") {
    return {
      id: "mobile-builder",
      title: "Mobile App Builder (React Native or Flutter) + 2 Apps",
      why: "Portfolio-driven program: ship apps and learn mobile product patterns.",
      duration: "6–10 weeks",
      priceBand: budget ?? "300_800",
    };
  }

  if (domain === "ui_ux") {
    return {
      id: "uiux-portfolio",
      title: "UI/UX Portfolio Program (Figma + Case Studies)",
      why: "You’ll produce 2 polished case studies and learn UX process end-to-end.",
      duration: "4–8 weeks",
      priceBand: budget ?? "100_300",
    };
  }

  if (domain === "cybersecurity") {
    return {
      id: "cyber-starter",
      title: "Cybersecurity Starter (Networking + Security Basics + Labs)",
      why: "Structured labs + fundamentals to enter security pathways confidently.",
      duration: "6–10 weeks",
      priceBand: budget ?? "300_800",
    };
  }

  return {
    id: "foundations",
    title: "Tech Foundations (Web + Tools + Projects)",
    why: "If you’re unsure, start here—covers core tools and lets you branch into a domain after 2 projects.",
    duration: "4–8 weeks",
    priceBand: budget ?? "0_100",
  };
}

export default function ProfilePage() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [profile, setProfile] = useState<Profile>({
    name: "",
    phone: "",
    specificCourse: "",
  });

  // Supabase save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<{
    profileId: string;
    recommendationId: string;
  } | null>(null);

  const program = useMemo(() => recommendProgram(profile), [profile]);

  const percent = Math.round((stepIndex / (STEPS.length - 1)) * 100);

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function canGoNext(): { ok: boolean; reason?: string } {
    if (step === "name") {
      if (!profile.name.trim())
        return { ok: false, reason: "Please enter your name." };
    }
    if (step === "phone") {
      if (profile.phone && !isValidPhone(profile.phone)) {
        return {
          ok: false,
          reason: "Phone looks invalid (or leave blank to skip).",
        };
      }
    }
    if (step === "education" && !profile.educationLevel)
      return { ok: false, reason: "Select an education level." };
    if (step === "status" && !profile.currentStatus)
      return { ok: false, reason: "Select your current status." };
    if (step === "domain" && !profile.interestDomain)
      return { ok: false, reason: "Select an interest domain." };
    if (step === "goal" && !profile.careerGoal)
      return { ok: false, reason: "Select a career goal." };
    if (step === "budget" && !profile.budgetRange)
      return { ok: false, reason: "Select a budget range." };
    return { ok: true };
  }

  const gate = canGoNext();

  async function saveToSupabase() {
    if (savedIds || saving) return;

    setSaving(true);
    setSaveError(null);

    // 1) Insert profile
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .insert({
        name: profile.name,
        phone: profile.phone || null,
        education_level: profile.educationLevel || null,
        current_status: profile.currentStatus || null,
        interest_domain: profile.interestDomain || null,
        career_goal: profile.careerGoal || null,
        budget_range: profile.budgetRange || null,
        specific_course: profile.specificCourse || null,
      })
      .select("id")
      .single();

    if (profileErr || !profileRow) {
      setSaving(false);
      setSaveError(profileErr?.message ?? "Failed to save profile");
      return;
    }

    // 2) Insert recommendation
    const { data: recRow, error: recErr } = await supabase
      .from("recommendations")
      .insert({
        profile_id: profileRow.id,
        program_id: program.id,
        program_title: program.title,
        program_duration: program.duration ?? null,
        program_price_band: program.priceBand ?? null,
        program_why: program.why ?? null,
      })
      .select("id")
      .single();

    if (recErr || !recRow) {
      setSaving(false);
      setSaveError(recErr?.message ?? "Failed to save recommendation");
      return;
    }

    setSavedIds({ profileId: profileRow.id, recommendationId: recRow.id });
    setSaving(false);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Student Profiling</h1>
      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Step {stepIndex + 1} of {STEPS.length}
      </p>
      <ProgressBar value={percent} />

      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid #3333",
          borderRadius: 12,
        }}
      >
        {step === "name" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>What’s your name?</h2>
            <input
              value={profile.name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g., Tanzeel"
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            />
          </>
        )}

        {step === "phone" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              Phone number (optional)
            </h2>
            <input
              value={profile.phone ?? ""}
              onChange={(e) =>
                setProfile((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="e.g., +1 555 123 4567 (or leave blank)"
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            />
          </>
        )}

        {step === "education" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Education level</h2>
            <select
              value={profile.educationLevel ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  educationLevel: e.target.value as EducationLevel,
                }))
              }
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="high_school">High school</option>
              <option value="college">College / Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="other">Other</option>
            </select>
          </>
        )}

        {step === "status" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Current status</h2>
            <select
              value={profile.currentStatus ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  currentStatus: e.target.value as CurrentStatus,
                }))
              }
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="student">Student</option>
              <option value="working">Working</option>
              <option value="job_seeker">Job seeker</option>
            </select>
          </>
        )}

        {step === "domain" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Interest domain</h2>
            <select
              value={profile.interestDomain ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  interestDomain: e.target.value as InterestDomain,
                }))
              }
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="web_dev">Web Development</option>
              <option value="data_ai">Data / AI</option>
              <option value="mobile">Mobile</option>
              <option value="cloud_devops">Cloud / DevOps</option>
              <option value="ui_ux">UI/UX</option>
              <option value="cybersecurity">Cybersecurity</option>
              <option value="other">Other</option>
            </select>
          </>
        )}

        {step === "goal" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Career goal</h2>
            <select
              value={profile.careerGoal ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  careerGoal: e.target.value as CareerGoal,
                }))
              }
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="get_job_fast">Get a job fast</option>
              <option value="switch_career">Switch career</option>
              <option value="upskill">Upskill in current role</option>
              <option value="freelance">Freelance</option>
            </select>
          </>
        )}

        {step === "budget" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Budget range</h2>
            <select
              value={profile.budgetRange ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  budgetRange: e.target.value as BudgetRange,
                }))
              }
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            >
              <option value="" disabled>
                Select one
              </option>
              <option value="0_100">$0–$100</option>
              <option value="100_300">$100–$300</option>
              <option value="300_800">$300–$800</option>
              <option value="800_plus">$800+</option>
            </select>
          </>
        )}

        {step === "specificCourse" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              Any specific course you’re considering?
            </h2>
            <input
              value={profile.specificCourse ?? ""}
              onChange={(e) =>
                setProfile((p) => ({ ...p, specificCourse: e.target.value }))
              }
              placeholder="e.g., 'Google Data Analytics' (optional)"
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #3333",
              }}
            />
            <p style={{ marginTop: 10, opacity: 0.8 }}>
              Optional — if you leave this blank we’ll recommend based on your
              answers.
            </p>
          </>
        )}

        {step === "result" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>
              Your Recommendation
            </h2>

            <div
              style={{
                marginTop: 12,
                padding: 14,
                border: "1px solid #3333",
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{program.title}</div>
              <div style={{ marginTop: 8, opacity: 0.9 }}>{program.why}</div>
              <div style={{ marginTop: 10, opacity: 0.8 }}>
                <div>Duration: {program.duration}</div>
                <div>Budget fit: {program.priceBand}</div>
              </div>
            </div>

            {/* Save to Supabase */}
            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={saveToSupabase}
                disabled={saving || !!savedIds}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #3333",
                  opacity: saving || !!savedIds ? 0.6 : 1,
                }}
              >
                {savedIds ? "Saved ✓" : saving ? "Saving..." : "Save to Supabase"}
              </button>

              {savedIds && (
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  profileId: {savedIds.profileId.slice(0, 8)}… | recId:{" "}
                  {savedIds.recommendationId.slice(0, 8)}…
                </span>
              )}
            </div>

            {saveError && (
              <p style={{ marginTop: 10, color: "#ff6b6b" }}>{saveError}</p>
            )}

            <h3 style={{ marginTop: 16, fontSize: 16, fontWeight: 700 }}>
              Your answers
            </h3>
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                background: "#111",
                overflow: "auto",
              }}
            >
              {JSON.stringify(profile, null, 2)}
            </pre>
          </>
        )}
      </div>

      {gate.reason && step !== "result" && (
        <p style={{ marginTop: 10, color: "#ff6b6b" }}>{gate.reason}</p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={back}
          disabled={stepIndex === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #3333",
            opacity: stepIndex === 0 ? 0.5 : 1,
          }}
        >
          Back
        </button>

        {step !== "result" ? (
          <button
            onClick={() => {
              const g = canGoNext();
              if (g.ok) next();
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #3333",
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => {
              setSavedIds(null);
              setSaveError(null);
              setSaving(false);
              setStepIndex(0);
              setProfile({ name: "", phone: "", specificCourse: "" });
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #3333",
            }}
          >
            Start over
          </button>
        )}
      </div>
    </main>
  );
}