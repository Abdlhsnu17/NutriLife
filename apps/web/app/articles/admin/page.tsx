"use client"

import { AdminRouteShell } from '@/components/dashboard-sidebar';
import Link from 'next/link';
import { ArrowLeft, Edit3, Eye, FilePlus2, ImagePlus, LayoutList, Megaphone, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'
const TOKEN_KEY = 'nutrilife_auth_token'

type Article = { slug: string; title: string; category?: string | null; excerpt?: string | null; imageUrl?: string | null; time?: string | null; isNews?: boolean }
type User = { id: string; name: string; email: string; role: string }
type AdminModule = 'articles' | 'article-form' | 'notifications'

const contentCategories = ['Makanan', 'Resep', 'Nutrisi', 'Minuman', 'Tips Sehat', 'Kebugaran', 'Hidrasi', 'Pengumuman']

export default function AdminArticlesPage() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState<Article[]>([])
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({ title: '', slug: '', category: '', excerpt: '', content: '', imageUrl: '', timeToRead: '', isNews: false })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'article' | 'notification' | null>(null)
  const [activeModule, setActiveModule] = useState<AdminModule>('articles')

  useEffect(() => { setToken(window.localStorage.getItem(TOKEN_KEY)) }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        if (!token) { setUser(null); await loadArticles(); setLoading(false); return }
        const meRes = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (!meRes.ok) { setUser(null); setToken(null); window.localStorage.removeItem(TOKEN_KEY); setError('Sesi tidak valid, silakan login ulang.'); await loadArticles(); setLoading(false); return }
        const meData = await meRes.json()
        setUser(meData.user)
        await loadArticles()
      } catch (err) { setError('Gagal menghubungi server') }
      finally { setLoading(false) }
    }
    void init()
  }, [token])

  async function loadArticles() {
    try {
      const res = await fetch(`${API_URL}/articles`, { cache: 'no-store' })
      if (!res.ok) { setArticles([]); return }
      const data = await res.json()
      setArticles(data.articles ?? [])
    } catch { setArticles([]) }
  }

  // Notifications
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; imageUrl?: string | null }>>([])
  const [notifForm, setNotifForm] = useState({ title: '', message: '', imageUrl: '' })

  async function loadNotifications() {
    try {
      const res = await fetch(`${API_URL}/notifications`, { cache: 'no-store' })
      if (!res.ok) { setNotifications([]); return }
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch { setNotifications([]) }
  }

  useEffect(() => { void loadNotifications() }, [])

  function ensureAuthHeader(headers: HeadersInit = {}) {
    if (token) return { ...headers, Authorization: `Bearer ${token}` }
    return headers
  }

  async function handleCreateOrUpdate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null)
    try {
      const payload = { title: form.title, slug: form.slug || undefined, category: form.category || undefined, excerpt: form.excerpt || undefined, content: form.content, imageUrl: form.imageUrl || undefined, timeToRead: form.timeToRead || undefined, isNews: form.isNews }
      const url = editing ? `${API_URL}/articles/${encodeURIComponent(editing)}` : `${API_URL}/articles`
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(ensureAuthHeader() as any) }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || res.statusText || 'Gagal menyimpan')
      }
      await loadArticles()
      setForm({ title: '', slug: '', category: '', excerpt: '', content: '', imageUrl: '', timeToRead: '', isNews: false })
      setEditing(null)
      setActiveModule('articles')
    } catch (err: any) { setError(err?.message ?? 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  async function handleUploadFile(file: File | undefined, target: 'article' | 'notification') {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File yang dipilih harus berupa gambar.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Ukuran gambar maksimal 5 MB.'); return }
    setUploading(target); setError(null)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Gagal membaca file'))
        reader.readAsDataURL(file)
      })
      const res = await fetch(`${API_URL}/uploads`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(ensureAuthHeader() as any) }, body: JSON.stringify({ fileName: file.name, data: dataUrl }) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || 'Gagal mengunggah') }
      const data = await res.json()
      if (target === 'article') setForm(prev => ({ ...prev, imageUrl: data.url }))
      else setNotifForm(prev => ({ ...prev, imageUrl: data.url }))
    } catch (err: any) { setError(err?.message ?? 'Gagal mengunggah') }
    finally { setUploading(null) }
  }

  async function handleEdit(slug: string) {
    setError(null); setLoading(true)
    try {
      const res = await fetch(`${API_URL}/articles/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Tidak dapat memuat artikel')
      const data = await res.json()
      setForm({ title: data.title ?? '', slug: data.slug ?? '', category: data.category ?? '', excerpt: data.excerpt ?? '', content: data.content ?? '', imageUrl: data.imageUrl ?? '', timeToRead: data.time ?? '', isNews: !!data.isNews })
      setEditing(slug)
      setActiveModule('article-form')
    } catch (err: any) { setError(err?.message ?? 'Gagal memuat artikel') }
    finally { setLoading(false) }
  }

  async function handleDelete(slug: string) {
    if (!confirm('Hapus artikel ini?')) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`${API_URL}/articles/${encodeURIComponent(slug)}`, { method: 'DELETE', headers: ensureAuthHeader() })
      if (!res.ok) throw new Error('Gagal menghapus')
      await loadArticles()
    } catch (err: any) { setError(err?.message ?? 'Gagal menghapus') }
    finally { setSaving(false) }
  }

  if (loading) return <main className="article-page-shell"><div className="article-page-container"><Link href="/articles" className="article-back"><ArrowLeft size={17} /> Kembali ke artikel</Link><div className="admin-loading">Memuat pengelolaan artikel…</div></div></main>

  if (!user) return (
    <main className="article-page-shell"><div className="article-page-container">
      <Link href="/articles" className="article-back"><ArrowLeft size={17} /> Kembali ke artikel</Link>
      <div className="admin-access-card"><h1>Admin Artikel &amp; Berita</h1><p>Silakan masuk sebagai Nutritionist atau Admin untuk mengelola artikel dan berita.</p><Link href="/" className="primary-btn">Masuk melalui dashboard</Link></div>
    </div></main>
  )

  if (!['ADMIN', 'NUTRITIONIST'].includes(user.role)) return (
    <main className="article-page-shell"><div className="article-page-container"><Link href="/articles" className="article-back"><ArrowLeft size={17} /> Kembali ke artikel</Link><div className="admin-access-card"><h1>Akses ditolak</h1><p>Akun Anda bukan Admin atau Nutritionist.</p></div></div></main>
  )

  return (
    <AdminRouteShell user={user} active="articles"><main className="article-page-shell"><div className="article-page-container admin-article-page">
      <div className="article-toolbar"><div className="staff-toolbar-actions">{user.role === 'ADMIN' && <Link href="/admin/users" className="secondary-btn">Kelola akun staf</Link>}<span className="admin-role-badge">{user.role}</span></div></div>
      <header className="article-hero admin-hero"><span className="article-kicker">CONTENT MANAGEMENT</span><h1>Kelola Artikel &amp; Berita</h1><p>Tambah, lihat, ubah, dan hapus artikel maupun berita NutriLife.</p></header>

      {error && <div className="panel error">{error}</div>}

      <nav className="admin-module-tabs" aria-label="Modul pengelolaan konten">
        <button className={activeModule === 'articles' ? 'active' : ''} onClick={() => setActiveModule('articles')}><LayoutList size={17} /><span>Daftar Konten<small>{articles.length} artikel &amp; berita</small></span></button>
        <button className={activeModule === 'article-form' ? 'active' : ''} onClick={() => { setEditing(null); setForm({ title: '', slug: '', category: '', excerpt: '', content: '', imageUrl: '', timeToRead: '', isNews: false }); setActiveModule('article-form') }}><FilePlus2 size={17} /><span>Tulis Konten<small>Artikel atau berita baru</small></span></button>
        <button className={activeModule === 'notifications' ? 'active' : ''} onClick={() => setActiveModule('notifications')}><Megaphone size={17} /><span>Pengumuman<small>{notifications.length} pemberitahuan</small></span></button>
      </nav>

      <div className="admin-module-stage" key={activeModule}>
      {activeModule === 'article-form' && <section className="panel admin-panel" id="article-form">
        <div className="admin-panel-heading"><span><FilePlus2 size={18} /></span><div><h2>{editing ? 'Ubah konten' : 'Buat konten baru'}</h2><p>{editing ? `Sedang mengubah “${editing}”` : 'Berita dapat berisi makanan, resep, nutrisi, minuman, tips sehat, dan informasi lainnya.'}</p></div></div>
        <form onSubmit={handleCreateOrUpdate} className="admin-form-grid">
          <label>Jenis konten
            <select value={form.isNews ? 'news' : 'article'} onChange={e => setForm({ ...form, isNews: e.target.value === 'news' })}>
              <option value="article">Artikel</option>
              <option value="news">Berita terbaru</option>
            </select>
          </label>
          <label>Judul<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label>Slug (opsional)<input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="biarkan kosong untuk auto" /></label>
          <label>Kategori
            <input list="content-categories" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Contoh: Resep" />
            <datalist id="content-categories">{contentCategories.map(category => <option value={category} key={category} />)}</datalist>
          </label>
          <label>Ringkasan<input value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} /></label>
          <label>Estimasi baca<input value={form.timeToRead} onChange={e => setForm({ ...form, timeToRead: e.target.value })} /></label>
          <label>URL gambar utama (opsional)<input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></label>
          <label className="full">Isi lengkap<textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} /></label>
          <label className="upload-field">Unggah gambar utama
            <span className="upload-control"><ImagePlus size={17} />{uploading === 'article' ? 'Mengunggah…' : 'Pilih foto dari perangkat'}</span>
            <input disabled={uploading !== null} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void handleUploadFile(e.target.files?.[0], 'article'); e.currentTarget.value = '' }} />
            <small>JPG, PNG, WebP, atau GIF · maksimal 5 MB.</small>
          </label>
          {form.imageUrl && <div className="image-preview full"><img src={form.imageUrl} alt="Preview gambar utama artikel" /><button type="button" onClick={() => setForm({ ...form, imageUrl: '' })}><X size={15} /> Hapus gambar</button></div>}
          <div className="form-actions">
            <button className="primary-btn" disabled={saving || uploading !== null}>{saving ? 'Menyimpan…' : (uploading === 'article' ? 'Mengunggah gambar…' : (editing ? 'Perbarui' : 'Buat'))}</button>
            {editing && (
              <button className="secondary-btn" type="button" onClick={() => { setEditing(null); setForm({ title: '', slug: '', category: '', excerpt: '', content: '', imageUrl: '', timeToRead: '', isNews: false }) }}>Batal</button>
            )}
          </div>
        </form>
      </section>}

      {activeModule === 'notifications' && <section className="panel admin-panel">
        <h2>Pengumuman / Pemberitahuan</h2>
        <form onSubmit={async e => {
          e.preventDefault(); setSaving(true); setError(null)
          try {
            const payload = { title: notifForm.title, message: notifForm.message, imageUrl: notifForm.imageUrl || undefined }
            const res = await fetch(`${API_URL}/notifications`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(ensureAuthHeader() as any) }, body: JSON.stringify(payload) })
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || 'Gagal menyimpan') }
            setNotifForm({ title: '', message: '', imageUrl: '' })
            await loadNotifications()
          } catch (err: any) { setError(err?.message ?? 'Gagal menyimpan') }
          finally { setSaving(false) }
        }} className="admin-form-grid">
          <label>Judul<input required value={notifForm.title} onChange={e => setNotifForm({ ...notifForm, title: e.target.value })} /></label>
          <label>Pesan<textarea required value={notifForm.message} onChange={e => setNotifForm({ ...notifForm, message: e.target.value })} /></label>
          <label>URL gambar (opsional)<input value={notifForm.imageUrl} onChange={e => setNotifForm({ ...notifForm, imageUrl: e.target.value })} placeholder="https://..." /></label>
          <label className="upload-field">Unggah gambar pengumuman
            <span className="upload-control"><ImagePlus size={17} />{uploading === 'notification' ? 'Mengunggah…' : 'Pilih foto dari perangkat'}</span>
            <input disabled={uploading !== null} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { void handleUploadFile(e.target.files?.[0], 'notification'); e.currentTarget.value = '' }} />
            <small>JPG, PNG, WebP, atau GIF · maksimal 5 MB.</small>
          </label>
          {notifForm.imageUrl && <div className="image-preview full"><img src={notifForm.imageUrl} alt="Preview gambar pengumuman" /><button type="button" onClick={() => setNotifForm({ ...notifForm, imageUrl: '' })}><X size={15} /> Hapus gambar</button></div>}
          <div className="form-actions"><button className="primary-btn" disabled={saving || uploading !== null}>{saving ? 'Menyimpan…' : (uploading === 'notification' ? 'Mengunggah gambar…' : 'Buat Pengumuman')}</button></div>
        </form>

        <h3>Daftar Pengumuman ({notifications.length})</h3>
        <table className="admin-table"><thead><tr><th>Judul</th><th>Pesan</th><th>Gambar</th><th>Aksi</th></tr></thead>
          <tbody>
            {notifications.map(n => (
              <tr key={n.id}><td>{n.title}</td><td>{n.message}</td><td>{n.imageUrl ? <img src={n.imageUrl} style={{ maxWidth: 120 }} /> : '—'}</td><td>
                <button onClick={async () => { if (!confirm('Hapus pengumuman?')) return; setSaving(true); try { const res = await fetch(`${API_URL}/notifications/${encodeURIComponent(n.id)}`, { method: 'DELETE', headers: ensureAuthHeader() }); if (!res.ok) throw new Error('Gagal menghapus'); await loadNotifications() } catch (err: any) { setError(err?.message ?? 'Gagal menghapus') } finally { setSaving(false) } }}>Hapus</button>
              </td></tr>
            ))}
          </tbody></table>
      </section>}

      {activeModule === 'articles' && <section className="panel admin-panel">
        <div className="admin-list-heading"><div><h2>Daftar Artikel &amp; Berita</h2><p>{articles.length} konten tersimpan</p></div><button className="primary-btn" onClick={() => { setEditing(null); setForm({ title: '', slug: '', category: '', excerpt: '', content: '', imageUrl: '', timeToRead: '', isNews: false }); setActiveModule('article-form') }}><Plus size={16} /> Tulis konten</button></div>
        <table className="admin-table">
          <thead>
            <tr><th>Judul</th><th>Slug</th><th>Kategori</th><th>Gambar</th><th>Berita</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {articles.map(a => (
              <tr key={a.slug}>
                <td>{a.title}</td>
                <td>{a.slug}</td>
                <td>{a.category}</td>
                <td>{a.imageUrl ? <img src={a.imageUrl} style={{ maxWidth: 120 }} /> : '—'}</td>
                <td>{a.isNews ? 'Ya' : '—'}</td>
                <td><div className="table-actions">
                  <Link href={`/articles/${a.slug}`} title="Lihat artikel"><Eye size={15} /> Lihat</Link>
                  <button className="edit-action" onClick={() => void handleEdit(a.slug)}><Edit3 size={15} /> Edit</button>
                  <button className="delete-action" onClick={() => void handleDelete(a.slug)}><Trash2 size={15} /> Hapus</button>
                </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>}
      </div>
    </div></main></AdminRouteShell>
  )
}
