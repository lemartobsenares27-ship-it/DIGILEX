import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface PageRecord {
  id: string;
  name: string;
  owner: string | null;
  platform: string;
  status: string;
  pancakeShopId: string | null;
  createdAt: string;
}

export function PagesStoreList() {
  const { can } = useAuth();
  const [pages, setPages] = useState<PageRecord[]>([]);

  const load = useCallback(() => {
    api.get<{ pages: PageRecord[] }>("/ecommerce/pages").then((r) => setPages(r.pages));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Pages & Store</h1>
        <Link to="/ecommerce/pages-store/new" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">
          + Add New
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Date Created</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Platform</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Pancake</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-2">{p.owner ?? "—"}</td>
                <td className="px-4 py-2">{p.platform}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2">
                  {p.pancakeShopId ? (
                    <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">Connected</span>
                  ) : (
                    <span className="text-xs text-slate-400">Not connected</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {can("ecommerce.pages.viewAll") || can("ecommerce.pages.viewOwn") ? (
                    <Link to={`/ecommerce/pages-store/${p.id}`} className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-400">
                      Edit
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No pages yet. Click "+ Add New" to register your first Page/Store.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: "bg-teal-100 text-teal-700",
    Inactive: "bg-slate-100 text-slate-600",
    "In-review": "bg-amber-100 text-amber-700",
    Restricted: "bg-orange-100 text-orange-700",
    "Permanently Disabled": "bg-red-100 text-red-700",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}
