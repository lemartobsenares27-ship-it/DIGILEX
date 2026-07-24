import { useLocation } from "react-router-dom";
import { NAV } from "../nav";

export function ComingSoon() {
  const { pathname } = useLocation();
  const item = NAV.flatMap((g) => g.items).find((i) => i.path === pathname);

  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
      <p className="mb-2 text-lg font-semibold text-slate-700">{item?.label ?? "This module"} — coming soon</p>
      <p className="max-w-md text-sm">
        This screen is fully specified in the LHIKE ERP documentation set (docs/manual/) but has not been built in
        this application yet. Foundation modules (User Management, Dashboard) shipped first by design.
      </p>
    </div>
  );
}
