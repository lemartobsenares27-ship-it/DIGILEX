import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";

const PLATFORMS = ["Facebook ECOM", "Instagram", "TikTok", "Shopee", "Lazada"];
const STATUSES = ["Active", "Inactive", "In-review", "Restricted", "Permanently Disabled"];

const EMPTY = {
  name: "",
  description: "",
  owner: "",
  platform: PLATFORMS[0],
  pageUrl: "",
  status: "Active",
  pancakeShopId: "",
  pancakeApiKey: "",
  pancakePageId: "",
  senderName: "",
  internName: "",
};

export function AddEditPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [showPancakeSettings, setShowPancakeSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<typeof EMPTY & { id: string }>(`/ecommerce/pages/${id}`).then((p) => {
      setForm({
        name: p.name,
        description: p.description ?? "",
        owner: p.owner ?? "",
        platform: p.platform,
        pageUrl: p.pageUrl ?? "",
        status: p.status,
        pancakeShopId: p.pancakeShopId ?? "",
        pancakeApiKey: p.pancakeApiKey ?? "",
        pancakePageId: p.pancakePageId ?? "",
        senderName: p.senderName ?? "",
        internName: p.internName ?? "",
      });
      if (p.pancakeShopId || p.pancakeApiKey) setShowPancakeSettings(true);
    });
  }, [id]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/ecommerce/pages/${id}`, form);
      } else {
        await api.post("/ecommerce/pages", form);
      }
      navigate("/ecommerce/pages-store");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">{isEdit ? "Edit Page/Store" : "Add Page/Store"}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-6">
        <Field label="Name *" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Description" value={form.description} onChange={(v) => set("description", v)} />
        <Field label="Owner" value={form.owner} onChange={(v) => set("owner", v)} placeholder="Defaults to you if left blank" />
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Platform
          <select className="rounded-md border border-slate-300 px-2 py-1.5" value={form.platform} onChange={(e) => set("platform", e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <Field label="Page URL" value={form.pageUrl} onChange={(v) => set("pageUrl", v)} />
        {isEdit && (
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Status
            <select className="rounded-md border border-slate-300 px-2 py-1.5" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={() => setShowPancakeSettings((v) => !v)}
          className="mt-1 self-start text-sm font-semibold text-blue-600 hover:text-blue-500"
        >
          {showPancakeSettings ? "Hide" : "Show"} Settings (Pancake Set Up)
        </button>

        {showPancakeSettings && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs text-slate-500">
              Optional. Connect this page to a Pancake POS shop so its orders become eligible for{" "}
              <span className="font-semibold">Download Sales from 3P Apps</span> on the Sales Tracker.
            </p>
            <div className="flex flex-col gap-3">
              <Field
                label="Pancake Shop ID"
                value={form.pancakeShopId}
                onChange={(v) => set("pancakeShopId", v)}
                placeholder="From pos.pancake.ph/shop/<Shop ID>/overview"
              />
              <Field
                label="API Key"
                value={form.pancakeApiKey}
                onChange={(v) => set("pancakeApiKey", v)}
                type="password"
                placeholder="From Pancake: Configuration > Advance > Webhook – API"
              />
              <Field
                label="Pancake Page ID for combine shop"
                value={form.pancakePageId}
                onChange={(v) => set("pancakePageId", v)}
                placeholder="Only needed for a Pancake COMBINE shop"
              />
              <Field label="Sender Name" value={form.senderName} onChange={(v) => set("senderName", v)} />
              <Field label="Intern Name" value={form.internName} onChange={(v) => set("internName", v)} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => navigate("/ecommerce/pages-store")} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      {label}
      <input
        type={type}
        className="rounded-md border border-slate-300 px-2 py-1.5"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </label>
  );
}
