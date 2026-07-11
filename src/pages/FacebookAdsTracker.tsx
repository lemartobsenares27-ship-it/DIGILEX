import { useMemo } from 'react'
import { db } from '../lib/db'
import { useLiveTable } from '../hooks/useLiveTable'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import StatTile from '../components/StatTile'
import DataTable, { type ColumnDef } from '../components/DataTable'
import HorizontalBarChart from '../components/charts/HorizontalBarChart'
import type { FBAccountRow, FBTxnRow } from '../lib/types'
import { formatCurrency, formatNumber } from '../lib/format'
import facebookAdsSeed from '../data/facebookAds.json'

const ACCOUNT_COLUMNS: ColumnDef<FBAccountRow>[] = [
  { key: 'Ad Account', label: 'Ad Account', editable: true },
  { key: 'Account ID', label: 'Account ID', editable: true },
  { key: 'Confirmed Paid Spend', label: 'Confirmed Spend', type: 'currency', editable: true, align: 'right' },
  { key: '# Transactions', label: '# Txns', type: 'number', editable: true, align: 'right' },
  { key: 'Data Source', label: 'Data Source', editable: true },
  { key: 'Coverage', label: 'Coverage', editable: true },
]

const TXN_COLUMNS: ColumnDef<FBTxnRow>[] = [
  { key: 'Date', label: 'Date', type: 'date', editable: true, width: '110px' },
  { key: 'Ad Account', label: 'Ad Account', editable: true },
  { key: 'Card (Network + Last 4)', label: 'Card', editable: true },
  { key: 'Amount', label: 'Amount', type: 'currency', editable: true, align: 'right' },
  { key: 'Status', label: 'Status', type: 'badge', editable: true, options: ['Paid', 'Failed'] },
  { key: 'Data Source', label: 'Data Source', editable: true },
  { key: 'On File Card Statement?', label: 'On File?', editable: true },
  { key: 'Notes', label: 'Notes', editable: true },
]

export default function FacebookAdsTracker() {
  const accounts = useLiveTable(db.fbAccounts)
  const txns = useLiveTable(db.fbTxns)

  const totalSpend = useMemo(() => txns.reduce((s, t) => s + (t.Amount ?? 0), 0), [txns])
  const byAccount = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of txns) {
      const acc = t['Ad Account'] ?? 'Unknown'
      map.set(acc, (map.get(acc) ?? 0) + (t.Amount ?? 0))
    }
    return [...map.entries()].map(([label, value]) => ({ label, value }))
  }, [txns])

  return (
    <div>
      <PageHeader title="Facebook Ads Tracker" description={facebookAdsSeed.note} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total Confirmed Spend" value={formatCurrency(totalSpend)} accent="var(--series-violet)" />
        <StatTile label="Ad Accounts Tracked" value={formatNumber(accounts.length)} />
        <StatTile label="Confirmed Transactions" value={formatNumber(txns.length)} />
        <StatTile
          label="Accounts w/ No Data"
          value={formatNumber(accounts.filter((a) => a['Data Source'] === 'NO DATA UPLOADED').length)}
          accent="var(--status-warning)"
        />
      </div>

      <Card title="Spend by Ad Account" className="mb-4">
        <HorizontalBarChart data={byAccount} />
      </Card>

      <Card title="Account Coverage" className="mb-4">
        <DataTable
          columns={ACCOUNT_COLUMNS}
          rows={accounts}
          getId={(r) => r.id!}
          csvName="facebook-ads-account-coverage"
          onUpdate={(id, key, value) => db.fbAccounts.update(id, { [key]: value })}
          onDelete={(id) => db.fbAccounts.delete(id)}
          onAdd={() =>
            db.fbAccounts.add({
              'Ad Account': 'New account',
              'Account ID': '',
              'Confirmed Paid Spend': 0,
              '# Transactions': 0,
              'Data Source': 'NO DATA UPLOADED',
              Coverage: '',
            })
          }
        />
      </Card>

      <Card title="Transaction Ledger" description="Every confirmed 'Paid' Meta charge">
        <DataTable
          columns={TXN_COLUMNS}
          rows={txns}
          getId={(r) => r.id!}
          searchKeys={['Ad Account', 'Card (Network + Last 4)']}
          pageSize={50}
          csvName="facebook-ads-transactions"
          onUpdate={(id, key, value) => db.fbTxns.update(id, { [key]: value })}
          onDelete={(id) => db.fbTxns.delete(id)}
          onAdd={() =>
            db.fbTxns.add({
              Date: new Date().toISOString().slice(0, 10),
              'Ad Account': '',
              'Account ID': '',
              'Card (Network + Last 4)': '',
              Amount: 0,
              Status: 'Paid',
              'Data Source': 'Manual entry',
              'On File Card Statement?': '',
              Notes: null,
            })
          }
        />
      </Card>
    </div>
  )
}
