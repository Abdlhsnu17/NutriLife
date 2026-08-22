"use client"

import { Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = { slug: string; title?: string }

const STORAGE_KEY = 'nutrilife_share_counts'

function TwitterIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.69 6.69 0 0 0 16 3.542a6.66 6.66 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.084.8 3.286 3.286 0 0 0-5.594 2.995A9.325 9.325 0 0 1 1.114 2.61a3.29 3.29 0 0 0 1.016 4.382A3.323 3.323 0 0 1 .64 6.583v.045a3.288 3.288 0 0 0 2.633 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15" />
    </svg>
  )
}

function FacebookIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M16 8.049C16 3.604 12.418 0 8 0S0 3.604 0 8.049C0 12.067 2.926 15.397 6.75 16v-5.625H4.719V8.049H6.75V6.276c0-2.017 1.194-3.132 3.022-3.132.875 0 1.79.157 1.79.157v1.98h-1.008c-.993 0-1.304.621-1.304 1.258v1.51h2.219l-.355 2.326H9.25V16c3.824-.603 6.75-3.933 6.75-7.951" />
    </svg>
  )
}

function readCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCounts(counts: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(counts)) } catch {}
}

export default function ShareButtons({ slug, title }: Props) {
  const [count, setCount] = useState<number>(0)
  const [status, setStatus] = useState<string | null>(null)
  const [popping, setPopping] = useState(false)

  useEffect(() => {
    const counts = readCounts()
    setCount(counts[slug] ?? 0)
  }, [slug])

  function increment() {
    try {
      const counts = readCounts()
      counts[slug] = (counts[slug] ?? 0) + 1
      writeCounts(counts)
      setCount(counts[slug])
      setPopping(true)
      setTimeout(() => setPopping(false), 350)
    } catch {}
  }

  function shareNative() {
    try {
      const url = window.location.href
      if (navigator.share) {
        void navigator.share({ title: title ?? 'Artikel NutriLife', text: title ?? '', url }).then(() => { increment(); setStatus('Berhasil dibagikan') })
      } else {
        void navigator.clipboard.writeText(url).then(() => { increment(); setStatus('Tautan disalin') })
      }
    } catch { alert('Gagal membagikan — silakan salin tautan') }
  }

  function shareTwitter() {
    try {
      const url = window.location.href
      const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title ?? '')}&url=${encodeURIComponent(url)}`
      window.open(tw, '_blank', 'noopener')
      increment()
      setStatus('Dibuka di Twitter')
    } catch { alert('Gagal membuka Twitter') }
  }

  function shareFacebook() {
    try {
      const url = window.location.href
      const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
      window.open(fb, '_blank', 'noopener')
      increment()
      setStatus('Dibuka di Facebook')
    } catch { alert('Gagal membuka Facebook') }
  }

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(null), 1800)
    return () => clearTimeout(t)
  }, [status])

  return (
    <div className="card-share-actions" style={{ position: 'relative' }}>
      {status && <div className="share-toast" role="status" aria-live="polite">{status}</div>}
      <button type="button" className="card-share-button" onClick={shareNative}>
        <Share2 size={14} /> Bagikan
        <span className={`share-count${popping ? ' pop' : ''}`}>{count}</span>
      </button>
      <button type="button" className="card-share-button twitter" onClick={shareTwitter} aria-label="Bagikan ke Twitter"><TwitterIcon /></button>
      <button type="button" className="card-share-button facebook" onClick={shareFacebook} aria-label="Bagikan ke Facebook"><FacebookIcon /></button>
    </div>
  )
}
