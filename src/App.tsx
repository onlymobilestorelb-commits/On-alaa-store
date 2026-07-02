import { useState, useEffect } from "react";

// ⚠️ Client-side gate only — password is visible in the built JS bundle.
// Fine for keeping casual visitors out of the admin UI, not a real
// security boundary. Upgrade to server-side auth before storing anything sensitive.

const ADMIN_PASSWORD = "A123321A";
const SESSION_KEY = "admin_authenticated";

export default function AdminGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const flag = sessionStorage.getItem(SESSION_KEY);
    if (flag === "true") setAuthenticated(true);
    setChecking(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password. Access denied.");
      setPassword("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  if (checking) return null; // avoid flash of login form

  if (!authenticated) {
    return (
      <div style={styles.wrapper}>
        <form onSubmit={handleSubmit} style={styles.card}>
          <div style={styles.iconCircle}>🔒</div>
          <h1 style={styles.title}>Admin Secure Gateway</h1>
          <p style={styles.subtitle}>Restricted area — authorized personnel only</p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            style={styles.input}
            autoFocus
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button}>
            Unlock Dashboard
          </button>

          <p style={styles.footer}>ON ALAA STORE · Protected Session</p>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.bar}>
        <span>🔓 Admin session active</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Log out
        </button>
      </div>
      {children}
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    padding: "2.5rem",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
    width: "320px",
    textAlign: "center",
  },
  iconCircle: {
    fontSize: "2rem",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
  },
  title: { fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.3rem", color: "#0f172a" },
  subtitle: { fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "1rem",
    marginBottom: "0.75rem",
    boxSizing: "border-box",
  },
  error: { color: "#dc2626", fontSize: "0.8rem", marginBottom: "0.75rem" },
  button: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  footer: { marginTop: "1.5rem", fontSize: "0.7rem", color: "#94a3b8" },
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 1rem",
    background: "#0f172a",
    color: "#fff",
    fontSize: "0.85rem",
  },
  logoutBtn: {
    background: "transparent",
    color: "#fff",
    border: "1px solid #475569",
    borderRadius: "6px",
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
};
