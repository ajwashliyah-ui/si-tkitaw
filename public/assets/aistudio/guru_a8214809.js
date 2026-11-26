/** Tampilan laporan anak, dipakai bersama oleh Guru dan Orang Tua. */
var Laporan = (function () {
  var st = { siswa: [], materi: [], id: '', ta: '', periode: '', r: null, hal: '', peran: '' };

  function mulai(peran, menu) {
    API.panggil('listSiswa').then(function (h) {
      st = { siswa: h.siswa, materi: h.materi, id: (h.siswa[0] || {}).siswa_id, ta: '', periode: Aplikasi.sekolah().periode, r: null, hal: menu[0][0], peran: peran };
      Aplikasi.kerangka(menu, st.hal, function (hal) { st.hal = hal; gambar(); });
      if (!st.id) {
        UI.el('isi').innerHTML = UI.kosong(peran === 'GURU'
          ? 'Belum ada siswa di kelas Anda. Minta Admin menetapkan Anda sebagai wali kelas dan mendaftarkan siswa.'
          : 'Akun ini belum terhubung dengan data anak. Hubungi Admin sekolah.');
        return;
      }
      return muat();
    }).catch(function () {});
  }

  function muat() {
    return API.panggil('getReport', { siswa_id: st.id, ta_id: st.ta, periode: st.periode }, 'Membuka laporan').then(function (r) {
      st.r = r;
      st.ta = r.ta_id;
      gambar();
    }).catch(function () {});
  }

  function simpan(aksi, data, pesan) {
    var isi = Object.assign({ siswa_id: st.id, periode: st.periode, ta_id: st.ta }, data);
    return API.panggil(aksi, isi, 'Menyimpan').then(function () {
      UI.toast(pesan || 'Tersimpan');
      return muat();
    });
  }

  function bulanTersedia() {
    var t = st.r.riwayat.filter(function (x) { return x.ta_id === st.r.ta_id; })[0] || {};
    var akhir = st.r.periode_kini, daftar = [];
    if (t.tanggal_selesai && t.tanggal_selesai.slice(0, 7) < akhir) akhir = t.tanggal_selesai.slice(0, 7);
    var p = (t.tanggal_mulai || akhir).slice(0, 7);
    while (p <= akhir && daftar.length < 18) {
      daftar.unshift([p, UI.bulan(p)]);
      var x = p.split('-'), n = Number(x[0]) * 12 + Number(x[1]);
      p = Math.floor(n / 12) + '-' + ('0' + (n % 12 + 1)).slice(-2);
    }
    return daftar;
  }

  function kepala() {
    var r = st.r;
    var bulan = bulanTersedia();
    return '<div class="pilih">' +
      (st.siswa.length > 1 ? UI.isian({ n: 'f-siswa', l: 'Anak', t: st.siswa.map(function (s) { return [s.siswa_id, s.nama_anak + ' (' + s.kelas_aktif + ')']; }) }, st.id) : '') +
      UI.isian({ n: 'f-ta', l: 'Tahun ajaran dan kelas', t: r.riwayat.map(function (x) { return [x.ta_id, x.nama_ta + ', ' + x.kelas]; }) }, r.ta_id) +
      UI.isian({ n: 'f-periode', l: 'Bulan', t: bulan }, st.periode) +
      '<button class="tbl polos" id="b-cetak">Cetak rapor</button></div>' +
      '<div class="identitas"><span class="inisial" aria-hidden="true">' + UI.esc(r.siswa.nama_anak.charAt(0)) + '</span><div><h1>' + UI.esc(r.siswa.nama_anak) + '</h1><p>NIS ' +
      UI.esc(r.siswa.nis) + ', ' + UI.esc(r.siswa.kelas_aktif) + (r.arsip ? '. Arsip, hanya bisa dibaca.' : '') + '</p></div></div>';
  }

  function bolehIsi() { return st.peran === 'GURU' && !st.r.arsip; }

  function formulir(id, judul, isi) {
    return '<form id="' + id + '" class="kartu formulir"><h2>' + judul + '</h2><div class="kisi">' + isi + '</div><button class="tbl">Simpan</button></form>';
  }

  var HAL = {
    ringkas: function () {
      var r = st.r, a = r.antro.filter(function (x) { return x.periode_bulan <= r.periode; }).pop();
      var status = [
        ['Pertumbuhan', a ? a.status_gizi_otomatis + ' (' + UI.bulan(a.periode_bulan) + ')' : 'Belum diukur'],
        ['Literasi', r.literasi ? 'Sudah dinilai' : 'Belum dinilai'],
        ['Keagamaan', r.agama.length ? r.agama.length + ' materi dinilai' : 'Belum dinilai'],
        ['7 KAIH', r.kaih ? 'Sudah Diisi' : 'Belum Diisi']
      ];
      return '<dl class="status">' + status.map(function (s) { return '<div><dt>' + s[0] + '</dt><dd>' + UI.esc(s[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<h2>Tips Praktis untuk Ayah &amp; Bunda</h2>' +
        (r.tips.length ? '<div class="tips">' + r.tips.map(function (t) {
          return '<article><small>' + UI.esc({ ANTRO: 'Pertumbuhan', LIT: 'Literasi', KAIH: 'Kebiasaan', AGAMA: 'Keagamaan' }[t.kategori_pemicu] || '') + '</small><h3>' + UI.esc(t.judul_tips) + '</h3><p>' + UI.esc(t.isi_tips_ayah_bunda) + '</p></article>';
        }).join('') + '</div>' : UI.kosong('Tips muncul setelah ada laporan yang terisi.')) +
        '<h2>Riwayat kelas</h2><ul class="daftar">' + r.riwayat.map(function (x) {
          return '<li><strong>' + UI.esc(x.nama_ta + ', ' + x.kelas) + '</strong><span class="nilai">' + UI.esc(x.status_akhir) + '</span></li>';
        }).join('') + '</ul>';
    },
    tumbuh: function () {
      var a = st.r.antro.filter(function (x) { return x.periode_bulan === st.periode; })[0] || {};
      return (bolehIsi() ? formulir('f-antro', 'Pengukuran ' + UI.bulan(st.periode), [['bb_kg', 'Berat badan (kg)'], ['tb_cm', 'Tinggi badan (cm)'], ['lk_cm', 'Lingkar kepala (cm)'], ['lila_cm', 'LiLA (cm)']]
        .map(function (f) { return UI.isian({ n: f[0], l: f[1], t: 'number', wajib: true, attr: 'step="0.1" inputmode="decimal"' }, a[f[0]]); }).join('') +
        UI.isian({ n: 'catatan_guru', l: 'Catatan guru', t: 'textarea' }, a.catatan_guru)) : '') +
        '<section class="kartu"><h2>Bagaimana pertumbuhan tiap bulan?</h2><div id="grafik"></div>' +
        '<p class="catatan">Status memakai batas penyaringan sederhana dan bukan diagnosis. Untuk penilaian lengkap, hubungi tenaga kesehatan.</p></section>';
    },
    baca: function () {
      var l = st.r.literasi || {}, a = st.r.siswa.kelas_aktif === 'Kelas A';
      var skala = Object.keys(Rapor.SKALA).map(function (k) { return [k, k + ', ' + Rapor.SKALA[k]]; });
      var nilai = function (n, label, v) { return UI.isian({ n: n, l: label, wajib: true, t: [['', 'Pilih nilai']].concat(skala) }, v); };
      var isi = '';
      if (bolehIsi()) {
        isi = formulir('f-lit', 'Penilaian ' + UI.bulan(st.periode),
          (a ? '' : UI.isian({ n: 'track_level_dipilih', l: 'Target belajar anak', t: Object.keys(Rapor.TRACK).map(function (k) { return [k, Rapor.TRACK[k]]; }) }, l.track_level_dipilih || st.r.siswa.target_literasi_kelas_b || 'TRACK_1') +
            UI.isian({ n: 'target_kustom', l: 'Tulis target kustom', t: 'textarea' }, l.target_kustom)) +
          nilai('nilai_dasar', a ? 'Pengenalan huruf A-Z' : 'Kemampuan dasar', l.nilai_huruf_atau_dasar) +
          nilai('nilai_lanjutan', a ? 'Suku kata mudah (KV)' : 'Kemampuan lanjutan', l.nilai_sukukata_atau_lanjutan) +
          (a ? '' : UI.isian({ n: 'nilai_kalimat', l: 'Kalimat (opsional)', t: [['', 'Tidak dinilai']].concat(skala) }, l.nilai_kalimat_opsional)) +
          UI.isian({ n: 'catatan_guru', l: 'Catatan guru', t: 'textarea' }, l.catatan_guru));
      }
      return isi + '<section class="kartu"><h2>Laporan literasi</h2>' + Rapor.literasi(st.r.literasi) + '</section>';
    },
    agama: function () {
      var isi = bolehIsi() ? formulir('f-agama', 'Nilai materi, ' + UI.bulan(st.periode),
        '<label class="isian"><span>Materi</span><select name="materi_id" required>' + Object.keys(Rapor.KATEGORI).map(function (k) {
          return '<optgroup label="' + Rapor.KATEGORI[k] + '">' + UI.opsi(st.materi.filter(function (m) { return m.kategori === k; }).map(function (m) { return [m.materi_id, m.nama_materi]; })) + '</optgroup>';
        }).join('') + '</select></label>' +
        UI.isian({ n: 'status_progres', l: 'Status progres', t: ['Baru Mengenalkan', 'Menirukan', 'Hafal/Lancar dengan Bantuan', 'Hafal/Lancar Mandiri'] }) +
        '<label class="isian" id="halaman-iqra" hidden><span>Halaman Iqra terakhir</span><input type="number" name="halaman" min="1" max="99" inputmode="numeric"></label>' +
        UI.isian({ n: 'catatan_guru', l: 'Catatan guru', t: 'textarea' })) : '';
      return isi + '<section class="kartu"><h2>Bacaan dan keagamaan</h2>' + Rapor.agama(st.r.agama) + '</section>';
    },
    kaih: function () {
      var k = st.r.kaih || {};
      var buka = st.peran === 'ORTU' && !st.r.arsip && st.periode === st.r.periode_kini;
      if (!buka) return '<section class="kartu"><h2>7 KAIH, ' + UI.esc(UI.bulan(st.periode)) + '</h2>' + Rapor.kaih(st.r.kaih) + '</section>';
      return '<form id="f-kaih" class="kartu formulir"><h2>7 KAIH, ' + UI.bulan(st.periode) + ' <span class="nilai">' + (st.r.kaih ? 'Sudah Diisi' : 'Belum Diisi') + '</span></h2>' +
        Rapor.KAIH.map(function (x) {
          return '<fieldset class="skala"><legend>' + x[1] + '</legend>' + ['Belum Terbiasa', 'Mulai Terbiasa', 'Sudah Terbiasa'].map(function (v) {
            return '<label><input type="radio" name="' + x[0] + '" value="' + v + '" required' + (k[x[0]] === v ? ' checked' : '') + '><span>' + v + '</span></label>';
          }).join('') + '</fieldset>';
        }).join('') +
        UI.isian({ n: 'catatan_ortu', l: 'Catatan orang tua', t: 'textarea' }, k.catatan_ortu) +
        '<label class="isian"><span>' + (k.foto_url ? 'Ganti foto kegiatan' : 'Foto kegiatan (1 per bulan)') + '</span><input type="file" id="f-foto" accept="image/*"></label>' +
        '<img id="pratinjau" class="foto" alt="Pratinjau foto kegiatan" width="800" height="600"' + (k.foto_url ? ' src="' + UI.esc(API.foto(k.foto_url)) + '"' : ' hidden') + '>' +
        '<p class="catatan">Foto bisa dilihat oleh siapa pun yang memegang tautannya. Pilih foto yang pantas dibagikan.</p><button class="tbl">Simpan isian</button></form>';
    },
    ulasan: function () {
      return '<section class="kartu"><h2>Diskusi laporan ' + UI.esc(UI.bulan(st.periode)) + '</h2>' +
        (st.r.ulasan.length ? '<ol class="obrolan">' + st.r.ulasan.map(function (u) {
          return '<li class="' + (u.pengirim_role === st.peran ? 'saya' : '') + '"><strong>' + UI.esc(u.pengirim_nama) + '</strong><p>' + UI.esc(u.isi_pesan) + '</p><time>' +
            UI.esc(new Date(u.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })) + '</time></li>';
        }).join('') + '</ol>' : UI.kosong('Belum ada pesan untuk bulan ini. Tulis pesan pertama di bawah.')) +
        (st.r.arsip ? '' : '<form id="f-ulasan" class="formulir">' + UI.isian({ n: 'isi_pesan', l: st.peran === 'GURU' ? 'Balasan guru' : 'Tanggapan Anda', t: 'textarea', wajib: true }) + '<button class="tbl">Kirim</button></form>') + '</section>';
    }
  };

  function kompres(file) {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (img) {
      var skala = Math.min(1, 800 / img.width);
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * skala);
      c.height = Math.round(img.height * skala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    });
  }

  function gambar() {
    if (!st.r) return;
    var isi = UI.el('isi');
    isi.innerHTML = kepala() + '<div class="halaman">' + HAL[st.hal]() + '</div>';
    var q = function (s) { return isi.querySelector(s); };
    var ganti = function (nama, fn) { var n = q('[name="' + nama + '"]'); if (n) n.onchange = function () { fn(n.value); muat(); }; };
    ganti('f-siswa', function (v) { st.id = v; st.ta = ''; st.periode = st.r.periode_kini; });
    ganti('f-ta', function (v) {
      st.ta = v;
      st.r.ta_id = v;
      st.periode = bulanTersedia()[0] ? bulanTersedia()[0][0] : st.r.periode_kini;
    });
    ganti('f-periode', function (v) { st.periode = v; });
    q('#b-cetak').onclick = function () { Rapor.cetak(st.r, Aplikasi.sekolah()); };
    if (q('#grafik')) Grafik.pasang(q('#grafik'), st.r.antro);

    var kirim = function (id, aksi, olah) {
      var f = q(id);
      if (!f) return;
      f.onsubmit = function (e) {
        e.preventDefault();
        var tombol = f.querySelector('button.tbl');
        tombol.disabled = true;
        Promise.resolve(olah ? olah(UI.dataForm(f)) : UI.dataForm(f))
          .then(function (d) { return simpan(aksi, d); })
          .catch(function () { tombol.disabled = false; });
      };
    };
    kirim('#f-antro', 'saveAntro');
    kirim('#f-lit', 'saveLiterasi');
    kirim('#f-ulasan', 'addUlasan');
    kirim('#f-agama', 'saveAgama', function (d) {
      var m = st.materi.filter(function (x) { return x.materi_id === d.materi_id; })[0];
      if (m.kategori === 'IQRA' && d.halaman) d.catatan_guru = ('Halaman terakhir: ' + d.halaman + '. ' + d.catatan_guru).trim();
      return d;
    });
    var foto = '';
    kirim('#f-kaih', 'saveKaih', function (d) { d.foto_base64 = foto; return d; });

    if (q('#f-foto')) {
      q('#f-foto').onchange = function (e) {
        if (!e.target.files[0]) return;
        kompres(e.target.files[0]).then(function (b64) {
          foto = b64;
          q('#pratinjau').src = b64;
          q('#pratinjau').hidden = false;
        }).catch(function () { e.target.value = ''; UI.toast('Foto tidak bisa dibaca. Coba format JPG atau PNG.', 'gagal'); });
      };
    }
    var materi = q('[name="materi_id"]');
    if (materi) {
      materi.onchange = function () {
        var m = st.materi.filter(function (x) { return x.materi_id === materi.value; })[0];
        q('#halaman-iqra').hidden = m.kategori !== 'IQRA';
        var lama = st.r.agama.filter(function (g) { return g.materi_id === materi.value; })[0];
        q('[name="status_progres"]').value = lama ? lama.status_progres : 'Baru Mengenalkan';
        q('#f-agama [name="catatan_guru"]').value = lama ? lama.catatan_guru : '';
      };
      materi.onchange();
    }
    var track = q('[name="track_level_dipilih"]');
    if (track) {
      track.onchange = function () { q('[name="target_kustom"]').closest('label').hidden = track.value !== 'KUSTOM'; };
      track.onchange();
    }
  }

  return { mulai: mulai };
})();

var Guru = {
  mulai: function () {
    Laporan.mulai('GURU', [['tumbuh', 'Tumbuh'], ['baca', 'Literasi'], ['agama', 'Agama'], ['kaih', '7 KAIH'], ['ulasan', 'Diskusi']]);
  }
};
