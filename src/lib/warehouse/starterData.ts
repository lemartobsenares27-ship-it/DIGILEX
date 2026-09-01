// Warehouse — one-click load of the real Digilex product catalogue.
//
// Everything here was transcribed from actual supplier orders and messages.
// Where a figure was not visible in the source (shrink-wrap pieces per pack,
// label cost, capsule cost) the field is left null rather than guessed — a
// fabricated cost would silently corrupt every inventory valuation downstream.
//
// Loading is idempotent per SKU/PO number: anything already present is skipped,
// so pressing the button twice cannot double-count stock.

import { warehouseDb } from './db'
import { postMovements, logWarehouseAudit } from './inventory'
import type { ProductRow, PurchaseOrderRow } from './types'

type SeedProduct = Omit<ProductRow, 'id' | 'defaultLocationId'> & { defaultLocationId?: number | null }

const PRODUCTS: SeedProduct[] = [
  // --- Resale: finished supplements bought by the bottle from Bellevine ----
  {
    kind: 'SIMPLE',
    sku: 'BV-ALAGANG',
    name: 'Bellevine Alagang Capsules',
    variant: null,
    category: 'Supplements — resale',
    brand: 'Bellevine',
    supplier: 'Bellevine Herbal Food Supplements',
    unitCost: 80,
    sellingPrice: null,
    unit: 'btl',
    unitsPerPack: 1,
    barcode: null,
    minStockLevel: null,
    reorderPoint: null,
    targetStockLevel: null,
    tracksExpiry: true,
    active: true,
    notes: 'PO 8/25/2026 — 240 btl @ ₱80 = ₱19,200. Paid via GCash / AUB 529010001223 Majestic Line Mfg. Corp.',
  },
  {
    kind: 'SIMPLE',
    sku: 'ALASKA-GARLIC-500',
    name: "Alaska Garlic 500's (Big)",
    variant: null,
    category: 'Supplements — resale',
    brand: 'Alaska',
    supplier: 'Bellevine Herbal Food Supplements',
    unitCost: 155,
    sellingPrice: null,
    unit: 'btl',
    unitsPerPack: 1,
    barcode: null,
    minStockLevel: null,
    reorderPoint: null,
    targetStockLevel: null,
    tracksExpiry: true,
    active: true,
    notes: 'Ordered twice: 8/25/2026 and 8/26/2026, 120 btl @ ₱155 = ₱18,600 each.',
  },

  // --- Components for the EYE CARE ADVANCE build --------------------------
  {
    kind: 'COMPONENT',
    sku: 'BOTTLE-100ML',
    name: 'Medicine Bottle Jar with Cap 100ml',
    variant: '100ML',
    category: 'Packaging',
    brand: null,
    supplier: 'Shopee — VILLAS BUDGETARIAN 3',
    unitCost: 11,
    sellingPrice: null,
    unit: 'pc',
    unitsPerPack: 20,
    barcode: null,
    minStockLevel: null,
    reorderPoint: 100,
    targetStockLevel: 500,
    tracksExpiry: false,
    active: true,
    notes: '₱220 per pack of 20 = ₱11.00/pc.',
  },
  {
    kind: 'COMPONENT',
    sku: 'FOAM-38MM',
    name: 'Self-adhesive Foam Pressure Seal',
    variant: '38mm',
    category: 'Packaging',
    brand: null,
    supplier: 'Shopee — Greenmanna Avenue',
    unitCost: 0.98,
    sellingPrice: null,
    unit: 'pc',
    unitsPerPack: 50,
    barcode: null,
    minStockLevel: null,
    reorderPoint: 200,
    targetStockLevel: 1000,
    tracksExpiry: false,
    active: true,
    notes: '₱49 per pack of 50 = ₱0.98/pc.',
  },
  {
    kind: 'COMPONENT',
    sku: 'SHRINK-68X30',
    name: 'Plastic Cap Seal Shrink Wrap 68x30mm',
    variant: '38mm cap size',
    category: 'Packaging',
    brand: null,
    supplier: 'Shopee — KNARFZSHOP',
    // Pack price is known (₱45 transparent / ₱85 white printed) but pieces per
    // pack were not shown, so a per-piece cost cannot be derived honestly.
    unitCost: null,
    sellingPrice: null,
    unit: 'pc',
    unitsPerPack: null,
    barcode: null,
    minStockLevel: null,
    reorderPoint: 100,
    targetStockLevel: 500,
    tracksExpiry: false,
    active: true,
    notes: 'Two variants bought: Trans w/ Print ₱45/pack, White Printed ₱85/pack. Pieces per pack unknown — set unitsPerPack and unitCost once confirmed.',
  },
  {
    kind: 'COMPONENT',
    sku: 'LABEL-EYECARE',
    name: 'EYE CARE ADVANCE Label',
    variant: null,
    category: 'Packaging',
    brand: null,
    supplier: 'Perfectly Kaptured LABELing',
    unitCost: null,
    sellingPrice: null,
    unit: 'pc',
    unitsPerPack: null,
    barcode: null,
    minStockLevel: null,
    reorderPoint: 100,
    targetStockLevel: 500,
    tracksExpiry: false,
    active: true,
    notes: '216 pcs reported ready for pickup. Cost per label not yet known.',
  },
  {
    kind: 'COMPONENT',
    sku: 'CAPSULE-EYECARE',
    name: 'EYE CARE ADVANCE Capsules (bulk)',
    variant: '60 capsules per bottle',
    category: 'Raw material',
    brand: null,
    supplier: null,
    unitCost: null,
    sellingPrice: null,
    unit: 'capsule',
    unitsPerPack: null,
    barcode: null,
    minStockLevel: null,
    reorderPoint: null,
    targetStockLevel: null,
    tracksExpiry: true,
    active: true,
    notes: 'Placeholder — the label states 60 capsules per bottle, but no purchase of capsules has been provided yet. Set the supplier and cost, then add it to the recipe at 60 per unit.',
  },

  // --- Finished good --------------------------------------------------------
  {
    kind: 'FINISHED',
    sku: 'EYECARE-60',
    name: 'EYE CARE ADVANCE',
    variant: '60 Capsules',
    category: 'Own brand',
    brand: 'EYE CARE ADVANCE',
    supplier: null,
    unitCost: null,
    sellingPrice: null,
    unit: 'btl',
    unitsPerPack: 1,
    barcode: null,
    minStockLevel: null,
    reorderPoint: 50,
    targetStockLevel: 200,
    tracksExpiry: true,
    active: true,
    notes: 'Assembled in-house. See Production for the recipe.',
  },

  // --- Consumable -----------------------------------------------------------
  {
    kind: 'CONSUMABLE',
    sku: 'TAPE-200M',
    name: 'Packing Tape Big Roll',
    variant: '200M',
    category: 'Shipping supplies',
    brand: null,
    supplier: 'Shopee — Dawn Light shop',
    unitCost: 60,
    sellingPrice: null,
    unit: 'roll',
    unitsPerPack: 1,
    barcode: null,
    minStockLevel: null,
    reorderPoint: 2,
    targetStockLevel: 10,
    tracksExpiry: false,
    active: true,
    notes: 'Used for outbound packing, not part of any single unit — kept out of the bill of materials.',
  },
]

/** Recipe for one EYE CARE ADVANCE bottle. Capsules are omitted deliberately:
 *  the quantity (60) is known from the label but the material is not yet
 *  sourced, and adding it would make the product permanently unbuildable
 *  without explaining why. Add it once capsule stock exists. */
const BOM: { finished: string; component: string; qtyPerUnit: number }[] = [
  { finished: 'EYECARE-60', component: 'BOTTLE-100ML', qtyPerUnit: 1 },
  { finished: 'EYECARE-60', component: 'FOAM-38MM', qtyPerUnit: 1 },
  { finished: 'EYECARE-60', component: 'SHRINK-68X30', qtyPerUnit: 1 },
  { finished: 'EYECARE-60', component: 'LABEL-EYECARE', qtyPerUnit: 1 },
]

/** Deliveries confirmed as received, with quantities that can be derived exactly. */
const RECEIPTS: { sku: string; pieces: number; supplier: string; reference: string; date: string }[] = [
  { sku: 'BOTTLE-100ML', pieces: 100, supplier: 'Shopee — VILLAS BUDGETARIAN 3', reference: 'PH266512504505H', date: '2026-08-25' },
  { sku: 'FOAM-38MM', pieces: 300, supplier: 'Shopee — Greenmanna Avenue', reference: 'PH269919199816N', date: '2026-08-28' },
  { sku: 'TAPE-200M', pieces: 5, supplier: 'Shopee — Dawn Light shop', reference: 'PH262408322359P', date: '2026-08-21' },
]

/** Orders placed but not yet in hand — these count as incoming, never as stock. */
const OPEN_POS: { poNumber: string; supplier: string; orderDate: string; lines: { sku: string; qty: number; unitCost: number | null }[]; notes: string }[] = [
  {
    poNumber: 'BV-2026-0825',
    supplier: 'Bellevine Herbal Food Supplements',
    orderDate: '2026-08-25',
    lines: [
      { sku: 'BV-ALAGANG', qty: 240, unitCost: 80 },
      { sku: 'ALASKA-GARLIC-500', qty: 120, unitCost: 155 },
    ],
    notes: '360 pieces total. Mode of payment: GCash.',
  },
  {
    poNumber: 'BV-2026-0826',
    supplier: 'Bellevine Herbal Food Supplements',
    orderDate: '2026-08-26',
    lines: [{ sku: 'ALASKA-GARLIC-500', qty: 120, unitCost: 155 }],
    notes: '₱18,600 paid to AUB 529010001223 Majestic Line Mfg. Corp.',
  },
  {
    poNumber: 'SHOPEE-BOTTLES-8PK',
    supplier: 'Shopee — VILLAS BUDGETARIAN 3',
    orderDate: '2026-09-01',
    lines: [{ sku: 'BOTTLE-100ML', qty: 160, unitCost: 11 }],
    notes: '8 packs × 20. Tracking PH2630134253053 — out for delivery.',
  },
  {
    poNumber: 'LABELS-EYECARE-216',
    supplier: 'Perfectly Kaptured LABELing',
    orderDate: '2026-09-01',
    lines: [{ sku: 'LABEL-EYECARE', qty: 216, unitCost: null }],
    notes: '216 pcs reported ready for pickup.',
  },
]

export interface StarterLoadResult {
  productsAdded: number
  bomLinesAdded: number
  receiptsPosted: number
  posCreated: number
  skipped: string[]
}

/**
 * Loads the real catalogue. Safe to run more than once — existing SKUs and PO
 * numbers are skipped rather than duplicated, so stock cannot be inflated by
 * a second press.
 */
export async function loadStarterData(warehouseLocationId: number, user: string): Promise<StarterLoadResult> {
  const result: StarterLoadResult = { productsAdded: 0, bomLinesAdded: 0, receiptsPosted: 0, posCreated: 0, skipped: [] }

  const existing = await warehouseDb.products.toArray()
  const idBySku = new Map(existing.map((p) => [p.sku, p.id!]))

  for (const p of PRODUCTS) {
    if (idBySku.has(p.sku)) {
      result.skipped.push(`product ${p.sku}`)
      continue
    }
    const id = await warehouseDb.products.add({ ...p, defaultLocationId: warehouseLocationId })
    idBySku.set(p.sku, id)
    result.productsAdded++
  }

  const bomExisting = await warehouseDb.bom.toArray()
  for (const line of BOM) {
    const finishedId = idBySku.get(line.finished)
    const componentId = idBySku.get(line.component)
    if (finishedId == null || componentId == null) continue
    if (bomExisting.some((b) => b.finishedProductId === finishedId && b.componentProductId === componentId)) {
      result.skipped.push(`recipe ${line.finished}/${line.component}`)
      continue
    }
    await warehouseDb.bom.add({ finishedProductId: finishedId, componentProductId: componentId, quantityPerUnit: line.qtyPerUnit, notes: null })
    result.bomLinesAdded++
  }

  // Only post a receipt when this exact delivery reference has never been
  // recorded — a repeat load must not re-receive the same parcel.
  const movements = await warehouseDb.movements.toArray()
  const seenRefs = new Set(movements.map((m) => m.reference).filter(Boolean) as string[])
  for (const r of RECEIPTS) {
    const productId = idBySku.get(r.sku)
    if (productId == null) continue
    if (seenRefs.has(r.reference)) {
      result.skipped.push(`receipt ${r.reference}`)
      continue
    }
    await postMovements([
      {
        productId,
        quantity: r.pieces,
        type: 'RECEIPT',
        toLocationId: warehouseLocationId,
        toState: 'AVAILABLE',
        reference: r.reference,
        source: r.supplier,
        user,
        notes: `Delivered ${r.date}`,
      },
    ])
    result.receiptsPosted++
  }

  const existingPos = await warehouseDb.purchaseOrders.toArray()
  const poNumbers = new Set(existingPos.map((p) => p.poNumber))
  for (const po of OPEN_POS) {
    if (poNumbers.has(po.poNumber)) {
      result.skipped.push(`PO ${po.poNumber}`)
      continue
    }
    const row: PurchaseOrderRow = {
      poNumber: po.poNumber,
      supplier: po.supplier,
      status: 'ORDERED',
      orderDate: po.orderDate,
      expectedDate: null,
      notes: po.notes,
      createdAt: new Date().toISOString(),
    }
    const poId = await warehouseDb.purchaseOrders.add(row)
    for (const line of po.lines) {
      const productId = idBySku.get(line.sku)
      if (productId == null) continue
      await warehouseDb.purchaseOrderItems.add({ poId, productId, quantityOrdered: line.qty, quantityReceived: 0, unitCost: line.unitCost })
    }
    result.posCreated++
  }

  await logWarehouseAudit({
    entity: 'starterData',
    entityId: null,
    action: 'Loaded real catalogue',
    newValue: result,
    user,
  })

  return result
}
