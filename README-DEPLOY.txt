============================================================
 DEPLOY KE VERCEL / GITHUB PAGES
============================================================

------------------------------------------------------------
 OPSI A: VERCEL (REKOMENDASI — semua jalan di 1 tempat)
------------------------------------------------------------
Vercel support static HTML + Serverless Function (Node.js),
jadi proxy bisa jalan.

Struktur folder:
  absensi-hrd-gedo-vercel/
  ├── index.html        ← halaman utama
  ├── vercel.json       ← konfigurasi
  └── api/
      └── proxy.js      ← serverless function (pengganti proxy.php)

Cara deploy:
1. Buat repo di GitHub, upload 3 file di atas (dengan struktur folder).
2. Buka https://vercel.com → Sign in with GitHub.
3. "Add New..." → Project → pilih repo kamu → Deploy.
4. Selesai! Akses https://nama-project.vercel.app

Catatan: Vercel gratis untuk penggunaan personal.

------------------------------------------------------------
 OPSI B: GITHUB PAGES (HTML saja, proxy di Vercel)
------------------------------------------------------------
GitHub Pages HANYA static — TIDAK bisa menjalankan PHP maupun
serverless function. Tapi kamu bisa:

1. Deploy proxy saja ke Vercel (opsi A di atas, tanpa index.html).
   Dapat URL misal: https://proxy-gedo.vercel.app
2. Upload index.html ke GitHub Pages.
3. Edit baris di index.html:
       const API_BASE = 'https://proxy-gedo.vercel.app/api/proxy?path=';
   (ganti dengan URL proxy Vercel kamu)

Cookie akan disimpan di domain Vercel (sudah di-set
SameSite=None; Secure di proxy.js), jadi cross-origin tetap jalan.

------------------------------------------------------------
 OPSI C: NETLIFY / CLOUDFLARE PAGES
------------------------------------------------------------
- Netlify: support serverless function (.netlify/functions/),
  logika proxy.js bisa diadaptasi (handler format sedikit beda).
- Cloudflare Pages + Workers: paling cepat & gratis, tapi
  perlu menulis ulang proxy dalam format Worker.

------------------------------------------------------------
 TIDAK DISARANKAN
------------------------------------------------------------
- GitHub Pages saja (tanpa proxy) → GAGAL karena CORS diblokir.
- Netlify Drop tanpa function → sama, gagal CORS.
- Hosting statis lain tanpa backend → gagal.

Intinya: SELALU butuh proxy di server (bukan di browser), karena
server hr.yeusaigongroup.com tidak mengizinkan cross-origin.
