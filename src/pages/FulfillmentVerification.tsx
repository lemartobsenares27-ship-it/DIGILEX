import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import StatTile from '../components/StatTile'
import Card from '../components/Card'
import NoteBanner from '../components/NoteBanner'
import DataTable, { type ColumnDef } from '../components/DataTable'
import type { FulfillmentVerificationRow, UnmatchedFulfillmentFeeRow } from '../lib/types'
import { formatCurrency, formatDate, formatNumber } from '../lib/format'
import seed from '../data/fulfillmentVerification.json'

const COLUMNS: ColumnDef<FulfillmentVerificationRow>[] = [
  { key: 'Batch Period', label: 'Batch Period', editable: true, width: '180px' },
  { key: 'Parcels Fulfilled (NPMCM)', label: 'Fulfilled', type: 'number', editable: true, align: 'right' },
  { key: 'Matched to POS', label: 'Matched', type: 'number', editable: true, align: 'right' },
  { key: 'Unmatched', label: 'Unmatched', type: 'number', editable: true, align: 'right' },
  { key: 'Fee at Risk', label: 'Fee at Risk', type: 'currency', editable: true, align: 'right' },
  { key: 'Match Rate', label: 'Match Rate', type: 'percent', editable: true, align: 'right' },
  { key: 'Status', label: 'Status', type: 'badge', editable: true },
]

const DETAIL_COLUMNS: ColumnDef<UnmatchedFulfillmentFeeRow>[] = [
  { key: 'Tracking Number', label: 'Tracking #', editable: true, width: '160px' },
  { key: 'Ship Date', label: 'Ship Date', type: 'date', editable: true },
  { key: 'Product', label: 'Product', editable: true },
  { key: 'Receiver', label: 'Receiver', editable: true },
  { key: 'Fee Charged', label: 'Fee Charged', type: 'currency', editable: true, align: 'right' },
  { key: 'Batch Period', label: 'Batch', editable: true, width: '200px' },
]

const chartTooltipStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary)',
}

export default function FulfillmentVerification() {
  const rows = useLiveTable(db.fulfillmentVerification)
  const unmatched = useLiveTable(db.unmatchedFulfillmentFees)

  const byShipDate = useMemo(() => {
    const map = new Map<string, { date: string; count: number; fee: number }>()
    for (const r of unmatched) {
      const date = r['Ship Date']
      if (!date) continue
      const bucket = map.get(date) ?? { date, count: 0, fee: 0 }
      bucket.count += 1
      bucket.fee += r['Fee Charged'] ?? 0
      map.set(date, bucket)
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [unmatched])

  return (
    <div>
      <PageHeader title="Fulfillment Verification" description={seed.note} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Total Parcels Billed a Fee" value={formatNumber(seed.summary.totalFeeParcels)} />
        <StatTile label="Matched to POS" value={formatNumber(seed.summary.matched)} accent="var(--status-good)" />
        <StatTile
          label="Unmatched Fee at Risk"
          value={formatCurrency(seed.summary.unmatchedFee)}
          sub={`${formatNumber(seed.summary.unmatchedCount)} parcels`}
          accent="var(--status-critical)"
        />
      </div>
      {seed.caveat && <NoteBanner>{seed.caveat}</NoteBanner>}
      <Card title="Fulfilled vs Matched by Batch" description="Every batch NPMCM has billed you a fulfillment fee for, checked one by one against your POS" className="mb-4">
        <DataTable
          columns={COLUMNS}
          rows={rows}
          getId={(r) => r.id!}
          searchKeys={['Batch Period', 'Status']}
          csvName="fulfillment-verification"
          onUpdate={(id, key, value) => db.fulfillmentVerification.update(id, { [key]: value })}
          onDelete={(id) => db.fulfillmentVerification.delete(id)}
          onAdd={() =>
            db.fulfillmentVerification.add({
              'Batch Period': '',
              'Parcels Fulfilled (NPMCM)': 0,
              'Matched to POS': 0,
              Unmatched: 0,
              'Fee at Risk': 0,
              'Match Rate': 0,
              Status: 'REVIEW',
            })
          }
        />
      </Card>

      {byShipDate.length > 0 && (
        <Card
          title="Unmatched Fee at Risk by Ship Date"
          description="Fees charged for parcels with no matching POS order at all, grouped by the date NPMCM says they were shipped"
          className="mb-4"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byShipDate} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-hairline)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: 'var(--border-strong)' }}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v: string) => formatDate(v)}
                minTickGap={30}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(v: number) => formatCurrency(v).replace('PHP', '₱').replace('.00', '')}
              />
              <Tooltip
                labelFormatter={(v: unknown) => formatDate(v)}
                formatter={(value: unknown) => formatCurrency(value)}
                contentStyle={chartTooltipStyle}
              />
              <Bar dataKey="fee" name="Fee at risk" fill="var(--status-critical)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card
        title="Unmatched Parcels — Fee Charged, No Matching POS Order"
        description="Every individual parcel NPMCM billed a fulfillment fee for that doesn't correspond to any order in your POS, by exact tracking number"
      >
        <DataTable
          columns={DETAIL_COLUMNS}
          rows={unmatched}
          getId={(r) => r.id!}
          searchKeys={['Tracking Number', 'Product', 'Receiver', 'Batch Period']}
          pageSize={50}
          csvName="unmatched-fulfillment-fees"
          onUpdate={(id, key, value) => db.unmatchedFulfillmentFees.update(id, { [key]: value })}
          onDelete={(id) => db.unmatchedFulfillmentFees.delete(id)}
          emptyLabel="No unmatched parcels — every fee charged matches a real POS order."
        />
      </Card>
    </div>
  )
}
