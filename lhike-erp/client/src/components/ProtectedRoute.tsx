import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, permission }: { children: ReactNode; permission?: string }) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (permission && !can(permission)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
        <p className="text-lg font-semibold text-slate-700">Access restricted</p>
        <p>Your role does not include the permission required to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
