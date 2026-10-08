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
  JntVipParcelRow,
  JntVipSoaCheckRow,
  JntVipOperatingExpenseRow,
  JntVipProductRow,
  JntVipParcelProductRow,
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
  parcels!: Table<JntVipParcelRow, number>
  soaChecks!: Table<JntVipSoaCheckRow, number>
  operatingExpenses!: Table<JntVipOperatingExpenseRow, number>
  products!: Table<JntVipProductRow, number>
  parcelProducts!: Table<JntVipParcelProductRow, number>

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
    // v2 adds the parcel-level waybill export and saved SOA verifications.
    // The SOA itself is only a summary, so checking one needs the parcels.
    // awb is unique: a re-import updates a parcel's status rather than
    // appending a second copy of the same shipment.
    this.version(2).stores({
      parcels: '++id, &awb, status, podDate, shipDate',
      soaChecks: '++id, soaNumber, periodFrom, checkedAt',
    })
    // v3 indexes payment status: the finance ledger's main question is
    // "which statements have not been paid", and that is a filter, not a scan.
    //
    // soaNumber is deliberately NOT unique. It was, briefly, and that was a
    // bug: IndexedDB aborts the entire version-change transaction when an index
    // it is told to create as unique finds existing duplicates, so a browser
    // that had ever saved the same SOA twice could no longer open this database
    // at all — the app simply failed to load. One statement per number is a
    // rule worth keeping, but it belongs in code that can report a duplicate,
    // not in a schema constraint that can brick an upgrade. importSoaPdfBatch
    // already looks up by soaNumber before writing and reports duplicates and
    // reissues explicitly.
    this.version(3).stores({
      soaChecks: '++id, soaNumber, periodFrom, checkedAt, paymentStatus',
    })
    // v4 exists only to relax that index for any browser that did apply v3's
    // unique version successfully. Redeclaring the store rebuilds its indexes
    // without touching the rows.
    this.version(4).stores({
      soaChecks: '++id, soaNumber, periodFrom, checkedAt, paymentStatus',
    })
    // v5 stores the operating expenses — support, fulfilment, utilities — as
    // rows rather than constants in the source. They arrived a few at a time
    // and kept arriving, and an expense that needs a code change to record is
    // an expense that quietly stays missing from the P&L.
    //
    // `key` is unique so seeding is idempotent and an edit updates in place;
    // retired expenses are kept with active=false rather than deleted, because
    // a period already closed was costed with them and deleting the row would
    // silently restate it.
    //
    // `active` is deliberately NOT indexed even though it is the field most
    // often filtered on. IndexedDB keys may only be numbers, strings, Dates or
    // Arrays — a boolean is not a valid key, and indexing one makes every read
    // of the table throw. The list is a handful of rows, so filtering it in
    // memory costs nothing.
    this.version(5).stores({
      operatingExpenses: '++id, &key, basis',
    })
    // v6 makes the product catalogue data. Two products were hard-coded and
    // everything else fell into "Other"; with four SKUs that silently merges
    // two of them and makes a per-product return rate meaningless.
    //
    // parcelProducts pins a waybill to a product from a source better than text
    // matching — a POS export covers one product, so every waybill in it is
    // known. `awb` is unique so re-importing the same POS file corrects the
    // mapping instead of stacking duplicates.
    //
    // Neither `active` nor `aliases` is indexed: a boolean is not a valid
    // IndexedDB key, and an array index would match each element rather than
    // the row. Both lists are small enough to filter in memory.
    this.version(6).stores({
      products: '++id, &name',
      parcelProducts: '++id, &awb, product',
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
