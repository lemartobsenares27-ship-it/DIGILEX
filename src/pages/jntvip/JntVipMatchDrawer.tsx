import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format'
import type { JntVipPosOrderRow, JntVipShipmentRow } from '../../lib/jntvip/types'
import type { JntVipReconciliationRow } from '../../lib/jntvip/selectors'
import {
  confirmMatch,
  rejectMatch,
  markDuplicate,
  markExpectedDifference,
  ignoreMatch,
  reopenMatch,
  addNote,
  linkManually,
  getReviewerName,
  setReviewerName,
} from '../../lib/jntvip/review'
import { ReconStatusBadge, ConfidenceBadge } from './StatusBadge'

interface Props {
  row: JntVipReconciliationRow
  posOrder: JntVipPosOrderRow | undefined
  shipment: JntVipShipmentRow | undefined
  unmatchedPos: JntVipPosOrderRow[]
  unmatchedShipments: JntVipShipmentRow[]
  onClose: () => void
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function ActionButton({ label, onClick, tone = 'default' }: { label: string; onClick: () => void; tone?: 'default' | 'danger' | 'primary' }) {
  const color = tone === 'danger' ? 'var(--status-critical)' : tone === 'primary' ? 'var(--series-blue)' : 'var(--text-secondary)'
  return (
    <button
      onClick={onClick}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium"
      style={{ borderColor: 'var(--border-hairline)', color }}
    >
      {label}
    </button>
  )
}

export default function JntVipMatchDrawer({ row, posOrder, shipment, unmatchedPos, unmatchedShipments, onClose }: Props) {
  const [reviewer, setReviewer] = useState('')
  const [note, setNote] = useState(row.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [linkTarget, setLinkTarget] = useState('')

  useEffect(() => {
    getReviewerName().then(setReviewer)
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      if (reviewer.trim()) await setReviewerName(reviewer.trim())
      await action()
    } finally {
      setBusy(false)
    }
  }

  const canLinkToShipment = row.status === 'POS_ONLY' && row.posOrderId != null
  const canLinkToPos = row.status === 'JNT_ONLY' && row.shipmentId != null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l p-5"
        style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)' }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ReconStatusBadge status={row.status} />
              {row.matchConfidence && <ConfidenceBadge confidence={row.matchConfidence} />}
            </div>
            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {row.trackingNumber ?? row.orderId ?? `Match #${row.matchId}`}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {row.discrepancyTypes.length > 0 && (
          <div
            className="mb-4 rounded-lg border p-3 text-sm"
            style={{ borderColor: 'color-mix(in srgb, var(--status-critical) 30%, var(--border-hairline))', background: 'color-mix(in srgb, var(--status-critical) 6%, transparent)', color: 'var(--text-secondary)' }}
          >
            <strong style={{ color: 'var(--status-critical)' }}>{row.discrepancySummary}</strong>
            {row.totalDifference !== null && (
              <div className="mt-1 tabular">Total difference: {formatCurrency(row.totalDifference)}</div>
            )}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="col-span-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            POS
          </div>
          <Field label="Order ID" value={posOrder?.orderId ?? '—'} />
          <Field label="Tracking #" value={posOrder?.trackingNumber ?? '—'} />
          <Field label="Customer" value={posOrder?.customerName ?? '—'} />
          <Field label="Phone" value={posOrder?.customerPhone ?? '—'} />
          <Field label="Order Date" value={formatDate(posOrder?.orderDate)} />
          <Field label="Status" value={posOrder?.status ?? '—'} />
          <Field label="COD Expected" value={formatCurrency(posOrder?.codAmountExpected)} />
          <Field label="Shipping Expected" value={formatCurrency(posOrder?.shippingFeeExpected)} />

          <div className="col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            J&T VIP
          </div>
          <Field label="Waybill #" value={shipment?.trackingNumber ?? '—'} />
          <Field label="Order Reference" value={shipment?.orderReference ?? '—'} />
          <Field label="Consignee" value={shipment?.consignee ?? '—'} />
          <Field label="Phone" value={shipment?.phone ?? '—'} />
          <Field label="Ship Date" value={formatDate(shipment?.shipDate)} />
          <Field label="Status" value={shipment?.status ?? '—'} />
          <Field label="COD Collected" value={formatCurrency(shipment?.codCollected)} />
          <Field label="Shipping Charge" value={formatCurrency(shipment?.shippingCharge)} />
          <Field label="Net Settlement" value={formatCurrency(shipment?.netSettlement)} />
          <Field label="Settlement Ref" value={shipment?.settlementReference ?? '—'} />
        </div>

        {(canLinkToShipment || canLinkToPos) && (
          <div className="mb-4 rounded-xl border p-3" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {canLinkToShipment ? 'Link to J&T transaction' : 'Link to POS order'}
            </div>
            <div className="flex gap-2">
              <select
                value={linkTarget}
                onChange={(e) => setLinkTarget(e.target.value)}
                className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
              >
                <option value="">Select…</option>
                {canLinkToShipment &&
                  unmatchedShipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.trackingNumber ?? s.orderReference} — {s.consignee ?? 'no name'} — {formatCurrency(s.codCollected)}
                    </option>
                  ))}
                {canLinkToPos &&
                  unmatchedPos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.orderId ?? p.trackingNumber} — {p.customerName ?? 'no name'} — {formatCurrency(p.codAmountExpected)}
                    </option>
                  ))}
              </select>
              <button
                disabled={!linkTarget || busy}
                onClick={() =>
                  run(async () => {
                    const targetId = Number(linkTarget)
                    if (canLinkToShipment) await linkManually(row.posOrderId!, targetId, reviewer, note || null)
                    else await linkManually(targetId, row.shipmentId!, reviewer, note || null)
                    onClose()
                  })
                }
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--series-blue)' }}
              >
                Link
              </button>
            </div>
          </div>
        )}

        <label className="mb-2 flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Reviewed by</span>
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Your name"
            className="rounded-lg border px-2.5 py-1.5 text-sm"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          />
        </label>
        <label className="mb-4 flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="rounded-lg border px-2.5 py-1.5 text-sm"
            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-primary)', background: 'var(--surface-page)' }}
          />
        </label>

        <div className="mb-4 flex flex-wrap gap-2">
          {row.status === 'NEEDS_REVIEW' && row.posOrderId != null && row.shipmentId != null && (
            <>
              <ActionButton label="Confirm Match" tone="primary" onClick={() => run(() => confirmMatch(row.matchId, reviewer, note || null))} />
              <ActionButton label="Reject Match" tone="danger" onClick={() => run(() => rejectMatch(row.matchId, reviewer, note || null))} />
            </>
          )}
          {row.status === 'MISMATCH' && (
            <>
              <ActionButton label="Confirm Match" onClick={() => run(() => confirmMatch(row.matchId, reviewer, note || null))} />
              <ActionButton label="Mark as Expected Difference" onClick={() => run(() => markExpectedDifference(row.matchId, reviewer, note || null))} />
            </>
          )}
          {row.status !== 'DUPLICATE' && <ActionButton label="Mark as Duplicate" onClick={() => run(() => markDuplicate(row.matchId, reviewer, note || null))} />}
          <ActionButton label="Add Note" onClick={() => run(() => addNote(row.matchId, note, reviewer))} />
          {row.manualStatus === '—' ? (
            <ActionButton label="Ignore" onClick={() => run(() => ignoreMatch(row.matchId, reviewer, note || null))} />
          ) : (
            <ActionButton label="Reopen" onClick={() => run(() => reopenMatch(row.matchId, reviewer))} />
          )}
        </div>

        {(row.reviewedBy || row.reviewDate) && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Last reviewed by {row.reviewedBy ?? 'unknown'} {row.reviewDate ? `on ${formatDateTime(row.reviewDate)}` : ''}
            {row.manualStatus !== '—' ? ` — marked "${row.manualStatus}"` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
