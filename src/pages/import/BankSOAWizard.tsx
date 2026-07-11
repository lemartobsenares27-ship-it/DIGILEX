import { useMemo, useState } from 'react'
import StepHeader from '../../components/import/StepHeader'
import UploadZone from '../../components/import/UploadZone'
import Card from '../../components/Card'
import NoteBanner from '../../components/NoteBanner'
import { formatCurrency, formatDate } from '../../lib/format'
import { parseSpreadsheetFile } from '../../lib/import/parseFile'
import { parseBankSOA } from '../../lib/import/bankSOA'
import { postBankSOA } from '../../lib/import/post'
import type { BankTxnDraft } from '../../lib/import/types'
import settingsSeed from '../../data/settings.json'
import { StatBox, NextButton, BackButton, PostButton } from '../../components/import/WizardBits'

const CATEGORY_OPTIONS = settingsSeed.dropdowns['Expense Categories'] ?? []
const ACCOUNTS = ['UB Corporate', 'UB Purchaser Fund', 'Unconfirmed / Other'] as const

interface Props {
  onBack: () => void
  onDone: (message: string) => void
}

export default function BankSOAWizard({ onBack, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [drafts, setDrafts] = useState<BankTxnDraft[]>([])
  const [detectedAccountNumber, setDetectedAccountNumber] = useState<string | null>(null)
  const [account, setAccount] = useState<(typeof ACCOUNTS)[number]>('Unconfirmed / Other')

  async function handleFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      const sheet = await parseSpreadsheetFile(file)
      const { drafts: parsed, detectedAccountNumber: acct } = await parseBankSOA(sheet)
      if (parsed.length === 0) throw new Error('No transactions were found in this file.')
      setDrafts(parsed)
      setDetectedAccountNumber(acct)
      setFileName(file.name)
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const totals = useMemo(() => {
    const included = drafts.filter((d) => d.include)
    return {
      credit: included.reduce((s, d) => s + d.credit, 0),
      debit: included.reduce((s, d) => s + d.debit, 0),
      duplicates: drafts.filter((d) => d.isDuplicate).length,
      count: included.length,
      lastBalance: [...drafts].reverse().find((d) => d.runningBalance !== null)?.runningBalance ?? null,
    }
  }, [drafts])

  function updateDraft(key: string, patch: Partial<BankTxnDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  async function handlePost() {
    setBusy(true)
    try {
      const { summary } = await postBankSOA(drafts, fileName)
      onDone(`Import complete — ${summary.messages[0] ?? `${summary.recordsPosted} records posted`}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <StepHeader current={step} onBack={onBack} />
      {error && <NoteBanner>{error}</NoteBanner>}

      {step === 0 && (
        <Card title="Upload Bank Statement of Account">
          <UploadZone
            hint="UnionBank SOA export — CSV or Excel. PDF is not supported; please export CSV/Excel from online banking."
            onFile={handleFile}
            busy={busy}
          />
        </Card>
      )}

      {step === 1 && (
        <>
          <Card title="Which account is this?" className="mb-4">
            <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {detectedAccountNumber
                ? `Detected account number in file: ${detectedAccountNumber}. Confirm which account this is.`
                : 'Could not auto-detect an account number — please confirm manually.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {ACCOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAccount(a)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: account === a ? 'var(--series-blue)' : 'var(--border-hairline)',
                    background: account === a ? 'color-mix(in srgb, var(--series-blue) 10%, transparent)' : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </Card>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Transactions found" value={String(drafts.length)} />
            <StatBox label="Total credits" value={formatCurrency(totals.credit)} accent="var(--status-good)" />
            <StatBox label="Total debits" value={formatCurrency(totals.debit)} accent="var(--series-orange)" />
            <StatBox label="Possible duplicates" value={String(totals.duplicates)} accent="var(--status-warning)" />
          </div>

          <Card title="Preview" description="Uncheck rows to exclude them from posting. Duplicates are pre-unchecked.">
            <PreviewTable drafts={drafts} onToggle={(key, include) => updateDraft(key, { include })} />
          </Card>

          <div className="mt-4 flex justify-end">
            <NextButton onClick={() => setStep(2)} />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Card title="Categorize" description="Auto-categorized by keyword rules. Override any row below.">
            <CategorizeTable drafts={drafts} onChange={updateDraft} />
          </Card>
          <div className="mt-4 flex justify-between">
            <BackButton onClick={() => setStep(1)} />
            <NextButton onClick={() => setStep(3)} />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card title="Confirm & Post">
            <ul className="mb-4 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong>{totals.count}</strong> transactions will be posted to Income/Expense Tracker
              </li>
              <li>
                Cash Flow will be updated for every date in this file
              </li>
              <li>
                <strong>{totals.duplicates}</strong> possible duplicates will be skipped
              </li>
              <li>Account: {account}</li>
              {totals.lastBalance !== null && (
                <li>Bank's own closing balance per SOA: {formatCurrency(totals.lastBalance)}</li>
              )}
            </ul>
            <PostButton onClick={handlePost} busy={busy} disabled={totals.count === 0} />
          </Card>
          <div className="mt-4">
            <BackButton onClick={() => setStep(2)} />
          </div>
        </>
      )}
    </div>
  )
}

function PreviewTable({ drafts, onToggle }: { drafts: BankTxnDraft[]; onToggle: (key: string, include: boolean) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
            {['', 'Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance', ''].map((h, i) => (
              <th key={i} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.slice(0, 300).map((d) => (
            <tr key={d.key} className="border-t" style={{ borderColor: 'var(--border-hairline)', opacity: d.include ? 1 : 0.45 }}>
              <td className="px-2 py-1.5">
                <input type="checkbox" checked={d.include} onChange={(e) => onToggle(d.key, e.target.checked)} />
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 tabular" style={{ color: 'var(--text-primary)' }}>
                {formatDate(d.date)}
              </td>
              <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                {d.referenceNumber ?? '—'}
              </td>
              <td className="max-w-[280px] truncate px-2 py-1.5" style={{ color: 'var(--text-primary)' }} title={d.description ?? ''}>
                {d.description ?? '—'}
              </td>
              <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                {d.debit ? formatCurrency(d.debit) : '—'}
              </td>
              <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                {d.credit ? formatCurrency(d.credit) : '—'}
              </td>
              <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                {d.runningBalance !== null ? formatCurrency(d.runningBalance) : '—'}
              </td>
              <td className="px-2 py-1.5">
                {d.isDuplicate && (
                  <span
                    className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ color: 'var(--status-warning)', background: 'color-mix(in srgb, var(--status-warning) 16%, transparent)' }}
                  >
                    Already posted — skip?
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {drafts.length > 300 && (
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing first 300 of {drafts.length} rows. All will still be posted.
        </p>
      )}
    </div>
  )
}

function CategorizeTable({
  drafts,
  onChange,
}: {
  drafts: BankTxnDraft[]
  onChange: (key: string, patch: Partial<BankTxnDraft>) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr style={{ background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}>
            {['Description', 'Amount', 'Category', 'Department'].map((h, i) => (
              <th key={i} className="whitespace-nowrap px-2 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts
            .filter((d) => d.include)
            .slice(0, 300)
            .map((d) => (
              <tr key={d.key} className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <td className="max-w-[320px] truncate px-2 py-1.5" style={{ color: 'var(--text-primary)' }} title={d.description ?? ''}>
                  {d.description ?? '—'}
                </td>
                <td className="px-2 py-1.5 text-right tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(d.debit || d.credit)}
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={d.category}
                    onChange={(e) => onChange(d.key, { category: e.target.value })}
                    className="w-full rounded border bg-transparent px-1.5 py-1 text-xs"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                  >
                    {[d.category, ...CATEGORY_OPTIONS.filter((c) => c !== d.category)].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={d.department}
                    onChange={(e) => onChange(d.key, { department: e.target.value })}
                    className="w-full rounded border bg-transparent px-1.5 py-1 text-xs"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

