'use client'

import { Send, Share2, Users } from 'lucide-react'

export default function ArticleShareActions({ title }: { title: string }) {
  async function shareArticle() {
    const url = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url })
        return
      }

      await navigator.clipboard.writeText(url)
      alert('Tautan artikel disalin ke clipboard')
    } catch {
      alert('Gagal membagikan — silakan salin tautan secara manual')
    }
  }

  function shareToTwitter() {
    const url = window.location.href
    const target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  function shareToFacebook() {
    const url = window.location.href
    const target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <button type="button" className="secondary-btn share-btn" onClick={() => void shareArticle()}>
        <Share2 size={14} /> Bagikan
      </button>
      <button type="button" className="social-btn twitter" onClick={shareToTwitter} title="Bagikan ke Twitter">
        <Send size={14} /> Twitter
      </button>
      <button type="button" className="social-btn facebook" onClick={shareToFacebook} title="Bagikan ke Facebook">
        <Users size={14} /> Facebook
      </button>
    </>
  )
}
