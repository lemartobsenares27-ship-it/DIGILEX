// Why parcels come back — and what that costs.
//
// The return rate says how much is coming back. It does not say whether the
// cause is something you can act on, and those lead to opposite decisions. A
// courier failing to find addresses is fixed by changing courier or cleaning
// addresses. A customer who ordered and then refused the parcel at the door is
// not a delivery problem at all, and no amount of logistics work touches it.
//
// J&T's export carries an RTS Reason column that previous exports did not, so
// this can finally be answered from data rather than guessed at. The reasons
// are grouped into the two that lead somewhere different, and the money is put
// beside them, because the rate alone understates this badly: a return costs
// the outbound freight, the RTS fee, the packing, and — much the largest part —
// the advertising that bought an order nobody accepted.
//
// Returns are shown against SETTLED parcels only. A parcel still in transit has
// not yet decided, and counting it as delivered is how a return rate ends up
// flattered by exactly the parcels most likely to come back.

import { useMemo } from 'react'
import { PackageX, Truck, HelpCircle } from 'lucide-react'
import Card from '../../components/Card'
import { formatNumber, formatPercent } from '../../lib/format'

/**
 * Centavos to pesos. Every money value in this app is an integer centavo, and
 * formatCurrency takes pesos — handing it centavos silently renders a hundred
 * times the real figure, which looks plausible enough on a dashboard to be
 * believed.
 */
const peso = (c: number) =>
  '\u20B1' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
import type { JntVipParcelRow } from '../../lib/jntvip/types'

/**
 * Which reasons mean the buyer changed their mind.
 *
 * Matched on a lowercased prefix because J&T's strings arrive with varying
 * trailing punctuation between exports. Anything unrecognised is counted as
 * unclassified rather than folded into either bucket — a reason nobody has
 * seen before should show up as unknown, not be quietly assumed to be the
 * common case.
 */
const CUSTOMER_REFUSAL = ['customer rejection', 'customer reason', 'customer refuse', 'rejected by customer']
const COURIER_SIDE = ['exception', 'not yet picked up', 'address', 'undeliverable', 'out of delivery area']

type Bucket = 'refusal' | 'courier' | 'unknown'

function bucketOf(reason: string | null): Bucket {
  const r = (reason ?? '').trim().toLowerCase().replace(/\.+$/, '')
  if (!r) return 'unknown'
  if (CUSTOMER_REFUSAL.some((p) => r.startsWith(p))) return 'refusal'
  if (COURIER_SIDE.some((p) => r.includes(p))) return 'courier'
  return 'unknown'
}

interface Props {
  parcels: JntVipParcelRow[]
  /** Advertising for the same window, so the wasted share can be priced. */
  adSpendCentavos?: number
}

export default function RtsReasons({ parcels, adSpendCentavos = 0 }: Props) {
  const stats = useMemo(() => {
    const settled = parcels.filter((p) => p.status === 'DELIVERED' || p.status === 'RETURNED')
    const returned = settled.filter((p) => p.status === 'RETURNED')

    const byReason = new Map<string, number>()
    const byBucket: Record<Bucket, number> = { refusal: 0, courier: 0, unknown: 0 }
    for (const p of returned) {
      const label = (p.rtsReason ?? '').trim().replace(/\.+$/, '') || 'No reason given'
      byReason.set(label, (byReason.get(label) ?? 0) + 1)
      byBucket[bucketOf(p.rtsReason)]++
    }

    // What the returns cost. Outbound freight was paid to carry the parcel out,
    // the RTS fee is half the receivable freight to carry it back, and the ad
    // spend is apportioned by parcel: every parcel shipped cost the same to
    // acquire, whether or not it was accepted.
    const outbound = returned.reduce((t, p) => t + p.shippingCost, 0)
    const rtsFee = returned.reduce((t, p) => t + Math.round(p.freight * 0.5), 0)
    const wastedAds = settled.length > 0 ? Math.round((adSpendCentavos * returned.length) / settled.length) : 0

    const byProvince = new Map<string, { settled: number; returned: number }>()
    for (const p of settled) {
      const k = p.province ?? 'Unknown'
      const row = byProvince.get(k) ?? { settled: 0, returned: 0 }
      row.settled++
      if (p.status === 'RETURNED') row.returned++
      byProvince.set(k, row)
    }
    const provinces = [...byProvince.entries()]
      .filter(([, v]) => v.settled >= 20)
      .map(([name, v]) => ({ name, ...v, rate: v.returned / v.settled }))
      .sort((a, b) => b.rate - a.rate)

    return {
      settled: settled.length,
      returned: returned.length,
      rate: settled.length > 0 ? returned.length / settled.length : 0,
      reasons: [...byReason.entries()].sort((a, b) => b[1] - a[1]),
      byBucket,
      outbound,
      rtsFee,
      wastedAds,
      total: outbound + rtsFee + wastedAds,
      provinces,
    }
  }, [parcels, adSpendCentavos])

  if (stats.returned === 0) return null

  const share = (n: number) => (stats.returned > 0 ? n / stats.returned : 0)
  const buckets = [
    {
      key: 'refusal' as const,
      icon: PackageX,
      label: 'Customer refused the parcel',
      hint: 'Ordered, then would not accept it. Not a delivery problem.',
      color: 'var(--series-orange)',
    },
    {
      key: 'courier' as const,
      icon: Truck,
      label: 'Courier or address problem',
      hint: 'Never reached the customer. Fixable in logistics.',
      color: 'var(--series-blue)',
    },
    { key: 'unknown' as const, icon: HelpCircle, label: 'No reason recorded', hint: 'J&T sent the return without one.', color: 'var(--text-muted)' },
  ]

  return (
    <Card
      title="Why parcels come back"
      description={`${formatNumber(stats.returned)} returns out of ${formatNumber(stats.settled)} settled parcels (${formatPercent(stats.rate)})`}
    >
      <div className="space-y-3">
        {buckets.map((b) => {
          const n = stats.byBucket[b.key]
          if (n === 0) return null
          const pct = share(n)
          const Icon = b.icon
          return (
            <div key={b.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  <Icon size={14} style={{ color: b.color }} aria-hidden />
                  {b.label}
                </span>
                <span className="tabular-nums text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(n)} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({formatPercent(pct, 1)})</span>
                </span>
              </div>
              {/* A proportion bar, not a chart: three parts of one whole, read
                  against each other rather than against an axis. */}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-sunken, rgba(127,127,127,.15))' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(pct * 100, 1)}%`, background: b.color }} />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{b.hint}</p>
            </div>
          )
        })}
      </div>

      {stats.reasons.length > 0 && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            As J&amp;T labels them
          </p>
          <table className="w-full text-sm">
            <tbody>
              {stats.reasons.map(([label, n]) => (
                <tr key={label}>
                  <td className="py-0.5 pr-3" style={{ color: 'var(--text-secondary)' }}>{label}</td>
                  <td className="py-0.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatNumber(n)}</td>
                  <td className="w-14 py-0.5 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{formatPercent(share(n), 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.total > 0 && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            What those returns cost
          </p>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Advertising that bought a refusal', stats.wastedAds],
                ['Outbound freight, paid anyway', stats.outbound],
                ['RTS fees to carry them back', stats.rtsFee],
              ].map(([label, v]) => (
                <tr key={label as string}>
                  <td className="py-0.5 pr-3" style={{ color: 'var(--text-secondary)' }}>{label}</td>
                  <td className="py-0.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{peso(v as number)}</td>
                </tr>
              ))}
              <tr className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="pt-1 pr-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Total</td>
                <td className="pt-1 text-right font-semibold tabular-nums" style={{ color: 'var(--series-orange)' }}>
                  {peso(stats.total)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Stock is not written off here: a returned bottle comes back sellable. The packing labour on it is counted in operating costs.
          </p>
        </div>
      )}

      {stats.provinces.length > 0 && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Worst provinces (20+ settled parcels)
          </p>
          <table className="w-full text-sm">
            <tbody>
              {stats.provinces.slice(0, 6).map((p) => (
                <tr key={p.name}>
                  <td className="py-0.5 pr-3" style={{ color: 'var(--text-secondary)' }}>{p.name}</td>
                  <td className="py-0.5 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {formatNumber(p.returned)}/{formatNumber(p.settled)}
                  </td>
                  <td className="w-16 py-0.5 text-right font-medium tabular-nums" style={{ color: p.rate > stats.rate * 1.4 ? 'var(--series-orange)' : 'var(--text-primary)' }}>
                    {formatPercent(p.rate, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
