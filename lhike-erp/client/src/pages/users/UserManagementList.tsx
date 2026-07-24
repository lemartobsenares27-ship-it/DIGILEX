import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

interface UserSummary {
  id: string;
  employeeNo: string;
  username: string | null;
  fullName: string;
  position: string | null;
  lastLogin: string | null;
  enabled: boolean;
  employmentStatus: string;
  isMotherAccount: boolean;
  hasRequestedAccess: boolean;
}

export function UserManagementList() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    api.get<{ users: UserSummary[] }>("/users").then((r) => setUsers(r.users));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleEnabled(u: UserSummary) {
    if (!u.hasRequestedAccess) return;
    await api.patch(`/users/${u.id}/enabled`, { enabled: !u.enabled });
    load();
  }

  const filtered = users.filter((u) =>
    `${u.fullName} ${u.username ?? ""} ${u.position ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">User Management</h1>
        <div className="flex gap-2">
          <Link to="/users/logo" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
            Add Company Logo
          </Link>
          <Link to="/users/new" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">
            + Add User
          </Link>
        </div>
      </div>

      <input
        className="mb-3 w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Full Name</th>
              <th className="px-4 py-2">Position</th>
              <th className="px-4 py-2">Last Login</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{u.employeeNo}</td>
                <td className="px-4 py-2">{u.username ?? <span className="text-slate-400">NO REQUEST ACCESS</span>}</td>
                <td className="px-4 py-2">
                  {u.fullName} {u.isMotherAccount && <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">Mother Account</span>}
                </td>
                <td className="px-4 py-2">{u.position}</td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Link
                      to={`/users/${u.id}/role`}
                      className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-400"
                    >
                      Change Role
                    </Link>
                    <button
                      onClick={() => void toggleEnabled(u)}
                      disabled={!u.hasRequestedAccess}
                      className={`rounded px-2 py-1 text-xs font-semibold text-white disabled:opacity-40 ${
                        u.enabled ? "bg-teal-600 hover:bg-teal-500" : "bg-slate-400 hover:bg-slate-500"
                      }`}
                      title={!u.hasRequestedAccess ? "Waiting for the employee to Request Access first" : undefined}
                    >
                      {u.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
