# Kerajaan Netizen: sistem interaktif & pangkat

Handle: **@kerajaannetizen.idn**. Konsep: Raja baru dinobatkan, kerajaannya masih kosong.
Setiap follower menjadi rakyat, komentar menentukan bangunan berikutnya, dan dukungan menaikkan pangkat.

## Cara kerja (yang terlihat penonton)

| Aksi penonton | Hasil di video | Cara menghitung |
|---|---|---|
| **Follow** | Angka di papan **"RAKYAT: N"** naik | Baca jumlah follower saat membuat episode (atau Graph API `followers_count`) |
| **Komentar** | Usulan dengan skor tertinggi dibangun di episode berikutnya | `tools/count_votes.py`: skor = jumlah komentar + like per kata kunci |
| **Komentar (semua)** | 10–12 nama pengomentar diundi, muncul sebagai warga bernama | `count_votes.py --names 12` |
| **Gift Instagram** | Masuk **Daftar Prajurit** (spanduk di barak) | Manual: buka dashboard profesional → Gifts, catat nama |
| **Saweria/Trakteer** | Naik pangkat sesuai nominal (tabel di bawah) | Webhook Saweria → bisa otomatis, atau cek riwayat donasi |

> Instagram **tidak** memberi daftar username follower lewat API, jadi follow hanya menjadi **angka**.
> Nama-nama yang muncul di video diambil dari **komentar** dan **pendukung**. Ini juga mendorong orang berkomentar.

## Tangga pangkat (usulan)

| Pangkat | Syarat | Hadiah di video |
|---|---|---|
| Rakyat | Follow | Ikut dihitung di papan RAKYAT |
| Rakyat Bernama | Komentar (diundi) | Nama melayang di atas warga atau rumah |
| Penasihat Raja | Komentar dengan like terbanyak | Usulannya dibangun dan namanya disebut Raja |
| Prajurit | Gift IG berapa pun | Nama di spanduk Daftar Prajurit |
| Ksatria | Dukungan Rp10.000 | Nama di panji istana + cameo prajurit bernama |
| Panglima | Dukungan Rp50.000 | Pilih kelas sendiri (pemanah, penyihir, pandai besi, penjaga naga) + disebut di narasi |
| Bangsawan | Dukungan Rp100.000 | Satu bangunan diberi namanya |
| Tangan Kanan Raja | Pendukung terbesar bulan ini | Tampil di episode "Sidang Kerajaan" akhir bulan |

Aturan main agar sehat:
- Jalur gratis (follow + komen) harus tetap terasa berarti: setiap episode **wajib** menyebut nama pengomentar.
- Tidak ada undian berhadiah uang atau sistem "beli peluang". Pangkat bersifat kosmetik (nama di video).
- Tiap 7 hari buat episode **"Papan Kehormatan"** (daftar nama rakyat, prajurit, ksatria, dan seterusnya).

## Teks bio (siap tempel, ≤150 karakter per baris)

```
👑 Kerajaan ini dibangun dari komen
🧑‍🌾 follow = jadi rakyat
🏰 usulan paling rame, dibangun besok
🎁 gift = naik pangkat · Raja butuh prajurit
```
Tambahkan link Saweria/Trakteer di bio setelah dibuat.

Sorotan (highlight) yang disarankan: **"Pusat Pangkat"** (tabel pangkat di atas sebagai 3 slide story)
dan **"Papan Kehormatan"**.

## Alur produksi harian

1. Kumpulkan komentar Day N-1, lalu jalankan `python3 tools/count_votes.py --file komentar.txt` (atau `--media`).
2. Salin `episodes/day01.json` menjadi `dayNN.json`: ubah `day`, `population` (= jumlah follower), dan `beats`.
   Beat pertama: "Hasil voting rakyat: …", lalu timelapse membangun, lelucon Raja, ajakan follow/komen, end card.
3. `python3 engine/build.py episodes/dayNN.json --stills 3,10,20` → cek PNG di `build/…/stills/`.
4. `python3 engine/build.py episodes/dayNN.json --workers 4` → `output/kerajaan-netizen-dayNN.mp4` + cover.
5. Tulis caption `episodes/dayNN.caption.txt`, lalu posting di jam ramai (11.00–13.00 atau 18.00–21.00 WIB).
