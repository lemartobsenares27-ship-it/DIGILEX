import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";

const EMPTY = {
  employeeNo: "",
  lastName: "",
  firstName: "",
  middleName: "",
  birthdate: "",
  contactNumber: "",
  personalEmail: "",
  companyEmail: "",
  gender: "",
  position: "",
  employmentDate: "",
  employmentStatus: "Active",
};

export function AddUser() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/users", form);
      navigate("/users");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Add User</h1>
      <p className="mb-4 text-sm text-slate-500">
        This creates the account record only. The employee must then visit the login page and click
        <strong> Request Access</strong> to set their own username and password; you'll enable the account afterward.
      </p>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-6">
        <Field label="Employee No. *" value={form.employeeNo} onChange={(v) => set("employeeNo", v)} />
        <Field label="Position" value={form.position} onChange={(v) => set("position", v)} />
        <Field label="Last Name *" value={form.lastName} onChange={(v) => set("lastName", v)} />
        <Field label="First Name *" value={form.firstName} onChange={(v) => set("firstName", v)} />
        <Field label="Middle Name" value={form.middleName} onChange={(v) => set("middleName", v)} />
        <Field label="Birthdate" type="date" value={form.birthdate} onChange={(v) => set("birthdate", v)} />
        <Field label="Contact Number" value={form.contactNumber} onChange={(v) => set("contactNumber", v)} />
        <Field label="Personal Email" value={form.personalEmail} onChange={(v) => set("personalEmail", v)} />
        <Field label="Company Email" value={form.companyEmail} onChange={(v) => set("companyEmail", v)} />
        <Field label="Gender" value={form.gender} onChange={(v) => set("gender", v)} />
        <Field label="Employment Date" type="date" value={form.employmentDate} onChange={(v) => set("employmentDate", v)} />
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Employment Status
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5"
            value={form.employmentStatus}
            onChange={(e) => set("employmentStatus", e.target.value)}
          >
            <option>Active</option>
            <option>Inactive</option>
            <option>Resigned</option>
            <option>Terminated</option>
          </select>
        </label>

        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

        <div className="col-span-2 mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => navigate("/users")} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      {label}
      <input
        type={type}
        className="rounded-md border border-slate-300 px-2 py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
