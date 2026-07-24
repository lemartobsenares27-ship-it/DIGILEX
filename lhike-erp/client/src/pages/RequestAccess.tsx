import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export function RequestAccess() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    employeeNo: "",
    username: "",
    password: "",
    confirmPassword: "",
    securityQuestion: "",
    securityAnswer: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/request-access", {
        employeeNo: form.employeeNo,
        username: form.username,
        password: form.password,
        securityQuestion: form.securityQuestion,
        securityAnswer: form.securityAnswer,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-800">
      <div className="w-full max-w-sm rounded-lg bg-slate-700 p-8 shadow-xl">
        <h1 className="mb-1 text-lg font-semibold text-white">Request Access</h1>
        <p className="mb-4 text-xs text-slate-300">
          Kindly fill up the form and inform your Admin for your access.
        </p>
        {success ? (
          <div className="rounded-md bg-teal-800/60 p-3 text-sm text-teal-100">
            Account created, contact your Administrator for verification. Redirecting to Sign In…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3 text-left">
            <input
              className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Employee ID"
              value={form.employeeNo}
              onChange={(e) => set("employeeNo", e.target.value)}
            />
            <input
              className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Username"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
            />
            <input
              type="password"
              className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <input
              type="password"
              className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Re-type password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
            />
            <input
              className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Security Question (e.g. What is your pet's name?)"
              value={form.securityQuestion}
              onChange={(e) => set("securityQuestion", e.target.value)}
            />
            <input
              className="rounded-md border-0 bg-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              placeholder="Security Answer"
              value={form.securityAnswer}
              onChange={(e) => set("securityAnswer", e.target.value)}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="mt-1 flex gap-2">
              <Link
                to="/login"
                className="flex-1 rounded-md bg-slate-600 py-2 text-center text-sm text-slate-200 hover:bg-slate-500"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
