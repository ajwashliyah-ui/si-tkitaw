# Panduan Deployment

## 1. Google Sheets
- [ ] Masuk dengan akun Google milik sekolah (bukan akun pribadi guru).
- [ ] Buat Spreadsheet kosong, beri nama `DB Laporan TK IT Al-Washliyah`.
- [ ] Jangan bagikan spreadsheet ini ke orang tua atau publik.

## 2. Apps Script
- [ ] Di spreadsheet: Ekstensi > Apps Script.
- [ ] Ganti isi `Code.gs` dengan `gas/Code.gs`.
- [ ] Tambah file skrip bernama `Setup`, isi dengan `gas/Setup.gs`.
- [ ] Setelan Proyek > tampilkan `appsscript.json`, lalu ganti isinya dengan `gas/appsscript.json`.
- [ ] Pilih fungsi `setupDatabase`, klik Jalankan, setujui izin Sheets dan Drive.
- [ ] Pastikan muncul 12 sheet dan folder Drive `Foto_KAIH_TK_IT_AL_WASHLIYAH`.

## 3. Deploy Web App
- [ ] Deploy > Deployment baru > Aplikasi web.
- [ ] Jalankan sebagai: **Saya**. Yang memiliki akses: **Siapa saja**.
- [ ] Salin URL yang berakhiran `/exec`.
- [ ] Buka URL itu di browser; harus tampil `{"ok":true,"data":"API aktif"}`.
- [ ] Setiap kali kode diubah: Deploy > Kelola deployment > Edit > Versi baru (URL tetap).

## 4. Trigger kenaikan kelas
Apps Script tidak punya pilihan trigger tahunan. Dipakai trigger harian yang hanya bekerja
setelah `tanggal_selesai` tahun ajaran aktif terlewati.
- [ ] Jalankan fungsi `pasangTriggerKenaikan` satu kali.
- [ ] Periksa menu Pemicu: ada `prosesKenaikanKelasOtomatis`.
- [ ] Tahun ajaran baru dibuat dengan tanggal 13 Juli sampai 26 Juni. Sesuaikan di menu Sekolah bila perlu.
- [ ] Bila ada anak yang tinggal kelas, ubah kelasnya di menu Siswa setelah proses.
- [ ] Sebelum menekan tombol manual, buat salinan spreadsheet. Proses ini tidak bisa dibatalkan.

## 5. GitHub Pages
- [ ] Tempel URL `/exec` ke `config.js`.
- [ ] Buat repositori, unggah semua file (boleh tanpa `preview.html`).
- [ ] Settings > Pages > Deploy from a branch > `main` / `(root)`.
- [ ] Buka alamat Pages, pastikan tidak ada pilihan "Mode demo" pada form masuk.

## 6. Wajib sebelum dipakai orang tua
Akun contoh punya password yang tertulis di kode. Siapa pun yang membaca repositori bisa mengetahuinya.

| Username | Password awal |
|---|---|
| admin | Admin#123 |
| guru.a, guru.b | Guru#123 |
| ortu.hasan, ortu.zahra | Ortu#123 |

- [ ] Masuk sebagai admin, ganti password lewat tombol Password.
- [ ] Buat akun guru dan orang tua asli, tetapkan wali kelas.
- [ ] Nonaktifkan semua akun contoh selain admin yang passwordnya sudah diganti.
- [ ] Hapus baris data contoh di sheet Siswa, RiwayatKelas, Antropometri, Literasi, Keagamaan, KAIH_Bulanan, UlasanOrtu.
- [ ] Isi alamat dan kontak sekolah.
- [ ] Minta persetujuan orang tua untuk foto anak: foto di Drive dapat dibuka siapa pun yang memegang tautannya.
- [ ] Minta bidan atau petugas gizi memeriksa tabel `BATAS` di `Code.gs` terhadap standar Permenkes No. 2 Tahun 2020 / WHO.

## 7. Uji setelah online
- [ ] Guru menyimpan pengukuran, grafik muncul.
- [ ] Orang tua mengisi 7 KAIH, mengunggah foto, lalu menggantinya (file lama masuk sampah Drive).
- [ ] Orang tua mengirim ulasan, guru membalas.
- [ ] Cetak rapor dari HP dan laptop.
