import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-full bg-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end gap-4 border-b border-slate-200 bg-white px-6">
          <span className="text-sm text-slate-600">
            {user?.fullName} <span className="text-slate-400">·</span> {user?.position}
          </span>
          <button
            onClick={() => void logout()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
