export default function AccountInfoCard({ firstName, lastName, email, userId, profileSource = "local" }) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return (
    <div className="card">
      <h3>Account</h3>
      <p>
        <strong>Name</strong>
        <br />
        {name || "—"}
      </p>
      <p>
        <strong>Email</strong>
        <br />
        {email || "—"}
      </p>
      <p style={{ marginBottom: 0 }}>
        <strong>User ID</strong>
        <br />
        <span style={{ wordBreak: "break-all", fontSize: "0.9em" }}>{userId || "—"}</span>
      </p>
      <p style={{ marginBottom: 0 }}>
        <strong>Profile data source</strong>
        <br />
        {profileSource === "supabase" ? "Supabase" : "Local fallback"}
      </p>
    </div>
  );
}
