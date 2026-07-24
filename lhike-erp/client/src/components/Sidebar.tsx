import { NavLink } from "react-router-dom";
import { NAV } from "../nav";
import { useAuth } from "../context/AuthContext";

export function Sidebar() {
  const { can } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col overflow-y-auto bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-4">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-white">LHIKE</span> <span className="text-blue-400">ERP</span>
        </span>
      </div>
      <nav className="flex-1 px-2 py-3">
        {NAV.map((group) => {
          const visibleItems = group.items.filter((item) => can(item.permission));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
                    }`
                  }
                >
                  <span>{item.label}</span>
                  {!item.implemented && (
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">soon</span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
