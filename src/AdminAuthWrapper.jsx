import { useState, useEffect } from "react";

/**
 * AdminAuthWrapper
 * ------------------
 * Gatekeeper for the /admin dashboard.
 * - Shows a branded "ON ALAA STORE" login screen until the correct
 *   password is entered.
 * - Persists the session in sessionStorage (onalaa_admin_session),
 *   so the admin stays logged in while navigating, but is forced to
 *   re-authenticate whenever the browser/tab is closed (sessionStorage
 *   is cleared automatically by the browser in that case).
 * - Renders nothing from the dashboard (children) until authenticated.
 *
 * NOTE ON SECURITY: This hardcodes the password in the client bundle,
 * which means it's technically visible to anyone who inspects the
 * JS. This matches the spec you gave me, but it is NOT true access
 * control — it just keeps casual visitors out. For real protection
 * (hiding orders/product data from anyone but you), the password
 * check needs to happen server-side, e.g. via a Vercel serverless
 * function + signed httpOnly cookie. Happy to build that version
 * too if you want it later.
 */

const ADMIN_PASSWORD = "A123321A";
const SESSION_KEY = "onalaa_admin_session";

function AdminLoginScreen({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ON ALAA STORE
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Admin Dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl"
        >
          <label
            htmlFor="admin-password"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Enter admin password
          </label>
          <input
            id="admin-password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder="••••••••"
            className={`w-full rounded-xl px-4 py-3 bg-neutral-950 text-white border outline-none transition-colors
              ${error ? "border-red-500 focus:border-red-500" : "border-neutral-700 focus:border-white"}`}
          />

          {error && (
            <p className="mt-2 text-sm text-red-500 font-medium">
              Access Denied — incorrect password.
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-white text-neutral-950 font-semibold py-3 active:scale-[0.98] transition-transform"
          >
            Unlock Dashboard
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Authorized personnel only.
        </p>
      </div>
    </div>
  );
}

export default function AdminAuthWrapper({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem(SESSION_KEY);
    setAuthenticated(session === "true");
    setChecked(true);
  }, []);

  // Avoid flashing the dashboard before we've checked sessionStorage
  if (!checked) return null;

  if (!authenticated) {
    return <AdminLoginScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return children;
}
