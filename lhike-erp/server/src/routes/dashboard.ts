import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// Module 2, Section 2.A -- Sales Warehouse Logistics dashboard. The
// underlying Logistics & Inventory transactional module (Module 7 in the
// docs) hasn't been built in this app yet, so every figure here is a
// documented-shape placeholder (zeroed, matching the "as of" empty-state
// screenshots in the source manual) rather than fabricated data.
dashboardRouter.get("/sales-warehouse-logistics", requirePermission("dashboard.view"), (_req, res) => {
  res.json({
    asOf: new Date().toISOString(),
    placeholder: true,
    note: "Logistics & Inventory module not yet implemented -- figures shown are zeroed placeholders matching the documented dashboard shape.",
    todaysSales: 0,
    totalSales: 0,
    fulfilled: 0,
    unfulfilledLastMonth: 0,
    funnel: {
      shippedOut: 0,
      odzIncomplete: 0,
      inTransit: 0,
      onDelivery: 0,
      delivered: 0,
      deliveredRate: 0,
      forReturn: 0,
      returned: 0,
      totalRts: 0,
      rtsRate: 0,
    },
  });
});

// Module 2, Section 2.B -- Finance dashboard overview.
dashboardRouter.get("/finance", requirePermission("finance.dashboard.view"), (_req, res) => {
  res.json({
    asOf: new Date().toISOString(),
    placeholder: true,
    note: "Finance module not yet implemented -- figures shown are zeroed placeholders matching the documented dashboard shape.",
    grossRevenue: 0,
    totalOpexPlusRevolvingFund: 0,
    operatingRevenue: 0,
    cogPurchase: 0,
    adspent: 0,
    revolvingFund: 0,
    shippingFee: 0,
    bookkeepingSummary: [] as { bank: string; runningBalance: number }[],
    actualCompanyFund: 0,
  });
});
