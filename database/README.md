# Database NutriLife

Database menggunakan MySQL 8. Jalankan dari root project:

Isi folder ini:

- `schema/schema.sql`: struktur lengkap untuk database baru.
- `migrations/migrate.sql`: pembaruan untuk database lama.
- `schema/setup-local-mysql.sql`: pembuatan database dan akun MySQL lokal; dijalankan oleh `npm run db:setup-local`.
- `README.md`: panduan setup dan pemeliharaan database.

```bash
npm run db:setup-local
npm run dev:all
```

Perintah `db:setup-local` menyiapkan MySQL lokal di `127.0.0.1:3306` sebagai
koneksi utama aplikasi. Perintah ini meminta password admin MySQL lokal, biasanya
akun `root`, lalu membuat database `nutrilife`, user `nutrilife`, dan tabel awal.
Untuk mengecek koneksi MySQL lokal dari konfigurasi `.env`, jalankan
`npm run db:check`.

Jika ingin memakai Docker sebagai cadangan:

```bash
npm run db:up
npm run db:migrate
npm run db:import-recipes -- /Users/abdillah/Downloads/Indonesian_Food_Recipes.csv
npm run db:import-fastfood -- /lokasi/fastfood.csv
npm run dev:all
```

Perintah import resep membaca CSV, memasukkan seluruh resep secara bertahap, dan aman
dijalankan ulang karena data diperbarui berdasarkan URL sumber. Lokasi CSV juga dapat
diatur melalui environment variable `RECIPE_CSV_PATH`.
Gunakan opsi `--dry-run` untuk memvalidasi dan menghitung isi CSV tanpa menulis ke database.

Importer fast-food menerima kolom dataset Kaggle `restaurant`, `item`, `calories`,
`total_fat`, `total_carb`, dan `protein`. Kolom `fiber`, `sugar`, serta `sodium`
ikut disimpan bila tersedia. Setelah impor, pilih hasil pencarian pada form Catat
Makanan untuk mengisi kalori dan makronutrien secara otomatis berdasarkan satu item
atau porsi pada dataset. Lokasi CSV juga dapat diatur melalui `FASTFOOD_CSV_PATH`.

File notebook Python saja belum memuat baris data. Unduh/letakkan `fastfood.csv`
secara lokal, jalankan migrasi, lalu jalankan perintah impor di atas.

`schema/schema.sql` otomatis dijalankan oleh Docker saat volume dibuat pertama kali. `migrations/migrate.sql` aman dijalankan untuk volume lama dan menambahkan tabel/enum yang belum ada. Akun awal untuk dashboard adalah `demo-user`.

Alur lupa password terdiri dari dua tahap: masukkan email untuk membuat token reset
yang berlaku 15 menit, lalu masukkan password baru pada form berikutnya. Saat mode
development, aplikasi langsung membuka form password baru. Pada production, token
tidak dikirim ke browser dan harus dikirim melalui layanan email sebagai tautan
`/?resetToken=TOKEN` agar akun tidak dapat diambil alih hanya dengan mengetahui email.
Pada development, email yang belum terdaftar juga ditampilkan sebagai error agar
pengujian lokal tidak terlihat berhenti di halaman email.

Jika volume database dibuat sebelum fitur autentikasi tersedia, jalankan kembali
`npm run db:migrate`. Migrasi utama sekarang juga menambahkan kolom `passwordHash`
dan tabel `PasswordResetToken` yang dibutuhkan oleh fitur lupa password.

Registrasi publik selalu membuat akun dengan role `USER`. Setelah login sebagai
`ADMIN`, buka `/admin/users` untuk membuat, mengubah, atau menghapus akun `ADMIN`
dan `NUTRITIONIST`. Jika belum ada Admin pertama, daftarkan akun melalui aplikasi,
lalu promosikan sekali melalui MySQL:

```sql
UPDATE `User` SET `role` = 'ADMIN' WHERE `email` = 'admin@nutrilife.com';
```

Login ulang setelah promosi agar aplikasi menerima sesi dengan role terbaru.

API berjalan di `http://localhost:4004`, sedangkan frontend berjalan di `http://localhost:3000`. Konfigurasi dapat disalin dari `.env.example` ke `.env`.
Backend terhubung langsung ke MySQL lokal yang dikelola melalui phpMyAdmin di
`DB_HOST`/`DB_PORT` (bawaan: `127.0.0.1:3306`). Gunakan `DB_USER` dan
`DB_PASSWORD` sesuai akun MySQL lokal Anda; `.env.example` berisi kredensial
contoh yang mungkin perlu disesuaikan.
