// Warehouse & Inventory Control — its own database.
//
// A third IndexedDB database, separate from 'digilex-financial-control-center'
// and 'jnt-vip-reconciliation'. No shared tables, no shared schema version.

import Dexie, { type Table } from 'dexie'
import type {
  ProductRow,
  LocationRow,
  MovementRow,
  PurchaseOrderRow,
  PurchaseOrderItemRow,
  RtsReturnRow,
  BomLineRow,
  StockCountRow,
  StockCountItemRow,
  WarehouseAuditLogRow,
} from './types'

export interface WarehouseMetaRow {
  key: string
  value: unknown
}

class WarehouseDB extends Dexie {
  products!: Table<ProductRow, number>
  locations!: Table<LocationRow, number>
  movements!: Table<MovementRow, number>
  purchaseOrders!: Table<PurchaseOrderRow, number>
  purchaseOrderItems!: Table<PurchaseOrderItemRow, number>
  rtsReturns!: Table<RtsReturnRow, number>
  stockCounts!: Table<StockCountRow, number>
  stockCountItems!: Table<StockCountItemRow, number>
  bom!: Table<BomLineRow, number>
  auditLog!: Table<WarehouseAuditLogRow, number>
  meta!: Table<WarehouseMetaRow, string>

  constructor() {
    super('warehouse-inventory-control')
    this.version(1).stores({
      // sku is unique — a duplicate SKU would split one product's ledger in two
      products: '++id, &sku, name, category, supplier, active',
      locations: '++id, name, kind, parentId',
      movements: '++id, timestamp, productId, type, fromLocationId, toLocationId, reference, groupId',
      purchaseOrders: '++id, &poNumber, supplier, status, orderDate',
      purchaseOrderItems: '++id, poId, productId',
      rtsReturns: '++id, trackingNumber, productId, status, returnDate',
      stockCounts: '++id, countDate, locationId, status',
      stockCountItems: '++id, countId, productId',
      auditLog: '++id, timestamp, entity, entityId',
      meta: 'key',
    })
    // Bill of materials: a finished product is assembled from components, so
    // "how many can I make" is a question about the scarcest one, not about
    // any single stock level.
    this.version(2).stores({
      bom: '++id, finishedProductId, componentProductId',
    })
  }
}

export const warehouseDb = new WarehouseDB()

warehouseDb.on('versionchange', () => {
  warehouseDb.close()
  window.location.reload()
})
warehouseDb.on('blocked', () => {
  console.warn('Warehouse database upgrade is blocked by another open tab of this app.')
})

/**
 * Seeds the handful of locations the system cannot function without. Runs
 * once; it never touches products, so it can't invent stock. Fulfillment
 * partners and shelves are added by the user from the Locations UI.
 */
export async function ensureWarehouseSeeded(): Promise<void> {
  const seeded = await warehouseDb.meta.get('seeded')
  if (seeded?.value) return

  await warehouseDb.transaction('rw', [warehouseDb.locations, warehouseDb.meta], async () => {
    const count = await warehouseDb.locations.count()
    if (count === 0) {
      await warehouseDb.locations.bulkAdd([
        { name: 'Main Warehouse', kind: 'warehouse', parentId: null, active: true, notes: null },
        { name: 'J&T VIP', kind: 'fulfillment', parentId: null, active: true, notes: 'Fulfillment partner' },
        { name: 'In Transit', kind: 'transit', parentId: null, active: true, notes: 'Stock moving between locations' },
      ])
    }
    await warehouseDb.meta.put({ key: 'seeded', value: true })
  })
}

export async function getWarehouseUser(): Promise<string> {
  const row = await warehouseDb.meta.get('currentUser')
  return (row?.value as string | undefined) ?? ''
}

export async function setWarehouseUser(name: string): Promise<void> {
  await warehouseDb.meta.put({ key: 'currentUser', value: name })
}
