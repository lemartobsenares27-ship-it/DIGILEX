import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Card from '../components/Card'
import NoteBanner from '../components/NoteBanner'
import DataTable, { type ColumnDef } from '../components/DataTable'
import ParcelsDateRangeFilter, { type MonthOption } from '../components/ParcelsDateRangeFilter'
import type { OrderRow, SOAReconciliationRow } from '../lib/types'
import { formatCurrency, formatDate, formatNumber } from '../lib/format'

type TabKey = 'daily' | 'repeat-customers' | 'rts' | 'remittance'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'daily', label: 'Daily Overview' },
  { key: 'repeat-customers', label: 'Repeat Customers' },
  { key: 'rts', label: 'RTS Center' },
  { key: 'remittance', label: 'Expected vs Actual Remittance' },
]

const chartTooltipStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary)',
}

function isDelivered(status: string | null): boolean {
  return (status ?? '').toLowerCase().includes('delivered')
}

function isRTS(status: string | null): boolean {
  return (status ?? '').toLowerCase().includes('rts')
}

function monthOptionsFromDates(dates: string[], minDate: string, maxDate: string): MonthOption[] {
  const keys = new Set<string>()
  for (const d of dates) keys.add(d.slice(0, 7))
  return [...keys].sort().map((key) => {
    const [y, m] = key.split('-').map(Number)
    const first = `${key}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const last = `${key}-${String(lastDay).padStart(2, '0')}`
    const label = new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return {
      key,
      label,
      start: first < minDate ? minDate : first,
      end: last > maxDate ? maxDate : last,
    }
  })
}

// ---------------------------------------------------------------------------
// Tab 1 — Daily Overview
// ---------------------------------------------------------------------------
function DailyOverviewTab({ orders }: { orders: OrderRow[] }) {
  const daily = useMemo(() => {
    const map = new Map<string, { date: string; delivered: number; rts: number; other: number; value: number }>()
    for (const o of orders) {
      const date = o['Date Ordered (Shipped)']
      if (!date) continue
      const bucket = map.get(date) ?? { date, delivered: 0, rts: 0, other: 0, value: 0 }
      bucket.value += o['Selling Price (COD)'] ?? 0
      if (isDelivered(o.Status)) bucket.delivered += 1
      else if (isRTS(o.Status)) bucket.rts += 1
      else bucket.other += 1
      map.set(date, bucket)
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [orders])

  const totals = useMemo(() => {
    const delivered = orders.filter((o) => isDelivered(o.Status)).length
    const rts = orders.filter((o) => isRTS(o.Status)).length
    const value = orders.reduce((s, o) => s + (o['Selling Price (COD)'] ?? 0), 0)
    return { total: orders.length, delivered, rts, value }
  }, [orders])

  const rangeLabel =
    daily.length > 0 ? `${formatDate(daily[0].date)} – ${formatDate(daily[daily.length - 1].date)} (${daily.length} day(s))` : 'no data yet'

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Showing data: {rangeLabel}
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total Parcels" value={formatNumber(totals.total)} />
        <StatTile label="Delivered" value={formatNumber(totals.delivered)} accent="var(--status-good)" />
        <StatTile label="RTS" value={formatNumber(totals.rts)} accent="var(--status-critical)" />
        <StatTile label="Total COD Value Shipped" value={formatCurrency(totals.value)} accent="var(--series-blue)" />
      </div>
      <Card title="Parcels Shipped Per Day" description="Outcome breakdown by ship date">
        {daily.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No parcels yet — import a POS order export to see daily activity here.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={daily} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: 'var(--border-strong)' }}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v: string) => formatDate(v)}
                minTickGap={40}
              />
              <YAxis tickLine={false} axisLine={false} width={40} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} allowDecimals={false} />
              <Tooltip labelFormatter={(v: unknown) => formatDate(v)} contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="delivered" name="Delivered" stackId="a" fill="var(--status-good)" />
              <Bar dataKey="rts" name="RTS" stackId="a" fill="var(--status-critical)" />
              <Bar dataKey="other" name="Other / Pending" stackId="a" fill="var(--text-muted)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Repeat Customers
// ---------------------------------------------------------------------------
interface RepeatCustomerRow {
  id: number
  customerName: string
  phone: string
  orderCount: number
  totalValue: number
  delivered: number
  rts: number
  deliveryRate: number
  reviewFlag: string | null
}

// Orders in one phone number well beyond what a genuine repeat customer would
// place in this dataset are more likely a CS/placeholder number than a real
// person — surface them for review instead of trusting the raw count.
const REPEAT_CUSTOMER_REVIEW_THRESHOLD = 20

function RepeatCustomersTab({ orders }: { orders: OrderRow[] }) {
  const rows = useMemo<RepeatCustomerRow[]>(() => {
    const map = new Map<
      string,
      { phone: string; customerName: string; orderCount: number; totalValue: number; delivered: number; rts: number }
    >()
    for (const o of orders) {
      const phone = (o.Phone ?? '').trim()
      if (!phone) continue
      const bucket = map.get(phone) ?? { phone, customerName: o.Customer ?? '', orderCount: 0, totalValue: 0, delivered: 0, rts: 0 }
      bucket.orderCount += 1
      bucket.totalValue += o['Selling Price (COD)'] ?? 0
      if (isDelivered(o.Status)) bucket.delivered += 1
      if (isRTS(o.Status)) bucket.rts += 1
      map.set(phone, bucket)
    }
    return [...map.values()]
      .filter((r) => r.orderCount >= 2)
      .sort((a, b) => b.orderCount - a.orderCount)
      .map((r, i) => ({
        id: i,
        customerName: r.customerName,
        phone: r.phone,
        orderCount: r.orderCount,
        totalValue: r.totalValue,
        delivered: r.delivered,
        rts: r.rts,
        deliveryRate: r.orderCount > 0 ? r.delivered / r.orderCount : 0,
        reviewFlag: r.orderCount > REPEAT_CUSTOMER_REVIEW_THRESHOLD ? 'Needs review' : null,
      }))
  }, [orders])

  const flaggedCount = rows.filter((r) => r.reviewFlag).length

  const columns: ColumnDef<RepeatCustomerRow>[] = [
    { key: 'customerName', label: 'Customer', width: '200px' },
    { key: 'phone', label: 'Phone', width: '140px' },
    { key: 'orderCount', label: 'Orders', type: 'number', align: 'right' },
    { key: 'totalValue', label: 'Total Value', type: 'currency', align: 'right' },
    { key: 'delivered', label: 'Delivered', type: 'number', align: 'right' },
    { key: 'rts', label: 'RTS', type: 'number', align: 'right' },
    { key: 'deliveryRate', label: 'Delivery Rate', type: 'percent', align: 'right' },
    { key: 'reviewFlag', label: 'Flag', type: 'badge' },
  ]

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {formatNumber(rows.length)} repeat customer(s) — 2 or more orders on the same phone number
      </p>
      {flaggedCount > 0 && (
        <NoteBanner>
          {`${flaggedCount} phone number(s) have more than ${REPEAT_CUSTOMER_REVIEW_THRESHOLD} orders in this data — that's an unusual amount for one real customer and more likely a CS/placeholder number reused across orders. Verify before treating these as genuine repeat customers.`}
        </NoteBanner>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getId={(r) => r.id}
        searchKeys={['customerName', 'phone']}
        pageSize={50}
        csvName="repeat-customers"
        emptyLabel="No repeat customers yet — every phone number has ordered only once."
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — RTS Center
// ---------------------------------------------------------------------------
const RTS_COLUMNS: ColumnDef<OrderRow>[] = [
  { key: 'Order / Tracking #', label: 'Tracking #', editable: true, width: '160px' },
  { key: 'Date Ordered (Shipped)', label: 'Shipped', type: 'date', editable: true },
  { key: 'Customer', label: 'Customer', editable: true },
  { key: 'Product', label: 'Product', editable: true },
  { key: 'Selling Price (COD)', label: 'Value', type: 'currency', editable: true, align: 'right' },
  { key: 'RTS Date', label: 'RTS Date', type: 'date', editable: true },
  { key: 'RTS Reason', label: 'Reason', editable: true, width: '260px' },
  { key: 'Courier', label: 'Courier', editable: true },
]

function RTSCenterTab({ orders }: { orders: OrderRow[] }) {
  const rtsOrders = useMemo(() => orders.filter((o) => isRTS(o.Status)), [orders])
  const totalValue = useMemo(() => rtsOrders.reduce((s, o) => s + (o['Selling Price (COD)'] ?? 0), 0), [rtsOrders])

  const reasonCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of rtsOrders) {
      const reason = (o['RTS Reason'] ?? '').trim() || 'No reason recorded'
      map.set(reason, (map.get(reason) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [rtsOrders])

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="RTS Parcels" value={formatNumber(rtsOrders.length)} accent="var(--status-critical)" />
        <StatTile label="RTS Value" value={formatCurrency(totalValue)} accent="var(--status-critical)" />
        <StatTile label="Distinct Reasons Logged" value={formatNumber(reasonCounts.length)} />
      </div>
      {reasonCounts.length > 0 && (
        <Card
          title="Top RTS Reasons"
          description="Pulled from the courier's raw shipping-status text — treat as a signal, not a clean category"
          className="mb-4"
        >
          <ResponsiveContainer width="100%" height={Math.max(160, reasonCounts.length * 32)}>
            <BarChart data={reasonCounts} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border-hairline)" />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-strong)' }}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={220}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="var(--status-critical)" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
      <DataTable
        columns={RTS_COLUMNS}
        rows={rtsOrders}
        getId={(r) => r.id!}
        searchKeys={['Order / Tracking #', 'Customer', 'Product']}
        pageSize={50}
        csvName="rts-center"
        onUpdate={(id, key, value) => db.orders.update(id, { [key]: value })}
        emptyLabel="No RTS parcels right now."
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — Expected vs Actual Remittance
// ---------------------------------------------------------------------------
function RemittanceTab({ orders, soaRows }: { orders: OrderRow[]; soaRows: SOAReconciliationRow[] }) {
  const posRemittance = useMemo(() => {
    const delivered = orders.filter((o) => isDelivered(o.Status))
    const remitted = delivered.filter((o) => !!o['Payout Batch'])
    const awaiting = delivered.filter((o) => !o['Payout Batch'])
    return {
      deliveredCount: delivered.length,
      remittedCount: remitted.length,
      awaitingCount: awaiting.length,
      remittedValue: remitted.reduce((s, o) => s + (o['Selling Price (COD)'] ?? 0), 0),
      awaitingValue: awaiting.reduce((s, o) => s + (o['Selling Price (COD)'] ?? 0), 0),
    }
  }, [orders])

  const soaTotals = useMemo(
    () =>
      soaRows.reduce(
        (acc, r) => {
          acc.codCollected += r['Total COD Collected'] ?? 0
          acc.expectedPayout += r['Expected Payout (For Remittance)'] ?? 0
          acc.actuallyReceived += r['Amount Actually Received'] ?? 0
          acc.difference += r.Difference ?? 0
          return acc
        },
        { codCollected: 0, expectedPayout: 0, actuallyReceived: 0, difference: 0 },
      ),
    [soaRows],
  )

  return (
    <div>
      <NoteBanner>
        Parcels here come straight from your POS orders. &quot;Remitted&quot; means a courier remittance file has already
        been matched to that order (Payout Batch set); &quot;Awaiting&quot; means it&apos;s delivered but not yet matched
        to a remittance. For the full courier-by-courier SOA arithmetic and confirmed shortfalls, see SOA Breakdown &amp;
        Verification.
      </NoteBanner>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Delivered (POS)" value={formatNumber(posRemittance.deliveredCount)} />
        <StatTile
          label="Remitted"
          value={formatCurrency(posRemittance.remittedValue)}
          accent="var(--status-good)"
          sub={`${formatNumber(posRemittance.remittedCount)} parcel(s)`}
        />
        <StatTile
          label="Awaiting Remittance"
          value={formatCurrency(posRemittance.awaitingValue)}
          accent="var(--status-warning)"
          sub={`${formatNumber(posRemittance.awaitingCount)} parcel(s)`}
        />
        <StatTile
          label="Confirmed Shortfall (all SOAs)"
          value={formatCurrency(soaTotals.difference)}
          accent={soaTotals.difference < 0 ? 'var(--status-critical)' : 'var(--status-good)'}
        />
      </div>
      <Card
        title="Courier SOA Rollup"
        description="All-time totals across every uploaded Statement of Account batch — not affected by the date filter above"
      >
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total COD Collected
            </div>
            <div className="mt-1 font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(soaTotals.codCollected)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Expected Payout
            </div>
            <div className="mt-1 font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(soaTotals.expectedPayout)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Actually Received
            </div>
            <div className="mt-1 font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(soaTotals.actuallyReceived)}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Difference
            </div>
            <div
              className="mt-1 font-semibold tabular"
              style={{ color: soaTotals.difference < 0 ? 'var(--status-critical)' : 'var(--status-good)' }}
            >
              {formatCurrency(soaTotals.difference)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ParcelsMonitoring() {
  const [tab, setTab] = useState<TabKey>('daily')
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const orders = useLiveTable(db.orders)
  const soaRows = useLiveTable(db.soaReconciliation)

  const shippedDates = useMemo(
    () => orders.map((o) => o['Date Ordered (Shipped)']).filter((d): d is string => !!d).sort(),
    [orders],
  )
  const minDate = shippedDates[0] ?? new Date().toISOString().slice(0, 10)
  const maxDate = shippedDates[shippedDates.length - 1] ?? new Date().toISOString().slice(0, 10)
  const monthOptions = useMemo(() => monthOptionsFromDates(shippedDates, minDate, maxDate), [shippedDates, minDate, maxDate])

  const { start: rangeStart, end: rangeEnd } = dateRange ?? { start: minDate, end: maxDate }

  const filteredOrders = useMemo(
    () => orders.filter((o) => {
      const d = o['Date Ordered (Shipped)']
      return !!d && d >= rangeStart && d <= rangeEnd
    }),
    [orders, rangeStart, rangeEnd],
  )

  return (
    <div>
      <PageHeader
        title="Parcels Monitoring"
        description="Every parcel from your POS orders, tracked end to end — shipped, delivered, RTS, and reconciled against courier remittance, so your bookkeeping stays fully transparent."
      />
      <ParcelsDateRangeFilter
        startDate={rangeStart}
        endDate={rangeEnd}
        minDate={minDate}
        maxDate={maxDate}
        monthOptions={monthOptions}
        onChange={(start, end) => setDateRange({ start, end })}
      />
      <div className="mb-4 flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-2 text-sm font-medium transition-colors"
            style={{
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--series-blue)' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && <DailyOverviewTab orders={filteredOrders} />}
      {tab === 'repeat-customers' && <RepeatCustomersTab orders={filteredOrders} />}
      {tab === 'rts' && <RTSCenterTab orders={filteredOrders} />}
      {tab === 'remittance' && <RemittanceTab orders={filteredOrders} soaRows={soaRows} />}
    </div>
  )
}
