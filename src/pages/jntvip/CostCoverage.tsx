// "Can I trust this number?"
//
// The honest answer to "I have a lot of expenses and I don't know the numbers"
// is not another chart. It is a list: here is every cost this page counts and
// where each one came from, here is what it cannot see, and here is how large
// the gap would have to be before the answer changes.
//
// Without that, a correct profit figure is still untrustworthy — the reader
// knows there are costs they have not told anyone about, so they discount the
// whole thing. Naming the boundary is what makes the number usable.

import { ShieldCheck, HelpCircle, Ban } from 'lucide-react'
import Card from '../../components/Card'
import { formatNumber } from '../../lib/format'

const peso = (c: number) =>
  (c < 0 ? '-₱' : '₱') + (Math.abs(c) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Line {
  label: string
  source: string
}

const COUNTED: Line[] = [
  { label: 'COD collected from customers', source: '34 J&T statements, 33 of them matched to a bank credit to the centavo' },
  { label: 'Shipping, COD commission, VAT, RTS fees', source: 'the same statements — shipping and COD verified against your parcel export on every overlapping period' },
  { label: 'Product cost', source: 'your capsule and packaging prices, times bottles counted from the parcel export' },
  { label: 'Facebook advertising', source: '194 charges read off the GoTyme and RCBC statements — not from Meta receipts, which understated August by ₱137,060' },
  { label: 'Payroll — Marcian ₱750/day (5 days a week), CSR admin ₱500/day then ₱700', source: 'the rates you gave. The date the CSR rate steps up is an assumption and is editable below.' },
  { label: 'Warehouse fulfilment, Meralco, internet', source: 'the rates you gave, editable below' },
]

/** Outflows seen in the bank but deliberately NOT charged to the business. */
const EXCLUDED: Line[] = [
  { label: 'Transfers between your own accounts', source: '₱815,345 over two months — moving your own money, not spending it. Much of it funds the ad card, which IS counted.' },
  { label: 'Credit card bill payments', source: '₱94,982 — paying the card whose Facebook charges are already in the ad figure. Counting both would double-count.' },
  { label: 'Majestic Line, Germike Packaging', source: '₱28,790 — buying stock. Already counted per bottle as product cost.' },
  { label: 'Shopee, food, load, family transfers', source: '₱16,149 — personal, not business.' },
  { label: 'Drew Marcian Abanez', source: '₱19,480 — this is payroll, now counted properly above at ₱750 a day, five days a week. The bank transfers are how it was paid, so counting them again would double-charge it.' },
]

const UNKNOWN = [
  { label: 'Incepxion Services Inc', amount: 100000 },
  { label: 'Mariella Bareto Obsenares', amount: 65000 },
  { label: 'Sa**h Ro*e S.', amount: 58700 },
  { label: 'Pk Corp', amount: 49300 },
  { label: 'L** C.', amount: 12000 },
  { label: 'Malou O', amount: 10000 },
]

export default function CostCoverage({ profit, days }: { profit: number; days: number }) {
  const unknownTotal = UNKNOWN.reduce((t, u) => t + u.amount, 0)
  const unknownPerMonth = Math.round(unknownTotal / 2)
  const perDay = days > 0 ? Math.round(profit / days) : 0
  const unknownPerDay = Math.round(unknownPerMonth / 30)
  const stillProfit = profit - Math.round((unknownPerMonth * days) / 30)
  const multiple = unknownPerDay > 0 ? perDay / unknownPerDay : 0

  return (
    <Card
      title="Can you trust this number?"
      description="Every cost counted, where it came from, and what is still invisible."
      className="mt-4"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--status-good-ink)' }}>
            <ShieldCheck size={15} /> Counted, and where it came from
          </div>
          {COUNTED.map((l) => (
            <div key={l.label} className="mb-2">
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{l.label}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{l.source}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <Ban size={15} /> Seen in your bank, deliberately not charged
          </div>
          {EXCLUDED.map((l) => (
            <div key={l.label} className="mb-2">
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{l.label}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{l.source}</div>
            </div>
          ))}
        </div>
      </div>

      {/* The gap, sized. This is the part that answers the worry. */}
      <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--status-warning-ink)' }}>
          <HelpCircle size={15} /> Genuinely unexplained — {peso(unknownTotal)} over two months
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {UNKNOWN.map((u) => (
            <span key={u.label} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {u.label} <strong className="tabular" style={{ color: 'var(--text-primary)' }}>{peso(u.amount)}</strong>
            </span>
          ))}
        </div>

        <div className="mt-3 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--status-good-ink) 10%, transparent)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Charge <strong>every one of those pesos</strong> to the business and this period still
            makes <strong>{peso(stillProfit)}</strong> instead of {peso(profit)}.
            {multiple > 1 && (
              <>
                {' '}
                For it to become a loss, hidden costs would have to exceed{' '}
                <strong>{peso(perDay)} a day</strong> — about {formatNumber(Math.round(multiple))} times
                everything unexplained in your bank account.
              </>
            )}
          </p>
        </div>

        <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <strong>GCash is spent money, not a gap.</strong> You have said that once it leaves
          MariBank for GCash it is already an expense, and that is the right way to count it: it
          does not come back. What is still missing is not the rule but the amount. MariBank's
          October statement shows {peso(25180300)} of transfers to your own accounts as a single
          bucket, and that bucket funds both the GoTyme ad card and GCash. The ad card half must
          not be charged — the advertising it buys is already counted from the card statements,
          and charging the transfer too would count it twice. So the GCash half needs splitting
          out of that {peso(25180300)} before any of it can be charged.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          One thing to settle when it is: the CSR admin is already charged here at the stated daily
          rate, and {peso(1360000)} of that is believed to be paid through GCash. If the GCash
          transfer is charged as a lump as well, that {peso(1360000)} is charged twice. Whichever
          way it is counted, it is counted once.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          These figures see UnionBank (J&amp;T money in), MariBank (suppliers and funding out),
          GoTyme and the RCBC card (advertising).
        </p>
      </div>
    </Card>
  )
}
