import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'

export function useJntVipTables() {
  const posOrders = useLiveTable(jntVipDb.posOrders)
  const shipments = useLiveTable(jntVipDb.shipments)
  const matches = useLiveTable(jntVipDb.matches)
  const batches = useLiveTable(jntVipDb.importBatches)
  const auditLog = useLiveTable(jntVipDb.auditLog)
  return { posOrders, shipments, matches, batches, auditLog }
}
