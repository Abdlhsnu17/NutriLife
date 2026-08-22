# Product Requirements Document — NutriLife

| Atribut | Nilai |
| --- | --- |
| Produk | NutriLife |
| Versi dokumen | 1.0 |
| Tanggal | 22 Agustus 2026 |
| Status | Draft berbasis implementasi saat ini |
| Platform | Web responsif |
| Bahasa utama | Bahasa Indonesia |

## 1. Ringkasan produk

NutriLife adalah platform kesehatan personal yang membantu pengguna membangun kebiasaan sehat melalui pencatatan sederhana dan umpan balik harian. Produk menggabungkan asupan makanan, air minum, aktivitas, langkah, berat badan, dan target kesehatan dalam satu dashboard. Konten edukasi dikelola oleh Nutritionist atau Admin untuk mendukung pengguna dengan informasi yang relevan.

PRD ini membedakan antara **MVP yang sudah tersedia** dan **pengembangan lanjutan** agar dapat digunakan sebagai acuan produk, desain, engineering, dan QA.

## 2. Latar belakang dan masalah

Pengguna sering mencatat nutrisi, aktivitas, dan progres berat badan di tempat yang berbeda atau tidak mencatat sama sekali karena prosesnya rumit. Akibatnya, mereka sulit menjawab pertanyaan sederhana seperti:

- Apakah asupan kalori dan makronutrien hari ini sudah sesuai target?
- Apakah kebutuhan air dan langkah harian sudah tercapai?
- Bagaimana perubahan berat badan dari pencatatan sebelumnya?
- Makanan atau resep apa yang dapat dicatat tanpa mengetik semua nilai nutrisi?

Di sisi operasional, tim kesehatan membutuhkan cara terkontrol untuk menerbitkan artikel, berita, dan pengumuman tanpa memberi akses administratif kepada seluruh pengguna.

## 3. Visi

Menjadi pendamping kesehatan harian yang mudah digunakan oleh pengguna Indonesia untuk memahami kebiasaan mereka dan mengambil tindakan kecil yang konsisten.

## 4. Tujuan produk

### Tujuan MVP

1. Memungkinkan pengguna menyelesaikan pencatatan kesehatan harian dari satu aplikasi.
2. Menampilkan progres terhadap target secara ringkas dan mudah dipahami.
3. Mengurangi input manual melalui pencarian resep dan data nutrisi.
4. Menyediakan sistem konten berbasis role untuk edukasi dan komunikasi.
5. Menjaga data setiap pengguna terisolasi melalui autentikasi dan pemeriksaan kepemilikan.

### Non-tujuan MVP

- Diagnosis, rekomendasi medis, atau pengganti konsultasi tenaga kesehatan.
- Integrasi wearable atau health platform pihak ketiga.
- Perhitungan target otomatis berdasarkan kondisi medis.
- Aplikasi mobile native dan penggunaan offline.
- Pembayaran, langganan, konsultasi video, atau marketplace.
- Rencana makan personal berbasis AI; rencana makan saat ini berupa rekomendasi statis.

## 5. Persona

### Pengguna umum

Orang dewasa yang ingin memantau pola makan dan aktivitas tanpa alur yang rumit. Membutuhkan dashboard cepat, input yang sederhana, dan target yang dapat disesuaikan.

### Nutritionist

Tenaga atau editor konten kesehatan yang membuat artikel, berita, dan pengumuman. Membutuhkan pengelolaan konten tanpa akses ke manajemen akun staf.

### Admin

Pengelola sistem yang memiliki seluruh kapabilitas Nutritionist serta bertanggung jawab mengelola akun staf dan keberlangsungan akses administratif.

## 6. Proposisi nilai

- Semua indikator harian utama tampil dalam satu dashboard.
- Form pencatatan menggunakan istilah dan format yang familiar bagi pengguna Indonesia.
- Data makanan dapat diisi dari katalog resep atau nutrisi yang dapat diimpor.
- Target bersifat fleksibel dan tersimpan per pengguna.
- Konten edukasi dan pengumuman dapat dikelola tanpa perubahan kode.

## 7. Ruang lingkup dan status fitur

| Area | Kemampuan | Status |
| --- | --- | --- |
| Landing page | Penjelasan manfaat dan artikel terbaru | Tersedia |
| Autentikasi | Registrasi, login, sesi 7 hari, logout | Tersedia |
| Pemulihan akun | Pembuatan dan penggunaan token reset | Parsial; email production belum tersedia |
| Dashboard | Ringkasan nutrisi, air, langkah, berat, target, aktivitas mingguan | Tersedia |
| Makanan | Tambah, ubah, hapus, dan pencarian autocomplete | Tersedia |
| Hidrasi | Tambah konsumsi air 250 ml | Tersedia |
| Aktivitas | Catat jenis, langkah, durasi, dan kalori | Tersedia |
| Berat badan | Catat berat dan lihat perubahan terakhir | Tersedia |
| Target | Atur tujuh target kesehatan | Tersedia |
| Rencana makan | Rekomendasi menu harian | Tersedia sebagai data statis |
| Profil | Ubah identitas, foto, dan password | Tersedia |
| Konten | Artikel, berita, pengumuman, dan upload gambar | Tersedia |
| Staf | CRUD Admin dan Nutritionist | Tersedia untuk Admin |
| Integrasi wearable | Sinkronisasi langkah/aktivitas | Belum tersedia |
| Notifikasi personal | Inbox, status baca, dan preferensi | Belum tersedia |

## 8. Alur pengguna utama

### Onboarding dan pencatatan pertama

1. Pengunjung membuka landing page dan memilih masuk/daftar.
2. Pengguna mendaftar dengan nama, email, dan password.
3. Sistem membuat akun `USER` beserta target default.
4. Pengguna masuk ke dashboard.
5. Pengguna mencari atau mengetik makanan, memeriksa nilai nutrisinya, lalu menyimpan.
6. Dashboard memperbarui konsumsi dan progres target hari itu.

### Pemantauan harian

1. Pengguna membuka dashboard.
2. Sistem menampilkan agregat data untuk tanggal hari ini.
3. Pengguna menambahkan air, aktivitas, makanan, atau berat badan.
4. Sistem menyimpan data dan menghitung ulang ringkasan.
5. Pengguna membandingkan progres dengan target personal.

### Publikasi konten

1. Nutritionist atau Admin login.
2. Staf membuka panel konten.
3. Staf membuat artikel/berita atau pengumuman dan opsional mengunggah gambar.
4. Sistem memvalidasi konten dan menyimpannya.
5. Artikel terbit di halaman publik; pengumuman tersedia melalui modul terautentikasi.

### Pengelolaan staf

1. Admin membuka halaman pengelolaan akun staf.
2. Admin membuat atau memperbarui akun dan menentukan role.
3. Sistem mencegah Admin menghapus dirinya atau menghilangkan Admin terakhir.
4. Perubahan role berlaku pada request terautentikasi berikutnya karena role dibaca ulang dari database.

## 9. Kebutuhan fungsional

### FR-01 — Autentikasi dan sesi

- Pengunjung dapat membuat akun dengan nama, email unik, dan password.
- Password harus terdiri dari 8–72 karakter serta mengandung huruf dan angka.
- Registrasi publik hanya boleh menghasilkan role `USER`.
- Pengguna dapat login menggunakan email dan password.
- Sesi menggunakan bearer token yang kedaluwarsa setelah tujuh hari.
- Sistem harus menolak token invalid, kedaluwarsa, atau milik akun yang telah dihapus.
- Pengguna dapat meminta reset password menggunakan token sekali pakai yang berlaku 15 menit.

**Acceptance criteria**

- Email duplikat menghasilkan respons konflik dan pesan yang dapat dipahami.
- Password salah tidak mengungkap apakah hash atau detail internal valid.
- Setelah password berhasil direset, token tidak dapat dipakai kembali.
- Role terbaru dari database digunakan pada setiap request yang dilindungi.

### FR-02 — Dashboard harian

- Sistem menampilkan total kalori, protein, karbohidrat, dan lemak untuk hari ini.
- Sistem menampilkan air dan langkah hari ini terhadap target.
- Sistem menampilkan berat terbaru, perubahan dari pencatatan sebelumnya, dan target.
- Sistem menampilkan catatan makanan hari ini dan aktivitas langkah tujuh hari terakhir.
- Semua data harus berasal dari pengguna yang sedang login.

**Acceptance criteria**

- Catatan yang ditambahkan hari ini terlihat setelah penyimpanan berhasil.
- Dashboard akun A tidak dapat diminta menggunakan identitas akun B.
- Kondisi kosong ditampilkan sebagai nilai nol, bukan error.

### FR-03 — Catatan makanan

- Pengguna dapat membuat, mengubah, dan menghapus catatan makanan miliknya.
- Data minimum adalah jenis waktu makan, nama, dan kalori.
- Protein, karbohidrat, dan lemak dapat bernilai nol.
- Pengguna dapat mencari katalog dengan minimal dua karakter.
- Pemilihan hasil nutrisi mengisi data kalori dan makronutrien.
- Pemilihan resep menampilkan bahan dan langkah yang tersedia.

**Acceptance criteria**

- Perubahan hanya berlaku pada catatan milik pengguna aktif.
- Nilai negatif dan nilai di atas batas validasi ditolak.
- Penghapusan membutuhkan konfirmasi di UI.

### FR-04 — Air, aktivitas, dan berat badan

- Pengguna dapat menambah konsumsi air dengan nominal default 250 ml.
- Pengguna dapat mencatat jenis aktivitas, langkah, durasi dalam menit, dan kalori terbakar.
- Pengguna dapat mencatat berat badan dalam kilogram.
- Data baru harus langsung memengaruhi ringkasan dashboard yang relevan.

### FR-05 — Target kesehatan

- Pengguna dapat mengatur target kalori, air, langkah, berat, protein, karbohidrat, dan lemak.
- Target harus berupa angka positif dalam batas yang ditentukan API.
- Sistem menyediakan target default ketika akun dibuat.

### FR-06 — Profil

- Pengguna dapat mengubah nama dan email sendiri.
- Email harus tetap unik.
- Pengguna dapat mengunggah avatar JPG, PNG, atau WebP dengan ukuran maksimum 2 MB.
- Pengguna dapat mengganti password setelah memverifikasi password saat ini.

### FR-07 — Artikel dan berita

- Semua pengunjung dapat melihat daftar dan detail artikel.
- Nutritionist dan Admin dapat membuat, memperbarui, dan menghapus artikel/berita.
- Konten mendukung judul, slug unik, kategori, ringkasan, isi, estimasi baca, gambar, dan tipe berita.
- Bila slug tidak diisi saat pembuatan, sistem membentuk slug dari judul.

### FR-08 — Pengumuman dan upload konten

- Pengguna terautentikasi dapat mengambil daftar pengumuman melalui API.
- Nutritionist dan Admin dapat mengelola pengumuman.
- Upload konten menerima JPG, PNG, WebP, atau GIF maksimal 5 MB.
- URL file yang tersimpan harus dapat dirender oleh frontend pada origin berbeda.

### FR-09 — Manajemen staf

- Hanya Admin yang dapat melihat, membuat, mengubah, atau menghapus akun staf.
- Role staf dibatasi pada `ADMIN` dan `NUTRITIONIST`.
- Admin tidak dapat menghapus akunnya sendiri.
- Sistem harus mempertahankan minimal satu Admin.

## 10. Matriks otorisasi

| Sumber daya | Publik | USER | NUTRITIONIST | ADMIN |
| --- | :---: | :---: | :---: | :---: |
| Landing, daftar/detail artikel | Baca | Baca | Baca | Baca |
| Data kesehatan personal | — | Kelola sendiri | Kelola sendiri | Kelola sendiri |
| Profil personal | — | Kelola sendiri | Kelola sendiri | Kelola sendiri |
| Katalog resep/nutrisi | — | Cari | Cari | Cari |
| Artikel dan berita | Baca | Baca | Kelola | Kelola |
| Pengumuman | — | Baca | Kelola | Kelola |
| Upload gambar konten | — | — | Buat | Buat |
| Akun staf | — | — | — | Kelola |

## 11. Model data inti

| Entitas | Fungsi |
| --- | --- |
| `User` | Identitas, kredensial, avatar, dan role |
| `MealLog` | Asupan makanan dan makronutrien |
| `WaterLog` | Konsumsi air |
| `ActivityLog` | Aktivitas, durasi, langkah, dan kalori |
| `WeightLog` | Riwayat berat badan |
| `HealthGoal` | Target per indikator dan pengguna |
| `Recipe` | Katalog resep hasil impor |
| `NutritionItem` | Katalog nutrisi makanan/minuman |
| `Article` | Artikel dan berita publik |
| `Notification` | Pengumuman dari staf |
| `PasswordResetToken` | Token reset ter-hash, kedaluwarsa, dan sekali pakai |

## 12. Kebutuhan nonfungsional

### Keamanan

- Password tidak boleh disimpan dalam bentuk plaintext.
- Secret dan kredensial tidak boleh berada di source control.
- Seluruh endpoint privat wajib memvalidasi bearer token dan role/kepemilikan.
- Production wajib menggunakan HTTPS, `JWT_SECRET` yang kuat, dan layanan email untuk reset password.
- Upload harus memvalidasi MIME type dan ukuran; pengembangan lanjutan perlu validasi signature file dan pemindaian malware.

### Kinerja

- Target p95 respons API untuk operasi dashboard dan pencatatan: kurang dari 500 ms pada beban normal, tidak termasuk latensi jaringan.
- Pencarian katalog harus mengembalikan maksimal 20 hasil dan ditunda singkat di UI untuk mengurangi request berulang.
- Indeks database harus tersedia pada user/tanggal log, judul resep, nama item, slug, dan waktu publikasi.

### Keandalan

- Transaksi harus digunakan untuk operasi multi-tabel seperti registrasi, perubahan password, dan pembaruan semua target.
- API harus mengembalikan status health yang membedakan layanan aktif dan database terputus.
- Strategi backup dan restore database wajib ditentukan sebelum production.

### Aksesibilitas dan UX

- Antarmuka harus responsif untuk desktop dan mobile.
- Form wajib memiliki label, pesan error yang dapat ditindaklanjuti, dan state loading.
- Aksi destruktif harus meminta konfirmasi.
- Warna progres tidak boleh menjadi satu-satunya pembeda informasi.

### Privasi

- Data kesehatan dianggap sensitif dan hanya dapat diakses oleh pemiliknya.
- Kebijakan privasi, retensi data, ekspor data, dan penghapusan akun perlu diselesaikan sebelum peluncuran publik.
- Analitik production tidak boleh mengirim nilai kesehatan atau kredensial sebagai event/parameter.

## 13. Metrik keberhasilan

Metrik berikut menjadi target awal setelah instrumentation tersedia:

| Metrik | Definisi | Target awal |
| --- | --- | --- |
| Aktivasi | Pengguna baru yang membuat minimal satu log dalam 24 jam | ≥ 60% |
| Completion harian | Pengguna aktif yang membuat minimal dua jenis log per hari | ≥ 40% |
| Retensi D7 | Pengguna baru yang kembali pada hari ke-7 | ≥ 25% |
| Keberhasilan pencatatan | Request create/update log yang berhasil | ≥ 99% |
| Latensi dashboard p95 | Durasi respons endpoint dashboard | < 500 ms |
| Error rate API | Respons 5xx terhadap seluruh request | < 1% |

Tidak ada event analytics khusus produk pada implementasi saat ini; event, consent, dan dashboard metrik perlu dirancang sebelum target diukur.

## 14. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Data katalog tidak konsisten | Perhitungan nutrisi menyesatkan | Cantumkan sumber, porsi, tanggal pembaruan, dan proses review |
| Rencana makan statis dianggap personal | Ekspektasi pengguna keliru | Beri label rekomendasi umum dan disclaimer |
| Upload tersimpan di disk lokal | File hilang pada deployment stateless | Pindah ke object storage sebelum scale-out |
| Reset email belum terhubung | Pemulihan akun production tidak selesai | Integrasikan provider email dan rate limiting |
| Token disimpan di local storage | Dampak XSS lebih besar | Perketat CSP; evaluasi cookie HttpOnly/SameSite |
| Tidak ada automated test | Regresi sulit dideteksi | Tambahkan test unit, API integration, dan alur E2E kritis |
| Tidak ada rate limiting | Risiko brute force dan abuse | Terapkan rate limit pada login, reset, pencarian, dan upload |

## 15. Rencana rilis

### Fase 0 — Hardening MVP

- Menambahkan automated test untuk autentikasi, isolasi data, perhitungan dashboard, dan RBAC.
- Menghubungkan layanan email reset password.
- Menambahkan rate limiting, security headers/CSP yang teruji, observability, dan audit log Admin.
- Memindahkan upload ke object storage serta menyiapkan backup/restore database.
- Memastikan panel pengumuman mengirim token pada seluruh request yang dilindungi.

### Fase 1 — Beta terbatas

- Riwayat dan filter berdasarkan tanggal untuk semua jenis log.
- Edit/hapus untuk air, aktivitas, dan berat badan.
- Pengaturan porsi dan satuan pada katalog nutrisi.
- Notifikasi yang tersimpan per pengguna dengan status dibaca.
- Ekspor data dan penghapusan akun mandiri.
- Instrumentation metrik aktivasi, retensi, dan keberhasilan pencatatan.

### Fase 2 — Personalisasi

- Rencana makan dinamis berdasarkan target dan preferensi.
- Preferensi alergi, pantangan, dan pola makan.
- Integrasi wearable/health platform.
- Dashboard tren mingguan dan bulanan.
- Workflow review/publish konten dan audit trail.

## 16. Kriteria kesiapan rilis production

Rilis production dapat dilakukan ketika:

- Semua alur kritis memiliki test otomatis dan lulus di CI.
- Tidak ada kerentanan severity tinggi/kritis yang belum ditangani.
- Reset password melalui email dan rate limiting telah aktif.
- Backup/restore telah diuji dan target recovery disepakati.
- Upload menggunakan storage persisten dengan validasi yang memadai.
- Kebijakan privasi, ketentuan penggunaan, retensi, dan penghapusan data tersedia.
- Monitoring error, latency, availability, dan alerting telah aktif.
- Uji aksesibilitas serta pengujian perangkat/browser prioritas selesai.

## 17. Pertanyaan terbuka

1. Apakah NutriLife akan ditujukan untuk wellness umum atau penggunaan klinis yang membutuhkan kontrol regulasi lebih ketat?
2. Siapa pemilik dan reviewer akhir dataset nutrisi serta konten kesehatan?
3. Apakah target kesehatan akan dihitung otomatis atau tetap sepenuhnya diatur pengguna?
4. Apakah Nutritionist kelak dapat melihat data klien tertentu dengan consent eksplisit?
5. Provider email, object storage, hosting, dan observability apa yang akan digunakan?
6. Berapa periode retensi log kesehatan, token, upload, dan audit trail?

## 18. Definition of Done

Sebuah fitur dianggap selesai ketika kebutuhan dan acceptance criteria disetujui, implementasi frontend/backend selesai, validasi dan otorisasi tersedia, migrasi data aman, test relevan lulus, state loading/error/empty tersedia, dokumentasi diperbarui, serta monitoring yang diperlukan sudah ditentukan.
