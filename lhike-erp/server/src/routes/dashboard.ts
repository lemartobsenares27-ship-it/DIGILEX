import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// Module 2, Section 2.A -- Sales Warehouse Logistics dashboard.
// Today's Sales / Total Sales are computed from the real Sales Tracker
// orders (Module 3.8, populated via Download Sales from 3P Apps -- Module
// 4, SOP 4-3). The funnel figures (Shipped Out, In-Transit, Delivered,
// etc.) genuinely require the Logistics & Inventory transactional module
// (Module 7), which hasn't been built in this app yet, so those remain
// documented-shape placeholders rather than fabricated data.
dashboardRouter.get("/sales-warehouse-logistics", requirePermission("dashboard.view"), async (_req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todaysAgg, totalAgg] = await Promise.all([
    prisma.salesOrder.aggregate({ _sum: { price: true }, where: { orderDate: { gte: startOfToday } } }),
    prisma.salesOrder.aggregate({ _sum: { price: true } }),
  ]);

  res.json({
    asOf: new Date().toISOString(),
    placeholder: true,
    note: "Today's Sales and Total Sales reflect real Sales Tracker orders. The funnel figures below (Shipped Out, In-Transit, Delivered, etc.) require the Logistics & Inventory module, not yet implemented -- those remain zeroed placeholders matching the documented dashboard shape.",
    todaysSales: todaysAgg._sum.price ?? 0,
    totalSales: totalAgg._sum.price ?? 0,
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
    note: "Finance module not yet implemented -- figures shown are zeroed placeholders matching the documented dashboard shape. This dashboard tracks bookkeeping, revolving fund, and opex, not raw sales -- it's a separate module from Sales Tracker and isn't derivable from Pancake order data.",
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
