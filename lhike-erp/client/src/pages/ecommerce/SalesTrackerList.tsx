import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface SalesOrderRow {
  id: string;
  displayId: string | null;
  orderDate: string;
  customerName: string | null;
  address: string | null;
  contactNumber: string | null;
  totalQty: number;
  price: number;
  shippingFee: number;
  trackingNumber: string | null;
  courier: string | null;
  orderStatus: string;
  page: { id: string; name: string };
}

interface PageOption {
  id: string;
  name: string;
  pancakeShopId: string | null;
}

const STATUS_OPTIONS = ["Canceled", "Confirmed", "Delivered", "Partial Return", "Printed"] as const;

export function SalesTrackerList() {
  const { can } = useAuth();
  const [orders, setOrders] = useState<SalesOrderRow[]>([]);
  const [totals, setTotals] = useState({ totalPrice: 0, totalShippingFee: 0 });
  const [showDownload, setShowDownload] = useState(false);

  const load = useCallback(() => {
    api.get<{ orders: SalesOrderRow[]; totals: typeof totals }>("/ecommerce/sales-tracker").then((r) => {
      setOrders(r.orders);
      setTotals(r.totals);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Sales Tracker</h1>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
            Refresh
          </button>
          {can("ecommerce.salesOrder.createNew") && (
            <button
              onClick={() => setShowDownload(true)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Download Sales from 3P Apps
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">Order Date</th>
              <th className="px-4 py-2">Customer Name</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Page</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Tracking No.</th>
              <th className="px-4 py-2">Courier</th>
              <th className="px-4 py-2">Order Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-xs text-slate-500">{new Date(o.orderDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{o.customerName ?? "—"}</td>
                <td className="max-w-[200px] truncate px-4 py-2" title={o.address ?? undefined}>
                  {o.address ?? "—"}
                </td>
                <td className="px-4 py-2">{o.contactNumber ?? "—"}</td>
                <td className="px-4 py-2">{o.page.name}</td>
                <td className="px-4 py-2">{o.totalQty}</td>
                <td className="px-4 py-2">₱{o.price.toLocaleString()}</td>
                <td className="px-4 py-2 font-mono text-xs">{o.trackingNumber ?? "—"}</td>
                <td className="px-4 py-2">{o.courier ?? "—"}</td>
                <td className="px-4 py-2">
                  <OrderStatusBadge status={o.orderStatus} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                  No orders yet. Use "Download Sales from 3P Apps" to pull confirmed orders from Pancake POS.
                </td>
              </tr>
            )}
          </tbody>
          {orders.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <tr>
                <td colSpan={6} className="px-4 py-2 text-right">
                  Total:
                </td>
                <td className="px-4 py-2">₱{totals.totalPrice.toLocaleString()}</td>
                <td colSpan={3} className="px-4 py-2 text-xs font-normal text-slate-500">
                  Shipping Fee: ₱{totals.totalShippingFee.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showDownload && (
        <DownloadFromPancakeModal
          onClose={() => setShowDownload(false)}
          onDone={() => {
            setShowDownload(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Confirmed: "bg-blue-100 text-blue-700",
    Delivered: "bg-teal-100 text-teal-700",
    Canceled: "bg-red-100 text-red-700",
    "Partial Return": "bg-amber-100 text-amber-700",
    Printed: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function DownloadFromPancakeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["Confirmed"]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orderDateSet, setOrderDateSet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number; unconfirmedPages: string[]; errors: { pageName: string; message: string }[] } | null>(null);

  useEffect(() => {
    api.get<{ pages: PageOption[] }>("/ecommerce/pages").then((r) => setPages(r.pages.filter((p) => p.pancakeShopId)));
  }, []);

  function toggleStatus(s: string) {
    setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function togglePage(id: string) {
    setSelectedPageIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (selectedPageIds.length === 0) {
      setError("Select at least one page. Pancake credentials are stored per page, so a page must be picked to know which Pancake shop to query.");
      return;
    }
    if (!dateFrom || !dateTo) {
      setError("Set both the Pancake Order Date From and To.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post<{ added: number; skipped: number; unconfirmedPages: string[]; errors: { pageName: string; message: string }[] }>(
        "/ecommerce/sales-tracker/download-from-pancake",
        {
          pageIds: selectedPageIds,
          pancakeOrderDateFrom: dateFrom,
          pancakeOrderDateTo: dateTo,
          orderDateSet: orderDateSet || undefined,
          status: statuses,
        },
      );
      setResult(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Download Sales from 3P Apps</h2>
        <p className="mb-4 text-xs text-slate-500">Pulls confirmed orders directly from Pancake POS for the pages and date range you choose.</p>

        {result ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-800">
              <p>
                <strong>{result.added}</strong> new order(s) added, <strong>{result.skipped}</strong> already existed and were skipped.
              </p>
            </div>
            {result.unconfirmedPages.length > 0 && (
              <p className="text-xs text-amber-700">{result.unconfirmedPages.length} selected page(s) had no Pancake connection configured and were skipped.</p>
            )}
            {result.errors.length > 0 && (
              <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                {result.errors.map((e, i) => (
                  <p key={i}>
                    {e.pageName}: {e.message}
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs font-semibold text-slate-500">
              ALWAYS REMEMBER to check the total entries and the total amount of your data both ERP &amp; POS.
            </p>
            <div className="flex justify-end">
              <button onClick={onDone} className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Pancake Order Date From
                <input type="date" className="rounded-md border border-slate-300 px-2 py-1.5" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Pancake Order Date To
                <input type="date" className="rounded-md border border-slate-300 px-2 py-1.5" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Order Date Set (optional — dates orders in LHIKE ERP as this date instead of their Pancake order date)
              <input type="date" className="rounded-md border border-slate-300 px-2 py-1.5" value={orderDateSet} onChange={(e) => setOrderDateSet(e.target.value)} />
            </label>

            <div>
              <p className="mb-1 text-sm text-slate-600">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs">
                    <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggleStatus(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm text-slate-600">Pages (only pages connected to Pancake are listed)</p>
              {pages.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No pages have a Pancake Shop ID/API Key configured yet. Add one via Pages &amp; Store first.
                </p>
              ) : (
                <div className="flex flex-col gap-1 rounded-md border border-slate-300 p-2">
                  {pages.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedPageIds.includes(p.id)} onChange={() => togglePage(p.id)} />
                      {p.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? "Downloading…" : "Update"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
