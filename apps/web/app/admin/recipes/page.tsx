'use client'

import { AdminRouteShell } from '@/components/dashboard-sidebar'
import Link from 'next/link'
import { ArrowLeft, ChefHat, Edit3, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'
const TOKEN_KEY = 'nutrilife_auth_token'
type User = { id: string; name: string; email: string; role: 'USER' | 'NUTRITIONIST' | 'ADMIN' }
type Recipe = { id: string; title: string; category: string; ingredients: string; steps: string; loves: number; sourceUrl: string; totalIngredients: number; totalSteps: number }
type RecipeForm = { title: string; category: string; ingredients: string; steps: string; sourceUrl: string }
const blank: RecipeForm = { title: '', category: '', ingredients: '', steps: '', sourceUrl: '' }

export default function RecipeManagementPage() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [form, setForm] = useState<RecipeForm>(blank)
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
        if (data.user.role === 'ADMIN') await loadRecipes(authToken)
      }
    } catch { setError('Gagal menghubungi server.') }
    finally { setLoading(false) }
  }

  async function loadRecipes(authToken = token, search = query) {
    const response = await fetch(`${API_URL}/admin/recipes?q=${encodeURIComponent(search)}`, { cache: 'no-store', headers: { Authorization: `Bearer ${authToken}` } })
    const data = await response.json().catch(() => ({})) as { recipes?: Recipe[]; message?: string }
    if (!response.ok) throw new Error(data.message || 'Daftar resep tidak dapat dimuat.')
    setRecipes(data.recipes ?? [])
  }

  function editRecipe(recipe: Recipe) {
    setEditing(recipe.id)
    setForm({ title: recipe.title, category: recipe.category, ingredients: recipe.ingredients, steps: recipe.steps, sourceUrl: recipe.sourceUrl })
    setError(''); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() { setEditing(''); setForm(blank); setError(''); setMessage('') }

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    const payload = { title: form.title, category: form.category, ingredients: form.ingredients.split('\n').map(value => value.trim()).filter(Boolean), steps: form.steps.split('\n').map(value => value.trim()).filter(Boolean), ...(form.sourceUrl ? { sourceUrl: form.sourceUrl } : {}) }
    try {
      const response = await fetch(editing ? `${API_URL}/admin/recipes/${encodeURIComponent(editing)}` : `${API_URL}/admin/recipes`, {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Resep gagal disimpan.')
      setMessage(editing ? 'Resep berhasil diperbarui.' : 'Resep berhasil ditambahkan.')
      setForm(blank); setEditing(''); await loadRecipes()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Resep gagal disimpan.') }
    finally { setSaving(false) }
  }

  async function deleteRecipe(recipe: Recipe) {
    if (!window.confirm(`Hapus resep “${recipe.title}”?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch(`${API_URL}/admin/recipes/${encodeURIComponent(recipe.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const data = response.status === 204 ? {} : await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Resep gagal dihapus.')
      if (editing === recipe.id) resetForm()
      setMessage('Resep berhasil dihapus.'); await loadRecipes()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Resep gagal dihapus.') }
    finally { setSaving(false) }
  }

  if (loading) return <main className="article-page-shell"><div className="article-page-container"><div className="admin-loading">Memuat resep…</div></div></main>
  if (!user) return <main className="article-page-shell"><div className="article-page-container"><div className="admin-access-card"><h1>Kelola Resep</h1><p>Silakan masuk menggunakan akun Admin.</p><Link href="/" className="primary-btn">Masuk melalui dashboard</Link></div></div></main>
  if (user.role !== 'ADMIN') return <main className="article-page-shell"><div className="article-page-container"><Link href="/" className="article-back"><ArrowLeft size={17} /> Kembali ke dashboard</Link><div className="admin-access-card"><h1>Akses ditolak</h1><p>Hanya Admin yang dapat mengelola resep.</p></div></div></main>

  return <AdminRouteShell user={user} active="recipes"><main className="article-page-shell"><div className="article-page-container admin-article-page">
    <div className="article-toolbar"><div className="staff-toolbar-actions"><Link href="/admin/catalog" className="secondary-btn">Katalog makanan</Link><span className="admin-role-badge">ADMIN</span></div></div>
    <header className="article-hero admin-hero"><span className="article-kicker">RECIPE MANAGEMENT</span><h1>Kelola Resep Makanan</h1><p>Tambahkan resep beserta bahan dan langkah memasaknya. Resep akan tersedia di pencarian Rencana Makan.</p></header>
    {error && <div className="panel error">{error}</div>}{message && <div className="panel success"><ShieldCheck size={17} /> {message}</div>}
    <section className="panel admin-panel"><div className="admin-panel-heading"><span><Plus size={18} /></span><div><h2>{editing ? 'Ubah resep' : 'Tambah resep'}</h2><p>Setiap bahan dan langkah ditulis pada baris terpisah.</p></div></div>
      <form className="admin-form-grid" onSubmit={saveRecipe}>
        <label>Nama resep<input required minLength={2} maxLength={255} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Sup ayam sayur" /></label>
        <label>Kategori<input required maxLength={100} value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="Contoh: Makanan utama" /></label>
        <label className="full">Bahan-bahan<textarea required rows={6} value={form.ingredients} onChange={event => setForm({ ...form, ingredients: event.target.value })} placeholder={'200 g dada ayam\n1 wortel\n500 ml air'} /></label>
        <label className="full">Langkah memasak<textarea required rows={6} value={form.steps} onChange={event => setForm({ ...form, steps: event.target.value })} placeholder={'Rebus ayam hingga matang.\nMasukkan sayuran dan masak hingga lunak.'} /></label>
        <label className="full">URL sumber (opsional)<input type="url" value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} placeholder="Kosongkan untuk resep buatan sendiri" /></label>
        <div className="form-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Tambahkan resep'}</button>{editing && <button type="button" className="secondary-btn" onClick={resetForm}>Batal</button>}</div>
      </form>
    </section>
    <section className="panel admin-panel"><div className="catalog-list-heading"><div className="admin-panel-heading"><span><ChefHat size={18} /></span><div><h2>Daftar resep ({recipes.length})</h2><p>Resep yang tersedia di katalog NutriLife.</p></div></div><form className="catalog-search" onSubmit={event => { event.preventDefault(); void loadRecipes(token, query).catch(reason => setError(reason.message)) }}><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari resep atau kategori" /><button className="secondary-btn">Cari</button></form></div>
      <div className="catalog-table-wrap"><table className="admin-table"><thead><tr><th>Nama resep</th><th>Kategori</th><th>Bahan</th><th>Langkah</th><th>Aksi</th></tr></thead><tbody>
        {recipes.map(recipe => <tr key={recipe.id}><td><strong>{recipe.title}</strong></td><td>{recipe.category}</td><td>{recipe.totalIngredients}</td><td>{recipe.totalSteps}</td><td><div className="table-actions"><button className="edit-action" type="button" onClick={() => editRecipe(recipe)}><Edit3 size={14} /> Edit</button><button className="delete-action" type="button" disabled={saving} onClick={() => void deleteRecipe(recipe)}><Trash2 size={14} /> Hapus</button></div></td></tr>)}
        {!recipes.length && <tr><td colSpan={5} className="staff-empty">Belum ada resep yang cocok.</td></tr>}
      </tbody></table></div>
    </section>
  </div></main></AdminRouteShell>
}
