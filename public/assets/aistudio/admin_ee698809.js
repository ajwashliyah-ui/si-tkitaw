var Admin = (function () {
  var data, hal = 'rekap', periode;
  var YA_TIDAK = [['YA', 'Aktif'], ['TIDAK', 'Nonaktif']];

  function mulai() {
    hal = 'rekap';
    periode = Aplikasi.sekolah().periode;
    Aplikasi.kerangka([['rekap', 'Rekap'], ['akun', 'Akun'], ['siswa', 'Siswa'], ['master', 'Master'], ['atur', 'Sekolah']], hal, function (h) { hal = h; gambar(); });
    muat();
  }

  function muat() {
    return API.panggil('adminData').then(function (d) { data = d; gambar(); }).catch(function () {});
  }

  function simpan(aksi, isi) {
    return API.panggil(aksi, isi, 'Menyimpan').then(function () {
      UI.toast('Tersimpan');
      return Aplikasi.muatSekolah().then(muat);
    });
  }

  function pengguna(role) {
    return data.users.filter(function (u) { return u.role === role; }).map(function (u) { return [u.user_id, u.nama_lengkap]; });
  }

  function formEntri(judul, aksi, bidang, nilai, kunci) {
    UI.dialog(judul, bidang.map(function (f) { return UI.isian(f, nilai[f.n]); }).join(''), function (d) {
      if (kunci) d[kunci] = nilai[kunci] || '';
      return simpan(aksi, d);
    });
  }

  var ENTRI = {
    user: ['Akun', 'saveUser', 'user_id', function (baru) {
      return [{ n: 'nama_lengkap', l: 'Nama lengkap', wajib: true }, { n: 'username', l: 'Username', wajib: true, attr: 'autocapitalize="none"' },
        { n: 'password', l: baru ? 'Password (minimal 8 karakter)' : 'Password baru (kosongkan bila tetap)', t: 'password', wajib: baru, attr: 'autocomplete="new-password"' },
        { n: 'role', l: 'Peran', t: [['ORTU', 'Orang Tua'], ['GURU', 'Guru'], ['ADMIN', 'Admin']] }, { n: 'no_hp', l: 'Nomor HP' }, { n: 'status_aktif', l: 'Status', t: YA_TIDAK }];
    }],
    siswa: ['Siswa', 'saveSiswa', 'siswa_id', function () {
      return [{ n: 'nama_anak', l: 'Nama anak', wajib: true }, { n: 'nis', l: 'NIS', wajib: true }, { n: 'jenis_kelamin', l: 'Jenis kelamin', t: [['L', 'Laki-laki'], ['P', 'Perempuan']] },
        { n: 'tanggal_lahir', l: 'Tanggal lahir', t: 'date', wajib: true }, { n: 'kelas_aktif', l: 'Kelas', t: ['Kelas A', 'Kelas B', 'Lulus'] },
        { n: 'ortu_user_id', l: 'Akun orang tua', t: [['', 'Belum dihubungkan']].concat(pengguna('ORTU')) }];
    }],
    tahun: ['Tahun ajaran', 'saveTA', 'ta_id', function () {
      return [{ n: 'nama_ta', l: 'Nama, contoh 2027/2028', wajib: true }, { n: 'tanggal_mulai', l: 'Tanggal mulai', t: 'date', wajib: true }, { n: 'tanggal_selesai', l: 'Tanggal selesai', t: 'date', wajib: true }];
    }],
    materi: ['Materi', 'saveMateri', 'materi_id', function () {
      return [{ n: 'nama_materi', l: 'Nama materi', wajib: true }, { n: 'kategori', l: 'Kategori', t: Object.keys(Rapor.KATEGORI).map(function (k) { return [k, Rapor.KATEGORI[k]]; }) },
        { n: 'urutan', l: 'Urutan', t: 'number', wajib: true }, { n: 'aktif', l: 'Status', t: YA_TIDAK }];
    }],
    tips: ['Tips', 'saveTips', 'tips_id', function () {
      return [{ n: 'judul_tips', l: 'Judul', wajib: true }, { n: 'isi_tips_ayah_bunda', l: 'Isi tips', t: 'textarea', wajib: true }, { n: 'aktif', l: 'Status', t: YA_TIDAK }];
    }]
  };

  function tabel(jenis, kepala, baris, tambah) {
    var id = ENTRI[jenis][2];
    return '<section class="kartu"><div class="judul-baris"><h2>' + ENTRI[jenis][0] + '</h2>' + (tambah ? '<button class="tbl kecil" data-tambah="' + jenis + '">Tambah</button>' : '') + '</div>' +
      (baris.length ? '<div class="geser"><table><thead><tr>' + kepala.map(function (k) { return '<th>' + k + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        baris.map(function (b) {
          return '<tr>' + b.sel.map(function (s) { return '<td>' + UI.esc(s) + '</td>'; }).join('') + '<td><button class="tbl polos kecil" data-ubah="' + jenis + '" data-id="' + UI.esc(b.data[id]) + '">Ubah</button></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.kosong('Belum ada data. Gunakan tombol Tambah.')) + '</section>';
  }

  function nama(id) {
    return (data.users.filter(function (u) { return u.user_id === id; })[0] || {}).nama_lengkap || '-';
  }

  var HAL = {
    rekap: function () {
      return '<h1>Kelengkapan laporan</h1><div class="pilih">' + UI.isian({ n: 'periode', l: 'Bulan', t: 'month' }, periode) + '</div><div id="rekap"></div>';
    },
    akun: function () {
      return '<h1>Akun pengguna</h1>' + tabel('user', ['Nama', 'Username', 'Peran', 'Status'], data.users.map(function (u) {
        return { data: u, sel: [u.nama_lengkap, u.username, u.role, u.status_aktif === 'YA' ? 'Aktif' : 'Nonaktif'] };
      }), true);
    },
    siswa: function () {
      return '<h1>Data siswa</h1>' + tabel('siswa', ['Nama', 'Kelas', 'Orang tua', 'Status'], data.siswa.map(function (s) {
        return { data: s, sel: [s.nama_anak, s.kelas_aktif, nama(s.ortu_user_id), s.status_siswa] };
      }), true);
    },
    master: function () {
      return '<h1>Master materi dan tips</h1>' + tabel('materi', ['Materi', 'Kategori', 'Urutan', 'Aktif'], data.materi.map(function (m) {
        return { data: m, sel: [m.nama_materi, Rapor.KATEGORI[m.kategori], m.urutan, m.aktif] };
      }), true) + tabel('tips', ['Kode pemicu', 'Judul', 'Aktif'], data.tips.map(function (t) {
        return { data: t, sel: [t.kondisi_pemicu, t.judul_tips, t.aktif] };
      }), false);
    },
    atur: function () {
      var p = data.pengaturan, guru = [['', 'Belum ditentukan']].concat(pengguna('GURU'));
      var aktif = data.tahun.filter(function (t) { return t.ta_id === p.tahun_ajaran_aktif; })[0] || {};
      return '<h1>Pengaturan sekolah</h1><form id="f-atur" class="kartu formulir"><div class="kisi">' +
        [{ n: 'nama_sekolah', l: 'Nama lembaga', wajib: true }, { n: 'alamat_sekolah', l: 'Alamat' }, { n: 'kontak_sekolah', l: 'Kontak' }, { n: 'folder_drive_id', l: 'ID folder Google Drive' },
          { n: 'wali_kelas_a', l: 'Wali Kelas A', t: guru }, { n: 'wali_kelas_b', l: 'Wali Kelas B', t: guru }].map(function (f) { return UI.isian(f, p[f.n]); }).join('') +
        '</div><button class="tbl">Simpan</button></form>' +
        tabel('tahun', ['Tahun ajaran', 'Mulai', 'Selesai', 'Status'], data.tahun.map(function (t) {
          return { data: t, sel: [t.nama_ta, t.tanggal_mulai, t.tanggal_selesai, t.ta_id === p.tahun_ajaran_aktif ? 'Berjalan' : '-'] };
        }), true) +
        '<section class="kartu bahaya"><h2>Kenaikan kelas</h2><p>Tahun ajaran berjalan: ' + UI.esc(aktif.nama_ta) + '. Siswa Kelas A naik ke Kelas B, siswa Kelas B menjadi Lulus, dan tahun ajaran berikutnya diaktifkan. Tindakan ini tidak punya tombol batal.</p>' +
        '<button class="tbl merah" id="b-naik">Proses kenaikan kelas</button></section>';
    }
  };

  function rekap() {
    API.panggil('rekap', { periode: periode }, 'Menghitung rekap').then(function (h) {
      var w = UI.el('rekap');
      if (!w) return;
      var n = h.baris.length;
      if (!n) { w.innerHTML = UI.kosong('Belum ada siswa aktif. Tambahkan lewat menu Siswa.'); return; }
      var kolom = [['antro', 'Antropometri'], ['literasi', 'Literasi'], ['agama', 'Keagamaan'], ['kaih', '7 KAIH (orang tua)']];
      w.innerHTML = '<dl class="status">' + kolom.map(function (k) {
        var isi = h.baris.filter(function (b) { return b[k[0]]; }).length;
        return '<div><dt>' + k[1] + '</dt><dd>' + isi + ' dari ' + n + '</dd><progress max="' + n + '" value="' + isi + '"></progress></div>';
      }).join('') + '</dl><section class="kartu"><div class="geser"><table><thead><tr><th>Anak</th><th>Kelas</th>' + kolom.map(function (k) { return '<th>' + k[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
        h.baris.map(function (b) {
          return '<tr><td>' + UI.esc(b.nama_anak) + '</td><td>' + UI.esc(b.kelas) + '</td>' + kolom.map(function (k) { return '<td class="' + (b[k[0]] ? 'sudah' : 'belum') + '">' + (b[k[0]] ? 'Sudah' : 'Belum') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div></section>';
    }).catch(function () {});
  }

  function gambar() {
    if (!data) return;
    var isi = UI.el('isi');
    isi.innerHTML = '<div class="halaman">' + HAL[hal]() + '</div>';
    isi.querySelectorAll('[data-tambah], [data-ubah]').forEach(function (b) {
      b.onclick = function () {
        var jenis = b.dataset.tambah || b.dataset.ubah, e = ENTRI[jenis];
        var daftar = { user: data.users, siswa: data.siswa, tahun: data.tahun, materi: data.materi, tips: data.tips }[jenis];
        var nilai = daftar.filter(function (x) { return x[e[2]] === b.dataset.id; })[0] || {};
        formEntri((b.dataset.ubah ? 'Ubah ' : 'Tambah ') + e[0].toLowerCase(), e[1], e[3](!b.dataset.ubah), nilai, e[2]);
      };
    });
    if (hal === 'rekap') {
      isi.querySelector('[name="periode"]').onchange = function (e) { if (e.target.value) { periode = e.target.value; rekap(); } };
      rekap();
    }
    if (hal === 'atur') {
      UI.el('f-atur').onsubmit = function (e) { e.preventDefault(); simpan('saveSettings', UI.dataForm(e.target)).catch(function () {}); };
      UI.el('b-naik').onclick = function () {
        var asal = data.pengaturan.tahun_ajaran_aktif;
        UI.dialog('Konfirmasi kenaikan kelas', '<p>Ketik <strong>NAIK KELAS</strong> untuk melanjutkan.</p>' + UI.isian({ n: 'konfirmasi', l: 'Konfirmasi', wajib: true }), function (d) {
          return API.panggil('naikKelas', { konfirmasi: d.konfirmasi, ta_asal: asal }, 'Memproses kenaikan kelas').then(function (h) {
            UI.toast(h.naik + ' siswa naik, ' + h.lulus + ' lulus. Tahun ajaran ' + h.tahun_baru + ' aktif.');
            return Aplikasi.muatSekolah().then(function () { mulai(); });
          });
        }, 'Proses');
      };
    }
  }

  return { mulai: mulai };
})();
