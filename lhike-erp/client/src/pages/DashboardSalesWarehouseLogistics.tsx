import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PlaceholderBanner, StatCard } from "../components/StatCard";

interface SwlDashboard {
  note: string;
  todaysSales: number;
  totalSales: number;
  fulfilled: number;
  unfulfilledLastMonth: number;
  funnel: {
    shippedOut: number;
    odzIncomplete: number;
    inTransit: number;
    onDelivery: number;
    delivered: number;
    deliveredRate: number;
    forReturn: number;
    returned: number;
    totalRts: number;
    rtsRate: number;
  };
}

const peso = (n: number) => `₱${n.toLocaleString()}`;

export function DashboardSalesWarehouseLogistics() {
  const [data, setData] = useState<SwlDashboard | null>(null);

  useEffect(() => {
    api.get<SwlDashboard>("/dashboard/sales-warehouse-logistics").then(setData).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Sales Warehouse Logistics</h1>
      <PlaceholderBanner note={data.note} />

      <div className="mb-4 rounded-lg bg-slate-800 p-4 text-white">
        <div className="text-2xl font-bold">{peso(data.todaysSales)}</div>
        <div className="text-sm uppercase tracking-wide opacity-80">Today's Sales</div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Sales" value={peso(data.totalSales)} color="bg-blue-600" />
        <StatCard label="Fulfilled" value={String(data.fulfilled)} color="bg-teal-600" />
        <StatCard label="Unfulfilled / Last Month" value={String(data.unfulfilledLastMonth)} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Shipped Out" value={String(data.funnel.shippedOut)} color="bg-teal-500" />
        <StatCard label="ODZ / Incomplete" value={String(data.funnel.odzIncomplete)} color="bg-orange-500" />
        <StatCard label="In-Transit" value={String(data.funnel.inTransit)} color="bg-cyan-600" />
        <StatCard label="On-Delivery" value={String(data.funnel.onDelivery)} color="bg-orange-600" />
        <StatCard
          label="Delivered"
          value={String(data.funnel.delivered)}
          sub={`${data.funnel.deliveredRate}%`}
          color="bg-indigo-700"
        />
        <StatCard label="For Return" value={String(data.funnel.forReturn)} color="bg-rose-500" />
        <StatCard label="Returned" value={String(data.funnel.returned)} color="bg-rose-600" />
        <StatCard
          label="Total RTS"
          value={String(data.funnel.totalRts)}
          sub={`${data.funnel.rtsRate}%`}
          color="bg-red-700"
        />
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Full behavior documented in <code>docs/manual/02-dashboard.md</code>, Section 2.A.
      </p>
    </div>
  );
}
