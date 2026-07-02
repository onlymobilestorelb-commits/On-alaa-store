import { useState, useEffect } from "react";

const ADMIN_PASSWORD = "A123321A";
const SESSION_KEY = "admin_authenticated";

export default function AdminGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [shake, setShake] = useState(false);

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
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  if (checking) return null;

  if (!authenticated) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.glowTop} />
        <div style={styles.glowBottom} />
        <form
          onSubmit={handleSubmit}
          style={{
            ...styles.card,
            animation: shake ? "adminShake 0.4s ease-in-out" : "none",
          }}
        >
          <div style={styles.iconCircle}>🔒</div>
          <h1 style={styles.title}>Admin Secure Gateway</h1>
          <p style={styles.subtitle}>ON ALAA STORE Control Center</p>

          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            placeholder="Enter admin password"
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button}>
            Unlock Dashboard
          </button>

          <p style={styles.footer}>Session ends when this tab is closed.</p>
        </form>

        <style>{`
          @keyframes adminShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
        `}</style>
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
    position: "fixed",
    inset: 0,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0f1e",
    fontFamily: "system-ui, sans-serif",
    zIndex: 100,
    overflow: "hidden",
    padding: "1rem",
    boxSizing: "border-box",
  },
  glowTop: {
    position: "absolute",
    top: "-6rem",
    left: "-6rem",
    width: "18rem",
    height: "18rem",
    borderRadius: "50%",
    background: "rgba(250, 204, 21, 0.1)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  glowBottom: {
    position: "absolute",
    bottom: "-6rem",
    right: "-6rem",
    width: "18rem",
    height: "18rem",
    borderRadius: "50%",
    background: "rgba(250, 204, 21, 0.1)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    background: "#111827",
    padding: "2.5rem",
    borderRadius: "16px",
    border: "1px solid rgba(250, 204, 21, 0.2)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    width: "320px",
    maxWidth: "100%",
    textAlign: "center",
    boxSizing: "border-box",
  },
  iconCircle: {
    fontSize: "1.75rem",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "rgba(250, 204, 21, 0.1)",
    border: "1px solid rgba(250, 204, 21, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 800,
    margin: "0 0 0.3rem",
    color: "#ffffff",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#facc15",
    marginBottom: "1.5rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "#0a0f1e",
    color: "#ffffff",
    fontSize: "1rem",
    marginBottom: "0.75rem",
    boxSizing: "border-box",
    outline: "none",
  },
  error: { color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" },
  button: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    background: "#facc15",
    color: "#0a0f1e",
    fontWeight: 700,
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    cursor: "pointer",
  },
  footer: { marginTop: "1.5rem", fontSize: "0.7rem", color: "#6b7280" },
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 1rem",
    background: "#0a0f1e",
    color: "#fff",
    fontSize: "0.85rem",
    borderBottom: "1px solid #facc1533",
  },
  logoutBtn: {
    background: "transparent",
    color: "#facc15",
    border: "1px solid #facc1550",
    borderRadius: "6px",
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
};
