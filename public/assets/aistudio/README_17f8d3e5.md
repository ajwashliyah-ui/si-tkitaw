# Laporan Perkembangan Anak, TK IT AL-WASHLIYAH

Frontend statis (GitHub Pages) dengan backend Google Apps Script, Google Sheets, dan Google Drive.

```
index.html          halaman utama
config.js           URL Web App (kosong = mode demo)
css/app.css         tampilan, animasi, dan gaya cetak rapor
js/ui.js            toast, dialog, form
js/api.js           panggilan API
js/auth.js          login, sesi, kerangka menu
js/landing.js       halaman depan beranimasi
js/guru.js          halaman laporan (dipakai Guru dan Orang Tua)
js/ortu.js          menu Orang Tua
js/admin.js         dashboard Admin
js/charts.js        grafik Chart.js
js/report.js        isi laporan dan cetak rapor
js/demo-backend.js  hasil rakitan untuk mode demo
assets/             logo
gas/                Setup.gs, Code.gs, appsscript.json (disalin ke Apps Script)
tools/              build.py, test.js, gas-shim.js, shots.py
preview.html        satu file untuk mencoba tanpa server
```

Setelah mengubah `gas/` atau frontend: `python3 tools/build.py`, lalu `node tools/test.js`.
Cara pasang ada di `PANDUAN_DEPLOY.md`.
