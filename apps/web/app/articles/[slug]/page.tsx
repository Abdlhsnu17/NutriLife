import { ArrowLeft, Clock3, Home } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ShareButtons from '../components/ShareButtons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4004/api/v1'

type ContentBlock = { type: 'text'; value: string } | { type: 'image'; src: string; alt: string }
type ArticleDetail = { slug: string; title: string; category?: string | null; content: string; imageUrl?: string | null; time?: string | null; isNews?: boolean }

const fallbackArticles: Record<string, ArticleDetail> = {
  'piring-makan-seimbang': { slug: 'piring-makan-seimbang', title: 'Cara menyusun piring makan yang seimbang', category: 'Nutrisi', time: '5 menit', content: 'Susun setengah bagian piring dengan sayur dan buah, seperempat dengan sumber protein, serta seperempat lainnya dengan karbohidrat. Pilih bahan yang beragam dan sesuaikan porsinya dengan kebutuhan serta aktivitas harian.' },
  'jalan-kaki-manfaat-besar': { slug: 'jalan-kaki-manfaat-besar', title: 'Jalan kaki: kebiasaan kecil dengan manfaat besar', category: 'Kebugaran', time: '4 menit', content: 'Mulailah dengan berjalan 10–15 menit setiap hari, lalu tingkatkan durasinya secara bertahap. Kebiasaan sederhana ini membantu kebugaran jantung, suasana hati, dan konsistensi aktivitas harian.' },
  'tanda-butuh-air': { slug: 'tanda-butuh-air', title: 'Tanda tubuh membutuhkan lebih banyak air', category: 'Hidrasi', time: '3 menit', content: 'Rasa haus, mulut kering, urine berwarna lebih pekat, dan sulit berkonsentrasi dapat menjadi tanda tubuh membutuhkan cairan. Biasakan minum secara berkala dan tambah asupan saat cuaca panas atau setelah beraktivitas.' },
  'manfaat-serat': { slug: 'manfaat-serat', title: 'Manfaat serat: kenapa penting untuk pencernaan', category: 'Nutrisi', time: '4 menit', imageUrl: 'https://source.unsplash.com/1200x800/?fiber,vegetables', content: 'Serat membantu pergerakan usus, menjaga kesehatan mikrobiota, dan memberi rasa kenyang lebih lama. Perbanyak buah, sayur, dan biji-bijian untuk asupan serat harian.' },
  'sarapan-sehat-untuk-energi': { slug: 'sarapan-sehat-untuk-energi', title: 'Pilihan sarapan sehat untuk energi sepanjang pagi', category: 'Gaya Hidup', time: '3 menit', imageUrl: 'https://source.unsplash.com/1200x800/?breakfast,oatmeal', content: 'Kombinasikan karbohidrat kompleks, protein, dan lemak sehat: contoh oatmeal dengan susu, buah, dan kacang; atau roti gandum dengan telur dan sayuran.' },
  'cemilan-sehat-di-kantor': { slug: 'cemilan-sehat-di-kantor', title: 'Cemilan sehat yang mudah dibawa ke kantor', category: 'Nutrisi', time: '2 menit', imageUrl: 'https://source.unsplash.com/1200x800/?snack,healthy', content: 'Pilih kacang, yoghurt rendah gula, buah segar, atau hummus dengan sayuran untuk camilan yang memberi energi tanpa membuat kantuk.' },
  'latihan-hiit-10-menit': { slug: 'latihan-hiit-10-menit', title: 'Latihan HIIT 10 menit untuk hari sibuk', category: 'Kebugaran', time: '5 menit', imageUrl: 'https://source.unsplash.com/1200x800/?workout,hiit', content: 'Sesi singkat interval intensitas tinggi dapat meningkatkan metabolisme. Contoh: 30 detik lompat tali, 30 detik istirahat, 30 detik squat jump — ulangi 10 siklus.' },
  'protein-untuk-otot-dan-tulang': { slug: 'protein-untuk-otot-dan-tulang', title: 'Sumber protein terbaik untuk otot dan tulang', category: 'Nutrisi', time: '4 menit', imageUrl: 'https://source.unsplash.com/1200x800/?protein,fish', content: 'Protein penting untuk perbaikan jaringan dan kepadatan tulang. Sumber baik: ikan, tahu/tempe, daging tanpa lemak, kacang-kacangan, dan produk susu rendah lemak.' },
  'resepsmoothie-antioksidan': { slug: 'resepsmoothie-antioksidan', title: 'Resep smoothie tinggi antioksidan', category: 'Resep', time: '3 menit', imageUrl: 'https://source.unsplash.com/1200x800/?smoothie,berries', content: 'Campur bayam, berry beku, pisang, yogurt, dan sedikit madu. Blender sampai halus untuk minuman yang kaya antioksidan dan serat.' },
  'peluncuran-fitur-pelacakan-resep': { slug: 'peluncuran-fitur-pelacakan-resep', title: 'Peluncuran fitur pelacakan resep', category: 'Resep', imageUrl: 'https://source.unsplash.com/1200x800/?recipe,notebook', content: 'Fitur impor resep kini tersedia untuk mempermudah pencatatan makanan dan membantu kamu menyimpan informasi resep dalam satu tempat.', isNews: true },
  'pembaruan-data-nutrisi': { slug: 'pembaruan-data-nutrisi', title: 'Pembaruan data nutrisi untuk makanan lokal', category: 'Makanan', imageUrl: 'https://source.unsplash.com/1200x800/?nutrition,data', content: 'Dataset nutrisi NutriLife diperluas dengan lebih banyak produk lokal agar hasil pencarian dan perhitungan nutrisi menjadi lebih relevan.', isNews: true },
  'ide-sarapan-tinggi-protein': { slug: 'ide-sarapan-tinggi-protein', title: 'Ide sarapan tinggi protein yang praktis', category: 'Makanan', time: '4 menit', content: 'Telur, yogurt, tempe, dan oatmeal dapat diolah menjadi sarapan praktis yang kaya protein. Sesuaikan porsinya dengan kebutuhan energi dan lengkapi dengan buah atau sayuran.', isNews: true },
  'resep-smoothie-buah-segar': { slug: 'resep-smoothie-buah-segar', title: 'Resep smoothie buah segar tanpa gula tambahan', category: 'Resep', time: '3 menit', content: 'Blender pisang, buah beri, yogurt tawar, air secukupnya, dan satu sendok chia seed hingga halus. Gunakan buah matang agar tetap manis tanpa gula tambahan.', isNews: true },
  'webinar-gizi-bersama-ahli': { slug: 'webinar-gizi-bersama-ahli', title: 'Webinar: Dasar gizi untuk keluarga', imageUrl: 'https://source.unsplash.com/1200x800/?webinar,group', content: 'Daftar webinar gratis bersama ahli gizi yang akan membahas pola makan keluarga seimbang dan tips praktis untuk anak-anak.', isNews: true },
  'fitur-pembaruan-aplikasi': { slug: 'fitur-pembaruan-aplikasi', title: 'Pembaruan aplikasi: perbaikan performa dan tema gelap', imageUrl: 'https://source.unsplash.com/1200x800/?app,update', content: 'Versi terbaru menghadirkan perbaikan kecepatan, perbaikan bug, dan opsi tampilan gelap untuk pengguna yang aktif di malam hari.', isNews: true },
}

function parseArticleContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  const imagePattern = /<img\s+src=["']([^"']+)["'](?:\s+alt=["']([^"']*)["'])?\s*\/?\s*>/gi
  let cursor = 0
  for (const match of content.matchAll(imagePattern)) {
    const index = match.index ?? 0
    const text = content.slice(cursor, index).trim()
    if (text) blocks.push({ type: 'text', value: text })
    blocks.push({ type: 'image', src: match[1], alt: match[2] || 'Gambar artikel' })
    cursor = index + match[0].length
  }
  const remainder = content.slice(cursor).trim()
  if (remainder) blocks.push({ type: 'text', value: remainder })
  return blocks
}

export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let data: ArticleDetail | null = null
  try {
    const res = await fetch(`${API_URL}/articles/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (res.status === 404) return notFound()
    if (res.ok) data = await res.json() as ArticleDetail
  } catch {
    data = fallbackArticles[slug] ?? null
  }
  data ??= fallbackArticles[slug] ?? null
  if (!data) return notFound()
  const contentBlocks = parseArticleContent(data.content)

  return (
    <main className="article-page-shell"><div className="article-page-container article-detail-container">
      <div className="article-toolbar"><Link href="/articles" className="article-back"><ArrowLeft size={17} /> Kembali ke daftar artikel</Link><Link href="/" className="article-home-link"><Home size={16} /> Beranda</Link></div>
      <nav className="article-breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/articles">Artikel & Berita</Link><span>/</span><b>{data.title}</b></nav>
      <article className="article-detail">
        {data.imageUrl && <img className="article-detail-image" src={data.imageUrl} alt={data.title} />}
        {data.category && <small className="category">{data.category}</small>}
        <h1>{data.title}</h1>
        {data.time && <div className="meta"><Clock3 size={14} /> <small>{data.time} baca</small></div>}
        <div className="content">{contentBlocks.map((block, index) => block.type === 'image'
          ? <img className="article-content-image" src={block.src} alt={block.alt} key={`${block.src}-${index}`} />
          : <p key={index}>{block.value}</p>)}</div>
        <div className="article-actions">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/articles" className="article-back"><ArrowLeft size={16} /> Kembali ke daftar</Link>
            <ShareButtons slug={data.slug} title={data.title} />
          </div>
        </div>
      </article>
    </div></main>
  )
}
