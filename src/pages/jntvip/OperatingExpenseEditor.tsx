// The operating-expense list, editable.
//
// These costs arrived a few at a time — support, then fulfilment, then Meralco,
// then internet, with food still to come. Every one of them needed a code change
// to record, and an expense that needs a developer is an expense that quietly
// stays out of the P&L and makes the business look better than it is. So the
// list lives in the database and is edited here.
//
// Retiring an expense sets active=false rather than deleting the row. A period
// already costed with it was costed correctly at the time, and erasing the row
// would silently restate history.

import { useState } from 'react'
import { Plus, Check, X, Pencil, Archive, RotateCcw } from 'lucide-react'
import { useLiveTable } from '../../hooks/useLiveTable'
import { jntVipDb } from '../../lib/jntvip/db'
import type { JntVipOperatingExpenseRow } from '../../lib/jntvip/types'
import type { ExpenseCharge } from '../../lib/jntvip/operatingCosts'

const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const BASIS_LABEL: Record<JntVipOperatingExpenseRow['basis'], string> = {
  PER_DAY: 'a day',
  PER_BOTTLE: 'a bottle',
  PER_MONTH: 'a month',
}

interface Draft {
  label: string
  basis: JntVipOperatingExpenseRow['basis']
  amount: string
  detail: string
}

const EMPTY: Draft = { label: '', basis: 'PER_MONTH', amount: '', detail: '' }

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `expense-${Date.now()}`
}

/**
 * `charges` prices each expense against the current period. It is optional so
 * the editor still works before a statement exists, and it is passed in rather
 * than recomputed here: the P&L already costed these rows, and a second
 * calculation of the same thing is a second thing to drift.
 */
export default function OperatingExpenseEditor({ charges = [] }: { charges?: ExpenseCharge[] }) {
  const priced = new Map(charges.map((c) => [c.key, c]))
  const rows = (useLiveTable(jntVipDb.operatingExpenses) as JntVipOperatingExpenseRow[]) ?? []
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [editing, setEditing] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY)

  const parse = (s: string) => Math.round(parseFloat(s.replace(/[^\d.]/g, '')) * 100)

  async function save() {
    const amount = parse(draft.amount)
    if (!draft.label.trim() || !Number.isFinite(amount) || amount <= 0) return
    await jntVipDb.operatingExpenses.add({
      key: slug(draft.label),
      label: draft.label.trim(),
      basis: draft.basis,
      rate: amount,
      detail: draft.detail.trim(),
      active: true,
      assumed: false,
      updatedAt: new Date().toISOString(),
    })
    setDraft(EMPTY)
    setAdding(false)
  }

  async function saveEdit(id: number) {
    const amount = parse(editDraft.amount)
    if (!editDraft.label.trim() || !Number.isFinite(amount) || amount <= 0) return
    await jntVipDb.operatingExpenses.update(id, {
      label: editDraft.label.trim(),
      basis: editDraft.basis,
      rate: amount,
      detail: editDraft.detail.trim(),
      // An edited figure is one the user stated, so it is no longer an assumption.
      assumed: false,
      updatedAt: new Date().toISOString(),
    })
    setEditing(null)
  }

  const field = 'rounded-lg border px-2.5 py-1.5 text-sm'
  const fieldStyle = { borderColor: 'var(--border-hairline)', background: 'var(--surface-page)', color: 'var(--text-primary)' }

  function Form({ value, onChange, onSave, onCancel }: { value: Draft; onChange: (d: Draft) => void; onSave: () => void; onCancel: () => void }) {
    return (
      <div className="flex flex-wrap items-center gap-2 py-2">
        <input
          className={field}
          style={{ ...fieldStyle, minWidth: 170 }}
          placeholder="What is it? e.g. Food"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
        <input
          className={`${field} tabular`}
          style={{ ...fieldStyle, width: 110 }}
          placeholder="Amount"
          inputMode="decimal"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <select
          className={field}
          style={fieldStyle}
          value={value.basis}
          onChange={(e) => onChange({ ...value, basis: e.target.value as Draft['basis'] })}
        >
          <option value="PER_MONTH">a month</option>
          <option value="PER_DAY">a day</option>
          <option value="PER_BOTTLE">a bottle</option>
        </select>
        <input
          className={field}
          style={{ ...fieldStyle, flex: 1, minWidth: 160 }}
          placeholder="Note (optional)"
          value={value.detail}
          onChange={(e) => onChange({ ...value, detail: e.target.value })}
        />
        <button onClick={onSave} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ background: 'var(--series-aqua)' }}>
          <Check size={14} />
        </button>
        <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>
    )
  }

  const live = rows.filter((r) => r.active)
  const retired = rows.filter((r) => !r.active)

  return (
    <div>
      <div className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
        {live.map((r) =>
          editing === r.id ? (
            <Form
              key={r.id}
              value={editDraft}
              onChange={setEditDraft}
              onSave={() => saveEdit(r.id!)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={r.id} className="flex items-baseline justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {r.label}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-xs tabular"
                    style={{ background: 'color-mix(in srgb, var(--series-yellow) 16%, transparent)', color: 'var(--text-secondary)' }}
                  >
                    {peso(r.rate)} {BASIS_LABEL[r.basis]}
                  </span>
                  {r.basis === 'PER_BOTTLE' ? (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      grows with sales
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      fixed
                    </span>
                  )}
                  {r.assumed && (
                    <span className="text-xs font-medium" style={{ color: 'var(--status-warning-ink)' }}>
                      assumed
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {r.detail}
                  {priced.has(r.key) && `${r.detail ? ' · ' : ''}${priced.get(r.key)!.quantityLabel}`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {priced.has(r.key) && (
                  <span className="mr-2 text-sm tabular" style={{ color: 'var(--text-primary)' }}>
                    {peso(priced.get(r.key)!.amount)}
                  </span>
                )}
                <button
                  aria-label={`Edit ${r.label}`}
                  onClick={() => {
                    setEditing(r.id!)
                    setEditDraft({ label: r.label, basis: r.basis, amount: (r.rate / 100).toFixed(2), detail: r.detail })
                  }}
                  className="rounded-lg border p-1.5"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  aria-label={`Retire ${r.label}`}
                  onClick={() => jntVipDb.operatingExpenses.update(r.id!, { active: false, updatedAt: new Date().toISOString() })}
                  className="rounded-lg border p-1.5"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                >
                  <Archive size={13} />
                </button>
              </div>
            </div>
          ),
        )}

        {adding ? (
          <Form value={draft} onChange={setDraft} onSave={save} onCancel={() => { setDraft(EMPTY); setAdding(false) }} />
        ) : (
          <div className="pt-2">
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              <Plus size={14} /> Add an expense
            </button>
          </div>
        )}
      </div>

      {retired.length > 0 && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Retired &mdash; kept so past periods still add up
          </div>
          {retired.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {r.label} &middot; {peso(r.rate)} {BASIS_LABEL[r.basis]}
              </span>
              <button
                onClick={() => jntVipDb.operatingExpenses.update(r.id!, { active: true, updatedAt: new Date().toISOString() })}
                className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
              >
                <RotateCcw size={12} /> Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
