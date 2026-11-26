var Aplikasi = (function () {
  var sekolah = { nama_sekolah: 'TK IT AL-WASHLIYAH', alamat_sekolah: '', kontak_sekolah: '', nama_ta: '' };
  var user = null;

  function formMasuk() {
    var akunDemo = API.demo ? '<fieldset class="demo"><legend>Mode demo, pilih akun contoh</legend>' +
      [['admin', 'Admin#123', 'Admin'], ['guru.a', 'Guru#123', 'Guru Kelas A'], ['guru.b', 'Guru#123', 'Guru Kelas B'], ['ortu.hasan', 'Ortu#123', 'Orang Tua Hasan'], ['ortu.zahra', 'Ortu#123', 'Orang Tua Zahra']]
        .map(function (a) { return '<button type="button" class="tbl polos kecil" data-u="' + a[0] + '" data-p="' + a[1] + '">' + a[2] + '</button>'; }).join('') + '</fieldset>' : '';
    UI.dialog('Masuk', akunDemo +
      UI.isian({ n: 'username', l: 'Username', wajib: true, attr: 'autocomplete="username" autocapitalize="none"' }) +
      UI.isian({ n: 'password', l: 'Password', t: 'password', wajib: true, attr: 'autocomplete="current-password"' }),
      function (d) {
        return API.panggil('login', d, 'Memeriksa akun').then(function (h) {
          API.toko.simpan('tk_token', h.token);
          buka(h.user);
        });
      }, 'Masuk');
    UI.el('dialog').querySelectorAll('[data-u]').forEach(function (b) {
      b.onclick = function () {
        var f = b.closest('form');
        f.username.value = b.dataset.u;
        f.password.value = b.dataset.p;
        f.requestSubmit();
      };
    });
  }

  function buka(u) {
    user = u;
    Landing.lepas();
    window.scrollTo(0, 0);
    ({ ADMIN: Admin, GURU: Guru, ORTU: Ortu })[u.role].mulai();
  }

  function beranda() {
    user = null;
    document.body.classList.remove('di-dalam');
    Landing.lepas();
    Landing.render(sekolah);
    document.querySelectorAll('[data-masuk]').forEach(function (b) { b.onclick = formMasuk; });
  }

  /** Kerangka halaman setelah masuk: menu samping di layar lebar, bilah bawah di HP. */
  function kerangka(menu, aktif, saatPilih) {
    document.body.classList.add('di-dalam');
    document.getElementById('app').innerHTML =
      '<header class="atas"><span class="merek"><img src="assets/lambang.png" alt="" width="44" height="41"><span>' + UI.esc(sekolah.nama_sekolah) +
      '<small>' + (sekolah.nama_ta ? 'Tahun ajaran ' + UI.esc(sekolah.nama_ta) : '') + '</small></span></span>' +
      '<div class="akun"><span>' + UI.esc(user.nama_lengkap) + '</span><button class="tbl polos kecil" id="b-sandi">Password</button><button class="tbl polos kecil" id="b-keluar">Keluar</button></div></header>' +
      '<div class="badan"><nav class="menu" aria-label="Menu utama">' + menu.map(function (m) {
        return '<button data-hal="' + m[0] + '"' + (m[0] === aktif ? ' aria-current="page"' : '') + '>' +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' + IKON[m[0]] + '</svg><span>' + m[1] + '</span></button>';
      }).join('') + '</nav><main id="isi" tabindex="-1"></main></div>';
    document.querySelectorAll('[data-hal]').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('[data-hal]').forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'page');
        saatPilih(b.dataset.hal);
        window.scrollTo(0, 0);
      };
    });
    UI.el('b-keluar').onclick = function () {
      API.panggil('logout', {}, 'Keluar').catch(function () {}).then(function () { API.toko.hapus('tk_token'); beranda(); });
    };
    UI.el('b-sandi').onclick = function () {
      UI.dialog('Ganti password', UI.isian({ n: 'lama', l: 'Password lama', t: 'password', wajib: true }) +
        UI.isian({ n: 'baru', l: 'Password baru (minimal 8 karakter)', t: 'password', wajib: true, attr: 'minlength="8"' }), function (d) {
        return API.panggil('changePassword', d, 'Menyimpan').then(function (h) { API.toko.simpan('tk_token', h.token); UI.toast('Password diganti'); });
      });
    };
  }

  var IKON = {
    tumbuh: '<path d="M4 20h16M6 16l4-5 3 3 5-7"/>',
    baca: '<path d="M3 5h6a3 3 0 013 3v11a3 3 0 00-3-2H3zM21 5h-6a3 3 0 00-3 3v11a3 3 0 013-2h6z"/>',
    agama: '<path d="M15 3a9 9 0 106 13 7 7 0 01-6-13z"/>',
    kaih: '<path d="M5 12l4 4L19 6M5 20h14"/>',
    ringkas: '<path d="M4 11l8-7 8 7v9H4z"/>',
    ulasan: '<path d="M4 5h16v11H10l-5 4v-4H4z"/>',
    rekap: '<path d="M4 4h16v16H4zM4 10h16M10 4v16"/>',
    akun: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 7 0 0116 0"/>',
    siswa: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2 20a6 5 0 0112 0M14 20a4 4 0 018 0"/>',
    master: '<path d="M5 6h14M5 12h14M5 18h9"/>',
    atur: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
  };

  function muatSekolah() {
    return API.panggil('publicInfo').then(function (s) { sekolah = s; }).catch(function () {});
  }

  window.addEventListener('sesi-habis', beranda);
  document.addEventListener('DOMContentLoaded', function () {
    muatSekolah().then(function () {
      if (!API.toko.ambil('tk_token')) return beranda();
      return API.panggil('me').then(buka).catch(beranda);
    });
  });

  return { kerangka: kerangka, muatSekolah: muatSekolah, sekolah: function () { return sekolah; }, user: function () { return user; } };
})();
