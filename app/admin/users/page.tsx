'use client'

import { AdminRouteShell } from '@/components/dashboard-sidebar'
import Link from 'next/link'
import { ArrowLeft, Edit3, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'
const TOKEN_KEY = 'nutrilife_auth_token'

type Role = 'NUTRITIONIST' | 'ADMIN'
type CurrentUser = { id: string; name: string; email: string; role: 'USER' | Role }
type Staff = { id: string; name: string; email: string; role: Role; createdAt?: string }
type StaffForm = { name: string; email: string; password: string; role: Role }

const emptyForm: StaffForm = { name: '', email: '', password: '', role: 'NUTRITIONIST' }

export default function StaffManagementPage() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_KEY) ?? ''
    setToken(savedToken)
    void initialize(savedToken)
  }, [])

  async function initialize(savedToken: string) {
    setLoading(true)
    try {
      if (!savedToken) return
      const meResponse = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
      if (!meResponse.ok) {
        window.localStorage.removeItem(TOKEN_KEY)
        return
      }
      const meData = await meResponse.json() as { user: CurrentUser }
      setUser(meData.user)
      if (meData.user.role === 'ADMIN') await loadStaff(savedToken)
    } catch {
      setError('Gagal menghubungi server.')
    } finally { setLoading(false) }
  }

  async function loadStaff(authToken = token) {
    const response = await fetch(`${API_URL}/admin/staff`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    const data = await response.json().catch(() => ({})) as { staff?: Staff[]; message?: string }
    if (!response.ok) throw new Error(data.message || 'Daftar staf tidak dapat dimuat.')
    setStaff(data.staff ?? [])
  }

  function startEdit(item: Staff) {
    setEditingId(item.id)
    setForm({ name: item.name, email: item.email, password: '', role: item.role })
    setError(''); setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError(''); setMessage('')
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const payload = editingId
        ? { name: form.name, email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) }
        : form
      const response = await fetch(editingId ? `${API_URL}/admin/staff/${editingId}` : `${API_URL}/admin/staff`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Akun staf gagal disimpan.')
      setMessage(editingId ? 'Akun staf berhasil diperbarui.' : 'Akun staf berhasil dibuat.')
      setEditingId(null); setForm(emptyForm)
      await loadStaff()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Akun staf gagal disimpan.')
    } finally { setSaving(false) }
  }

  async function deleteStaff(item: Staff) {
    if (!window.confirm(`Hapus akun ${item.name}? Data akun yang terkait juga akan dihapus.`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await fetch(`${API_URL}/admin/staff/${item.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const data = response.status === 204 ? {} : await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(data.message || 'Akun staf gagal dihapus.')
      if (editingId === item.id) cancelEdit()
      setMessage('Akun staf berhasil dihapus.')
      await loadStaff()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Akun staf gagal dihapus.')
    } finally { setSaving(false) }
  }

  if (loading) return <main className="article-page-shell"><div className="article-page-container"><div className="admin-loading">Memuat pengelolaan akun…</div></div></main>

  if (!user) return <main className="article-page-shell"><div className="article-page-container"><div className="admin-access-card"><h1>Kelola Akun Staf</h1><p>Silakan masuk menggunakan akun Admin.</p><Link href="/" className="primary-btn">Masuk melalui dashboard</Link></div></div></main>

  if (user.role !== 'ADMIN') return <main className="article-page-shell"><div className="article-page-container"><Link href="/" className="article-back"><ArrowLeft size={17} /> Kembali ke dashboard</Link><div className="admin-access-card"><h1>Akses ditolak</h1><p>Hanya Admin yang dapat mengelola akun Admin dan Nutritionist.</p></div></div></main>

  return <AdminRouteShell user={user} active="staff"><main className="article-page-shell"><div className="article-page-container admin-article-page">
    <div className="article-toolbar">
      <div className="staff-toolbar-actions"><Link href="/articles/admin" className="secondary-btn">Kelola artikel</Link><span className="admin-role-badge">ADMIN</span></div>
    </div>
    <header className="article-hero admin-hero"><span className="article-kicker">USER MANAGEMENT</span><h1>Kelola Akun Staf</h1><p>Buat dan atur akun Admin maupun Nutritionist tanpa membuka pilihan role pada registrasi publik.</p></header>

    {error && <div className="panel error">{error}</div>}
    {message && <div className="panel success"><ShieldCheck size={17} /> {message}</div>}

    <section className="panel admin-panel">
      <div className="admin-panel-heading"><span><UserPlus size={18} /></span><div><h2>{editingId ? 'Ubah akun staf' : 'Buat akun staf'}</h2><p>{editingId ? 'Kosongkan password jika tidak ingin menggantinya.' : 'Password minimal 8 karakter serta mengandung huruf dan angka.'}</p></div></div>
      <form className="admin-form-grid" onSubmit={saveStaff}>
        <label>Nama lengkap<input required minLength={2} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input required={!editingId} minLength={form.password ? 8 : undefined} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder={editingId ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'} /></label>
        <label>Role<select value={form.role} disabled={editingId === user.id} onChange={event => setForm({ ...form, role: event.target.value as Role })}><option value="NUTRITIONIST">Nutritionist</option><option value="ADMIN">Admin</option></select></label>
        <div className="form-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Menyimpan…' : editingId ? 'Perbarui akun' : 'Buat akun'}</button>{editingId && <button className="secondary-btn" type="button" onClick={cancelEdit}>Batal</button>}</div>
      </form>
    </section>

    <section className="panel admin-panel">
      <div className="admin-panel-heading"><span><UsersRound size={18} /></span><div><h2>Daftar staf ({staff.length})</h2><p>Akun USER dari registrasi publik tidak ditampilkan di daftar ini.</p></div></div>
      <table className="admin-table"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>
        {staff.map(item => <tr key={item.id}><td><strong>{item.name}</strong>{item.id === user.id && <small className="current-user-label">Akun Anda</small>}</td><td>{item.email}</td><td><span className={`staff-role role-${item.role.toLowerCase()}`}>{item.role}</span></td><td>{item.createdAt ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.createdAt)) : '—'}</td><td><div className="table-actions"><button className="edit-action" type="button" onClick={() => startEdit(item)}><Edit3 size={14} /> Edit</button><button className="delete-action" type="button" disabled={saving || item.id === user.id} onClick={() => void deleteStaff(item)}><Trash2 size={14} /> Hapus</button></div></td></tr>)}
        {staff.length === 0 && <tr><td colSpan={5} className="staff-empty">Belum ada akun staf.</td></tr>}
      </tbody></table>
    </section>
  </div></main></AdminRouteShell>
}
