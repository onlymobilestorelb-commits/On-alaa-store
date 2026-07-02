import { useState, useEffect } from 'react';

const SESSION_KEY = 'onalaa_admin_session';
const ADMIN_PASSWORD = 'A123321A';

export default function AdminAuthGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session === 'true') setIsAuthenticated(true);
    setChecked(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  // Avoid a flash of the login screen while sessionStorage is read
  if (!checked) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1e] px-4">
        {/* subtle background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-yellow-400/10 rounded-full blur-3xl" />
        </div>

        <form
          onSubmit={handleSubmit}
          className={`relative w-full max-w-sm bg-[#111827] border border-yellow-400/20 rounded-2xl shadow-2xl shadow-black/50 p-8 ${
            shake ? 'animate-shake' : ''
          }`}
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Admin Secure Gateway
            </h1>
            <p className="text-sm text-gray-400 mt-1 text-center">
              ON ALAA STORE — restricted access
            </p>
          </div>

          <label className="block text-xs font-medium text-gray-400 mb-2">
            Access Password
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter admin password"
            className="w-full bg-[#0a0f1e] border border-gray-700 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}

          <button
            type="submit"
            className="w-full mt-6 bg-yellow-400 hover:bg-yellow-300 text-[#0a0f1e] font-semibold py-3 rounded-lg transition-colors"
          >
            Unlock Dashboard
          </button>

          <p className="text-xs text-gray-500 text-center mt-5">
            Session ends when this tab is closed.
          </p>
        </form>
      </div>
    );
  }

  // Authenticated: render the protected dashboard, pass logout down if needed
  return typeof children === 'function' ? children({ onLogout: handleLogout }) : children;
}
