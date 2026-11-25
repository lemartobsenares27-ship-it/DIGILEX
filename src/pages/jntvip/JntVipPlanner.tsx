// "PROFITABILITY — audit sa calculator, kung may problem."
//
// The calculator from the owner's notes, rebuilt on this account's own rules
// and pre-filled with its own measured figures, so the first thing it shows is
// their real business rather than a worked example from a seminar.

import { useMemo, useState } from 'react'
import { AlertTriangle, PiggyBank, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/Card'
import PageHeader from '../../components/PageHeader'
import { plan, splitFunds, type PlannerInputs } from '../../lib/jntvip/planner'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const peso0 = (c: number) =>
  (c < 0 ? '-₱' : '₱') + Math.round(Math.abs(c) / 100).toLocaleString('en-PH')

/** Measured from this account, not assumed. */
const DEFAULTS: PlannerInputs = {
  adSpend: 21400000, // ~PHP214,000, November's run rate for a month
  roas: 2.61,
  pricePerParcel: 46488,
  cogPerParcel: 4792, // 1.198 bottles x PHP40
  rtsRate: 0.1263,
  shippingPerParcel: 7835,
  codFeeRate: 0.0275,
  vatRate: 0.12,
  opex: 5000000, // PHP50,000 a month
  rtsRecoveryRate: 0.8,
  days: 30,
}

function Field({
  label, value, onChange, suffix, step = 1, hint,
}: { label: string; value: number; onChange: (n: number) => void; suffix?: string; step?: number; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="mt-1 flex items-center gap-1.5">
        <input
          type="number"
          step={step}
          // Rounded for display only. 0.1263 x 100 is 12.629999999999999 in
          // binary floating point, and a field showing that invites the owner
          // to "fix" a number that was already right.
          value={Number.isFinite(value) ? Math.round(value * 1e4) / 1e4 : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border px-2.5 py-1.5 text-right text-sm tabular"
          style={{ borderColor: 'var(--border-hairline)', background: 'transparent', color: 'var(--text-primary)' }}
        />
        {suffix && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{suffix}</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  )
}

export default function JntVipPlanner() {
  const [i, setI] = useState<PlannerInputs>(DEFAULTS)
  const [revolvingPct, setRevolvingPct] = useState(40)
  const [reservePct, setReservePct] = useState(30)

  const set = (patch: Partial<PlannerInputs>) => setI((p) => ({ ...p, ...patch }))
  const r = useMemo(() => plan(i), [i])
  const funds = useMemo(
    () => splitFunds(Math.max(0, r.netProfit), { revolvingPct: revolvingPct / 100, reservePct: reservePct / 100 }),
    [r.netProfit, revolvingPct, reservePct],
  )
  const markup = i.cogPerParcel > 0 ? i.pricePerParcel / i.cogPerParcel : 0

  return (
    <div>
      <PageHeader
        title="Profit Calculator"
        description="If I put this much into ads at this return, what comes out? Pre-filled with your own measured figures — change any of them."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card title="Inputs">
          <div className="space-y-3">
            <Field label="Ad spend for the period" value={i.adSpend / 100} onChange={(n) => set({ adSpend: Math.round(n * 100) })} suffix="₱" step={1000} hint="November ran about ₱214,000 a month" />
            <Field label="ROAS" value={i.roas} onChange={(n) => set({ roas: n })} suffix="x" step={0.01} hint="Best month 2.61x · break-even about 2.00x" />
            <Field label="Days in the period" value={i.days} onChange={(n) => set({ days: n })} suffix="days" />
            <Field label="Average COD per parcel" value={i.pricePerParcel / 100} onChange={(n) => set({ pricePerParcel: Math.round(n * 100) })} suffix="₱" hint="Measured: ₱464.88" />
            <Field label="Product cost per parcel" value={i.cogPerParcel / 100} onChange={(n) => set({ cogPerParcel: Math.round(n * 100) })} suffix="₱" hint="1.198 bottles × ₱40" />
            <Field label="Return rate" value={i.rtsRate * 100} onChange={(n) => set({ rtsRate: n / 100 })} suffix="%" step={0.01} hint="Measured: 12.63%" />
            <Field label="Shipping per dispatched parcel" value={i.shippingPerParcel / 100} onChange={(n) => set({ shippingPerParcel: Math.round(n * 100) })} suffix="₱" hint="Measured: ₱78.35 · billed on dispatch" />
            <Field label="COD commission" value={i.codFeeRate * 100} onChange={(n) => set({ codFeeRate: n / 100 })} suffix="%" step={0.01} hint="J&T charges you 2.75%" />
            <Field label="VAT on the commission" value={i.vatRate * 100} onChange={(n) => set({ vatRate: n / 100 })} suffix="%" />
            <Field label="Running costs (OPEX)" value={i.opex / 100} onChange={(n) => set({ opex: Math.round(n * 100) })} suffix="₱" step={1000} hint="About ₱50,000 a month" />
            <Field label="Returned stock you can resell" value={i.rtsRecoveryRate * 100} onChange={(n) => set({ rtsRecoveryRate: n / 100 })} suffix="%" hint="Assumption — nobody has measured this" />
          </div>
          <button
            onClick={() => setI(DEFAULTS)}
            className="mt-4 w-full rounded-lg border py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            Reset to your measured figures
          </button>
        </Card>

        <div>
          {r.warnings.length > 0 && (
            <Card className="mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} style={{ color: 'var(--status-warning-ink)', flexShrink: 0, marginTop: 2 }} />
                <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {r.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            </Card>
          )}

          <Card className="mb-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Net profit</div>
                <div className="mt-1 text-3xl font-semibold tabular" style={{ color: r.netProfit >= 0 ? 'var(--status-good-ink)' : 'var(--status-critical)' }}>
                  {peso0(r.netProfit)}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {(r.margin * 100).toFixed(1)}% of COD · {peso0(r.profitPerDay)} a day
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Ad cost per delivered</div>
                <div className="mt-1 text-3xl font-semibold tabular" style={{ color: r.adPerDelivered <= r.breakEvenAdPerDelivered ? 'var(--status-good-ink)' : 'var(--status-critical)' }}>
                  {peso0(r.adPerDelivered)}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  break-even {peso0(r.breakEvenAdPerDelivered)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Parcels</div>
                <div className="mt-1 text-3xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {Math.round(r.delivered).toLocaleString('en-PH')}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  delivered of {Math.round(r.dispatched).toLocaleString('en-PH')} dispatched
                </div>
              </div>
            </div>
          </Card>

          <Card title="The waterfall" description="Every peso from gross sales down to net profit." className="mb-4">
            <table className="w-full text-sm">
              <tbody>
                {r.lines.map((l, n) => (
                  <tr
                    key={n}
                    className={l.kind === 'SUBTOTAL' || l.kind === 'RESULT' ? 'border-t-2' : 'border-b'}
                    style={{ borderColor: 'var(--border-hairline)' }}
                  >
                    <td className="py-2 pr-4" style={{ color: 'var(--text-primary)', fontWeight: l.kind === 'RESULT' ? 700 : l.kind === 'SUBTOTAL' ? 600 : 400, paddingLeft: l.kind === 'COST' ? '1rem' : 0 }}>
                      {l.label}
                      {l.note && <div className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{l.note}</div>}
                    </td>
                    <td
                      className="whitespace-nowrap py-2 text-right tabular"
                      style={{
                        color: l.kind === 'RESULT' ? (l.amount >= 0 ? 'var(--status-good-ink)' : 'var(--status-critical)') : l.kind === 'COST' ? 'var(--text-secondary)' : 'var(--text-primary)',
                        fontWeight: l.kind === 'RESULT' ? 700 : l.kind === 'SUBTOTAL' ? 600 : 400,
                        fontSize: l.kind === 'RESULT' ? '1.05rem' : undefined,
                      }}
                    >
                      {peso(l.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <Tag size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Pricing check</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The rule from your notes: price at <strong>8 to 10 times</strong> what the goods cost.
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular" style={{ color: markup >= 8 ? 'var(--status-good-ink)' : 'var(--status-warning-ink)' }}>
              {markup.toFixed(1)}×
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {peso(i.pricePerParcel)} collected on {peso(i.cogPerParcel)} of product
            </span>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {markup >= 8
              ? 'You are inside the rule. Pricing is not your problem — the cost of finding a buyer is, and that is the ad number above.'
              : 'Below the rule. At this markup there is not enough left between the bottle and the customer to pay for advertising.'}
          </p>
        </Card>

        <Card>
          <div className="mb-2 flex items-center gap-2">
            <PiggyBank size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Where the profit goes</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Company, revolving and reserve, from your notes. Money without a name gets spent.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Revolving (next cycle's stock and ads)" value={revolvingPct} onChange={setRevolvingPct} suffix="%" />
            <Field label="Reserve (not touched)" value={reservePct} onChange={setReservePct} suffix="%" />
          </div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {[
                ['Revolving funds', funds.revolving],
                ['Reserve fund', funds.reserve],
                ['Company funds (yours to draw)', funds.company],
              ].map(([label, amt]) => (
                <tr key={label as string} className="border-b last:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{label}</td>
                  <td className="py-2 text-right tabular font-medium" style={{ color: 'var(--text-primary)' }}>{peso(amt as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs" style={{ color: 'var(--status-warning-ink)' }}>
            Not yet, though. The business is still behind cumulatively, so every peso of profit
            repays that before any of it can be split. See{' '}
            <Link to="/balance-sheet" style={{ color: 'var(--series-orange)' }}>Balance Sheet</Link>.
          </p>
        </Card>
      </div>

      <Card title="Where this differs from the sheet in your notes">
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Three of the seminar sheet's rules are wrong for this business, and all three make the
          answer look better than it is.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Shipping was charged on parcels that landed.</strong>{' '}
            J&amp;T bills on dispatch. A parcel that comes back was still carried and still costs
            its freight, so at a 12.6% return rate that is 12.6% more shipping than the sheet counts.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>The COD fee was 2.00% with no VAT line.</strong>{' '}
            Yours is 2.75%, plus 12% VAT on the fee itself.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Product cost was charged only on delivered parcels.</strong>{' '}
            The bottles in a returned parcel were still bought and packed. This charges everything
            dispatched and credits back what comes home saleable.
          </li>
        </ol>
        <p className="mt-3 rounded-lg p-3 text-sm" style={{ background: 'color-mix(in srgb, var(--status-warning-ink) 10%, transparent)', color: 'var(--text-primary)' }}>
          <strong>And the one worth remembering.</strong> That sheet showed a net profit of
          ₱6,368,064.29 against an OPEX of ₱1.00 — a million pesos of overhead typed as one peso,
          and nothing caught it. A calculator that will not argue with you is a calculator that will
          confirm whatever you type. That is why this one checks its own inputs.
        </p>
      </Card>
    </div>
  )
}
