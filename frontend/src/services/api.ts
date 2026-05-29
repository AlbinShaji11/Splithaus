import type { ScannedReceipt } from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function scanReceipt(file: File): Promise<ScannedReceipt> {
  const form = new FormData()
  form.append('file', file)
  let res: Response
  try {
    res = await fetch(`${BASE}/api/scan-receipt`, { method: 'POST', body: form })
  } catch {
    throw new Error('Could not reach the server. Is the backend running?')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `Server error ${res.status}` }))
    const msg = typeof body.detail === 'string' ? body.detail : `Server error ${res.status}`
    throw new Error(msg)
  }
  return res.json() as Promise<ScannedReceipt>
}
