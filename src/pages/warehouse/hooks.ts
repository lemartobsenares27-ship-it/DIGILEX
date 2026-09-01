import { useMemo } from 'react'
import { useLiveTable } from '../../hooks/useLiveTable'
import { warehouseDb } from '../../lib/warehouse/db'
import { computeBalances, incomingByProduct, productStock, recommendedPurchase, stockStatus, type ProductStock, type StockStatus } from '../../lib/warehouse/inventory'
import { OPEN_PO_STATUSES } from '../../lib/warehouse/operations'
import type { ProductRow } from '../../lib/warehouse/types'

export function useWarehouseTables() {
  return {
    products: useLiveTable(warehouseDb.products),
    locations: useLiveTable(warehouseDb.locations),
    movements: useLiveTable(warehouseDb.movements),
    purchaseOrders: useLiveTable(warehouseDb.purchaseOrders),
    purchaseOrderItems: useLiveTable(warehouseDb.purchaseOrderItems),
    rtsReturns: useLiveTable(warehouseDb.rtsReturns),
    stockCounts: useLiveTable(warehouseDb.stockCounts),
    stockCountItems: useLiveTable(warehouseDb.stockCountItems),
    auditLog: useLiveTable(warehouseDb.auditLog),
  }
}

export interface ProductRowWithStock {
  product: ProductRow
  stock: ProductStock
  status: StockStatus
  suggestedBuy: number
  /** Value of sellable units at cost — never at selling price. */
  availableValue: number
  physicalValue: number
  unsellableValue: number
}

/** Joins every product to its ledger-derived balances, status and reorder maths. */
export function useInventory() {
  const tables = useWarehouseTables()
  const { products, movements, purchaseOrders, purchaseOrderItems } = tables

  const balances = useMemo(() => computeBalances(movements), [movements])

  const incoming = useMemo(() => {
    const openIds = new Set(purchaseOrders.filter((p) => p.id != null && OPEN_PO_STATUSES.includes(p.status)).map((p) => p.id!))
    return incomingByProduct(purchaseOrderItems, openIds)
  }, [purchaseOrders, purchaseOrderItems])

  const rows: ProductRowWithStock[] = useMemo(
    () =>
      products
        .filter((p) => p.id != null)
        .map((product) => {
          const stock = productStock(balances, product.id!, incoming.get(product.id!) ?? 0)
          const cost = product.unitCost ?? 0
          return {
            product,
            stock,
            status: stockStatus(product, stock),
            suggestedBuy: recommendedPurchase(product, stock),
            availableValue: stock.available * cost,
            physicalValue: stock.physical * cost,
            unsellableValue: stock.unsellable * cost,
          }
        }),
    [products, balances, incoming],
  )

  return { ...tables, balances, rows }
}
