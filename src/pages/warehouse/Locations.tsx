// Locations — the physical places stock can sit.
//
// A second warehouse is a location, not a second system and not a duplicated
// set of products. Stock moves between them with Transfers, so the ledger
// keeps the history and the balances follow the units.
//
// Locations are never deleted, only deactivated: every movement ever posted
// points at a location id, and deleting one would orphan history.

import { useMemo, useState } from 'react'
import { Warehouse, Truck, ArrowLeftRight, Layers, Factory, CircleDashed, Pencil, Check, Ban } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { formatNumber } from '../../lib/format'
import { warehouseDb } from '../../lib/warehouse/db'
import { logWarehouseAudit } from '../../lib/warehouse/inventory'
import type { LocationKind, LocationRow } from '../../lib/warehouse/types'
import { useInventory } from './hooks'
import { Field, TextInput, TextArea, Select, SubmitButton, ErrorNote, SuccessNote } from './FormBits'

const KIND_META: Record<LocationKind, { label: string; hint: string; Icon: typeof Warehouse }> = {
  warehouse: {
    label: 'Warehouse',
    hint: 'A place you hold and ship stock from. Receiving, production and stock counts happen here.',
    Icon: Warehouse,
  },
  fulfillment: {
    label: 'Fulfillment partner',
    hint: 'A courier or 3PL holding your stock. One per account — a second J&T account is a second location.',
    Icon: Truck,
  },
  shelf: {
    label: 'Shelf / zone',
    hint: 'A subdivision inside a warehouse, for when one building is not granular enough.',
    Icon: Layers,
  },
  transit: {
    label: 'In transit',
    hint: 'The holding place between two locations. Stock sits here after a transfer is sent, before it is received.',
    Icon: ArrowLeftRight,
  },
  supplier: { label: 'Supplier', hint: 'Where stock comes from. Rarely needed as a stocking location.', Icon: Factory },
  virtual: { label: 'Virtual', hint: 'A bucket that is not a real place.', Icon: CircleDashed },
}

/** Only the kinds worth creating by hand; supplier and virtual are internal. */
const CREATABLE: LocationKind[] = ['warehouse', 'fulfillment', 'shelf', 'transit']

const KIND_OPTIONS = CREATABLE.map((k) => ({
  value: k,
  label: `${KIND_META[k].label} — ${KIND_META[k].hint.split('.')[0]}`,
}))

const EMPTY = { name: '', kind: 'warehouse' as LocationKind, notes: '' }

export default function Locations() {
  const { locations, movements, balances, products } = useInventory()
  const [form, setForm] = useState({ ...EMPTY })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  /** Units and movements per location — what makes deactivating safe or not. */
  const usage = useMemo(() => {
    const map = new Map<number, { units: number; movements: number; skus: number }>()
    for (const l of locations) {
      if (l.id == null) continue
      let units = 0
      const skus = new Set<number>()
      for (const [productId, byLocation] of balances) {
        const states = byLocation.get(l.id)
        if (!states) continue
        for (const qty of states.values()) units += qty
        if ([...states.values()].some((q) => q !== 0)) skus.add(productId)
      }
      const moves = movements.filter((m) => m.fromLocationId === l.id || m.toLocationId === l.id).length
      map.set(l.id, { units, movements: moves, skus: skus.size })
    }
    return map
  }, [locations, balances, movements])

  function startEdit(l: LocationRow) {
    setEditingId(l.id!)
    setForm({ name: l.name, kind: l.kind, notes: l.notes ?? '' })
    setError(null)
    setResult(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ ...EMPTY })
  }

  async function save() {
    setError(null)
    setResult(null)
    const name = form.name.trim()
    if (!name) return setError('Give the location a name.')
    const clash = locations.find((l) => l.name.toLowerCase() === name.toLowerCase() && l.id !== editingId)
    if (clash) return setError(`"${clash.name}" already exists. Names must be unique so pickers are unambiguous.`)

    setBusy(true)
    try {
      if (editingId != null) {
        const before = locations.find((l) => l.id === editingId)
        await warehouseDb.locations.update(editingId, { name, kind: form.kind, notes: form.notes.trim() || null })
        await logWarehouseAudit({
          entity: 'location',
          entityId: editingId,
          action: 'Updated',
          previousValue: { name: before?.name, kind: before?.kind },
          newValue: { name, kind: form.kind },
        })
        setResult(`Renamed to "${name}". Every movement already posted against it follows the rename — nothing is rewritten.`)
        cancelEdit()
      } else {
        const id = await warehouseDb.locations.add({
          name,
          kind: form.kind,
          parentId: null,
          active: true,
          notes: form.notes.trim() || null,
        })
        await logWarehouseAudit({ entity: 'location', entityId: id, action: 'Created', newValue: { name, kind: form.kind } })
        setResult(
          form.kind === 'warehouse'
            ? `"${name}" created. Move stock into it with Transfers — never by re-entering products, which would lose their history.`
            : `"${name}" created and available in the pickers.`,
        )
        setForm({ ...EMPTY })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(l: LocationRow) {
    const u = usage.get(l.id!)
    if (l.active && u && u.units !== 0) {
      setError(
        `"${l.name}" still holds ${formatNumber(u.units)} unit(s) across ${formatNumber(u.skus)} SKU(s). ` +
          `Transfer them out first — deactivating would hide stock you still own.`,
      )
      return
    }
    setError(null)
    await warehouseDb.locations.update(l.id!, { active: !l.active })
    await logWarehouseAudit({ entity: 'location', entityId: l.id!, action: l.active ? 'Deactivated' : 'Reactivated' })
    setResult(
      l.active
        ? `"${l.name}" deactivated. It disappears from pickers but keeps its full movement history.`
        : `"${l.name}" is selectable again.`,
    )
  }

  const byKind = useMemo(() => {
    const order: LocationKind[] = ['warehouse', 'fulfillment', 'shelf', 'transit', 'supplier', 'virtual']
    return order
      .map((kind) => ({ kind, rows: locations.filter((l) => l.kind === kind).sort((a, b) => a.name.localeCompare(b.name)) }))
      .filter((g) => g.rows.length > 0)
  }, [locations])

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Every place stock can sit. A second warehouse or a second courier account is a location here — stock moves between them with Transfers, which keeps the history attached to the units."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title={editingId != null ? 'Edit location' : 'Add a location'}
          description={editingId != null ? 'Renaming is safe — history follows the id, not the name.' : undefined}
          className="lg:col-span-1"
          actions={
            editingId != null ? (
              <button onClick={cancelEdit} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Cancel
              </button>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 gap-3">
            <Field label="Name" hint="What you will call it in every picker.">
              <TextInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Bagumbayan Warehouse" />
            </Field>
            <Field label="Type">
              <Select
                value={form.kind}
                onChange={(v) => setForm((f) => ({ ...f, kind: v as LocationKind }))}
                options={KIND_OPTIONS}
                placeholder=""
              />
            </Field>
            <p className="rounded-lg border p-2 text-[11px]" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
              {KIND_META[form.kind].hint}
            </p>
            <Field label="Notes">
              <TextArea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            {result && <SuccessNote>{result}</SuccessNote>}
            <SubmitButton label={editingId != null ? 'Save changes' : 'Add location'} onClick={save} busy={busy} />
          </div>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {byKind.map((g) => {
            const { label, Icon } = KIND_META[g.kind]
            return (
              <Card key={g.kind} title={label} description={KIND_META[g.kind].hint}>
                <div className="flex flex-col">
                  {g.rows.map((l) => {
                    const u = usage.get(l.id!) ?? { units: 0, movements: 0, skus: 0 }
                    return (
                      <div
                        key={l.id}
                        className="flex flex-wrap items-center gap-3 border-b py-2.5 last:border-0"
                        style={{ borderColor: 'var(--border-hairline)' }}
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            background: 'color-mix(in srgb, var(--series-aqua) 12%, transparent)',
                            color: l.active ? 'var(--series-aqua)' : 'var(--text-muted)',
                          }}
                        >
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {l.name}
                            {!l.active && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{ color: 'var(--text-muted)', background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
                              >
                                inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {u.units === 0 ? 'no stock here' : `${formatNumber(u.units)} unit(s) · ${formatNumber(u.skus)} SKU(s)`}
                            {' · '}
                            {formatNumber(u.movements)} movement(s)
                            {l.notes ? ` · ${l.notes}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(l)}
                            className="rounded-lg border px-2 py-1 text-[11px] font-medium"
                            style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                          >
                            <Pencil size={11} className="inline" /> Edit
                          </button>
                          <button
                            onClick={() => toggleActive(l)}
                            className="rounded-lg border px-2 py-1 text-[11px] font-medium"
                            style={{
                              borderColor: 'var(--border-hairline)',
                              color: l.active ? 'var(--status-critical)' : 'var(--series-aqua)',
                            }}
                          >
                            {l.active ? (
                              <>
                                <Ban size={11} className="inline" /> Deactivate
                              </>
                            ) : (
                              <>
                                <Check size={11} className="inline" /> Reactivate
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}

          <Card title="Moving stock to a new warehouse">
            <ol className="flex flex-col gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>1.</strong> Add the warehouse here.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>2.</strong> Transfers → <em>Send</em>: source location, destination,
                quantity. The units leave AVAILABLE and sit in IN_TRANSIT — they are still yours, just in motion.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>3.</strong> When the stock lands, Transfers → <em>Receive</em>. Short
                counts post to MISSING and appear in Discrepancies rather than disappearing.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>4.</strong> Products are <em>never</em> re-added to move them. Re-entering
                a SKU at the new warehouse creates a second product with no history and splits the ledger in two.
              </li>
            </ol>
            <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {formatNumber(products.length)} product(s) and {formatNumber(movements.length)} movement(s) in the ledger today.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
