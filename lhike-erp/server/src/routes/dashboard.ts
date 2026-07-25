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
//
// HISTORICAL_SNAPSHOT is a one-time import of the verified Apr 1 - Jun 30,
// 2026 Monthly P&L from the pre-existing "Digilex Financial Control
// Center" workbook (src/data/monthlyPL.json, src/data/cashFlow.json) --
// every batch in it was independently reconciled to the peso against
// NPMCM's own SOAs and the real bank/credit-card statements, per that
// workbook's own notes. It is NOT live and will not update itself.
//
// Gross Revenue for July onward is added on top of that snapshot from
// real Sales Tracker orders (Module 3.8) with orderStatus "Delivered",
// synced via the actual Pancake POS connection (Module 4, SOP 4-3) --
// this is the one figure with a genuine live data source. The cost-side
// figures (COG Purchase, Adspent, Shipping Fee, Opex, Actual Company
// Fund) have no live source yet (no Bookkeeping/Expense module built),
// so they remain frozen at the snapshot's Apr-Jun values -- shown as-is
// rather than silently extrapolated.
const HISTORICAL_SNAPSHOT = {
  periodEnd: new Date("2026-07-01T00:00:00.000Z"),
  grossRevenue: 1_583_562,
  operatingRevenue: 631_649.09, // Gross Profit: Revenue - COGS - Adspent - Courier - Fulfillment
  cogPurchase: 258_988.05,
  adspent: 436_835.21,
  shippingFee: 256_089.65, // Courier Fees + Fulfillment Cost combined
  opex: 69_077.98,
  revolvingFund: 0, // not tracked as a distinct account in the source data
  actualCompanyFund: 71_869.09, // cash flow ending balance, Jun 30 2026
  bookkeepingSummary: [{ bank: "MariBank", runningBalance: 71_869.09 }],
};

dashboardRouter.get("/finance", requirePermission("finance.dashboard.view"), async (_req, res) => {
  const liveAgg = await prisma.salesOrder.aggregate({
    _sum: { price: true },
    where: { orderDate: { gte: HISTORICAL_SNAPSHOT.periodEnd }, orderStatus: "Delivered" },
  });
  const liveRevenue = liveAgg._sum.price ?? 0;
  const grossRevenue = HISTORICAL_SNAPSHOT.grossRevenue + liveRevenue;

  res.json({
    asOf: new Date().toISOString(),
    placeholder: true,
    note:
      "Gross Revenue = a verified historical snapshot (Apr 1 - Jun 30, 2026, imported from your prior financial workbook) plus real Delivered orders synced from Pancake POS from Jul 1 onward. Everything else below (COG Purchase, Adspent, Shipping Fee, Opex, Actual Company Fund) is still frozen at the Apr-Jun snapshot -- there's no live source for those yet (Bookkeeping/Expense tracking hasn't been built).",
    grossRevenue,
    totalOpexPlusRevolvingFund: HISTORICAL_SNAPSHOT.opex + HISTORICAL_SNAPSHOT.revolvingFund,
    operatingRevenue: HISTORICAL_SNAPSHOT.operatingRevenue,
    cogPurchase: HISTORICAL_SNAPSHOT.cogPurchase,
    adspent: HISTORICAL_SNAPSHOT.adspent,
    revolvingFund: HISTORICAL_SNAPSHOT.revolvingFund,
    shippingFee: HISTORICAL_SNAPSHOT.shippingFee,
    bookkeepingSummary: HISTORICAL_SNAPSHOT.bookkeepingSummary,
    actualCompanyFund: HISTORICAL_SNAPSHOT.actualCompanyFund,
  });
});
