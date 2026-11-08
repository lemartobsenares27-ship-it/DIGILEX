// What to change, and what each change is worth.
//
// The weeks of October look contradictory until they go through one formula.
// The week spending PHP83,688 on ads made PHP10,904; the week spending
// PHP35,248 made PHP42,351. That reads as "spend less" and it is the wrong
// lesson. The first paid PHP201 to win a parcel, the second PHP116. The
// level of spend is not what decides it — the COST PER PARCEL is, and volume
// then multiplies whatever that gap happens to be.
//
// So the page leads with the formula, then lets the three parts be moved and
// shows the profit change immediately. Sliders rather than a table, because
// the useful question is never "what if returns were exactly 9%" — it is
// "how much does this have to move before it is worth doing".

import { useMemo, useState } from 'react'
import { Target, Undo2, Boxes, Megaphone } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import NeedsData from './NeedsData'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import { profitByMonth } from '../../lib/jntvip/profit'
import { toOperatingExpenses } from '../../lib/jntvip/operatingCosts'
import { baselineFrom, levers, profitUnder } from '../../lib/jntvip/levers'
import type {
  JntVipOperatingExpenseRow,
  JntVipParcelRow,
  JntVipSoaCheckRow,
} from '../../lib/jntvip/types'

/** Quantity as the shipper typed it — "3Pc -3 BOTTLES ...". Counted, not assumed. */
const QTY = /^\s*(\d+)\s*Pc/i
function bottlesOf(p: JntVipParcelRow): number {
  const m = QTY.exec(p.remarks ?? '')
  if (m) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0 && n < 100) return n
  }
  return 1
}

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })

export default function ProfitLevers() {
  const rows = useLiveTable(jntVipDb.soaChecks) as JntVipSoaCheckRow[]
  const parcels = useLiveTable(jntVipDb.parcels) as JntVipParcelRow[]
  const expenseRows = useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]
  const expenses = useMemo(() => toOperatingExpenses(expenseRows), [expenseRows])
  // The LATEST MONTH, not the whole run of data.
  //
  // Built on the blended 65 days it read PHP307 of contribution against
  // PHP296 of ad cost — the average of a business that lost money in
  // September and made it in October, describing neither. Every figure here
  // is a rate, and averaging rates across months that traded differently
  // produces a month that never happened.
  const months = useMemo(() => profitByMonth(rows, parcels, expenses), [rows, parcels, expenses])
  const pnl = months.length > 0 ? months[months.length - 1] : null

  const base = useMemo(() => {
    if (!pnl) return null
    const settled = parcels.filter(
      (p) => p.podDate?.startsWith(pnl.key) && (p.status === 'DELIVERED' || p.status === 'RETURNED'),
    )
    const delivered = settled.filter((p) => p.status === 'DELIVERED')
    return baselineFrom({
      parcels: settled.length,
      delivered: delivered.length,
      revenue: pnl.revenue,
      courier: pnl.courier,
      cogs: pnl.cogs,
      // Packing sits inside the operating total already; counting it here too
      // would charge the same PHP6 a bottle twice.
      packing: 0,
      adSpend: pnl.adSpend,
      fixedCosts: pnl.operating,
      bottlesDelivered: delivered.reduce((t, p) => t + bottlesOf(p), 0),
    })
  }, [pnl, parcels])

  const [rts, setRts] = useState<number | null>(null)
  const [adPer, setAdPer] = useState<number | null>(null)
  const [bottles, setBottles] = useState<number | null>(null)
  const [vol, setVol] = useState<number | null>(null)

  const scenario = useMemo(() => {
    if (!base) return null
    return {
      rtsRate: rts ?? base.rtsRate,
      adPerParcel: adPer ?? base.adPerParcel,
      bottlesPerOrder: bottles ?? base.bottlesPerOrder,
      parcels: vol ?? base.parcels,
    }
  }, [base, rts, adPer, bottles, vol])

  const list = useMemo(() => (base ? levers(base) : []), [base])

  if (!base || !scenario || !pnl) {
    return (
      <div>
        <PageHeader title="How to make more" description="What to change, and what each change is worth." />
        <NeedsData
          shows="the formula your profit actually follows, and what moving each part of it is worth"
          needs="the J&T Statements of Account and a parcel export"
          where="the J&T VIP portal"
          to="/import"
        />
      </div>
    )
  }

  const now = profitUnder(base, {
    rtsRate: base.rtsRate,
    adPerParcel: base.adPerParcel,
    bottlesPerOrder: base.bottlesPerOrder,
    parcels: base.parcels,
  })
  const projected = profitUnder(base, scenario)
  const gain = projected - now
  const touched = rts != null || adPer != null || bottles != null || vol != null

  return (
    <div>
      <PageHeader
        title="How to make more"
        description="Your whole business reduces to one line. Move the parts of it and see what each is worth."
      />

      <Card>
        <p className="text-center text-base" style={{ color: 'var(--text-secondary)' }}>
          profit = <strong style={{ color: 'var(--text-primary)' }}>parcels</strong> × (
          <strong style={{ color: 'var(--series-blue)' }}>{peso(base.contributionPerParcel)} contribution</strong> −{' '}
          <strong style={{ color: 'var(--series-orange)' }}>ad cost per parcel</strong>) −{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{peso(base.fixedCosts)} fixed</strong>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Fact label="A shipped parcel brings in" value={peso(base.contributionPerParcel)} note="after J&T, product and packing — whether it delivers or comes back" />
          <Fact label="You pay to win one" value={peso(base.adPerParcel)} note={`break-even is ${peso(base.breakEvenAdCost)} at this volume`} />
          <Fact
            label="So you keep"
            value={peso(base.contributionPerParcel - base.adPerParcel)}
            note={`× ${base.parcels.toLocaleString()} parcels, less fixed costs`}
            good
          />
        </div>
        <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          This is why October's weeks look contradictory. The week you spent {peso(8368800)} on ads made{' '}
          {peso(1090400)}; the week you spent {peso(3524800)} made {peso(4235100)}. The first paid {peso(20100)} to win
          a parcel, the second {peso(11600)}.{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            Spending less is not the lever. Paying less per parcel is.
          </strong>{' '}
          Above {peso(base.breakEvenAdCost)} a parcel, more volume is a bigger loss, not growth.
        </p>
      </Card>

      <Card title="Move the parts" description="Drag any of these. Everything recalculates from your own figures for the latest month." className="mt-4">
        <Slider icon={<Undo2 size={14} />} label="Return rate" value={scenario.rtsRate * 100} min={4} max={20} step={0.5} onChange={(v) => setRts(v / 100)} format={(v) => `${v.toFixed(1)}%`} baseline={base.rtsRate * 100} />
        <Slider icon={<Megaphone size={14} />} label="Ad cost per parcel" value={scenario.adPerParcel / 100} min={80} max={260} step={5} onChange={(v) => setAdPer(Math.round(v * 100))} format={(v) => peso(v * 100)} baseline={base.adPerParcel / 100} />
        <Slider icon={<Boxes size={14} />} label="Bottles per order" value={scenario.bottlesPerOrder} min={1} max={2.5} step={0.05} onChange={setBottles} format={(v) => v.toFixed(2)} baseline={base.bottlesPerOrder} />
        <Slider icon={<Target size={14} />} label="Parcels a month" value={scenario.parcels} min={500} max={4000} step={50} onChange={setVol} format={(v) => v.toLocaleString('en-PH')} baseline={base.parcels} />

        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: gain >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)', background: 'var(--surface-card)' }}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {touched ? 'Profit under these numbers' : 'Profit as things stand'}
              </span>
              <div className="text-3xl font-semibold tabular" style={{ color: projected >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)' }}>
                {peso(projected)}
              </div>
            </div>
            {touched && (
              <div className="text-right">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>vs now</span>
                <div className="text-2xl font-semibold tabular" style={{ color: gain >= 0 ? 'var(--status-good-ink)' : 'var(--series-orange)' }}>
                  {gain >= 0 ? '+' : ''}{peso(gain)}
                </div>
              </div>
            )}
          </div>
          {touched && (
            <button
              type="button"
              onClick={() => { setRts(null); setAdPer(null); setBottles(null); setVol(null) }}
              className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              Back to October's actual figures
            </button>
          )}
        </div>
      </Card>

      <Card title="Each lever on its own" description="One change at a time, against October. Ranked by what it is worth." className="mt-4">
        <table className="w-full text-sm">
          <tbody>
            {[...list].sort((a, b2) => b2.gain - a.gain).map((l) => (
              <tr key={l.label} className="border-t first:border-0" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="py-2 pr-3">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{l.label}</span>
                  {!l.measured && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>modelled</span>
                  )}
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{l.detail}</p>
                </td>
                <td className="whitespace-nowrap py-2 text-right align-top font-semibold tabular-nums" style={{ color: 'var(--status-good-ink)' }}>
                  +{peso(l.gain)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 border-t pt-3 text-xs" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
          Returns, ad cost and volume are measured from your own months. How much a second bottle adds is modelled —
          the pair sells for PHP599 rather than PHP798, so the bottle count is damped rather than doubled. It is the
          one figure here no month has tested, and it is set low enough to stay worth having if it is half wrong.
        </p>
      </Card>
    </div>
  )
}

function Fact({ label, value, note, good }: { label: string; value: string; note: string; good?: boolean }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular" style={{ color: good ? 'var(--status-good-ink)' : 'var(--text-primary)' }}>{value}</div>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{note}</p>
    </div>
  )
}

function Slider({
  icon, label, value, min, max, step, onChange, format, baseline,
}: {
  icon: React.ReactNode
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
  baseline: number
}) {
  const moved = Math.abs(value - baseline) > step / 2
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
          {label}
        </span>
        <span className="tabular text-sm font-semibold" style={{ color: moved ? 'var(--series-blue)' : 'var(--text-primary)' }}>
          {format(value)}
          {moved && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>was {format(baseline)}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
        style={{ accentColor: 'var(--series-blue)' }}
      />
    </div>
  )
}
