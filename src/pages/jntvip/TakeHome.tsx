// What the month actually leaves you.
//
// Every other page stops at business profit, and that is the wrong number to
// live on. Card instalments and money sent to family leave the same account
// and never touch a profit and loss, so a month can clear PHP56,000 and leave
// nothing — with no page explaining the difference.
//
// It is also the page that should carry good news honestly. The instalments
// END. Showing them as a flat monthly drain hides the fact that PHP12,800 a
// month comes back by March without a single extra sale, so each one counts
// down and the months ahead are laid out.
//
// Supplier payments and stock are deliberately absent. They are already inside
// the per-bottle cost, and counting them here as personal spending was an
// error worth PHP19,044 when a Shopee stock purchase was read that way.

import { useMemo, useState } from 'react'
import { Wallet, CalendarClock, TrendingUp, Building2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StatTile from '../../components/StatTile'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { profitByMonth } from '../../lib/jntvip/profit'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import { takeHomeFor } from '../../lib/jntvip/personal'
import { formatPercent } from '../../lib/format'
import type {
  JntVipOperatingExpenseRow,
  JntVipParcelRow,
  JntVipSoaCheckRow,
} from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })
const pesoExact = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MONTH = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

export default function TakeHome() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])
  const months = useMemo(() => profitByMonth(rows, parcels, expenses), [rows, parcels, expenses])

  const [picked, setPicked] = useState('')
  const period = useMemo(() => {
    if (months.length === 0) return null
    return months.find((m) => m.key === picked) ?? months[months.length - 1]
  }, [months, picked])

  const th = useMemo(() => (period ? takeHomeFor(period.key, period.profit) : null), [period])

  // Above the early return, because hooks must run in the same order every
  // render — placing this after it crashed the page with React error #310 the
  // moment there was no data to show.
  const ahead = useMemo(() => {
    if (!period) return []
    const [y, m] = period.key.split('-').map(Number)
    return Array.from({ length: 6 }, (_, i) => {
      const idx = y * 12 + (m - 1) + i + 1
      const key = `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
      return takeHomeFor(key, period.profit)
    })
  }, [period])

  if (!period || !th) {
    return (
      <div>
        <PageHeader title="What you actually take home" description="Business profit is not what reaches you." />
        <NeedsData
          shows="what a month leaves you after the money that is yours and not the business's — card instalments and family transfers"
          needs="the J&T Statements of Account"
          where="the J&T VIP portal"
          to="/import"
        />
      </div>
    )
  }

  const good = th.takeHome >= 0

  return (
    <div>
      <PageHeader
        title="What you actually take home"
        description="Business profit is what the business made. This is what reached you after the money that is yours and not its."
      />

      {months.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Month</span>
          {months.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setPicked(m.key)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: m.key === period.key ? 'var(--series-blue)' : 'var(--border-hairline)',
                color: m.key === period.key ? 'var(--series-blue)' : 'var(--text-secondary)',
                background: m.key === period.key ? 'color-mix(in srgb, var(--series-blue) 10%, transparent)' : 'var(--surface-card)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="The business made"
          value={peso(th.businessProfit)}
          icon={<Building2 size={16} />}
          accent={th.businessProfit >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)'}
          sub={`${formatPercent(period.margin)} of what customers paid`}
        />
        <StatTile
          label="Left your pocket"
          value={peso(th.outflowTotal)}
          icon={<Wallet size={16} />}
          accent="var(--series-orange)"
          sub="instalments and family — not business costs"
        />
        <StatTile
          label="YOU TOOK HOME"
          value={peso(th.takeHome)}
          icon={<TrendingUp size={16} />}
          accent={good ? 'var(--status-good-ink)' : 'var(--series-orange)'}
          sub={MONTH(period.key)}
        />
        <StatTile
          label="Comes back by"
          value={th.lastInstalmentMonth ? MONTH(th.lastInstalmentMonth).split(' ')[0] : '—'}
          icon={<CalendarClock size={16} />}
          accent="var(--series-violet)"
          sub={`${peso(th.freedWhenInstalmentsEnd)}/month when instalments finish`}
        />
      </div>

      <Card title={`${MONTH(period.key)}, from the business down to you`} className="mt-4">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <td className="py-2 pr-3">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Business profit</span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  COD collected, less everything the business spent — J&amp;T, product, staff, overhead and advertising
                </p>
              </td>
              <td className="whitespace-nowrap py-2 text-right align-top font-semibold tabular-nums" style={{ color: 'var(--status-good-ink)' }}>
                {pesoExact(th.businessProfit)}
              </td>
            </tr>
            {th.outflows.map((l) => (
              <tr key={l.key} className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="py-2 pr-3">
                  <span style={{ color: 'var(--text-primary)' }}>{l.label}</span>
                  {l.remaining != null && (
                    <span className="ml-2 rounded px-1.5 py-0.5 text-xs" style={{ background: 'color-mix(in srgb, var(--series-violet) 14%, transparent)', color: 'var(--series-violet)' }}>
                      {l.remaining === 0 ? 'last payment' : `${l.remaining} more`}
                    </span>
                  )}
                  {l.variable && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>varies</span>
                  )}
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{l.detail}</p>
                </td>
                <td className="whitespace-nowrap py-2 text-right align-top tabular-nums" style={{ color: 'var(--series-orange)' }}>
                  -{pesoExact(l.amount)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 pr-3">
                <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>You took home</span>
              </td>
              <td className="whitespace-nowrap pt-3 text-right text-xl font-semibold tabular" style={{ color: good ? 'var(--status-good-ink)' : 'var(--series-orange)' }}>
                {pesoExact(th.takeHome)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
          Stock and supplier payments are not here on purpose. Those are already counted inside the cost of each
          bottle, and listing them again as personal spending once took PHP19,044 off this figure for money that had
          gone into stock to sell.
        </p>
      </Card>

      <Card
        title="What happens as the instalments finish"
        description="Same business profit, nothing else improving — just the plans ending on their own schedule."
        className="mt-4"
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="pb-2 text-left font-medium">Month</th>
              <th className="pb-2 text-right font-medium">Leaves your pocket</th>
              <th className="pb-2 text-right font-medium">You take home</th>
              <th className="pb-2 text-right font-medium">vs now</th>
            </tr>
          </thead>
          <tbody>
            {ahead.map((a) => {
              const up = a.takeHome - th.takeHome
              return (
                <tr key={a.month} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-1.5" style={{ color: 'var(--text-primary)' }}>{MONTH(a.month)}</td>
                  <td className="whitespace-nowrap py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {pesoExact(a.outflowTotal)}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {pesoExact(a.takeHome)}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-right tabular-nums" style={{ color: up > 0 ? 'var(--status-good-ink)' : 'var(--text-muted)' }}>
                    {up > 0 ? `+${peso(up)}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          This assumes the business makes exactly what it made in {MONTH(period.key)} and nothing else changes. It is
          not a forecast of the business — it is what the instalments alone are worth, which is {peso(th.freedWhenInstalmentsEnd)} a
          month once they all finish.
        </p>
      </Card>
    </div>
  )
}
