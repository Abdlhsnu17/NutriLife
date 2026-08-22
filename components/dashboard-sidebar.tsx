'use client'

import Link from 'next/link'
import { Activity, Apple, BookOpen, ChevronRight, CircleHelp, LayoutDashboard, LogOut, Menu, Settings, Sparkles, Target, UsersRound, Utensils, X } from 'lucide-react'
import { ReactNode, useState } from 'react'

type SidebarUser = { name: string; role: string; avatarUrl?: string | null }
type AdminSection = 'articles' | 'staff'

const mainItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Catat Makanan', icon: Utensils },
  { label: 'Aktivitas', icon: Activity },
  { label: 'Rencana Makan', icon: Apple },
]
const otherItems = [
  { label: 'Target saya', icon: Target },
  { label: 'Bantuan', icon: CircleHelp },
  { label: 'Pengaturan', icon: Settings },
]

type DashboardSidebarProps = {
  user: SidebarUser
  active?: string
  activeAdmin?: AdminSection
  mobileOpen: boolean
  onClose: () => void
  onNavigate?: (label: string) => void
  onLogout?: () => void
}

function dashboardHref(label: string) {
  return label === 'Dashboard' ? '/' : `/?section=${encodeURIComponent(label)}`
}

export function DashboardSidebar({ user, active, activeAdmin, mobileOpen, onClose, onNavigate, onLogout }: DashboardSidebarProps) {
  const initials = user.name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
  const avatar = <div className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</div>
  const navigate = (label: string) => { onNavigate?.(label); onClose() }
  const logout = () => {
    if (onLogout) onLogout()
    else { window.localStorage.removeItem('nutrilife_auth_token'); window.location.href = '/' }
  }
  const renderDashboardItem = ({ label, icon: Icon }: (typeof mainItems)[number] | (typeof otherItems)[number]) => {
    const className = active === label ? 'nav-item active' : 'nav-item'
    return onNavigate
      ? <button key={label} className={className} onClick={() => navigate(label)}><Icon size={18} />{label}</button>
      : <Link key={label} href={dashboardHref(label)} className={className} onClick={onClose}><Icon size={18} />{label}</Link>
  }

  return <>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Tutup menu" onClick={onClose} />}
    <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><Apple size={19} /></div><span>Nutri<span>Life</span></span><button className="close-mobile" onClick={onClose} aria-label="Tutup menu"><X size={18} /></button></div>
      {onNavigate
        ? <button className="workspace" onClick={() => navigate('Pengaturan')}>{avatar}<div><strong>{user.name}</strong><small>Personal space</small></div><ChevronRight size={16} className="muted" /></button>
        : <Link href={dashboardHref('Pengaturan')} className="workspace sidebar-workspace-link" onClick={onClose}>{avatar}<div><strong>{user.name}</strong><small>Personal space</small></div><ChevronRight size={16} className="muted" /></Link>}
      <p className="nav-caption">MENU UTAMA</p>
      <nav>{mainItems.map(renderDashboardItem)}</nav>
      <p className="nav-caption second">LAINNYA</p>
      <nav>
        {renderDashboardItem(otherItems[0])}
        {['ADMIN', 'NUTRITIONIST'].includes(user.role) && <Link href="/articles/admin" className={activeAdmin === 'articles' ? 'nav-item admin-link active' : 'nav-item admin-link'} onClick={onClose}><BookOpen size={18} />Kelola Artikel &amp; Berita</Link>}
        {user.role === 'ADMIN' && <Link href="/admin/users" className={activeAdmin === 'staff' ? 'nav-item admin-link active' : 'nav-item admin-link'} onClick={onClose}><UsersRound size={18} />Kelola akun staf</Link>}
        {otherItems.slice(1).map(renderDashboardItem)}
      </nav>
      <div className="sidebar-bottom"><button className="coach-card" onClick={() => onNavigate ? navigate('Bantuan') : window.location.assign(dashboardHref('Bantuan'))}><Sparkles size={18} /><div><strong>Butuh arahan?</strong><small>Konsultasi dengan nutritionist kami.</small></div><ChevronRight size={15} /></button><button className="logout" onClick={logout}><LogOut size={17} /> Keluar</button></div>
    </aside>
  </>
}

export function AdminRouteShell({ user, active, children }: { user: SidebarUser; active: AdminSection; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return <div className="app-shell admin-app-shell">
    <DashboardSidebar user={user} activeAdmin={active} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <div className="admin-route-content">
      <button className="admin-route-menu" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={21} /></button>
      {children}
    </div>
  </div>
}
