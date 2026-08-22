'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Apple, ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'

export type AuthUser = { id: string; name: string; email: string; role: 'USER' | 'NUTRITIONIST' | 'ADMIN'; avatarUrl?: string | null }
type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

export default function AuthScreen({ onAuthenticated, onBack }: { onAuthenticated: (token: string, user: AuthUser) => void; onBack?: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [resetToken, setResetToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('resetToken')
    if (!token) return
    setResetToken(token)
    setMode('reset')
    setMessage('Tautan valid. Silakan masukkan password baru.')
  }, [])

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode); setError(''); setMessage(''); setForm(current => ({ ...current, password: '', confirmPassword: '' }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    if ((mode === 'register' || mode === 'reset') && form.password !== form.confirmPassword) {
      setError('Konfirmasi password tidak sama.'); setLoading(false); return
    }
    try {
      const endpoint = mode === 'register' ? 'register' : mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : 'login'
      const body = mode === 'register'
        ? { name: form.name, email: form.email, password: form.password }
        : mode === 'forgot' ? { email: form.email }
          : mode === 'reset' ? { token: resetToken, password: form.password }
            : { email: form.email, password: form.password }
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await response.json() as { token?: string; user?: AuthUser; resetToken?: string; message?: string }
      if (!response.ok) throw new Error(data.message || 'Permintaan tidak dapat diproses.')
      if ((mode === 'login' || mode === 'register') && data.token && data.user) {
        onAuthenticated(data.token, data.user); return
      }
      if (mode === 'forgot') {
        setMessage(data.resetToken ? 'Email ditemukan. Silakan buat password baru.' : data.message || 'Instruksi reset telah dibuat.')
        if (data.resetToken) { setResetToken(data.resetToken); setMode('reset') }
        return
      }
      setMessage(data.message || 'Password berhasil diperbarui.')
      setMode('login'); setForm(current => ({ ...current, password: '', confirmPassword: '' }))
      const url = new URL(window.location.href)
      if (url.searchParams.has('resetToken')) {
        url.searchParams.delete('resetToken')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Terjadi kesalahan. Coba lagi.')
    } finally { setLoading(false) }
  }

  const title = mode === 'register' ? 'Buat akun baru' : mode === 'forgot' ? 'Lupa password?' : mode === 'reset' ? 'Buat password baru' : 'Selamat datang kembali'
  const subtitle = mode === 'register' ? 'Mulai perjalanan sehatmu bersama NutriLife.' : mode === 'forgot' ? 'Masukkan email akun untuk melanjutkan.' : mode === 'reset' ? 'Gunakan minimal 8 karakter, huruf, dan angka.' : 'Masuk untuk melihat progres kesehatanmu.'

  return <main className="auth-page">
    <section className="auth-visual">
      <div className="auth-brand"><span><Apple size={25} /></span>Nutri<strong>Life</strong></div>
      <div className="auth-visual-copy"><p>KESEHATANMU, SETIAP HARI</p><h1>Kebiasaan kecil.<br />Perubahan besar.</h1><span>Catat makanan, pantau aktivitas, dan capai target kesehatan dalam satu tempat.</span></div>
      <div className="auth-orbit"><div><Apple size={44} /></div></div>
    </section>
    <section className="auth-panel">
      <form className="auth-card" onSubmit={submit}>
        {mode === 'login' && onBack && <button type="button" className="auth-back" onClick={onBack}><ArrowLeft size={16} /> Kembali ke beranda</button>}
        {mode !== 'login' && <button type="button" className="auth-back" onClick={() => changeMode('login')}><ArrowLeft size={16} /> Kembali ke login</button>}
        <div className="auth-mobile-brand"><Apple size={22} /> Nutri<strong>Life</strong></div>
        <p className="auth-kicker">NUTRILIFE PERSONAL</p><h2>{title}</h2><p className="auth-subtitle">{subtitle}</p>
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {mode === 'register' && <label>Nama lengkap<div className="auth-input"><UserRound size={17} /><input autoComplete="name" required minLength={2} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Nama lengkapmu" /></div></label>}
        {mode !== 'reset' && <label>Email<div className="auth-input"><Mail size={17} /><input type="email" autoComplete="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="nama@email.com" /></div></label>}
        {mode !== 'forgot' && <label>Password<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 8} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Tampilkan password">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
        {(mode === 'register' || mode === 'reset') && <label>Konfirmasi password<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={form.confirmPassword} onChange={event => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Ulangi password" /></div></label>}
        {mode === 'login' && <button type="button" className="forgot-link" onClick={() => changeMode('forgot')}>Lupa password?</button>}
        <button className="auth-submit" disabled={loading}>{loading ? 'Memproses…' : mode === 'register' ? 'Buat akun' : mode === 'forgot' ? 'Lanjutkan' : mode === 'reset' ? 'Simpan password baru' : 'Masuk'}</button>
        {mode === 'login' && <p className="auth-switch">Belum punya akun? <button type="button" onClick={() => changeMode('register')}>Buat akun</button></p>}
        {mode === 'register' && <p className="auth-switch">Sudah punya akun? <button type="button" onClick={() => changeMode('login')}>Masuk</button></p>}
      </form>
    </section>
  </main>
}
