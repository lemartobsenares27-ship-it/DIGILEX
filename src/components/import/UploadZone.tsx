import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

interface UploadZoneProps {
  accept?: string
  hint: string
  onFile: (file: File) => void
  busy?: boolean
}

export default function UploadZone({ accept = '.csv,.xlsx,.xls', hint, onFile, busy }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
      onClick={() => inputRef.current?.click()}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors"
      style={{
        borderColor: dragOver ? 'var(--series-blue)' : 'var(--border-strong)',
        background: dragOver ? 'color-mix(in srgb, var(--series-blue) 6%, transparent)' : 'var(--surface-card)',
      }}
    >
      <UploadCloud size={28} style={{ color: 'var(--text-muted)' }} />
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {busy ? 'Parsing file…' : 'Drag & drop a file here, or click to browse'}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {hint}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
