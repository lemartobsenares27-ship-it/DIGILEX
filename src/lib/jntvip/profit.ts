// The one question this app exists to answer: after every fee, am I making money?
//
// The Finance and Bookkeeping pages stop at the net remittance, which is only
// the courier's side of the story. A remittance that looks healthy can still sit
// on top of a loss once the product and the advertising that sold it are counted.
// This module closes that gap by putting all four costs in one statement:
//
//   COD collected  -  courier fees  -  cost of goods  -  ad spend  =  profit
//
// Three deliberate choices, because each could reasonably be made the other way:
//
// 1. Revenue is COD COLLECTED, taken from the statements, not the parcel export.
//    The statements are the money J&T actually took and remitted, verified
//    against the bank. The export is missing parcels dispatched before it starts,
//    so its COD total runs low.
//
// 2. Units are SCALED from the parcel export to the statements' revenue. The
//    export gives the bottle count per parcel, which the statements do not, but
//    it covers slightly fewer parcels. Scaling by the revenue ratio keeps COGS
//    proportional to the revenue it is charged against. It is an estimate, and
//    the page says so.
//
// 3. Returned parcels carry NO cost of goods. The bottles come back and go on
//    the shelf. What a return really costs is the RTS fee plus the outbound
//    shipping already spent on it, and that is reported separately.
//
// All amounts are integer centavos.

import type { JntVipSoaCheckRow, JntVipParcelRow } from './types'
import { adSpendBetween } from './adSpend'
import { BOTTLE_COSTS, PRUDENT_UNIT_COST } from './bottleCost'

export { BOTTLE_COSTS, PRUDENT_UNIT_COST }

export interface ProfitAndLoss {
  from: string
  to: string
  days: number

  revenue: number
  shipping: number
  commission: number
  vat: number
  rtsFee: number
  courierTotal: number
  netRemitted: number

  units: number
  unitCost: number
  cogs: number

  adSpend: number

  profit: number
  margin: number

  /** Parcel counts behind the unit estimate. */
  delivered: number
  returned: number
  rtsRate: number
  /** RTS fees plus the outbound shipping spent on parcels that came back. */
  returnDrag: number

  roas: number
  breakEvenRoas: number
  /** Ad spend the period could bear before profit reaches zero. */
  adCeiling: number
  adHeadroom: number
  adPerDelivered: number
  profitPerDelivered: number

  /** Where one bottle's revenue actually goes, from this period's own figures. */
  perBottle: {
    revenue: number
    product: number
    shipping: number
    codService: number
    ads: number
    profit: number
  }

  /** True when units were scaled from an export narrower than the statements. */
  unitsEstimated: boolean
  hasParcels: boolean
}

/** Both live SKUs go out at the same COD price, which is what makes the
 *  bottles-per-parcel inference below possible. */
const REFERENCE_PRICE = BOTTLE_COSTS[0].price

const val = (stated: number | null, computed: number) => stated ?? computed

/** Bottles in a parcel, read from its COD value against the SKU price. */
function bottlesIn(p: JntVipParcelRow): number {
  const cod = p.cod
  if (cod <= 0) return 1
  // A two-bottle order is discounted (PHP599, not PHP798), so rounding the
  // ratio recovers the count where a plain division would not.
  return Math.max(1, Math.round(cod / REFERENCE_PRICE))
}

export function profitAndLoss(rows: JntVipSoaCheckRow[], parcels: JntVipParcelRow[]): ProfitAndLoss | null {
  if (rows.length === 0) return null

  const sorted = [...rows].sort((a, b) => a.periodFrom.localeCompare(b.periodFrom))
  const from = sorted[0].periodFrom
  const to = sorted[sorted.length - 1].periodTo
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1

  const sum = (f: (s: JntVipSoaCheckRow) => number) => rows.reduce((t, s) => t + f(s), 0)
  const revenue = sum((s) => val(s.statedCod, s.computedCod))
  const shipping = sum((s) => val(s.statedShipping, s.computedShipping))
  const commission = sum((s) => val(s.statedCommission, s.computedCommission))
  const vat = sum((s) => val(s.statedVat, s.computedVat))
  const rtsFee = sum((s) => val(s.statedRtsFee, s.computedRtsFee))
  const courierTotal = shipping + commission + vat + rtsFee
  const netRemitted = sum((s) => val(s.statedNet, s.computedNet))

  const inWindow = (d: string | null) => d != null && d >= from && d <= to
  const deliveredParcels = parcels.filter((p) => p.status === 'DELIVERED' && inWindow(p.podDate))
  const returnedParcels = parcels.filter((p) => p.status === 'RETURNED' && inWindow(p.podDate))
  const delivered = deliveredParcels.length
  const returned = returnedParcels.length
  const settled = delivered + returned
  const hasParcels = settled > 0

  // Scale the export's bottle count up to the statements' revenue.
  const exportCod = deliveredParcels.reduce((t, p) => t + (p.cod), 0)
  const rawUnits = deliveredParcels.reduce((t, p) => t + bottlesIn(p), 0)
  const scale = exportCod > 0 ? revenue / exportCod : 1
  const units = hasParcels
    ? Math.round(rawUnits * scale)
    : Math.round(revenue / REFERENCE_PRICE)
  const unitCost = PRUDENT_UNIT_COST
  const cogs = units * unitCost

  const adSpend = adSpendBetween(from, to)

  const profit = netRemitted - cogs - adSpend
  const adCeiling = netRemitted - cogs

  return {
    from,
    to,
    days,
    revenue,
    shipping,
    commission,
    vat,
    rtsFee,
    courierTotal,
    netRemitted,
    units,
    unitCost,
    cogs,
    adSpend,
    profit,
    margin: revenue > 0 ? profit / revenue : 0,
    delivered,
    returned,
    rtsRate: settled > 0 ? returned / settled : 0,
    returnDrag: rtsFee + (settled > 0 ? Math.round((shipping * returned) / settled) : 0),
    roas: adSpend > 0 ? revenue / adSpend : 0,
    breakEvenRoas: adCeiling > 0 ? revenue / adCeiling : 0,
    adCeiling,
    adHeadroom: adCeiling - adSpend,
    adPerDelivered: delivered > 0 ? Math.round(adSpend / delivered) : 0,
    profitPerDelivered: delivered > 0 ? Math.round(profit / delivered) : 0,
    perBottle: {
      revenue: units > 0 ? Math.round(revenue / units) : 0,
      product: unitCost,
      shipping: units > 0 ? Math.round(shipping / units) : 0,
      codService: units > 0 ? Math.round((commission + vat + rtsFee) / units) : 0,
      ads: units > 0 ? Math.round(adSpend / units) : 0,
      profit: units > 0 ? Math.round(profit / units) : 0,
    },
    unitsEstimated: hasParcels && Math.abs(scale - 1) > 0.005,
    hasParcels,
  }
}

export interface CostLine {
  key: string
  label: string
  amount: number
  share: number
  color: string
  note: string
}

/**
 * The cost stack, largest first, so the biggest lever is the top row.
 *
 * Four series rather than five: shipping, commission and VAT are all what the
 * courier charges to move and collect, and splitting VAT off its own commission
 * would add a hue for 0.3% of revenue. The categorical order is fixed, so a
 * period where one line vanishes does not repaint the others.
 */
export function costStack(p: ProfitAndLoss): CostLine[] {
  const share = (n: number) => (p.revenue > 0 ? n / p.revenue : 0)
  return [
    { key: 'ads', label: 'Meta ads', amount: p.adSpend, share: share(p.adSpend), color: 'var(--series-blue)', note: 'What you paid to find the buyer' },
    { key: 'shipping', label: 'Shipping', amount: p.shipping, share: share(p.shipping), color: 'var(--series-aqua)', note: 'Billed on dispatch, whether or not it lands' },
    { key: 'cogs', label: 'Product', amount: p.cogs, share: share(p.cogs), color: 'var(--series-orange)', note: `${p.units} bottles at \u20b1${(p.unitCost / 100).toFixed(2)}` },
    { key: 'cod', label: 'COD service', amount: p.commission + p.vat + p.rtsFee, share: share(p.commission + p.vat + p.rtsFee), color: 'var(--series-violet)', note: '2.75% commission, VAT on it, and RTS fees' },
  ].filter((l) => l.amount > 0)
}
