# Dimas Pratama · Portofolio Analis Data

Portofolio full-stack Dimas Pratama, persona fiktif dari Ruang Karya. Desain dasbor asli menggunakan palet biru, Inter, IBM Plex Mono, dan potret generatif dari galeri.

## Dashboard publik

- Pilih studi kasus yang sudah terbit, rentang bulan, dan kanal. Grafik dapat berpindah antara pendapatan, kunjungan, dan konversi.
- Kartu KPI, grafik, tabel, dan ekspor CSV mengikuti filter yang sama. URL menyimpan filter aktif.
- Konversi agregat dihitung dari total pesanan dibagi total kunjungan. Jika jumlah kunjungan nol, konversi ditampilkan sebagai —. Grafik memberi jeda ketika bulan atau nilai konversi tidak tersedia.
- Studi contoh berisi 24 baris sintetis dari Januari–Juni 2026. Total bulanan berasal dari prototipe awal, dengan rincian kanal sintetis.

## Studio admin

- Kelola metadata, sumber, dan penanda simulasi sebuah dataset. Unduh template, impor CSV, tinjau 10 baris pertama, dan unduh salinan dataset untuk disunting.
- Buat draf studi kasus, kaitkan dataset, tulis metode, temuan, dan kredit, lalu terbitkan. Jadikan studi draf untuk menariknya dari galeri.
- Dataset yang masih digunakan terlindung dari penghapusan. Impor mengganti seluruh data dalam satu transaksi dan langsung memperbarui studi publik terkait.

### Format impor

CSV UTF-8 dengan koma, maksimum 1 MB dan 1.000 baris. Gunakan satu baris per kombinasi bulan dan kanal. Kanal yang didukung adalah `organic`, `paid`, `direct`, dan `referral`. Isi nilai bulat tanpa pemisah ribuan dan pastikan pesanan tidak melebihi kunjungan.

```csv
bulan,kanal,pendapatan_rupiah,kunjungan,pesanan
2026-01,organic,8640000,2960,71
2026-01,paid,7920000,2220,77
```

## Menjalankan secara lokal

Siapkan Node.js 24 dan PostgreSQL, lalu buat database. Salin `.env.example` ke `.env` dan isi `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, serta `ADMIN_PASSWORD`. Panjang kata sandi admin minimal 16 karakter. Gunakan hasil perintah pertama sebagai nilai `SESSION_SECRET`.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm ci
npm run db:migrate
npm run db:seed
npm run admin:provision
npm run dev
```

Mode pengembangan berjalan di [portofolio lokal](http://127.0.0.1:5182/) dan [studio admin](http://127.0.0.1:5182/admin). Untuk hasil build lokal, atur `APP_ORIGIN=http://127.0.0.1:4182`, jalankan `npm run build`, lalu `npm start`.

Frontend memakai React, Vite, TypeScript, dan CSS Modules. Express menyediakan API. PostgreSQL dan Prisma menyimpan dataset, studi kasus, akun admin, dan sesi.

## Kredit

Pengembangan oleh [guspriaman](https://github.com/guspriaman) untuk [guspriStack](https://github.com/guspristack). Desain asli, profil, dan contoh data berasal dari prototipe Ruang Karya.
