import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.brand}>BHI Career Platform</div>
          <div className={styles.status}>WhatsApp + CRM Ready</div>
        </div>

        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <span className={styles.eyebrow}>Career Acceleration</span>
            <h1 className={styles.title}>
              From student profile to <span className={styles.titleAccent}>ranked job-fit</span> in one guided flow.
            </h1>
            <p className={styles.subtitle}>
              Capture leads from WhatsApp, run structured profiling, generate grounded recommendations, and view ranked job matches in CRM.
            </p>

            <div className={styles.ctaRow}>
              <Link href="/profile" className={styles.primaryBtn}>
                Start Profiling
              </Link>
              <Link href="/crm" className={styles.secondaryBtn}>
                Open CRM Dashboard
              </Link>
            </div>
          </div>

          <aside className={styles.heroSide}>
            <h2 className={styles.sideTitle}>Guided student journey</h2>
            <ol className={styles.steps}>
              <li>Student messages on WhatsApp</li>
              <li>Step-by-step profile capture</li>
              <li>Grok-powered recommendation</li>
              <li>Lead appears in CRM with ranked jobs</li>
            </ol>
            <div className={styles.pill}>Grounded by Supabase course and job data</div>
          </aside>
        </section>

        <section className={styles.metrics}>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Primary Channel</div>
            <div className={styles.metricValue}>WhatsApp</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Profile Steps</div>
            <div className={styles.metricValue}>8</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricLabel}>Outcome</div>
            <div className={styles.metricValue}>Job Ranking</div>
          </div>
        </section>

        <section className={styles.cards}>
          <article className={styles.card}>
            <h3>Lead Capture</h3>
            <p>
              Every message is tied to a conversation and stored with metadata for complete prospect tracking.
            </p>
          </article>
          <article className={styles.card}>
            <h3>Recommendation Engine</h3>
            <p>
              Recommendations are grounded on available courses by domain and cached to minimize repeated AI cost.
            </p>
          </article>
          <article className={styles.card}>
            <h3>CRM Matching</h3>
            <p>
              Student profiles are matched against job postings with transparent scoring and ranking reasons.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
