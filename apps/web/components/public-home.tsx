'use client'

import { Apple, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Droplets, Footprints, HeartPulse, LogIn, Newspaper, Salad, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'

type PublicArticle = {
  slug: string
  title: string
  category?: string | null
  excerpt?: string | null
  imageUrl?: string | null
  time?: string | null
  isNews?: boolean
}

const fallbackArticles: PublicArticle[] = [
  { title: 'Cara menyusun piring makan yang seimbang', category: 'Nutrisi', excerpt: 'Panduan sederhana membagi porsi karbohidrat, protein, sayur, dan buah.', time: '5 menit', slug: 'piring-makan-seimbang' },
  { title: 'Jalan kaki: kebiasaan kecil dengan manfaat besar', category: 'Kebugaran', excerpt: 'Mulai aktif tanpa perlengkapan khusus dan capai target langkah harianmu.', time: '4 menit', slug: 'jalan-kaki-manfaat-besar' },
  { title: 'Tanda tubuh membutuhkan lebih banyak air', category: 'Hidrasi', excerpt: 'Kenali sinyal dehidrasi dan bangun rutinitas minum yang konsisten.', time: '3 menit', slug: 'tanda-butuh-air' },
  { title: 'Peluncuran fitur pelacakan resep', category: 'Resep', excerpt: 'Kini NutriLife mendukung impor resep untuk pencatatan yang lebih mudah.', slug: 'peluncuran-fitur-pelacakan-resep', isNews: true },
  { title: 'Pembaruan data nutrisi untuk makanan lokal', category: 'Makanan', excerpt: 'Dataset nutrisi diperbarui dengan lebih banyak produk lokal.', slug: 'pembaruan-data-nutrisi', isNews: true },
]

export default function PublicHome() {
  const [articles, setArticles] = useState<PublicArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    void fetch(`${API_URL}/articles`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Artikel tidak dapat dimuat')
        const data = await response.json() as { articles?: PublicArticle[] }
        setArticles(data.articles ?? [])
      })
      .catch(error => {
        if ((error as Error).name !== 'AbortError') setArticles(fallbackArticles)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const featured = articles.filter(article => !article.isNews).slice(0, 6)
  const news = articles.filter(article => article.isNews).slice(0, 4)

  return (
    <main className="public-home">
      <header className="public-nav">
        <Link href="/" className="public-brand"><span><Apple size={21} /></span>Nutri<b>Life</b></Link>
        <nav aria-label="Navigasi utama">
          <a href="#fitur">Fitur</a>
          <a href="#artikel">Artikel</a>
          <a href="#berita">Berita</a>
        </nav>
        <Link className="public-login" href="/login?redirect=%2F"><LogIn size={16} /> Masuk <ChevronRight size={14} /></Link>
      </header>

      <section className="public-hero-home">
        <div className="public-hero-copy">
          <span className="public-kicker"><Sparkles size={14} /> WELLNESS YANG TERASA PERSONAL</span>
          <h1>Lebih paham tubuhmu.<br /><em>Lebih sehat</em> setiap hari.</h1>
          <p>Satu ruang sederhana untuk memahami nutrisi, membangun kebiasaan baik, dan melihat progres yang benar-benar berarti.</p>
          <div className="public-hero-actions">
            <Link href="/login?redirect=%2F">Mulai perjalananmu <ArrowRight size={17} /></Link>
            <a href="#fitur"><span>Jelajahi fitur</span> <ChevronRight size={15} /></a>
          </div>
          <div className="public-hero-proof">
            <div className="proof-faces" aria-hidden="true"><span>AD</span><span>RN</span><span>+</span></div>
            <p><strong>Dibuat untuk hidup nyata</strong><span>Personal, praktis, dan mudah dijalani.</span></p>
          </div>
        </div>
        <div className="public-hero-visual" aria-label="Pratinjau dashboard NutriLife">
          <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
          <div className="public-health-card">
            <div className="health-card-head"><span><HeartPulse size={20} /></span><div><small>RINGKASAN HARIAN</small><strong>Halo, Andi! <span>👋</span></strong></div><em><ShieldCheck size={15} /> Optimal</em></div>
            <div className="health-overview">
              <div className="health-ring"><div><strong>72%</strong><span>target tercapai</span></div></div>
              <div className="health-stats">
                <div><span><Footprints size={15} /></span><p><small>LANGKAH</small><strong>6.420</strong></p><em>+12%</em></div>
                <div><span className="water"><Droplets size={15} /></span><p><small>AIR MINUM</small><strong>1,8 L</strong></p><em>6 gelas</em></div>
              </div>
            </div>
            <div className="health-macros"><span><i className="macro-green" /> Protein <b>86g</b><small>72% target</small></span><span><i className="macro-gold" /> Karbo <b>142g</b><small>65% target</small></span><span><i className="macro-purple" /> Lemak <b>42g</b><small>70% target</small></span></div>
          </div>
          <div className="hero-floating-card hero-floating-top"><span><TrendingUp size={16} /></span><p><small>STREAK HARIAN</small><strong>7 hari berturut-turut</strong></p></div>
          <div className="hero-floating-card hero-floating-bottom"><span><Check size={16} /></span><p><small>TARGET TERBARU</small><strong>Protein tercapai</strong></p></div>
        </div>
      </section>

      <section className="public-feature-strip" id="fitur">
        <div><span><Salad size={21} /></span><strong>Nutrisi tanpa ribet</strong><small>Kalori dan makro tercatat rapi dalam hitungan detik.</small><b>01</b></div>
        <div><span><HeartPulse size={21} /></span><strong>Progres yang terlihat</strong><small>Pahami pola dan perkembanganmu dari hari ke hari.</small><b>02</b></div>
        <div><span><BookOpen size={21} /></span><strong>Insight tepercaya</strong><small>Konten kesehatan yang relevan dan mudah diterapkan.</small><b>03</b></div>
      </section>

      <section className="public-home-section" id="artikel">
        <div className="public-home-heading"><div><span>WAWASAN SEHAT</span><h2>Artikel terbaru</h2><p>Konten yang dibuat oleh Admin dan Nutritionist NutriLife.</p></div><Link href="/articles">Lihat semua <ArrowRight size={15} /></Link></div>
        {loading && <div className="public-content-state">Memuat artikel terbaru…</div>}
        {!loading && featured.length === 0 && <div className="public-content-state">Belum ada artikel yang diterbitkan.</div>}
        <div className="public-article-grid">
          {featured.map((article, index) => (
            <article className="public-article-card" key={article.slug}>
              <Link href={`/articles/${article.slug}`} className={`public-article-cover cover-${index % 3}${article.imageUrl ? ' has-image' : ''}`} style={article.imageUrl ? { backgroundImage: `url("${article.imageUrl}")` } : undefined} aria-label={`Baca ${article.title}`}>
                {!article.imageUrl && <BookOpen size={32} />}
              </Link>
              <div className="public-article-body">
                <span className="article-category">{article.category || 'Kesehatan'}</span>
                <h3><Link href={`/articles/${article.slug}`}>{article.title}</Link></h3>
                <p>{article.excerpt || 'Baca informasi selengkapnya dari NutriLife.'}</p>
                <div className="public-article-footer"><span><Clock3 size={14} /> {article.time || '3 menit'} baca</span><Link href={`/articles/${article.slug}`}>Baca →</Link></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="public-home-section public-home-news" id="berita">
        <div className="public-home-heading"><div><span>PEMBARUAN NUTRILIFE</span><h2>Berita terbaru</h2></div></div>
        {!loading && news.length === 0 && <div className="public-content-state">Belum ada berita terbaru.</div>}
        <div className="public-news-list">
          {news.map(article => <Link href={`/articles/${article.slug}`} className="public-news-row" key={article.slug}><span className="public-news-icon"><Newspaper size={19} /></span><span><em className="public-news-category">{article.category || 'Berita'}</em><strong>{article.title}</strong><small>{article.excerpt || 'Baca informasi terbaru dari NutriLife.'}</small></span><b>→</b></Link>)}
        </div>
      </section>

      <section className="public-cta"><div><span>MULAI DARI HARI INI</span><h2>Versi terbaikmu dimulai<br />dari satu kebiasaan kecil.</h2><p>Bangun pola hidup sehat yang realistis, personal, dan berkelanjutan bersama NutriLife.</p><div className="public-cta-checks"><span><Check size={14} /> Mudah digunakan</span><span><Check size={14} /> Progres personal</span></div></div><Link href="/login?redirect=%2F">Mulai sekarang <ArrowRight size={17} /></Link></section>
      <footer className="public-footer"><div><Link href="/" className="public-brand"><span><Apple size={18} /></span>Nutri<b>Life</b></Link><p>Teman bertumbuh untuk hidup yang lebih sehat, setiap hari.</p></div><nav aria-label="Navigasi footer"><a href="#fitur">Fitur</a><Link href="/articles">Artikel</Link><a href="#berita">Berita</a></nav><small>© {new Date().getFullYear()} NutriLife</small></footer>
    </main>
  )
}
