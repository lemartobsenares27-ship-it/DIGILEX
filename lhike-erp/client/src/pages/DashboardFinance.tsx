import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PlaceholderBanner, StatCard } from "../components/StatCard";

interface FinanceDashboard {
  note: string;
  grossRevenue: number;
  totalOpexPlusRevolvingFund: number;
  operatingRevenue: number;
  cogPurchase: number;
  adspent: number;
  revolvingFund: number;
  shippingFee: number;
  bookkeepingSummary: { bank: string; runningBalance: number }[];
  actualCompanyFund: number;
}

const peso = (n: number) => `₱${n.toLocaleString()}`;

export function DashboardFinance() {
  const [data, setData] = useState<FinanceDashboard | null>(null);

  useEffect(() => {
    api.get<FinanceDashboard>("/dashboard/finance").then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Finance</h1>
      <PlaceholderBanner note={data.note} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Gross Revenue" value={peso(data.grossRevenue)} color="bg-teal-600" />
        <StatCard label="Total Opex + Revolving Fund" value={peso(data.totalOpexPlusRevolvingFund)} color="bg-purple-600" />
        <StatCard label="Operating Revenue" value={peso(data.operatingRevenue)} color="bg-blue-600" />
        <StatCard label="COG Purchase" value={peso(data.cogPurchase)} color="bg-amber-500" />
        <StatCard label="Adspent" value={peso(data.adspent)} color="bg-rose-500" />
        <StatCard label="Revolving Fund" value={peso(data.revolvingFund)} color="bg-orange-500" />
        <StatCard label="Shipping Fee" value={peso(data.shippingFee)} color="bg-orange-600" />
      </div>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Book Keeping Summary (Banks)</h2>
        {data.bookkeepingSummary.length === 0 ? (
          <p className="text-sm text-slate-400">No banks configured yet.</p>
        ) : (
          <ul className="text-sm text-slate-600">
            {data.bookkeepingSummary.map((b) => (
              <li key={b.bank}>
                {b.bank} — Running Balance: {peso(b.runningBalance)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg bg-slate-800 p-4 text-white">
        <div className="text-2xl font-bold">{peso(data.actualCompanyFund)}</div>
        <div className="text-sm uppercase tracking-wide opacity-80">🔒 Actual Company Fund</div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Full behavior documented in <code>docs/manual/02-dashboard.md</code>, Section 2.B.
      </p>
    </div>
  );
}
