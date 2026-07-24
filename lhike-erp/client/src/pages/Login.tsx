import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { api } from "../lib/api";

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/dashboard/sales-warehouse-logistics", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    api.get<{ logoUrl: string | null }>("/settings/logo").then((r) => setLogoUrl(r.logoUrl)).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/dashboard/sales-warehouse-logistics");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-800">
      <div className="w-full max-w-sm rounded-lg bg-slate-700 p-8 text-center shadow-xl">
        {logoUrl ? (
          <img src={logoUrl} alt="Company logo" className="mx-auto mb-6 h-14 object-contain" />
        ) : (
          <div className="mx-auto mb-6 text-xl font-bold text-white">
            <span>LHIKE</span> <span className="text-blue-400">ERP</span>
          </div>
        )}
        <h1 className="mb-4 text-lg font-semibold text-white">Sign In</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 text-left">
          <input
            className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "LOGIN"}
          </button>
        </form>
        <Link
          to="/request-access"
          className="mt-4 block rounded-md bg-slate-600 py-2 text-sm text-slate-200 hover:bg-slate-500"
        >
          REQUEST ACCESS
        </Link>
        <p className="mt-3 text-xs text-slate-400">For your login credential, contact Administrator for access.</p>
      </div>
    </div>
  );
}
