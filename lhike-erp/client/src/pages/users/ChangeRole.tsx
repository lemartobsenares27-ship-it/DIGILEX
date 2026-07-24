import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";

interface PermissionNode {
  key: string;
  label: string;
}
interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionNode[];
}
interface PermissionModule {
  key: string;
  label: string;
  groups: PermissionGroup[];
}

interface UserDetail {
  id: string;
  fullName: string;
  employeeNo: string;
  position: string | null;
  employmentStatus: string;
  permissions: string[];
  isMotherAccount: boolean;
}

export function ChangeRole() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState<PermissionModule[]>([]);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isMotherAccount, setIsMotherAccount] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ tree: PermissionModule[] }>("/users/permission-tree").then((r) => setTree(r.tree));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get<UserDetail>(`/users/${id}`).then((u) => {
      setUser(u);
      setSelected(new Set(u.permissions));
      setIsMotherAccount(u.isMotherAccount);
    });
  }, [id]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: PermissionGroup, checkAll: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of group.permissions) {
        if (checkAll) next.add(p.key);
        else next.delete(p.key);
      }
      return next;
    });
  }

  async function onSave() {
    if (!id) return;
    setSaving(true);
    try {
      await api.patch(`/users/${id}/role`, {
        permissions: Array.from(selected),
        isMotherAccount,
      });
      navigate("/users");
    } finally {
      setSaving(false);
    }
  }

  if (!user || tree.length === 0) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">User Role</h1>
      <p className="mb-4 text-sm text-slate-500">
        Name: <strong>{user.fullName}</strong> · Employee No: {user.employeeNo} · Position: {user.position} · Status:{" "}
        {user.employmentStatus}
      </p>

      <div className="space-y-4">
        {tree.map((mod) => (
          <div key={mod.key} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">{mod.label}</h2>
            {mod.groups.map((group) => {
              const allChecked = group.permissions.every((p) => selected.has(p.key));
              return (
                <div key={group.key} className="mb-3 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                  <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={allChecked} onChange={(e) => toggleGroup(group, e.target.checked)} />
                    {group.label}
                  </label>
                  <div className="ml-6 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                    {group.permissions.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={selected.has(p.key)} onChange={() => toggle(p.key)} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <label className="flex items-center gap-2 text-sm font-bold text-red-700">
            <input type="checkbox" checked={isMotherAccount} onChange={(e) => setIsMotherAccount(e.target.checked)} />
            Access for Mother Account — grants all-account access. Restrict to a very small number of accounts.
          </label>
        </div>
      </div>

      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 bg-slate-100 py-3">
        <button onClick={() => navigate("/users")} className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm">
          Cancel
        </button>
        <button
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
