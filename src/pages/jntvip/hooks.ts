import { useLiveTable } from '../../hooks/useLiveTable'
import { db } from '../../lib/db'

export function useJntVipTables() {
  const posOrders = useLiveTable(db.jntVipPosOrders)
  const shipments = useLiveTable(db.jntVipShipments)
  const matches = useLiveTable(db.jntVipMatches)
  const batches = useLiveTable(db.jntVipImportBatches)
  const auditLog = useLiveTable(db.jntVipAuditLog)
  return { posOrders, shipments, matches, batches, auditLog }
}
