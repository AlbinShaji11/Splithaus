import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import imageCompression from 'browser-image-compression'
import type { ScannedReceipt } from '../../types'
import { scanReceipt } from '../../services/api'

interface UploadZoneProps {
  onSuccess: (receipt: ScannedReceipt) => void
}

type ZoneState = 'idle' | 'previewing' | 'uploading' | 'error'

const SCAN_MESSAGES = [
  'Uploading your receipt...',
  'Reading the line items...',
  'Checking the totals...',
]

const MAX_BYTES = 10 * 1024 * 1024

const primaryCircle: React.CSSProperties = {
  background: 'color-mix(in oklab, var(--primary) 14%, transparent)',
  border: '1px solid color-mix(in oklab, var(--primary) 30%, transparent)',
  color: 'var(--primary)',
}

const primaryBtn: React.CSSProperties = {
  background: 'var(--primary)',
}

const dragGlow: React.CSSProperties = {
  background:
    'radial-gradient(60% 60% at 50% 30%, color-mix(in oklab, var(--primary) 14%, transparent) 0%, transparent 60%)',
  opacity: 0.7,
}

export default function UploadZone({ onSuccess }: UploadZoneProps) {
  const [state, setState] = useState<ZoneState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msgIdx, setMsgIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const browseRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [])

  function startCycle() {
    setMsgIdx(0)
    timerRef.current = setInterval(
      () => setMsgIdx(i => (i + 1) % SCAN_MESSAGES.length),
      1800,
    )
  }

  function stopCycle() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  function freePreview() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
  }

  function reset() {
    stopCycle()
    freePreview()
    setFile(null)
    setError(null)
    setState('idle')
  }

  function selectFile(raw: File) {
    if (raw.size > MAX_BYTES) {
      setError('File exceeds 10 MB - please choose a smaller file.')
      setState('error')
      return
    }
    freePreview()
    if (raw.type !== 'application/pdf') {
      setPreviewUrl(URL.createObjectURL(raw))
    }
    setFile(raw)
    setError(null)
    setState('previewing')
  }

  async function upload(raw: File) {
    setState('uploading')
    startCycle()
    try {
      let toSend: File = raw
      if (raw.type !== 'application/pdf') {
        toSend = await imageCompression(raw, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1800,
          useWebWorker: true,
        })
      }
      const receipt = await scanReceipt(toSend)
      stopCycle()
      reset()
      onSuccess(receipt)
    } catch (err) {
      stopCycle()
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setState('error')
    }
  }

  const onDrop = useCallback(
    (accepted: File[], rejected: { errors: readonly { code: string }[] }[]) => {
      if (rejected.length > 0) {
        const code = rejected[0]?.errors[0]?.code
        setError(
          code === 'file-too-large'
            ? 'File exceeds 10 MB - please choose a smaller file.'
            : 'Unsupported file type. Please use PDF, JPG, PNG, or WEBP.',
        )
        setState('error')
        return
      }
      if (accepted[0]) selectFile(accepted[0])
    },
    [],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: MAX_BYTES,
    multiple: false,
    noClick: true,
  })

  const isPdf = file?.type === 'application/pdf'

  // -- Uploading --
  if (state === 'uploading') {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center gap-6 rounded-lg border border-rule bg-card px-8 py-12 text-center shadow-card">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full" style={primaryCircle}>
          <svg
            className="animate-spin"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'var(--primary)' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="font-display text-xl font-semibold tracking-tight text-ink">
            {SCAN_MESSAGES[msgIdx]}
          </p>
          <p className="mt-1 text-sm text-ink-2">This usually takes a few seconds</p>
        </div>
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ background: 'var(--primary)', animationDelay: `${i * 0.25}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // -- Previewing --
  if (state === 'previewing' && file) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center gap-6 rounded-lg border border-rule bg-card px-8 py-12 shadow-card">
        <div className="flex flex-col items-center gap-3">
          {isPdf ? (
            <div className="flex h-24 w-20 flex-col items-center justify-center gap-1 rounded-md border border-rule-strong bg-paper-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-accent"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="font-mono text-xs font-medium text-ink-2">PDF</span>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-48 max-w-[240px] rounded-md border border-rule object-contain shadow-sm"
            />
          ) : null}
          <p className="max-w-xs break-all text-center text-sm font-medium text-ink">
            {file.name}
          </p>
          <p className="text-xs text-ink-2">{(() => { const kb = file.size / 1024; return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB` })()}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="rounded-xs border border-rule-strong px-4 py-2 text-sm font-medium text-ink-2 transition hover:border-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Cancel
          </button>
          <button
            onClick={() => upload(file)}
            className="rounded-xs px-5 py-2 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            style={primaryBtn}
          >
            Scan receipt
          </button>
        </div>
      </div>
    )
  }

  // -- Idle / Error --
  return (
    <div
      {...getRootProps()}
      className={[
        'relative flex min-h-[480px] flex-col items-center justify-center rounded-lg',
        'border-[1.5px] border-dashed px-8 py-12 text-center',
        'cursor-pointer select-none transition-all duration-200',
        isDragActive
          ? 'scale-[1.005] border-[var(--primary)] bg-card'
          : 'border-rule-strong bg-card hover:border-[var(--primary)]',
      ].join(' ')}
      onClick={() => browseRef.current?.click()}
    >
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 rounded-lg" style={dragGlow} />
      )}

      {/* Dropzone drag-and-drop input */}
      <input {...getInputProps()} />

      {/* Mobile: camera input */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) selectFile(f)
          e.target.value = ''
        }}
      />

      {/* Browse: all types */}
      <input
        ref={browseRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) selectFile(f)
          e.target.value = ''
        }}
      />

      {/* Icon circle */}
      <div
        className="relative z-10 mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={primaryCircle}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <h2 className="relative z-10 mb-2 font-display text-2xl font-semibold tracking-heading text-ink">
        {isDragActive ? 'Drop it here' : 'Drop your receipt here'}
      </h2>
      <p className="relative z-10 mb-8 text-sm text-ink-2">
        PDF, JPG, PNG or WEBP &bull; max 10 MB
      </p>

      {/* CTAs */}
      <div className="relative z-10 flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-2 rounded-xs px-5 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          style={primaryBtn}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Take a photo
        </button>
        <button
          type="button"
          onClick={() => browseRef.current?.click()}
          className="text-sm text-ink-2 underline underline-offset-2 transition hover:text-ink hover:no-underline focus:outline-none focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          or browse files
        </button>
      </div>

      {/* Error */}
      {(state === 'error' && error) && (
        <div className="relative z-10 mt-6 flex max-w-sm items-start gap-2 rounded-xs bg-red-50 px-4 py-3 text-left text-sm text-red-700">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
