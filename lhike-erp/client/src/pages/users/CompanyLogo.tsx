import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";

export function CompanyLogo() {
  const [file, setFile] = useState<File | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ logoUrl: string | null }>("/settings/logo").then((r) => setCurrentLogo(r.logoUrl));
  }, []);

  async function onUpload() {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const r = await api.upload<{ logoUrl: string }>("/settings/logo", formData);
      setCurrentLogo(r.logoUrl);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Upload Company Logo</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {currentLogo && (
          <div className="mb-4">
            <p className="mb-1 text-xs text-slate-500">Current logo (shown on the Sign In page):</p>
            <img src={currentLogo} alt="Current company logo" className="h-16 object-contain" />
          </div>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 block w-full text-sm"
        />
        {success && <p className="mb-2 text-sm text-teal-600">Logo has been uploaded successfully.</p>}
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={() => navigate("/users")} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm">
            Back
          </button>
          <button
            onClick={() => void onUpload()}
            disabled={!file}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
