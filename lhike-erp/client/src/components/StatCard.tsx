export function StatCard({
  label,
  value,
  color = "bg-blue-500",
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className={`rounded-lg p-4 text-white shadow-sm ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm uppercase tracking-wide opacity-90">{label}</div>
      {sub && <div className="mt-1 text-xs opacity-80">{sub}</div>}
    </div>
  );
}

export function PlaceholderBanner({ note }: { note: string }) {
  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      {note}
    </div>
  );
}
