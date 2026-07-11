import { Info } from 'lucide-react'

interface NoteBannerProps {
  children: string
}

export default function NoteBanner({ children }: NoteBannerProps) {
  return (
    <div
      className="mb-4 flex gap-2.5 rounded-xl border p-3 text-xs leading-relaxed"
      style={{
        borderColor: 'color-mix(in srgb, var(--series-blue) 30%, var(--border-hairline))',
        background: 'color-mix(in srgb, var(--series-blue) 6%, transparent)',
        color: 'var(--text-secondary)',
      }}
    >
      <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--series-blue)' }} />
      <p>{children}</p>
    </div>
  )
}
