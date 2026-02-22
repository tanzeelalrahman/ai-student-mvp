import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        AI Student MVP
      </h1>

      <p style={{ marginTop: 12 }}>
        Start your guided profiling flow below.
      </p>

      <Link
        href="/profile"
        style={{
          display: "inline-block",
          marginTop: 20,
          padding: "10px 16px",
          border: "1px solid #3333",
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        Start Profiling →
      </Link>

      <Link
        href="/crm"
        style={{
          display: "inline-block",
          marginTop: 20,
          marginLeft: 10,
          padding: "10px 16px",
          border: "1px solid #3333",
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        Open CRM →
      </Link>
    </main>
  );
}
