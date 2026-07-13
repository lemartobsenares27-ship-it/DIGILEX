import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import NoteBanner from '../components/NoteBanner'
import GroupedBarChart from '../components/charts/GroupedBarChart'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import {
  listWeeks,
  weekLabel,
  weeklyCompanyKPIs,
  defaultReportingWeek,
  roasStatus,
  spendToRevenueStatus,
  rtsRateStatus,
  matchRateStatus,
  deltaPct,
  allTimeRTSRate,
  fulfillmentFeeHealth,
  remittanceHealth,
  type KPIStatus,
} from '../lib/kpi'

const STATUS_COLOR: Record<KPIStatus, string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical)',
}

function Trend({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const pct = deltaPct(current, previous)
  if (pct === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const isUp = pct > 0.001
  const isDown = pct < -0.001
  const good = invert ? isDown : isUp
  const color = isUp || isDown ? (good ? 'var(--status-good)' : 'var(--status-critical)') : 'var(--text-muted)'
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <Icon size={12} />
      {(pct * 100).toFixed(1)}% vs last week
    </span>
  )
}

function ScoreTile({
  label,
  value,
  status,
  trend,
  sub,
}: {
  label: string
  value: string
  status?: KPIStatus
  trend?: React.ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {status && <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {trend}
        {sub && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

function OwnerBadge({ owner }: { owner: 'You' | 'NPMCM' | 'Ads Manager' }) {
  const color =
    owner === 'You' ? 'var(--series-blue)' : owner === 'NPMCM' ? 'var(--series-violet)' : 'var(--series-orange)'
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {owner}
    </span>
  )
}

export default function KPIScorecard() {
  const orders = useLiveTable(db.orders)
  const fbTxns = useLiveTable(db.fbTxns)
  const posRows = useLiveTable(db.posReconciliation)
  const fulfillmentRows = useLiveTable(db.fulfillmentVerification)
  const soaRows = useLiveTable(db.soaReconciliation)

  const weeks = useMemo(() => listWeeks(orders), [orders])
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const activeWeek = selectedWeek ?? defaultReportingWeek(orders, weeks)
  const activeIdx = weeks.indexOf(activeWeek)
  const prevWeek = activeIdx > 0 ? weeks[activeIdx - 1] : null

  const current = useMemo(() => weeklyCompanyKPIs(orders, fbTxns, activeWeek), [orders, fbTxns, activeWeek])
  const previous = useMemo(() => (prevWeek ? weeklyCompanyKPIs(orders, fbTxns, prevWeek) : null), [orders, fbTxns, prevWeek])
  const showLagCaveat = current.ordersPlaced === 0

  const trendWeeks = useMemo(() => weeks.slice(-8), [weeks])
  const trendData = useMemo(
    () =>
      trendWeeks.map((w) => {
        const k = weeklyCompanyKPIs(orders, fbTxns, w)
        return { week: weekLabel(w), Revenue: k.revenue, 'Ad Spend': k.adSpend, 'Contribution Profit': k.contributionProfit }
      }),
    [trendWeeks, orders, fbTxns],
  )

  const rts = useMemo(() => allTimeRTSRate(posRows), [posRows])
  const fee = useMemo(() => fulfillmentFeeHealth(fulfillmentRows), [fulfillmentRows])
  const remit = useMemo(() => remittanceHealth(soaRows), [soaRows])

  const spendToRevenue = current.revenue > 0 ? current.adSpend / current.revenue : 0

  return (
    <div>
      <PageHeader
        title="KPI Scorecard"
        description="The vital few numbers that actually drive this business — updated from your live data every time you open this page, so you're never guessing. Company view compares this week to last week; vendor scorecards track NPMCM (fulfillment) and your ad accounts against the numbers they actually control."
        actions={
          <select
            value={activeWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-card)' }}
          >
            {weeks.map((w) => (
              <option key={w} value={w}>
                {weekLabel(w)}
              </option>
            ))}
          </select>
        }
      />

      <Card title="Company Scorecard" description={`Week of ${weekLabel(activeWeek)}`} className="mb-4">
        {showLagCaveat && (
          <NoteBanner>
            No orders were shipped in this week yet per your current data — this almost always means recent imports haven't caught up, not a real drop to zero. Treat this week's numbers as incomplete until your next SOA/POS import.
          </NoteBanner>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <ScoreTile label="Revenue" value={formatCurrency(current.revenue)} trend={previous && <Trend current={current.revenue} previous={previous.revenue} />} />
          <ScoreTile
            label="Contribution Profit"
            value={formatCurrency(current.contributionProfit)}
            status={current.contributionProfit >= 0 ? 'good' : 'critical'}
            trend={previous && <Trend current={current.contributionProfit} previous={previous.contributionProfit} />}
            sub="Revenue − COGS − Logistics − Ads"
          />
          <ScoreTile label="Orders Placed" value={formatNumber(current.ordersPlaced)} trend={previous && <Trend current={current.ordersPlaced} previous={previous.ordersPlaced} />} />
          <ScoreTile
            label="Delivery Rate (this week's orders)"
            value={formatPercent(current.deliveryRate)}
            sub="Still rising as recent orders resolve"
          />
          <ScoreTile label="Ad Spend" value={formatCurrency(current.adSpend)} trend={previous && <Trend current={current.adSpend} previous={previous.adSpend} invert />} />
          <ScoreTile
            label="ROAS"
            value={current.roas ? `${current.roas.toFixed(2)}x` : '—'}
            status={roasStatus(current.roas)}
            trend={previous && previous.roas > 0 && <Trend current={current.roas} previous={previous.roas} />}
          />
          <ScoreTile
            label="Cost per Order (CPA)"
            value={Number.isFinite(current.cpa) ? formatCurrency(current.cpa) : '—'}
            trend={previous && Number.isFinite(current.cpa) && Number.isFinite(previous.cpa) && <Trend current={current.cpa} previous={previous.cpa} invert />}
          />
          <ScoreTile
            label="Ad Spend ÷ Revenue"
            value={formatPercent(spendToRevenue)}
            status={spendToRevenueStatus(spendToRevenue)}
            sub="Above ~30% has historically meant shrinking margins"
          />
        </div>
      </Card>

      <Card title="8-Week Trend" description="Revenue, ad spend and contribution profit — this is the chart that would have caught the May ad-spend spike early" className="mb-4">
        <GroupedBarChart
          data={trendData}
          xKey="week"
          series={[
            { key: 'Revenue', label: 'Revenue', color: 'var(--series-blue)' },
            { key: 'Ad Spend', label: 'Ad Spend', color: 'var(--series-orange)' },
            { key: 'Contribution Profit', label: 'Contribution Profit', color: 'var(--series-violet)' },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="NPMCM — Fulfillment Vendor Scorecard"
          description="Their execution, checked against your own POS and SOA data"
          actions={<OwnerBadge owner="NPMCM" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <ScoreTile label="RTS Rate (all-time)" value={formatPercent(rts.rate)} status={rtsRateStatus(rts.rate)} sub={`${formatNumber(rts.rts)} of ${formatNumber(rts.delivered + rts.rts)} resolved`} />
            <ScoreTile
              label="Fulfillment Fee Match Rate"
              value={formatPercent(fee.matchRate)}
              status={matchRateStatus(fee.matchRate)}
              sub={`${formatCurrency(fee.totalFeeAtRisk)} fee at risk`}
            />
          </div>
          {!fee.recentClean && (
            <NoteBanner>Your 3 most recent batches are not all 100% clean — check Fulfillment Verification for which parcels to dispute.</NoteBanner>
          )}
        </Card>

        <Card
          title="Facebook Ads — Marketing Vendor Scorecard"
          description="Ad efficiency this week vs last — the number that told the real May story"
          actions={<OwnerBadge owner="Ads Manager" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <ScoreTile label="ROAS" value={current.roas ? `${current.roas.toFixed(2)}x` : '—'} status={roasStatus(current.roas)} />
            <ScoreTile label="Spend ÷ Revenue" value={formatPercent(spendToRevenue)} status={spendToRevenueStatus(spendToRevenue)} />
          </div>
        </Card>
      </div>

      <Card title="Remittance Health" description="NPMCM's expected payout vs what you've confirmed received, across every uploaded SOA batch" className="mt-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <ScoreTile label="Expected (all batches)" value={formatCurrency(remit.expected)} />
          <ScoreTile label="Confirmed Received" value={formatCurrency(remit.received)} />
          <ScoreTile label="Gap" value={formatCurrency(remit.gap)} status={remit.gap === 0 ? 'good' : 'critical'} sub={`${formatNumber(remit.batchCount)} batches tracked`} />
        </div>
        <NoteBanner>
          "Confirmed Received" is currently pre-filled to match Expected Payout per your process — it assumes every SOA was paid. Verify against your actual bank deposits to be certain this gap is really zero.
        </NoteBanner>
      </Card>

      <Card title="Accountability — Who Owns Which Number" className="mt-4">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-hairline)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Revenue, order volume, pricing, COGS</span>
            <OwnerBadge owner="You" />
          </div>
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-hairline)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>RTS rate, fulfillment fee accuracy, remittance timing</span>
            <OwnerBadge owner="NPMCM" />
          </div>
          <div className="flex items-center justify-between pb-1">
            <span style={{ color: 'var(--text-secondary)' }}>ROAS, cost per order, ad spend efficiency</span>
            <OwnerBadge owner="Ads Manager" />
          </div>
        </div>
      </Card>
    </div>
  )
}
