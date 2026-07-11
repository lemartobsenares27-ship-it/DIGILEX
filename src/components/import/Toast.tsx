import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface ToastProps {
  message: string
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg"
      style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-card)', maxWidth: 420 }}
    >
      <CheckCircle2 size={18} style={{ color: 'var(--status-good)' }} className="shrink-0" />
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {message}
      </span>
      <button onClick={onDismiss} style={{ color: 'var(--text-muted)' }}>
        <X size={16} />
      </button>
    </div>
  )
}
