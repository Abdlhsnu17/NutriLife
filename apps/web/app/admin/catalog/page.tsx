'use client'

import { AdminRouteShell } from '@/components/dashboard-sidebar'
import Link from 'next/link'
import { ArrowLeft, Edit3, Plus, Salad, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'
const TOKEN_KEY = 'nutrilife_auth_token'
type User = { id: string; name: string; email: string; role: 'USER' | 'NUTRITIONIST' | 'ADMIN' }
type Item = { id: string; name: string; brand: string; kind: 'FOOD' | 'DRINK'; calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number }
type ItemForm = Omit<Item, 'id'>
const blank: ItemForm = { name: '', brand: '', kind: 'FOOD', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
const nutritionFields = [['calories', 'Kalori (kkal)'], ['protein', 'Protein (g)'], ['carbs', 'Karbohidrat (g)'], ['fat', 'Lemak (g)'], ['fiber', 'Serat (g)'], ['sugar', 'Gula (g)'], ['sodium', 'Natrium (mg)']] as const

export default function CatalogManagementPage() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState<ItemForm>(blank)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_KEY) ?? ''
    setToken(saved)
    void initialize(saved)
  }, [])

  async function initialize(authToken: string) {
    try {
      if (!authToken) return
      const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } })
      if (response.ok) {
        const data = await response.json() as { user: User }
        setUser(data.user)
        if (data.user.role === 'ADMIN') await loadItems(authToken)
      }
    } catch { setError('Gagal menghubungi server.') }
    finally { setLoading(false) }
  }

  async function loadItems(authToken = token, search = query) {
    const response = await fetch(`${API_URL}/admin/nutrition-items?q=${encodeURIComponent(search)}`, { cache: 'no-store', headers: { Authorization: `Bearer ${authToken}` } })
    const data = await response.json().catch(() => ({})) as { items?: Item[]; message?: string }
    if (!response.ok) throw new Error(data.message || 'Katalog tidak dapat dimuat.')
    setItems(data.items ?? [])
  }

  function beginEdit(item: Item) {
    setEditing(item.id)
    setForm({ name: item.name, brand: item.brand, kind: item.kind, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber, sugar: item.sugar, sodium: item.sodium })
    setError(''); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() { setEditing(''); setForm(blank); setError(''); setMessage('') }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch(editing ? `${API_URL}/admin/nutrition-items/${encodeURIComponent(editing)}` : `${API_URL}/admin/nutrition-items`, {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Item katalog gagal disimpan.')
      setMessage(editing ? 'Item katalog berhasil diperbarui.' : 'Item katalog berhasil ditambahkan.')
      setForm(blank); setEditing(''); await loadItems()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Item katalog gagal disimpan.') }
    finally { setSaving(false) }
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Hapus “${item.name}” dari katalog?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch(`${API_URL}/admin/nutrition-items/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const data = response.status === 204 ? {} : await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Item katalog gagal dihapus.')
      if (editing === item.id) resetForm()
      setMessage('Item katalog berhasil dihapus.'); await loadItems()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Item katalog gagal dihapus.') }
    finally { setSaving(false) }
  }

  if (loading) return <main className="article-page-shell"><div className="article-page-container"><div className="admin-loading">Memuat katalog makanan…</div></div></main>
  if (!user) return <main className="article-page-shell"><div className="article-page-container"><div className="admin-access-card"><h1>Katalog makanan &amp; minuman</h1><p>Silakan masuk menggunakan akun Admin.</p><Link href="/" className="primary-btn">Masuk melalui dashboard</Link></div></div></main>
  if (user.role !== 'ADMIN') return <main className="article-page-shell"><div className="article-page-container"><Link href="/" className="article-back"><ArrowLeft size={17} /> Kembali ke dashboard</Link><div className="admin-access-card"><h1>Akses ditolak</h1><p>Hanya Admin yang dapat mengelola katalog makanan dan minuman.</p></div></div></main>

  return <AdminRouteShell user={user} active="catalog"><main className="article-page-shell"><div className="article-page-container admin-article-page">
    <div className="article-toolbar"><div className="staff-toolbar-actions"><Link href="/admin/users" className="secondary-btn">Kelola akun staf</Link><span className="admin-role-badge">ADMIN</span></div></div>
    <header className="article-hero admin-hero"><span className="article-kicker">NUTRITION CATALOG</span><h1>Katalog Makanan &amp; Minuman</h1><p>Kelola pilihan yang muncul saat pengguna mencari makanan untuk dicatat.</p></header>
    {error && <div className="panel error">{error}</div>}{message && <div className="panel success"><ShieldCheck size={17} /> {message}</div>}
    <section className="panel admin-panel"><div className="admin-panel-heading"><span><Plus size={18} /></span><div><h2>{editing ? 'Ubah item katalog' : 'Tambah item katalog'}</h2><p>Masukkan kandungan gizi per porsi yang ditampilkan kepada pengguna.</p></div></div>
      <form className="admin-form-grid" onSubmit={saveItem}>
        <label>Nama makanan/minuman<input required minLength={2} maxLength={255} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Nasi goreng" /></label>
        <label>Merek / sumber<input required value={form.brand} onChange={event => setForm({ ...form, brand: event.target.value })} placeholder="Contoh: Buatan sendiri" /></label>
        <label>Jenis<select value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value as ItemForm['kind'] })}><option value="FOOD">Makanan</option><option value="DRINK">Minuman</option></select></label>
        {nutritionFields.map(([key, label]) => <label key={key}>{label}<input required min="0" step={key === 'calories' ? '1' : '0.1'} type="number" value={form[key]} onChange={event => setForm({ ...form, [key]: Number(event.target.value) })} /></label>)}
        <div className="form-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Tambahkan ke katalog'}</button>{editing && <button type="button" className="secondary-btn" onClick={resetForm}>Batal</button>}</div>
      </form>
    </section>
    <section className="panel admin-panel"><div className="catalog-list-heading"><div className="admin-panel-heading"><span><Salad size={18} /></span><div><h2>Daftar item ({items.length})</h2><p>Item di sini tersedia sebagai pilihan pada pencatatan makanan.</p></div></div><form className="catalog-search" onSubmit={event => { event.preventDefault(); void loadItems(token, query).catch(reason => setError(reason.message)) }}><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama atau merek" /><button className="secondary-btn">Cari</button></form></div>
      <div className="catalog-table-wrap"><table className="admin-table"><thead><tr><th>Nama</th><th>Merek / sumber</th><th>Jenis</th><th>Kalori</th><th>Protein</th><th>Karbo</th><th>Lemak</th><th>Aksi</th></tr></thead><tbody>
        {items.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.brand}</td><td>{item.kind === 'FOOD' ? 'Makanan' : 'Minuman'}</td><td>{item.calories} kkal</td><td>{item.protein} g</td><td>{item.carbs} g</td><td>{item.fat} g</td><td><div className="table-actions"><button className="edit-action" type="button" onClick={() => beginEdit(item)}><Edit3 size={14} /> Edit</button><button className="delete-action" type="button" disabled={saving} onClick={() => void deleteItem(item)}><Trash2 size={14} /> Hapus</button></div></td></tr>)}
        {!items.length && <tr><td colSpan={8} className="staff-empty">Belum ada item katalog yang cocok.</td></tr>}
      </tbody></table></div>
    </section>
  </div></main></AdminRouteShell>
}
