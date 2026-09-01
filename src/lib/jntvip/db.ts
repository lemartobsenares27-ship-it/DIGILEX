// J&T VIP Reconciliation — its own database.
//
// This is a separate IndexedDB database from the Digilex Financial Control
// Center ('digilex-financial-control-center'). Nothing is shared: not the
// tables, not the schema version, not the seed data. The two systems can be
// upgraded, reset, or broken independently, and this one starts empty —
// there is no seeding step, because all of its data comes from the POS and
// SOA files you import.

import Dexie, { type Table } from 'dexie'
import type {
  JntVipImportBatchRow,
  JntVipPosOrderRow,
  JntVipShipmentRow,
  JntVipMatchRow,
  JntVipAuditLogRow,
} from './types'

export interface JntVipMetaRow {
  key: string
  value: unknown
}

class JntVipDB extends Dexie {
  importBatches!: Table<JntVipImportBatchRow, number>
  posOrders!: Table<JntVipPosOrderRow, number>
  shipments!: Table<JntVipShipmentRow, number>
  matches!: Table<JntVipMatchRow, number>
  auditLog!: Table<JntVipAuditLogRow, number>
  meta!: Table<JntVipMetaRow, string>

  constructor() {
    super('jnt-vip-reconciliation')
    this.version(1).stores({
      importBatches: '++id, kind, importedAt',
      posOrders: '++id, batchId, orderId, trackingNumber',
      shipments: '++id, batchId, trackingNumber, orderReference',
      matches: '++id, posOrderId, shipmentId, soaBatchId, status',
      auditLog: '++id, matchId, timestamp',
      meta: 'key',
    })
  }
}

export const jntVipDb = new JntVipDB()

// If a second tab of this app is open on an older schema, IndexedDB blocks
// this tab's upgrade until that connection closes. Close ours so the other
// tab can proceed, and reload to pick the new schema up.
jntVipDb.on('versionchange', () => {
  jntVipDb.close()
  window.location.reload()
})
jntVipDb.on('blocked', () => {
  console.warn('J&T VIP database upgrade is blocked by another open tab of this app.')
})

/** Deletes every J&T VIP record. Does not touch the Digilex financial database. */
export async function resetJntVipData(): Promise<void> {
  await jntVipDb.transaction(
    'rw',
    [jntVipDb.importBatches, jntVipDb.posOrders, jntVipDb.shipments, jntVipDb.matches, jntVipDb.auditLog],
    async () => {
      await Promise.all([
        jntVipDb.importBatches.clear(),
        jntVipDb.posOrders.clear(),
        jntVipDb.shipments.clear(),
        jntVipDb.matches.clear(),
        jntVipDb.auditLog.clear(),
      ])
    },
  )
}
