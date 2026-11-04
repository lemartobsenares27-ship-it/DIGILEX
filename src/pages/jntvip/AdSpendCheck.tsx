// "How do I check I am still profitable, when I am not sure what I spent?"
//
// The card statements and Meta's Ads Manager do not agree, and they never
// will exactly: Meta bills at a threshold, so spend always runs ahead of the
// charge. Waiting for them to match is waiting forever, and the question
// cannot wait — money is going out today.
//
// So the page does not try to settle the gap. It answers the question the gap
// cannot touch: HOW MUCH could advertising have been before the business
// stopped making money? That ceiling comes only from revenue and the costs
// that are known exactly — J&T's own statements, product, payroll, overhead —
// and is therefore certain even while the ad figure is not.
//
// Then any ad number can be tested against it. If the worst honest estimate
// still sits under the ceiling, the answer is yes, and no statement is needed
// to know it.

import { useMemo, useState } from 'react'
import { ShieldCheck, AlertTriangle, Calculator } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { profitAndLoss, profitByMonth } from '../../lib/jntvip/profit'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import { COVERAGE_BY_SOURCE } from '../../lib/jntvip/adSpend'
import { formatPercent } from '../../lib/format'
import type {
  JntVipOperatingExpenseRow,
  JntVipParcelRow,
  JntVipSoaCheckRow,
} from '../../lib/jntvip/types'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })

export default function AdSpendCheck() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])
  const all = useMemo(() => profitAndLoss(rows, parcels, expenses), [rows, parcels, expenses])
  const months = useMemo(() => profitByMonth(rows, parcels, expenses), [rows, parcels, expenses])

  // The LATEST month, not the whole run of data.
  //
  // Defaulting to the blended period was wrong in the way that matters most
  // here: across all 65 days the cards show more advertising than the ceiling
  // allows, because August and September lost money. The page answered "no,
  // not profitable" about a business that turned in October and is making
  // money now. A question asked in the present tense has to be answered about
  // the present.
  const [picked, setPicked] = useState<string>('')
  const period = useMemo(() => {
    if (months.length === 0) return null
    const found = months.find((m) => m.key === picked)
    return found ?? months[months.length - 1]
  }, [months, picked])

  const [typed, setTyped] = useState('')

  if (!all || !period) {
    return (
      <div>
        <PageHeader title="Am I still profitable?" description="The one check that does not need the ad figure to be settled." />
        <NeedsData
          shows="the most you could have spent on advertising and still broken even, and whether any figure you have beats it"
          needs="the J&T Statements of Account"
          where="the J&T VIP portal"
          to="/import"
        />
      </div>
    )
  }

  // The ceiling is built only from figures that are known exactly — COD
  // remitted on statements, product, payroll, overhead. It does not use the ad
  // figure at all, which is precisely why it survives the ad figure being
  // uncertain.
  const ceiling = period.revenue - period.courier - period.cogs - period.operating
  const recorded = period.adSpend
  const entered = Math.round(Number(typed.replace(/[^\d.]/g, '')) * 100)
  const test = Number.isFinite(entered) && entered > 0 ? entered : null
  const shown = test ?? recorded
  const profit = ceiling - shown
  const safe = profit > 0
  // Last calendar day of the month being shown.
  const monthEnd = (() => {
    const [y, m] = period.key.split('-').map(Number)
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  })()

  return (
    <div>
      <PageHeader
        title="Am I still profitable?"
        description="Your cards and Meta will never agree to the peso — Meta bills at a threshold, so its figure always runs ahead. This answers the question without settling that. One month at a time, because a blended figure buries the month you are actually in."
      />

      {months.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Month
          </span>
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

      <Card>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          In <strong style={{ color: 'var(--text-primary)' }}>{period.label}</strong> — {period.days} days —
          everything except advertising leaves you
        </p>
        <div className="mt-1 text-4xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
          {peso(ceiling)}
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          That is <strong style={{ color: 'var(--text-primary)' }}>the most you could have spent on ads and still broken even</strong>. It is
          built from COD actually remitted, J&amp;T's own charges, product, payroll and overhead — every one of them a
          figure you can point at. The ad number is the only uncertain one, and this ceiling does not use it.
        </p>
      </Card>

      <Card title="Test any ad figure against it" className="mt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              What did you really spend on ads?
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              inputMode="decimal"
              placeholder={(recorded / 100).toFixed(0)}
              className="mt-1 block w-56 rounded-lg border px-3 py-2 text-lg tabular"
              style={{
                borderColor: 'var(--border-hairline)',
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
              }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Blank uses the {peso(recorded)} your card statements show. Type the Ads Manager total to test the worst case.
            </p>
          </div>
        </div>

        <div
          className="mt-4 rounded-xl border p-4"
          style={{
            borderColor: safe ? 'var(--status-good-ink)' : 'var(--series-orange)',
            background: 'var(--surface-card)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0" style={{ color: safe ? 'var(--status-good-ink)' : 'var(--series-orange)' }}>
              {safe ? <ShieldCheck size={20} aria-hidden /> : <AlertTriangle size={20} aria-hidden />}
            </span>
            <div>
              <p className="text-lg font-semibold" style={{ color: safe ? 'var(--status-good-ink)' : 'var(--series-orange)' }}>
                {safe ? 'Yes — still profitable' : 'No — that would put you under'}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                At {peso(shown)} of advertising you keep{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{peso(profit)}</strong> over {period.days} days —{' '}
                {formatPercent(period.revenue > 0 ? profit / period.revenue : 0)} of what customers paid, at{' '}
                {shown > 0 ? (period.revenue / shown).toFixed(2) : '—'}x on ads.
                {test != null && (
                  <> That is {peso(Math.abs(test - recorded))} {test > recorded ? 'more' : 'less'} than your cards show.</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* A ladder, so the answer does not depend on getting the input right.
            Seeing where the line actually falls is more use than one verdict. */}
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="pb-2 text-left font-medium">If advertising was…</th>
              <th className="pb-2 text-right font-medium">You keep</th>
              <th className="pb-2 text-right font-medium">Margin</th>
              <th className="pb-2 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {[recorded, Math.round(recorded * 1.1), Math.round(recorded * 1.25), Math.round(recorded * 1.4), ceiling]
              .filter((v, i, a) => a.indexOf(v) === i)
              .sort((a, b) => a - b)
              .map((v) => {
                const p = ceiling - v
                const isCeil = v === ceiling
                return (
                  <tr key={v} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                    <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {peso(v)}
                      {v === recorded && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>your cards</span>}
                      {isCeil && <span className="ml-2 text-xs" style={{ color: 'var(--series-orange)' }}>break-even</span>}
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-right tabular-nums" style={{ color: p > 0 ? 'var(--status-good-ink)' : 'var(--series-orange)' }}>
                      {peso(p)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {formatPercent(period.revenue > 0 ? p / period.revenue : 0)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {v > 0 ? `${(period.revenue / v).toFixed(2)}x` : '—'}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </Card>

      {/* The single most useful fact on this page when the totals disagree:
          which card is behind, and since when. */}
      <Card title="How far each card is actually covered" className="mt-4">
        <table className="w-full text-sm">
          <tbody>
            {(Object.entries(COVERAGE_BY_SOURCE) as [string, string | null][]).map(([src, to]) => {
              // Against the LAST DAY of the month, not the month itself. Comparing
              // months said RCBC was "current for October" on the strength of
              // covering seven days of it — the exact false reassurance this
              // panel exists to prevent.
              const stale = to == null || to < monthEnd
              return (
                <tr key={src} className="border-t first:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-2" style={{ color: 'var(--text-primary)' }}>{src}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                    statements read up to {to ?? '—'}
                  </td>
                  <td className="py-2 text-right" style={{ color: stale ? 'var(--series-orange)' : 'var(--status-good-ink)' }}>
                    {stale ? `BEHIND — nothing after ${to ?? 'never'}` : 'covers the whole month'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Where a card is behind, the figure above is short by whatever its unread statements hold — not by money that
          went somewhere else. If the two cards are the only way ads are paid for, then every peso Meta reports beyond
          what is shown here sits in a statement that has not been read yet.
        </p>
      </Card>

      <Card title="Why the two numbers differ, and why it does not decide the answer" className="mt-4">
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex gap-2">
            <Calculator size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Ads Manager runs ahead of your cards, always.</strong> Meta
              charges when spend crosses a billing threshold, so at any moment some spend has happened and not yet been
              billed. The gap is normal; a gap of zero would be the surprise.
            </span>
          </li>
          <li className="flex gap-2">
            <Calculator size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>The P&amp;L uses the cards, deliberately.</strong> A card
              charge is money that left an account you control. Ads Manager is Meta's own account of itself. Where they
              disagree, the bank is the record — but the unbilled part is still a real debt, so test against it here.
            </span>
          </li>
          <li className="flex gap-2">
            <Calculator size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>The ceiling needs neither to be right.</strong> It is
              revenue less the costs that arrive on statements. However the ad question settles, the answer is simply
              whether the true figure is under {peso(ceiling)}.
            </span>
          </li>
        </ul>
      </Card>
    </div>
  )
}
