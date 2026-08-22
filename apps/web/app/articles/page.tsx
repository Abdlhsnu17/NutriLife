'use client'

import { ArrowLeft, BookOpen, Clock3, Newspaper, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ShareButtons from './components/ShareButtons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'
const TOKEN_KEY = 'nutrilife_auth_token'

type Article = {
  slug: string
  title: string
  category?: string | null
  excerpt?: string | null
  imageUrl?: string | null
  time?: string | null
  isNews?: boolean
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY)
    const load = async () => {
      try {
        const requests: Promise<Response>[] = [fetch(`${API_URL}/articles`, { cache: 'no-store' })]
        if (token) requests.push(fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }))
        const [articleResponse, userResponse] = await Promise.all(requests)
        if (!articleResponse.ok) throw new Error('Artikel tidak dapat dimuat')
        if (articleResponse.ok) {
          const data = await articleResponse.json() as { articles: Article[] }
          setArticles(data.articles)
        }
        if (userResponse?.ok) {
          const data = await userResponse.json() as { user: { role: string } }
          setCanManage(['ADMIN', 'NUTRITIONIST'].includes(data.user.role))
        }
      } catch { setUnavailable(true) }
      finally { setLoading(false) }
    }
    void load()
  }, [])

  const featured = articles.filter(article => !article.isNews)
  const news = articles.filter(article => article.isNews)
  const firstFeatured = featured.length > 0 ? featured[0] : null
  const restFeatured = featured.length > 1 ? featured.slice(1) : []

  return (
    <main className="article-page-shell">
      <div className="article-page-container">
        <div className="article-toolbar">
          <Link href="/" className="article-back"><ArrowLeft size={17} /> Kembali ke beranda</Link>
          {canManage && <Link href="/articles/admin" className="primary-btn"><Settings size={16} /> Kelola artikel</Link>}
        </div>

        <header className="article-hero">
          <span className="article-kicker">PUSAT INFORMASI NUTRILIFE</span>
          <h1>Artikel & Berita</h1>
          <p>Wawasan, panduan, dan pengumuman terbaru untuk menemani gaya hidup sehatmu.</p>
        </header>

        <section className="public-article-section">
          <div className="article-section-heading"><div><span>WAWASAN SEHAT</span><h2>Artikel pilihan</h2></div>{loading && <small>Memuat data terbaru…</small>}</div>
          {firstFeatured && (
            <article className="public-article-card featured-card">
              <Link href={`/articles/${firstFeatured.slug}`} className={`public-article-cover featured-cover${firstFeatured.imageUrl ? ' has-image' : ''}`} style={firstFeatured.imageUrl ? { backgroundImage: `url("${firstFeatured.imageUrl}")` } : undefined} aria-label={`Baca ${firstFeatured.title}`}>
                {!firstFeatured.imageUrl && <BookOpen size={48} />}
              </Link>
              <div className="public-article-body">
                <span className="article-category">{firstFeatured.category || 'Kesehatan'}</span>
                <h3><Link href={`/articles/${firstFeatured.slug}`}>{firstFeatured.title}</Link></h3>
                <p>{firstFeatured.excerpt || 'Baca informasi selengkapnya dari NutriLife.'}</p>
                <div className="public-article-footer">
                  <span><Clock3 size={14} /> {firstFeatured.time || '3 menit'}</span>
                  <ShareButtons slug={firstFeatured.slug} title={firstFeatured.title} />
                  <Link href={`/articles/${firstFeatured.slug}`}>Baca artikel →</Link>
                </div>
              </div>
            </article>
          )}

          <div className="public-article-grid">
            {restFeatured.map((article, index) => (
              <article key={article.slug} className="public-article-card">
                <Link href={`/articles/${article.slug}`} className={`public-article-cover cover-${index % 3}${article.imageUrl ? ' has-image' : ''}`} style={article.imageUrl ? { backgroundImage: `url("${article.imageUrl}")` } : undefined} aria-label={`Baca ${article.title}`}>{!article.imageUrl && <BookOpen size={32} />}</Link>
                <div className="public-article-body">
                  <span className="article-category">{article.category || 'Kesehatan'}</span>
                  <h3><Link href={`/articles/${article.slug}`}>{article.title}</Link></h3>
                  <p>{article.excerpt || 'Baca informasi selengkapnya dari NutriLife.'}</p>
                  <div className="public-article-footer">
                    <span><Clock3 size={14} /> {article.time || '3 menit'}</span>
                    <ShareButtons slug={article.slug} title={article.title} />
                    <Link href={`/articles/${article.slug}`}>Baca artikel →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!loading && unavailable && <div className="article-empty">Artikel belum dapat dimuat. Pastikan backend dan database aktif.</div>}
          {!loading && !unavailable && featured.length === 0 && <div className="article-empty">Belum ada artikel yang diterbitkan.</div>}
        </section>

        <section className="public-news-section">
          <div className="article-section-heading"><div><span>PEMBARUAN</span><h2>Berita terbaru</h2></div></div>
          <div className="public-news-list">
            {news.map(article => (
              <Link href={`/articles/${article.slug}`} className="public-news-row" key={article.slug}>
                <span className="public-news-icon"><Newspaper size={19} /></span>
                <span><em className="public-news-category">{article.category || 'Berita'}</em><strong>{article.title}</strong><small>{article.excerpt || 'Informasi terbaru dari NutriLife.'}</small></span>
                <b>→</b>
              </Link>
            ))}
          </div>
          {!loading && !unavailable && news.length === 0 && <div className="article-empty">Belum ada berita terbaru.</div>}
        </section>
      </div>
    </main>
  )
}
