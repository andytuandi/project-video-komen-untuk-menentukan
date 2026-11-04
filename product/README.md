# Produk digital: Studio Animasi Netizen (catatan penjual)

## File yang diunggah ke Lynk.id
Folder `dist/` (file yang dijual):
- `MULAI DI SINI - Panduan Studio Animasi Netizen.pdf`: panduan pembeli, 12 halaman, bahasa sangat sederhana
- `Studio-Animasi-Netizen.zip`: studio (37 file)

Folder `marketing/` (untuk halaman jualan, BUKAN untuk pembeli):
- `lynk/01-thumbnail.jpg`: gambar utama produk (1080x1080)
- `lynk/02…05-*.jpg`: gambar galeri (isi paket, cara kerja, contoh hasil, cocok untuk + bonus)
- `preview-video.mp4`: video preview ±38 detik (cuplikan Day 1–3 Kerajaan Netizen)
- `DESKRIPSI_LYNK.md`: nama produk, harga, deskripsi siap tempel, pesan setelah beli, caption promosi
- `make_images.js`: membuat ulang gambar-gambar di atas (`node product/marketing/make_images.js`)

## Isi studio (`studio-animasi-netizen/`)
- `CLAUDE.md`: manual kerja yang otomatis dibaca Claude di akun pembeli (gaya bicara untuk orang awam, alur Day 1 & Day N, troubleshooting)
- `prompts/`: 6 pesan siap salin (mulai, buat dunia, day berikutnya, ubah sesuatu, kalau ada masalah, ide tema)
- `engine/`: mesin 3D low-poly versi umum (+ validator `--check`), `tools/`: cek setup, tonton video, hitung voting, logo
- `docs/`: format episode, aset + tata letak dunia + katalog bergambar, playbook interaktif, suara
- `episodes/contoh/day01.json`: contoh Day 1 generik ("Kerajaan Kita", naga "Gosong", @akunkamu)
- Tidak berisi brand Kerajaan Netizen, handle @kerajaannetizen.idn, username pengikutmu, atau nama kreator lain.

## Membangun ulang setelah ada perubahan
```bash
python3 product/build_dist.py
```

## Sudah diuji
- ZIP diekstrak ke folder kosong → `tools/check_setup.py` READY (memasang three.js otomatis, suara, video uji 8 detik).
- Dari hasil ekstrak: validasi contoh Day 1 OK, still contoh Day 1 OK, pembuat logo OK (termasuk versi Ratu).

## Belum bisa diuji dari sini
- Langkah klik di akun pembeli baru (daftar GitHub, upload, menghubungkan Claude, Network access = Full). Label tombol
  di PDF mengikuti tampilan yang umum dipakai, tapi tampilan situs bisa berubah. **Coba sekali sendiri dengan akun
  GitHub baru sebelum mulai berjualan.**
- Halaman referensi Lynk.id tidak bisa dibuka dari sini (diblokir verifikasi anti-bot).
