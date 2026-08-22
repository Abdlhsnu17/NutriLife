'use client'

import { Apple, ArrowRight, BookOpen, Clock3, HeartPulse, LogIn, Newspaper, Salad, Sparkles } from 'lucide-react'
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

export default function PublicHome({ onLogin }: { onLogin: () => void }) {
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
        <button className="public-login" onClick={onLogin}><LogIn size={16} /> Masuk</button>
      </header>

      <section className="public-hero-home">
        <div className="public-hero-copy">
          <span className="public-kicker"><Sparkles size={14} /> KESEHATANMU, SETIAP HARI</span>
          <h1>Pahami tubuhmu.<br />Bangun hidup yang lebih sehat.</h1>
          <p>Catat nutrisi, pantau aktivitas, dan temukan wawasan kesehatan tepercaya dalam satu tempat.</p>
          <div className="public-hero-actions">
            <button onClick={onLogin}>Mulai sekarang <ArrowRight size={17} /></button>
            <a href="#artikel">Baca artikel kesehatan</a>
          </div>
        </div>
        <div className="public-health-card" aria-label="Pratinjau fitur NutriLife">
          <div className="health-card-head"><span><HeartPulse size={20} /></span><div><small>RINGKASAN HARIAN</small><strong>Progress kesehatan</strong></div></div>
          <div className="health-ring"><div><strong>72%</strong><span>target hari ini</span></div></div>
          <div className="health-macros"><span><i className="macro-green" /> Protein <b>86g</b></span><span><i className="macro-gold" /> Karbo <b>142g</b></span><span><i className="macro-purple" /> Lemak <b>42g</b></span></div>
        </div>
      </section>

      <section className="public-feature-strip" id="fitur">
        <div><span><Salad size={21} /></span><strong>Catat nutrisi</strong><small>Pantau kalori dan makro harian.</small></div>
        <div><span><HeartPulse size={21} /></span><strong>Lihat perkembangan</strong><small>Target kesehatan dalam satu dashboard.</small></div>
        <div><span><BookOpen size={21} /></span><strong>Belajar hidup sehat</strong><small>Artikel dari tim NutriLife.</small></div>
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

      <section className="public-cta"><div><span>SIAP MEMULAI?</span><h2>Jadikan kebiasaan sehat lebih mudah.</h2><p>Masuk untuk mengakses dashboard nutrisi personalmu.</p></div><button onClick={onLogin}>Masuk ke NutriLife <ArrowRight size={17} /></button></section>
      <footer className="public-footer"><Link href="/" className="public-brand"><span><Apple size={18} /></span>Nutri<b>Life</b></Link><p>Informasi kesehatan untuk mendukung kebiasaan yang lebih baik.</p><Link href="/articles">Artikel & Berita</Link></footer>
    </main>
  )
}
