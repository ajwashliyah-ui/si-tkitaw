var Rapor = (function () {
  var NAMA_SKALA = { BB: 'Belum Berkembang', MB: 'Mulai Berkembang', BSH: 'Berkembang Sesuai Harapan', BSB: 'Berkembang Sangat Baik' };
  var TRACK = {
    TRACK_1: 'Penguatan Dasar: huruf dan suku kata KV', TRACK_2: 'Reguler: suku kata lanjutan',
    TRACK_3: 'Lanjutan: kalimat sederhana', TRACK_4: 'Next Level: paragraf pendek dan bercerita', KUSTOM: 'Target kustom'
  };
  var KATEGORI = { SURAT: 'Surat Pendek', DOA: 'Doa Harian', IQRA: 'Hijaiyah / Iqra', HADITS: 'Hadits Pendek' };
  var KAIH = [['bangun_pagi', 'Bangun Pagi'], ['beribadah', 'Beribadah'], ['berolahraga', 'Berolahraga'], ['makan_sehat', 'Makan Sehat dan Bergizi'],
    ['gemar_belajar', 'Gemar Belajar'], ['bermasyarakat', 'Bermasyarakat'], ['tidur_cepat', 'Tidur Cepat']];

  function baris(isi) {
    return '<table>' + isi.map(function (r) {
      return '<tr><th>' + UI.esc(r[0]) + '</th><td>' + UI.esc(r[1] || '-') + '</td></tr>';
    }).join('') + '</table>';
  }

  function literasi(l) {
    if (!l) return UI.kosong('Belum ada penilaian literasi pada bulan ini.');
    var a = l.kelas === 'Kelas A';
    var isi = a ? [] : [['Target belajar', l.track_level_dipilih === 'KUSTOM' ? l.target_kustom : TRACK[l.track_level_dipilih]]];
    isi.push([a ? 'Pengenalan huruf A-Z' : 'Kemampuan dasar', NAMA_SKALA[l.nilai_huruf_atau_dasar]]);
    isi.push([a ? 'Suku kata mudah' : 'Kemampuan lanjutan', NAMA_SKALA[l.nilai_sukukata_atau_lanjutan]]);
    if (l.nilai_kalimat_opsional) isi.push(['Kalimat', NAMA_SKALA[l.nilai_kalimat_opsional]]);
    isi.push(['Catatan guru', l.catatan_guru]);
    return baris(isi);
  }

  function agama(list) {
    if (!list.length) return UI.kosong('Belum ada materi keagamaan yang dinilai pada bulan ini.');
    return '<ul class="daftar">' + list.map(function (g) {
      return '<li><div><small>' + UI.esc(KATEGORI[g.kategori]) + '</small><strong>' + UI.esc(g.nama_materi) + '</strong>' +
        (g.catatan_guru ? '<p>' + UI.esc(g.catatan_guru) + '</p>' : '') + '</div><span class="nilai">' + UI.esc(g.status_progres) + '</span></li>';
    }).join('') + '</ul>';
  }

  function kaih(k) {
    if (!k) return UI.kosong('Orang tua belum mengisi 7 KAIH pada bulan ini.');
    return baris(KAIH.map(function (x) { return [x[1], k[x[0]]]; }).concat([['Catatan orang tua', k.catatan_ortu]])) +
      (k.foto_url ? '<img class="foto" src="' + UI.esc(API.foto(k.foto_url)) + '" alt="Foto kegiatan bulan ini" width="800" height="600">' : '');
  }

  function cetak(r, sekolah) {
    var s = r.siswa;
    var a = r.antro.filter(function (x) { return x.periode_bulan === r.periode; })[0];
    var kelas = (r.riwayat.filter(function (x) { return x.ta_id === r.ta_id; })[0] || {});
    UI.el('cetak').innerHTML =
      '<header><img src="assets/lambang.png" alt=""><div><h1>' + UI.esc(sekolah.nama_sekolah) + '</h1><p>' + UI.esc(sekolah.alamat_sekolah) +
      ' | ' + UI.esc(sekolah.kontak_sekolah) + '</p></div></header>' +
      '<h2>Laporan Perkembangan Anak, ' + UI.esc(UI.bulan(r.periode)) + '</h2>' +
      baris([['Nama anak', s.nama_anak], ['NIS', s.nis], ['Kelas', kelas.kelas], ['Tahun ajaran', kelas.nama_ta]]) +
      '<h3>Pertumbuhan fisik</h3>' + (a ? baris([['Berat badan', a.bb_kg + ' kg'], ['Tinggi badan', a.tb_cm + ' cm'], ['Lingkar kepala', a.lk_cm + ' cm'],
        ['LiLA', a.lila_cm + ' cm'], ['Status', a.status_gizi_otomatis], ['Catatan guru', a.catatan_guru]]) : UI.kosong('Belum diukur pada bulan ini.')) +
      '<h3>Literasi</h3>' + literasi(r.literasi) + '<h3>Keagamaan</h3>' + agama(r.agama) + '<h3>7 Kebiasaan Anak Indonesia Hebat</h3>' + kaih(r.kaih) +
      '<div class="ttd"><p>Orang Tua / Wali<br><br><br><br>( ........................ )</p><p>Wali Kelas<br><br><br><br>( ........................ )</p></div>';
    var gambar = Array.from(UI.el('cetak').querySelectorAll('img'));
    Promise.all(gambar.map(function (g) { return g.decode().catch(function () {}); })).then(function () { window.print(); });
  }

  return { literasi: literasi, agama: agama, kaih: kaih, cetak: cetak, SKALA: NAMA_SKALA, TRACK: TRACK, KATEGORI: KATEGORI, KAIH: KAIH };
})();
