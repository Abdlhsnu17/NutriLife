'use client'

import AuthScreen, { AuthUser } from '@/components/auth-screen';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import PublicHome from '@/components/public-home';
import { Activity, Apple, Bell, BookOpen, CalendarDays, Camera, ChevronRight, Droplets, Edit3, Eye, EyeOff, Flame, Footprints, LayoutDashboard, LockKeyhole, Mail, Menu, Moon, MoreHorizontal, Plus, Save, Search, ShieldCheck, Sparkles, Sun, Trash2, TrendingUp, Utensils, Weight, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'
const TOKEN_KEY = 'nutrilife_auth_token'
const mealLabels = { BREAKFAST: 'Sarapan', LUNCH: 'Makan siang', SNACK: 'Camilan', DINNER: 'Makan malam' } as const
const mealStyles = { BREAKFAST: ['mint', '🥣'], LUNCH: ['gold', '🍱'], SNACK: ['lilac', '🫐'], DINNER: ['mint', '🍲'] } as const
type MealType = keyof typeof mealLabels
type Meal = { id: string; mealType: MealType; name: string; calories: number; protein: number; carbs: number; fat: number; loggedAt: string }
type NutritionSuggestion = {
  id: string; name: string; brand: string; kind: 'FOOD' | 'DRINK'
  calories: number; protein: number; carbs: number; fat: number
  fiber: number; sugar: number; sodium: number
}
type RecipeSuggestion = {
  id: string; title: string; category: string; ingredients: string; steps: string
  totalIngredients: number; totalSteps: number
}
type PlanRecipe = RecipeSuggestion & { calories?: number; protein?: number; carbs?: number; fat?: number }
type SelectedMealDetail =
  | { kind: 'nutrition'; item: NutritionSuggestion }
  | { kind: 'recipe'; recipe: RecipeSuggestion }
type Dashboard = {
  user: AuthUser; date: string
  nutrition: { calories: number; protein: number; carbs: number; fat: number }
  calories: { consumed: number; target: number }; water: { consumedMl: number; targetMl: number }
  steps: { current: number; target: number }; weight: { current: number; change: number; target: number }
  macroTargets: { protein: number; carbs: number; fat: number }; meals: Meal[]
  weeklyActivity: { day: string; steps: number }[]
}
const emptyDashboard = (user: AuthUser = { id: '', name: 'Pengguna', email: '', role: 'USER' }): Dashboard => ({
  user, date: new Date().toISOString(),
  nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 }, calories: { consumed: 0, target: 1800 },
  water: { consumedMl: 0, targetMl: 2500 }, steps: { current: 0, target: 8000 },
  weight: { current: 0, change: 0, target: 65 }, macroTargets: { protein: 120, carbs: 220, fat: 60 }, meals: [], weeklyActivity: [],
})
const nav = [
  { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Catat Makanan', icon: Utensils },
  { label: 'Aktivitas', icon: Activity }, { label: 'Rencana Makan', icon: Apple },
]
const faq = [
  ['Bagaimana cara mencatat makanan?', 'Pilih Catat Makanan, isi nilai nutrisi, lalu tekan Simpan makanan.'],
  ['Apakah target bisa diubah?', 'Bisa. Buka Target saya, ubah nilai yang diinginkan, kemudian simpan.'],
  ['Mengapa data belum muncul?', 'Pastikan MySQL dan backend aktif, lalu tekan tombol Coba lagi pada notifikasi.'],
]
const percent = (value: number, target: number) => target ? Math.min(100, Math.round(value / target * 100)) : 0
const formatNumber = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)
const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
const parseRecipeList = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return []
  const withoutBrackets = trimmed.replace(/^\s*\[/, '').replace(/\]\s*$/, '')
  const parts = withoutBrackets.includes("', '")
    ? withoutBrackets.split(/'\s*,\s*'/)
    : withoutBrackets.includes('\", \"')
      ? withoutBrackets.split(/\"\s*,\s*\"/)
      : withoutBrackets.split(/\r?\n|\s*\|\s*/)
  return parts.map(part => part.trim().replace(/^['\"]|['\"]$/g, '')).filter(Boolean)
}

function StatCard({ icon: Icon, label, value, detail, progress, accent }: { icon: typeof Flame; label: string; value: string; detail: string; progress: number; accent: string }) {
  return <div className={`stat-card ${accent}`}><div className="stat-head"><span className="stat-icon"><Icon size={18} /></span><span className="stat-label">{label}</span><MoreHorizontal size={18} className="muted" /></div><div className="stat-value">{value}</div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><div className="stat-detail">{detail}</div></div>
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<AuthUser | null>(null)
  const [token, setToken] = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [active, setActive] = useState('Dashboard')
  const [dark, setDark] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMeal, setShowMeal] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showWeight, setShowWeight] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingMealId, setDeletingMealId] = useState('')
  const [dashboard, setDashboard] = useState<Dashboard>(() => emptyDashboard())
  const [mealForm, setMealForm] = useState({ mealType: 'BREAKFAST' as MealType, name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [editingMealId, setEditingMealId] = useState('')
  const [nutritionSuggestions, setNutritionSuggestions] = useState<NutritionSuggestion[]>([])
  const [recipeSuggestions, setRecipeSuggestions] = useState<RecipeSuggestion[]>([])
  const [planRecipes, setPlanRecipes] = useState<PlanRecipe[]>([])
  const [planQuery, setPlanQuery] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [selectedSuggestionName, setSelectedSuggestionName] = useState('')
  const [selectedMealDetail, setSelectedMealDetail] = useState<SelectedMealDetail | null>(null)
  const [activityForm, setActivityForm] = useState({ activityType: 'Berjalan', steps: '', duration: '', calories: '' })
  const [weightValue, setWeightValue] = useState('')
  const [goals, setGoals] = useState({ CALORIES: '1800', WATER: '2500', STEPS: '8000', WEIGHT: '65', PROTEIN: '120', CARBS: '220', FAT: '60' })
  const [profileForm, setProfileForm] = useState({ name: 'Andi Darmawan', email: 'andi@nutrilife.local' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400) }
  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(''); setSession(null); setDashboard(emptyDashboard()); setError('')
  }, [])
  const loadDashboard = useCallback(async () => {
    if (!token || !session) return
    try {
      const response = await fetch(`${API_URL}/dashboard/${session.id}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
      if (response.status === 401) { logout(); return }
      if (!response.ok) throw new Error('Dashboard tidak dapat dimuat')
      const data = await response.json() as Dashboard
      setDashboard(data); setProfileForm({ name: data.user.name, email: data.user.email }); setGoals({ CALORIES: String(data.calories.target), WATER: String(data.water.targetMl), STEPS: String(data.steps.target), WEIGHT: String(data.weight.target), PROTEIN: String(data.macroTargets.protein), CARBS: String(data.macroTargets.carbs), FAT: String(data.macroTargets.fat) }); setError('')
    } catch { setError('Database belum tersambung. Jalankan MySQL dan backend untuk memuat data.') }
    finally { setLoading(false) }
  }, [logout, session, token])
  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    if (!storedToken) { setAuthReady(true); return }
    void fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` } })
      .then(async response => {
        if (!response.ok) throw new Error('Sesi berakhir')
        const data = await response.json() as { user: AuthUser }
        setToken(storedToken); setSession(data.user); setDashboard(emptyDashboard(data.user))
      })
      .catch(() => window.localStorage.removeItem(TOKEN_KEY))
      .finally(() => setAuthReady(true))
  }, [])
  useEffect(() => { if (authReady && session && token) void loadDashboard() }, [authReady, session, token, loadDashboard])
  useEffect(() => {
    if (window.location.pathname === '/login') setShowAuth(true)
    const requestedSection = new URLSearchParams(window.location.search).get('section')
    const sections = ['Dashboard', 'Catat Makanan', 'Aktivitas', 'Rencana Makan', 'Target saya', 'Bantuan', 'Pengaturan']
    if (requestedSection && sections.includes(requestedSection)) setActive(requestedSection)
  }, [])
  useEffect(() => {
    const query = mealForm.name.trim()
    if (!showMeal || !token || query.length < 2 || query === selectedSuggestionName) {
      setNutritionSuggestions([]); setRecipeSuggestions([]); return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      const options = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
      void Promise.all([
        fetch(`${API_URL}/nutrition-items?q=${encodeURIComponent(query)}&limit=5`, options),
        fetch(`${API_URL}/recipes?q=${encodeURIComponent(query)}&limit=5`, options),
      ]).then(async ([nutritionResponse, recipeResponse]) => {
        const nutritionData = nutritionResponse.ok ? await nutritionResponse.json() as { items: NutritionSuggestion[] } : { items: [] }
        const recipeData = recipeResponse.ok ? await recipeResponse.json() as { recipes: RecipeSuggestion[] } : { recipes: [] }
        setNutritionSuggestions(nutritionData.items); setRecipeSuggestions(recipeData.recipes)
      }).catch(error => {
        if ((error as Error).name !== 'AbortError') { setNutritionSuggestions([]); setRecipeSuggestions([]) }
      })
    }, 250)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [mealForm.name, selectedSuggestionName, showMeal, token])
  useEffect(() => {
    if (active !== 'Rencana Makan' || !token) return
    const query = planQuery.trim() || 'ayam'
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setPlanLoading(true); setPlanError('')
      void fetch(`${API_URL}/recipes?q=${encodeURIComponent(query)}&limit=8`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
        .then(async response => {
          if (!response.ok) throw new Error('Resep belum dapat dimuat. Pastikan database dan backend aktif.')
          const data = await response.json() as { recipes: PlanRecipe[] }
          setPlanRecipes(data.recipes)
        })
        .catch(requestError => { if ((requestError as Error).name !== 'AbortError') setPlanError((requestError as Error).message) })
        .finally(() => { if (!controller.signal.aborted) setPlanLoading(false) })
    }, 250)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [active, planQuery, token])

  function resetMealEditor() {
    setShowMeal(false); setEditingMealId(''); setNutritionSuggestions([]); setRecipeSuggestions([]); setSelectedSuggestionName(''); setSelectedMealDetail(null)
    setMealForm({ mealType: 'BREAKFAST', name: '', calories: '', protein: '', carbs: '', fat: '' })
  }
  function openNewMeal() {
    resetMealEditor()
    setShowMeal(true)
  }
  function editMeal(meal: Meal) {
    setEditingMealId(meal.id); setSelectedSuggestionName(meal.name); setSelectedMealDetail(null); setNutritionSuggestions([]); setRecipeSuggestions([])
    setMealForm({ mealType: meal.mealType, name: meal.name, calories: String(meal.calories), protein: String(meal.protein), carbs: String(meal.carbs), fat: String(meal.fat) })
    setShowMeal(true)
  }
  async function saveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true)
    try {
      const body = { mealType: mealForm.mealType, name: mealForm.name, calories: Number(mealForm.calories), protein: Number(mealForm.protein || 0), carbs: Number(mealForm.carbs || 0), fat: Number(mealForm.fat || 0) }
      const response = await fetch(editingMealId ? `${API_URL}/meals/${encodeURIComponent(editingMealId)}` : `${API_URL}/meals`, { method: editingMealId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      if (!response.ok) throw new Error('Gagal menyimpan makanan')
      const wasEditing = Boolean(editingMealId)
      await loadDashboard(); resetMealEditor(); notify(wasEditing ? 'Catatan makanan berhasil diperbarui' : 'Makanan berhasil disimpan ke database')
    } catch { setError('Makanan gagal disimpan. Periksa backend dan isian form.') }
    finally { setSaving(false) }
  }
  async function deleteMeal(meal: Meal) {
    if (!window.confirm(`Hapus catatan “${meal.name}”? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeletingMealId(meal.id)
    try {
      const response = await fetch(`${API_URL}/meals/${encodeURIComponent(meal.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('Gagal menghapus makanan')
      await loadDashboard(); notify('Catatan makanan berhasil dihapus')
    } catch { setError('Catatan makanan gagal dihapus. Periksa koneksi backend.') }
    finally { setDeletingMealId('') }
  }
  async function addWater() {
    try {
      const response = await fetch(`${API_URL}/water`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amountMl: 250 }) })
      if (!response.ok) throw new Error('Gagal menyimpan air')
      await loadDashboard(); notify('250 ml air disimpan ke database')
    } catch { setError('Air minum gagal disimpan. Periksa koneksi backend.') }
  }
  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true)
    try {
      const response = await fetch(`${API_URL}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ activityType: activityForm.activityType, steps: Number(activityForm.steps || 0), duration: Number(activityForm.duration || 0), calories: Number(activityForm.calories || 0) }) })
      if (!response.ok) throw new Error()
      await loadDashboard(); setShowActivity(false); setActivityForm({ activityType: 'Berjalan', steps: '', duration: '', calories: '' }); notify('Aktivitas berhasil disimpan')
    } catch { setError('Aktivitas gagal disimpan. Periksa backend dan isian form.') } finally { setSaving(false) }
  }
  async function saveWeight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true)
    try {
      const response = await fetch(`${API_URL}/weights`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ weight: Number(weightValue) }) })
      if (!response.ok) throw new Error()
      await loadDashboard(); setShowWeight(false); setWeightValue(''); notify('Berat badan berhasil diperbarui')
    } catch { setError('Berat badan gagal disimpan.') } finally { setSaving(false) }
  }
  async function saveGoals(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true)
    try {
      const payload = Object.fromEntries(Object.entries(goals).map(([key, value]) => [key, Number(value)]))
      const response = await fetch(`${API_URL}/goals`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ goals: payload }) })
      if (!response.ok) throw new Error()
      await loadDashboard(); notify('Semua target berhasil disimpan')
    } catch { setError('Target gagal disimpan. Periksa nilai dan koneksi backend.') } finally { setSaving(false) }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      let updatedUser = session!
      if (avatarFile) {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
          reader.readAsDataURL(avatarFile)
        })
        const avatarResponse = await fetch(`${API_URL}/users/${session!.id}/avatar`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ fileName: avatarFile.name, data }) })
        const avatarResult = await avatarResponse.json() as { user?: AuthUser; message?: string }
        if (!avatarResponse.ok || !avatarResult.user) throw new Error(avatarResult.message || 'Foto profil gagal diunggah.')
        updatedUser = avatarResult.user
      }
      const response = await fetch(`${API_URL}/users/${session!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(profileForm) })
      const result = await response.json() as { user?: AuthUser; message?: string }
      if (!response.ok || !result.user) throw new Error(result.message || 'Profil gagal disimpan.')
      updatedUser = { ...updatedUser, ...result.user }
      setSession(updatedUser); setAvatarFile(null)
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview('')
      await loadDashboard(); notify('Profil berhasil diperbarui')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Profil gagal disimpan.') } finally { setSaving(false) }
  }
  function selectAvatar(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Gunakan foto JPG, PNG, atau WebP.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Ukuran foto maksimal 2 MB.'); return }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); setError('')
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError('Konfirmasi password baru tidak sama.'); return }
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/users/${session!.id}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) })
      const result = await response.json() as { message?: string }
      if (!response.ok) throw new Error(result.message || 'Password gagal diperbarui.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); notify('Password berhasil diperbarui')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Password gagal diperbarui.') } finally { setSaving(false) }
  }

  function selectMenu(label: string) {
    setActive(label); setMobileOpen(false); setSearchOpen(false); setNotificationsOpen(false)
    if (label === 'Catat Makanan') openNewMeal()
  }

  if (!authReady) return <main className="auth-loading"><div className="brand-mark"><Apple size={24} /></div><span>Menyiapkan NutriLife…</span></main>
  if (!session || !token) return showAuth ? <AuthScreen onBack={() => {
    setShowAuth(false)
    if (window.location.pathname === '/login') router.push('/')
  }} onAuthenticated={(newToken, user) => {
    window.localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken); setSession(user); setDashboard(emptyDashboard(user)); setProfileForm({ name: user.name, email: user.email })
    if (window.location.pathname === '/login') {
      const requested = searchParams.get('redirect') || '/'
      router.replace(requested.startsWith('/') && !requested.startsWith('//') ? requested : '/')
    }
  }} /> : <PublicHome />

  const initials = dashboard.user.name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
  const waterGlasses = Math.round(dashboard.water.consumedMl / 250)
  const targetGlasses = Math.max(1, Math.round(dashboard.water.targetMl / 250))
  const weeklyBars = dashboard.weeklyActivity.length ? dashboard.weeklyActivity : Array.from({ length: 7 }, (_, index) => ({ day: new Date(Date.now() - (6 - index) * 86400000).toISOString(), steps: 0 }))
  const pageDescriptions: Record<string, string> = { Dashboard: 'Pantau kebiasaan sehatmu hari ini.', 'Catat Makanan': 'Lihat dan tambahkan asupan harianmu.', Aktivitas: 'Catat gerak tubuh dan perkembangan langkahmu.', 'Rencana Makan': 'Menu seimbang yang siap menemani harimu.', 'Target saya': 'Atur sasaran kesehatan sesuai kebutuhanmu.', Bantuan: 'Temukan jawaban atau hubungi tim NutriLife.', Pengaturan: 'Kelola profil dan preferensi aplikasi.' }

  return <main className={dark ? 'app-shell dark' : 'app-shell'}>
    <DashboardSidebar user={dashboard.user} active={active} mobileOpen={mobileOpen} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(collapsed => !collapsed)} onClose={() => setMobileOpen(false)} onNavigate={selectMenu} onLogout={logout} />
    <section className="content">
      <header className="topbar"><button className="menu-btn" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={21} /></button><div className="crumb"><span>{formatDate(dashboard.date)}</span><h1>{active === 'Dashboard' ? <>Selamat datang, {dashboard.user.name.split(' ')[0]} <span>👋</span></> : active}</h1></div><div className="top-actions"><button className="icon-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Cari"><Search size={19} /></button><button className="icon-btn notification" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifikasi"><Bell size={19} /><i /></button><button className="theme-btn" onClick={() => setDark(!dark)} aria-label="Ganti tema">{dark ? <Sun size={17} /> : <Moon size={17} />}</button></div>{searchOpen && <div className="top-popover search-pop"><Search size={16} /><input autoFocus placeholder="Cari menu…" onChange={event => { const found = [...nav.map(item => item.label), 'Target saya', 'Bantuan', 'Pengaturan'].find(label => label.toLowerCase().includes(event.target.value.toLowerCase())); if (event.target.value && found) setActive(found) }} /></div>}{notificationsOpen && <div className="top-popover"><strong>Notifikasi</strong><p>Data kesehatanmu siap diperbarui hari ini.</p><button onClick={() => { setNotificationsOpen(false); notify('Notifikasi ditandai sudah dibaca') }}>Tandai sudah dibaca</button></div>}</header>
      <div className="page-body">
        {error && <div className="db-error"><span>{error}</span><button onClick={() => { setLoading(true); void loadDashboard() }}>Coba lagi</button></div>}
        {active === 'Dashboard' && <><div className="title-row"><div><p className="eyebrow">RINGKASAN HARI INI</p><h2>Progress kesehatanmu</h2><p className="subtext">{loading ? 'Mengambil data dari database…' : 'Data hari ini tersinkron dengan database.'}</p></div><button className="primary-btn" onClick={openNewMeal}><Plus size={17} /> Catat makanan</button></div>
        <div className="stats-grid">
          <StatCard icon={Flame} label="Kalori hari ini" value={formatNumber(dashboard.calories.consumed)} detail={`dari target ${formatNumber(dashboard.calories.target)} kkal`} progress={percent(dashboard.calories.consumed, dashboard.calories.target)} accent="peach" />
          <StatCard icon={Droplets} label="Minum air" value={`${formatNumber(dashboard.water.consumedMl / 1000)} L`} detail={`dari target ${formatNumber(dashboard.water.targetMl / 1000)} L`} progress={percent(dashboard.water.consumedMl, dashboard.water.targetMl)} accent="blue" />
          <StatCard icon={Activity} label="Aktivitas" value={formatNumber(dashboard.steps.current)} detail={`dari target ${formatNumber(dashboard.steps.target)} langkah`} progress={percent(dashboard.steps.current, dashboard.steps.target)} accent="lavender" />
          <StatCard icon={TrendingUp} label="Berat badan" value={dashboard.weight.current ? `${formatNumber(dashboard.weight.current)} kg` : '—'} detail={`${dashboard.weight.change <= 0 ? 'turun' : 'naik'} ${formatNumber(Math.abs(dashboard.weight.change))} kg dari catatan sebelumnya`} progress={percent(dashboard.weight.target, dashboard.weight.current || dashboard.weight.target)} accent="green" />
        </div>
        <div className="dashboard-grid">
          <div className="panel nutrition"><div className="panel-title"><div><h3>Asupan nutrisi</h3><p>{formatDate(dashboard.date)}</p></div><button className="select-btn">Hari ini <ChevronRight size={15} /></button></div><div className="nutrition-main"><div className="donut" style={{ background: `conic-gradient(#73b696 0 ${percent(dashboard.calories.consumed, dashboard.calories.target)}%, #ecf1ed 0)` }}><div className="donut-hole"><strong>{formatNumber(dashboard.nutrition.calories)}</strong><span>kkal dikonsumsi</span></div></div><div className="macro-list"><div><span className="macro-dot protein" /><span>Protein</span><strong>{formatNumber(dashboard.nutrition.protein)}g <small>/ {formatNumber(dashboard.macroTargets.protein)}g</small></strong></div><div><span className="macro-dot carbs" /><span>Karbohidrat</span><strong>{formatNumber(dashboard.nutrition.carbs)}g <small>/ {formatNumber(dashboard.macroTargets.carbs)}g</small></strong></div><div><span className="macro-dot fat" /><span>Lemak</span><strong>{formatNumber(dashboard.nutrition.fat)}g <small>/ {formatNumber(dashboard.macroTargets.fat)}g</small></strong></div></div></div><div className="tip"><Sparkles size={17} /><span><strong>Tip hari ini:</strong> Catat makro makanan agar ringkasan nutrisimu lebih akurat.</span></div></div>
          <div className="panel meals"><div className="panel-title"><div><h3>Log makanan</h3><p>{dashboard.meals.length} waktu makan tercatat hari ini</p></div></div>{dashboard.meals.length === 0 && <p className="empty-state">Belum ada makanan yang dicatat.</p>}{dashboard.meals.slice(0, 4).map(meal => { const style = mealStyles[meal.mealType]; return <div className="meal-row" key={meal.id}><div className={`meal-icon ${style[0]}`}>{style[1]}</div><div className="meal-copy"><strong>{mealLabels[meal.mealType]}</strong><span>{new Date(meal.loggedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {meal.name}</span></div><strong className="meal-kcal">{meal.calories} <small>kkal</small></strong></div> })}<button className="add-meal" onClick={openNewMeal}><Plus size={17} /> Tambah waktu makan</button></div>
        </div>
        <div className="lower-grid">
          <div className="panel weekly"><div className="panel-title"><div><h3>Aktivitas minggu ini</h3><p>Target {formatNumber(dashboard.steps.target * 7)} langkah</p></div><span className="goal-badge"><ShieldCheck size={14} /> tersimpan di DB</span></div><div className="chart"><div className="y-labels"><span>10k</span><span>7.5k</span><span>5k</span><span>2.5k</span><span>0</span></div><div className="bars">{weeklyBars.map(item => <div className="bar-col" key={item.day}><div className="bar" style={{ height: `${Math.min(100, item.steps / 100)}%` }} /><span>{new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(new Date(item.day))}</span></div>)}</div></div></div>
          <div className="panel water"><div className="panel-title"><div><h3>Target air minum</h3><p>Jaga hidrasi tubuhmu</p></div><Droplets size={20} className="water-icon" /></div><div className="water-value"><strong>{waterGlasses}</strong><span>/ {targetGlasses} gelas</span></div><div className="glasses">{Array.from({ length: targetGlasses }).map((_, i) => <span className={i < waterGlasses ? 'glass filled' : 'glass'} key={i}><Droplets size={14} /></span>)}</div><button className="outline-btn" onClick={() => void addWater()}>+ Tambah 1 gelas</button></div>
        </div>
        </>}
        {active !== 'Dashboard' && <div className="section-heading"><p className="eyebrow">{active.toUpperCase()}</p><h2>{active}</h2><p>{pageDescriptions[active]}</p></div>}

        {active === 'Catat Makanan' && <div className="panel page-panel"><div className="panel-title"><div><h3>Catatan makanan hari ini</h3><p>{dashboard.meals.length} makanan · {formatNumber(dashboard.nutrition.calories)} kkal</p></div><button className="primary-btn" onClick={openNewMeal}><Plus size={16} /> Tambah makanan</button></div><div className="record-list">{dashboard.meals.length === 0 && <p className="empty-state">Belum ada makanan. Mulai dengan tombol Tambah makanan.</p>}{dashboard.meals.map(meal => { const style = mealStyles[meal.mealType]; return <div className="record-row" key={meal.id}><div className={`meal-icon ${style[0]}`}>{style[1]}</div><div className="record-copy"><strong>{meal.name}</strong><span>{mealLabels[meal.mealType]} · {new Date(meal.loggedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div><div className="record-macros"><span>P {formatNumber(meal.protein)}g</span><span>K {formatNumber(meal.carbs)}g</span><span>L {formatNumber(meal.fat)}g</span><strong>{meal.calories} kkal</strong></div><div className="record-actions"><button type="button" onClick={() => editMeal(meal)} aria-label={`Edit ${meal.name}`}><Edit3 size={14} /> Edit</button><button type="button" className="delete-record" disabled={deletingMealId === meal.id} onClick={() => void deleteMeal(meal)} aria-label={`Hapus ${meal.name}`}><Trash2 size={14} /> {deletingMealId === meal.id ? 'Menghapus…' : 'Hapus'}</button></div></div>})}</div></div>}

        {active === 'Aktivitas' && <><div className="stats-grid activity-stats"><StatCard icon={Footprints} label="Langkah hari ini" value={formatNumber(dashboard.steps.current)} detail={`target ${formatNumber(dashboard.steps.target)} langkah`} progress={percent(dashboard.steps.current, dashboard.steps.target)} accent="green" /><StatCard icon={CalendarDays} label="Target mingguan" value={formatNumber(dashboard.steps.target * 7)} detail="langkah per minggu" progress={percent(weeklyBars.reduce((sum, item) => sum + item.steps, 0), dashboard.steps.target * 7)} accent="lavender" /><StatCard icon={Weight} label="Berat terakhir" value={dashboard.weight.current ? `${formatNumber(dashboard.weight.current)} kg` : '—'} detail={`target ${formatNumber(dashboard.weight.target)} kg`} progress={percent(dashboard.weight.target, dashboard.weight.current || dashboard.weight.target)} accent="blue" /></div><div className="action-row"><button className="primary-btn" onClick={() => setShowActivity(true)}><Plus size={16} /> Catat aktivitas</button><button className="outline-action" onClick={() => setShowWeight(true)}><Weight size={16} /> Catat berat</button></div><div className="panel weekly page-panel"><div className="panel-title"><div><h3>Langkah 7 hari terakhir</h3><p>Perkembangan aktivitas minggu ini</p></div></div><div className="chart large-chart"><div className="y-labels"><span>10k</span><span>7.5k</span><span>5k</span><span>2.5k</span><span>0</span></div><div className="bars">{weeklyBars.map(item => <div className="bar-col" key={item.day}><div className="bar" style={{ height: `${Math.min(100, item.steps / 100)}%` }} /><span>{new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(new Date(item.day))}</span></div>)}</div></div></div></>}

        {active === 'Rencana Makan' && <><div className="panel plan-search"><div><h3>Temukan ide menu</h3><p>Rekomendasi berasal dari katalog resep NutriLife.</p></div><label><Search size={16} /><input value={planQuery} onChange={event => setPlanQuery(event.target.value)} placeholder="Cari resep, misalnya ayam atau sayur" /></label></div>{planError && <div className="db-error"><span>{planError}</span><button onClick={() => { setPlanQuery(''); setPlanError('') }}>Coba lagi</button></div>}{planLoading && <p className="empty-state">Mencari resep…</p>}{!planLoading && !planError && planRecipes.length === 0 && <div className="panel empty-state">Belum ada resep yang cocok. Coba kata kunci lain atau impor dataset resep.</div>}<div className="plan-grid">{planRecipes.map((recipe, index) => <div className="panel plan-card" key={recipe.id}><div className={`meal-icon ${['mint', 'gold', 'lilac', 'mint'][index % 4]}`}>{['🥣', '🍱', '🫐', '🍲'][index % 4]}</div><div><span>{recipe.category || 'Resep'}</span><h3>{recipe.title}</h3><p>{recipe.totalIngredients} bahan · {recipe.totalSteps} langkah</p></div><button onClick={() => { setEditingMealId(''); setSelectedSuggestionName(recipe.title); setSelectedMealDetail({ kind: 'recipe', recipe }); setMealForm({ mealType: 'LUNCH', name: recipe.title, calories: '', protein: '', carbs: '', fat: '' }); setShowMeal(true) }}>Lihat resep <ChevronRight size={14} /></button></div>)}</div></>}

        {active === 'Target saya' && <form className="panel settings-form" onSubmit={saveGoals}><div className="form-header"><div><h3>Target kesehatan</h3><p>Nilai ini digunakan untuk menghitung semua progress di dashboard.</p></div><button disabled={saving} className="primary-btn"><Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan target'}</button></div><div className="goal-form-grid">{([['CALORIES', 'Kalori harian', 'kkal'], ['WATER', 'Air minum', 'ml'], ['STEPS', 'Langkah', 'langkah'], ['WEIGHT', 'Berat badan', 'kg'], ['PROTEIN', 'Protein', 'g'], ['CARBS', 'Karbohidrat', 'g'], ['FAT', 'Lemak', 'g']] as const).map(([key, label, unit]) => <label key={key}><span>{label}</span><div><input required min="1" step={key === 'WEIGHT' ? '.1' : '1'} type="number" value={goals[key]} onChange={event => setGoals({ ...goals, [key]: event.target.value })} /><small>{unit}</small></div></label>)}</div></form>}

        {active === 'Bantuan' && <div className="help-grid"><div className="panel faq-panel"><h3>Pertanyaan umum</h3>{faq.map(([question, answer], index) => <button className="faq-item" key={question} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}<ChevronRight className={openFaq === index ? 'rotated' : ''} size={16} /></span>{openFaq === index && <p>{answer}</p>}</button>)}</div><div className="panel contact-card"><div className="contact-icon"><Mail size={22} /></div><h3>Masih butuh bantuan?</h3><p>Tim kami siap membantu pertanyaan seputar akun dan penggunaan NutriLife.</p><a href="mailto:help@nutrilife.local">Hubungi tim bantuan</a></div></div>}

        {active === 'Pengaturan' && <div className="settings-grid">
          <form className="panel settings-form" onSubmit={saveProfile}>
            <div className="form-header"><div><h3>Profil pribadi</h3><p>Informasi yang tampil pada ruang personalmu.</p></div></div>
            <div className="avatar-editor">
              <div className="avatar avatar-large">{avatarPreview || dashboard.user.avatarUrl ? <img src={avatarPreview || dashboard.user.avatarUrl!} alt="Foto profil" /> : initials}</div>
              <div><strong>Foto profil</strong><p>JPG, PNG, atau WebP. Maksimal 2 MB.</p><label className="avatar-picker"><Camera size={15} /> Pilih foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => selectAvatar(event.target.files?.[0])} /></label></div>
            </div>
            <label>Nama lengkap<input required minLength={2} autoComplete="name" value={profileForm.name} onChange={event => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
            <label>Email<input required type="email" autoComplete="email" value={profileForm.email} onChange={event => setProfileForm({ ...profileForm, email: event.target.value })} /></label>
            <button disabled={saving} className="primary-btn"><Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan profil'}</button>
          </form>
          <div className="settings-side">
            <form className="panel settings-form password-form" onSubmit={changePassword}>
              <div className="form-header"><div><h3>Ganti password</h3><p>Gunakan minimal 8 karakter yang berisi huruf dan angka.</p></div><LockKeyhole size={19} className="muted" /></div>
              <label>Password saat ini<div className="password-input"><input required type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={passwordForm.currentPassword} onChange={event => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /><button type="button" onClick={() => setShowPasswords(!showPasswords)} aria-label={showPasswords ? 'Sembunyikan password' : 'Tampilkan password'}>{showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
              <label>Password baru<input required minLength={8} type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={passwordForm.newPassword} onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label>
              <label>Konfirmasi password baru<input required minLength={8} type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={passwordForm.confirmPassword} onChange={event => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>
              <button disabled={saving} className="primary-btn"><LockKeyhole size={15} /> {saving ? 'Menyimpan…' : 'Perbarui password'}</button>
            </form>
            <div className="panel preference-card"><h3>Tampilan</h3><p>Atur tema yang nyaman untuk matamu.</p><button className="preference-toggle" onClick={() => setDark(!dark)}><span>{dark ? <Moon size={18} /> : <Sun size={18} />} Mode {dark ? 'gelap' : 'terang'}</span><i className={dark ? 'on' : ''}><b /></i></button></div>
          </div>
        </div>}
      </div>
    </section>
    {showMeal && <div className="modal-backdrop" onClick={resetMealEditor}>
      <form className="modal" onSubmit={saveMeal} onClick={event => event.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">{editingMealId ? 'UBAH CATATAN' : 'CATAT KE DATABASE'}</p><h3>{editingMealId ? 'Edit makanan atau minuman' : 'Tambah makanan atau minuman'}</h3></div><button type="button" className="close-modal" onClick={resetMealEditor}><X size={18} /></button></div>
        <label>Waktu makan<select value={mealForm.mealType} onChange={event => setMealForm({ ...mealForm, mealType: event.target.value as MealType })}>{Object.entries(mealLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="recipe-field">Pilih makanan/minuman
          <span className="field-help">Ketik nama untuk mencari pilihan dari katalog, lalu klik hasilnya. Jika tidak ada, nama bisa diisi manual.</span>
          <input required minLength={2} autoComplete="off" value={mealForm.name} onChange={event => { setSelectedSuggestionName(''); setSelectedMealDetail(null); setMealForm({ ...mealForm, name: event.target.value }) }} placeholder="Contoh: nasi goreng, tempe, jus jeruk" />
          {(nutritionSuggestions.length > 0 || recipeSuggestions.length > 0) && <div className="recipe-suggestions">
            {nutritionSuggestions.map(item => <button type="button" key={`nutrition-${item.id}`} onClick={() => { const name = `${item.brand} — ${item.name}`; setSelectedSuggestionName(name); setSelectedMealDetail({ kind: 'nutrition', item }); setMealForm({ ...mealForm, name, calories: String(item.calories), protein: String(item.protein), carbs: String(item.carbs), fat: String(item.fat) }); setNutritionSuggestions([]); setRecipeSuggestions([]) }}><strong>{item.kind === 'DRINK' ? '🥤' : '🍽️'} {item.name}<em>Pilih</em></strong><span>{item.brand} · {item.calories} kkal · P {formatNumber(item.protein)}g · K {formatNumber(item.carbs)}g · L {formatNumber(item.fat)}g</span></button>)}
            {recipeSuggestions.map(recipe => <button type="button" key={`recipe-${recipe.id}`} onClick={() => { setSelectedSuggestionName(recipe.title); setSelectedMealDetail({ kind: 'recipe', recipe }); setMealForm({ ...mealForm, name: recipe.title }); setNutritionSuggestions([]); setRecipeSuggestions([]) }}><strong>📖 {recipe.title}<em>Pilih</em></strong><span>{recipe.category || 'Resep Indonesia'} · {recipe.totalIngredients} bahan · {recipe.totalSteps} langkah</span></button>)}
          </div>}
          {mealForm.name.trim().length >= 2 && selectedSuggestionName !== mealForm.name && nutritionSuggestions.length === 0 && recipeSuggestions.length === 0 && <small className="recipe-hint">Tidak ada pilihan katalog yang cocok saat ini. Nama akan dicatat sebagai input manual.</small>}
          {selectedSuggestionName === mealForm.name && <small className="recipe-hint selected-hint">Pilihan katalog digunakan. Kamu tetap dapat mengubah namanya.</small>}
        </label>
        {selectedMealDetail?.kind === 'nutrition' && <div className="meal-detail">
          <div className="meal-detail-title"><Sparkles size={14} /><strong>Kandungan {selectedMealDetail.item.kind === 'DRINK' ? 'minuman' : 'makanan'}</strong></div>
          <div className="nutrition-detail-grid"><span>Kalori <strong>{formatNumber(selectedMealDetail.item.calories)} kkal</strong></span><span>Protein <strong>{formatNumber(selectedMealDetail.item.protein)} g</strong></span><span>Karbohidrat <strong>{formatNumber(selectedMealDetail.item.carbs)} g</strong></span><span>Lemak <strong>{formatNumber(selectedMealDetail.item.fat)} g</strong></span><span>Serat <strong>{formatNumber(selectedMealDetail.item.fiber)} g</strong></span><span>Gula <strong>{formatNumber(selectedMealDetail.item.sugar)} g</strong></span><span>Natrium <strong>{formatNumber(selectedMealDetail.item.sodium)} mg</strong></span></div>
          <small>Nilai nutrisi utama sudah dimasukkan ke form dan tetap bisa disunting.</small>
        </div>}
        {selectedMealDetail?.kind === 'recipe' && <div className="meal-detail recipe-detail">
          <div className="meal-detail-title"><BookOpen size={14} /><strong>Isi resep · {selectedMealDetail.recipe.totalIngredients} bahan</strong></div>
          {parseRecipeList(selectedMealDetail.recipe.ingredients).length > 0
            ? <ul>{parseRecipeList(selectedMealDetail.recipe.ingredients).map((ingredient, index) => <li key={`${ingredient}-${index}`}>{ingredient}</li>)}</ul>
            : <small>Daftar bahan resep belum tersedia.</small>}
          <small>Dataset resep belum memuat nilai nutrisi; isi kalori dan makro secara manual.</small>
        </div>}
        <div className="form-grid"><label>Kalori (kkal)<input required min="0" type="number" value={mealForm.calories} onChange={event => setMealForm({ ...mealForm, calories: event.target.value })} placeholder="0" /></label><label>Protein (g)<input min="0" step="0.1" type="number" value={mealForm.protein} onChange={event => setMealForm({ ...mealForm, protein: event.target.value })} placeholder="0" /></label><label>Karbo (g)<input min="0" step="0.1" type="number" value={mealForm.carbs} onChange={event => setMealForm({ ...mealForm, carbs: event.target.value })} placeholder="0" /></label><label>Lemak (g)<input min="0" step="0.1" type="number" value={mealForm.fat} onChange={event => setMealForm({ ...mealForm, fat: event.target.value })} placeholder="0" /></label></div>
        <button disabled={saving} className="primary-btn full">{saving ? 'Menyimpan…' : editingMealId ? 'Simpan perubahan' : 'Simpan makanan/minuman'}</button>
      </form>
    </div>}
    {showActivity && <div className="modal-backdrop" onClick={() => setShowActivity(false)}><form className="modal" onSubmit={saveActivity} onClick={event => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">CATAT KE DATABASE</p><h3>Tambah aktivitas</h3></div><button type="button" className="close-modal" onClick={() => setShowActivity(false)}><X size={18} /></button></div><label>Jenis aktivitas<input required minLength={2} value={activityForm.activityType} onChange={event => setActivityForm({ ...activityForm, activityType: event.target.value })} placeholder="Contoh: Berjalan" /></label><div className="form-grid"><label>Langkah<input required min="0" type="number" value={activityForm.steps} onChange={event => setActivityForm({ ...activityForm, steps: event.target.value })} placeholder="0" /></label><label>Durasi (menit)<input min="0" type="number" value={activityForm.duration} onChange={event => setActivityForm({ ...activityForm, duration: event.target.value })} placeholder="0" /></label><label>Kalori terbakar<input min="0" type="number" value={activityForm.calories} onChange={event => setActivityForm({ ...activityForm, calories: event.target.value })} placeholder="0" /></label></div><button disabled={saving} className="primary-btn full">{saving ? 'Menyimpan…' : 'Simpan aktivitas'}</button></form></div>}
    {showWeight && <div className="modal-backdrop" onClick={() => setShowWeight(false)}><form className="modal compact-modal" onSubmit={saveWeight} onClick={event => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">PERBARUI PROGRESS</p><h3>Catat berat badan</h3></div><button type="button" className="close-modal" onClick={() => setShowWeight(false)}><X size={18} /></button></div><label>Berat saat ini (kg)<input autoFocus required min="1" max="500" step="0.1" type="number" value={weightValue} onChange={event => setWeightValue(event.target.value)} placeholder="Contoh: 68.2" /></label><button disabled={saving} className="primary-btn full">{saving ? 'Menyimpan…' : 'Simpan berat badan'}</button></form></div>}
    {toast && <div className="toast"><ShieldCheck size={17} />{toast}</div>}
  </main>
}

export default function Home() {
  return <Suspense fallback={<main className="auth-loading"><span>Menyiapkan NutriLife…</span></main>}><HomeContent /></Suspense>
}
