import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { fetchPancakeOrders, mapPancakeStatus, PancakeApiError } from "../pancake.js";

export const ecommerceRouter = Router();

ecommerceRouter.use(requireAuth);

function canViewAllPages(req: Express.Request) {
  return Boolean(
    req.user?.isMotherAccount ||
      req.user?.permissions.includes("ecommerce.pages.viewAll") ||
      req.user?.permissions.includes("motherAccount.access"),
  );
}

function hasAnyPagePermission(req: Express.Request) {
  return Boolean(
    req.user?.isMotherAccount ||
      req.user?.permissions.includes("ecommerce.pages.viewOwn") ||
      req.user?.permissions.includes("ecommerce.pages.viewAll"),
  );
}

// ---------------------------------------------------------------------
// Pages & Store (Module 3, Section 3.5)
// ---------------------------------------------------------------------

ecommerceRouter.get("/pages", (req, res, next) => {
  if (!hasAnyPagePermission(req)) return res.status(403).json({ error: "Missing permission." });
  next();
});
ecommerceRouter.get("/pages", async (req, res) => {
  const viewAll = canViewAllPages(req);
  const pages = await prisma.page.findMany({
    where: {
      archived: false,
      ...(viewAll ? {} : { owner: req.user!.username ?? "__none__" }),
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ pages });
});

ecommerceRouter.get("/pages/:id", (req, res, next) => {
  if (!hasAnyPagePermission(req)) return res.status(403).json({ error: "Missing permission." });
  next();
});
ecommerceRouter.get("/pages/:id", async (req, res) => {
  const page = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!page) return res.status(404).json({ error: "Not found." });
  if (!canViewAllPages(req) && page.owner !== req.user!.username) {
    return res.status(403).json({ error: "Missing permission." });
  }
  res.json(page);
});

// SOP 3-1: Register a New Page/Store.
const pageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().optional(),
  platform: z.string().min(1),
  pageUrl: z.string().optional(),
  status: z.enum(["Active", "Inactive", "In-review", "Restricted", "Permanently Disabled"]).default("Active"),
  // Pancake Set Up panel (Module 3.5.1 / Module 4, SOP 4-1/4-2).
  pancakeShopId: z.string().optional(),
  pancakeApiKey: z.string().optional(),
  pancakePageId: z.string().optional(),
  senderName: z.string().optional(),
  internName: z.string().optional(),
});

ecommerceRouter.post("/pages", (req, res, next) => {
  if (!hasAnyPagePermission(req)) return res.status(403).json({ error: "Missing permission." });
  next();
});
ecommerceRouter.post("/pages", async (req, res) => {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const data = parsed.data;
  const page = await prisma.page.create({
    data: {
      name: data.name,
      description: data.description || null,
      owner: data.owner || req.user!.username,
      platform: data.platform,
      pageUrl: data.pageUrl || null,
      status: data.status,
      pancakeShopId: data.pancakeShopId || null,
      pancakeApiKey: data.pancakeApiKey || null,
      pancakePageId: data.pancakePageId || null,
      senderName: data.senderName || null,
      internName: data.internName || null,
    },
  });
  res.status(201).json(page);
});

const editPageSchema = pageSchema.partial();

ecommerceRouter.patch("/pages/:id", async (req, res) => {
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found." });
  if (!canViewAllPages(req) && existing.owner !== req.user!.username) {
    return res.status(403).json({ error: "Missing permission." });
  }
  const parsed = editPageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const data = parsed.data;
  const page = await prisma.page.update({
    where: { id: req.params.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.owner !== undefined && { owner: data.owner || null }),
      ...(data.platform !== undefined && { platform: data.platform }),
      ...(data.pageUrl !== undefined && { pageUrl: data.pageUrl || null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.pancakeShopId !== undefined && { pancakeShopId: data.pancakeShopId || null }),
      ...(data.pancakeApiKey !== undefined && { pancakeApiKey: data.pancakeApiKey || null }),
      ...(data.pancakePageId !== undefined && { pancakePageId: data.pancakePageId || null }),
      ...(data.senderName !== undefined && { senderName: data.senderName || null }),
      ...(data.internName !== undefined && { internName: data.internName || null }),
    },
  });
  res.json(page);
});

ecommerceRouter.patch("/pages/:id/archive", async (req, res) => {
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found." });
  if (!canViewAllPages(req) && existing.owner !== req.user!.username) {
    return res.status(403).json({ error: "Missing permission." });
  }
  const page = await prisma.page.update({ where: { id: req.params.id }, data: { archived: true } });
  res.json(page);
});

ecommerceRouter.delete("/pages/:id", requirePermission("ecommerce.pages.deletePlatform"), async (req, res) => {
  const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found." });
  await prisma.page.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ---------------------------------------------------------------------
// Sales Tracker (Module 3, Section 3.8)
// ---------------------------------------------------------------------

function canViewAllOrders(req: Express.Request) {
  return Boolean(req.user?.isMotherAccount || req.user?.permissions.includes("ecommerce.salesOrder.viewAll"));
}

const listOrdersQuerySchema = z.object({
  pageId: z.string().optional(),
  orderStatus: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

ecommerceRouter.get(
  "/sales-tracker",
  (req, res, next) => {
    const hasAny = req.user?.isMotherAccount ||
      req.user?.permissions.includes("ecommerce.salesOrder.viewOwn") ||
      req.user?.permissions.includes("ecommerce.salesOrder.viewAll");
    if (!hasAny) return res.status(403).json({ error: "Missing permission." });
    next();
  },
  async (req, res) => {
    const parsed = listOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query." });
    const { pageId, orderStatus, from, to } = parsed.data;
    const viewAll = canViewAllOrders(req);

    const orders = await prisma.salesOrder.findMany({
      where: {
        ...(pageId && { pageId }),
        ...(orderStatus && { orderStatus }),
        ...(from || to
          ? {
              orderDate: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
        ...(viewAll ? {} : { page: { owner: req.user!.username ?? "__none__" } }),
      },
      include: { page: { select: { id: true, name: true } } },
      orderBy: { orderDate: "desc" },
      take: 500,
    });

    const totals = orders.reduce(
      (acc, o) => {
        acc.totalPrice += o.price;
        acc.totalShippingFee += o.shippingFee;
        return acc;
      },
      { totalPrice: 0, totalShippingFee: 0 },
    );

    res.json({ orders, totals });
  },
);

// Module 4, SOP 4-3: Download Confirmed Orders from Pancake POS.
const downloadFromPancakeSchema = z.object({
  pageIds: z.array(z.string()).min(1, "Select at least one page."),
  pancakeOrderDateFrom: z.string(),
  pancakeOrderDateTo: z.string(),
  // "Order Date Set" -- the date these orders should be dated as in LHIKE
  // ERP; defaults to each order's own Pancake order date if omitted.
  orderDateSet: z.string().optional(),
  status: z
    .array(z.enum(["Canceled", "Confirmed", "Delivered", "Partial Return", "Printed"]))
    .min(1, "Select at least one status."),
});

ecommerceRouter.post(
  "/sales-tracker/download-from-pancake",
  requirePermission("ecommerce.salesOrder.createNew"),
  async (req, res) => {
    const parsed = downloadFromPancakeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
    }
    const { pageIds, pancakeOrderDateFrom, pancakeOrderDateTo, orderDateSet, status } = parsed.data;

    const pages = await prisma.page.findMany({ where: { id: { in: pageIds } } });
    const foundIds = new Set(pages.map((p) => p.id));
    const missingPageIds = pageIds.filter((id) => !foundIds.has(id));

    const startDateTime = Math.floor(new Date(pancakeOrderDateFrom).getTime() / 1000);
    const endDateTime = Math.floor(new Date(pancakeOrderDateTo).getTime() / 1000);
    const forcedOrderDate = orderDateSet ? new Date(orderDateSet) : null;

    let added = 0;
    let skipped = 0;
    const unconfirmedPages: string[] = [...missingPageIds];
    const errors: { pageId: string; pageName: string; message: string }[] = [];

    for (const page of pages) {
      if (!page.pancakeShopId || !page.pancakeApiKey) {
        unconfirmedPages.push(page.id);
        continue;
      }

      try {
        let pageNumber = 1;
        let totalPages = 1;
        do {
          const result = await fetchPancakeOrders({
            shopId: page.pancakeShopId,
            apiKey: page.pancakeApiKey,
            startDateTime,
            endDateTime,
            pageNumber,
            pageSize: 100,
          });
          totalPages = result.total_pages || 1;

          for (const order of result.data) {
            const mappedStatus = mapPancakeStatus(order.status_name);
            if (!status.includes(mappedStatus as (typeof status)[number])) continue;

            const orderId = String(order.id);
            const totalQty = (order.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);

            try {
              await prisma.salesOrder.create({
                data: {
                  pageId: page.id,
                  source: "Pancake-POS",
                  pancakeOrderId: orderId,
                  displayId: order.display_id ? String(order.display_id) : null,
                  orderDate: forcedOrderDate ?? (order.inserted_at ? new Date(order.inserted_at) : new Date()),
                  customerName: order.bill_full_name || null,
                  address: order.shipping_address?.full_address || null,
                  contactNumber: order.bill_phone_number || null,
                  totalQty,
                  price: order.total_price ?? 0,
                  shippingFee: order.shipping_fee ?? 0,
                  trackingNumber: order.tracking_id || null,
                  courier: order.partner?.name || null,
                  orderStatus: mappedStatus,
                },
              });
              added += 1;
            } catch (err: unknown) {
              // Unique constraint on [pageId, pancakeOrderId] -- already imported.
              if ((err as { code?: string })?.code === "P2002") {
                skipped += 1;
              } else {
                throw err;
              }
            }
          }
          pageNumber += 1;
        } while (pageNumber <= totalPages);
      } catch (err) {
        errors.push({
          pageId: page.id,
          pageName: page.name,
          message: err instanceof PancakeApiError ? err.message : "Unexpected error contacting Pancake POS.",
        });
      }
    }

    res.json({ added, skipped, unconfirmedPages, errors });
  },
);
