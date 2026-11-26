var Landing = (function () {
  var lepas = function () {};
  var reduksi = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Satu hari anak mengikuti 7 KAIH: [jam, judul, teks, warna langit atas, warna langit bawah, teks terang]
  var HARI = [
    ['05.00', 'Bangun Pagi', 'Hari dimulai saat langit masih jingga. Anak belajar menyambut pagi dengan segar.', '#f6b48f', '#fde3b8', 0],
    ['05.15', 'Beribadah', 'Berwudu, shalat bersama Ayah dan Bunda, lalu membaca doa.', '#f7cfa0', '#fff0cc', 0],
    ['06.00', 'Berolahraga', 'Badan digerakkan: melompat, berlari, atau berjalan pagi.', '#a9d8ee', '#e5f5ea', 0],
    ['07.00', 'Makan Sehat dan Bergizi', 'Sarapan dengan lauk, sayur, dan buah sebelum berangkat.', '#8fcdee', '#dcf1fb', 0],
    ['09.00', 'Gemar Belajar', 'Di sekolah: huruf, Iqra, surat pendek, dan banyak bertanya.', '#7fc3ee', '#d3ecfa', 0],
    ['16.00', 'Bermasyarakat', 'Sore hari bermain dengan teman, memberi salam kepada tetangga.', '#e99a6b', '#fbd59b', 0],
    ['20.00', 'Tidur Cepat', 'Gawai disimpan, doa dibaca, dan anak beristirahat cukup.', '#122044', '#33487a', 1]
  ];

  function bintang(cx, cy, r) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var a = Math.PI / 5 * i - Math.PI / 2, j = i % 2 ? r * 0.42 : r;
      p.push((cx + j * Math.cos(a)).toFixed(1) + ',' + (cy + j * Math.sin(a)).toFixed(1));
    }
    return '<polygon points="' + p.join(' ') + '"/>';
  }

  function pohon(x, y, s, warna) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><rect x="-5" y="-30" width="10" height="42" rx="4" fill="#8a6242"/>' +
      '<ellipse cy="-62" rx="34" ry="46" fill="' + warna + '"/></g>';
  }

  function bunga(x, y, warna, i) {
    return '<g transform="translate(' + x + ' ' + y + ')"><g class="mekar" style="--i:' + i + '">' +
      [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cy="-9" rx="6" ry="9" fill="' + warna + '" transform="rotate(' + a + ')"/>'; }).join('') +
      '<circle r="5" fill="#f2b632"/></g></g>';
  }

  function anak(x, y, baju, kerudung, i) {
    return '<g transform="translate(' + x + ' ' + y + ')"><g class="anak" style="--i:' + i + '" tabindex="-1">' +
      '<path d="M-24 62 Q-20 8 0 8 Q20 8 24 62Z" fill="' + baju + '"/>' +
      (kerudung ? '<path d="M-29 20 Q-30 -34 0 -34 Q30 -34 29 20 Q0 36 -29 20Z" fill="' + kerudung + '"/>' : '') +
      '<circle cy="-8" r="20" fill="#f6cba4"/>' +
      (kerudung ? '' : '<path d="M-21 -10 Q-18 -34 2 -30 Q22 -30 21 -8 Q8 -20 -21 -10Z" fill="#3b2a20"/><path d="M-17 -25 Q0 -42 18 -24Z" fill="#176238"/>') +
      '<circle cx="-7" cy="-7" r="2.4" fill="#33241c"/><circle cx="7" cy="-7" r="2.4" fill="#33241c"/>' +
      '<circle cx="-12" cy="0" r="4" fill="#ee9b8f"/><circle cx="12" cy="0" r="4" fill="#ee9b8f"/>' +
      '<path d="M-6 1 Q0 8 6 1" fill="none" stroke="#33241c" stroke-width="2" stroke-linecap="round"/>' +
      '<path class="lambai" d="M17 22 Q34 14 36 -4" fill="none" stroke="' + baju + '" stroke-width="9" stroke-linecap="round"/></g></g>';
  }

  function pemandangan() {
    return '<svg class="pemandangan" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<g class="lapis" data-d="0.35"><g class="bulan-sabit" fill="#176238"><path d="M978 78a74 74 0 1 0 62 112a60 60 0 1 1-62-112Z"/>' +
      bintang(1058, 150, 13) + bintang(1090, 168, 13) + bintang(1048, 184, 13) + bintang(1080, 204, 13) + bintang(1038, 218, 13) + '</g></g>' +
      '<g class="lapis awan" data-d="0.55" fill="#fffdf5"><path d="M90 190q8-44 52-38q22-40 66-14q46-8 46 34q30 6 22 30H92q-28-4-2-12Z"/>' +
      '<path d="M760 120q6-30 36-26q18-28 46-8q34-4 32 24q22 4 16 20H764q-22-2-4-10Z"/></g>' +
      '<g class="lapis" data-d="0.3"><path d="M0 430Q210 320 470 410T900 390T1200 380V640H0Z" fill="#bcd9a4"/>' +
      pohon(1060, 400, 1.35, '#4f8f5b') + pohon(990, 415, 0.85, '#6fa86a') + '</g>' +
      '<g class="lapis" data-d="0.15"><path d="M0 500Q300 410 640 480T1200 455V640H0Z" fill="#93c27e"/>' +
      '<g transform="translate(790 352)"><rect width="170" height="118" fill="#fff6dc"/><path d="M-18 6L85-62L188 6Z" fill="#c9603f"/>' +
      '<path d="M66 118V80a19 19 0 0 1 38 0v38Z" fill="#176238"/><rect x="18" y="38" width="30" height="30" rx="14" fill="#8fcbe8"/>' +
      '<rect x="122" y="38" width="30" height="30" rx="14" fill="#8fcbe8"/><path d="M78 -28a14 14 0 1 0 14 22a11 11 0 1 1-14-22Z" fill="#fff6dc"/></g></g>' +
      '<g class="lapis" data-d="0"><path d="M0 560Q320 500 700 552T1200 530V640H0Z" fill="#5f9e63"/>' +
      anak(520, 500, '#e2735d', '#f4c04f', 0) + anak(600, 510, '#3f7fb5', '', 1) + anak(680, 498, '#8d5a97', '#f2a7b5', 2) +
      [[60, 590, '#f2a7b5'], [170, 612, '#fffdf5'], [300, 580, '#f4c04f'], [430, 605, '#e2735d'], [790, 592, '#fffdf5'], [900, 610, '#f2a7b5'], [1040, 580, '#f4c04f'], [1140, 606, '#fffdf5']]
        .map(function (b, i) { return bunga(b[0], b[1], b[2], i); }).join('') + '</g></svg>';
  }

  function render(sekolah) {
    document.getElementById('app').innerHTML =
      '<header class="atas"><a class="merek" href="#isi"><img src="assets/lambang.png" alt="Lambang Al-Washliyah" width="44" height="41"><span>' + UI.esc(sekolah.nama_sekolah) + '</span></a>' +
      '<button class="tbl" data-masuk>Masuk</button></header>' +
      '<main id="isi" class="beranda">' +
      '<section class="sampul"><div class="sapa"><p class="salam" lang="ar" dir="rtl">السَّلَامُ عَلَيْكُمْ</p>' +
      '<h1>Tumbuh bersama, tercatat setiap bulan</h1>' +
      '<p>Laporan perkembangan anak ' + UI.esc(sekolah.nama_sekolah) + (sekolah.nama_ta ? ', tahun ajaran ' + UI.esc(sekolah.nama_ta) : '') +
      '. Ayah, Bunda, dan guru membaca cerita yang sama tentang si kecil.</p>' +
      '<div class="aksi-sampul"><button class="tbl besar" data-masuk>Buka laporan anak</button><a class="tbl besar polos" href="#sehari" data-gulir>Lihat sehari si kecil</a></div></div>' +
      pemandangan() + '</section>' +
      '<section class="sehari" id="sehari" aria-labelledby="j-sehari"><div class="layar">' +
      '<div class="langit" aria-hidden="true"><i class="surya"></i><i class="rembulan"></i><i class="kelip"></i><i class="bukit"></i></div>' +
      '<div class="isi-hari"><h2 id="j-sehari">Sehari bersama 7 Kebiasaan Anak Indonesia Hebat</h2><div class="panggung">' +
      HARI.map(function (h, i) {
        return '<article class="momen' + (i ? '' : ' aktif') + '"><time>' + h[0] + '</time><h3>' + h[1] + '</h3><p>' + h[2] + '</p></article>';
      }).join('') + '</div><div class="jejak">' +
      HARI.map(function (h, i) { return '<button aria-label="' + h[1] + '" data-momen="' + i + '"><span>' + h[0] + '</span></button>'; }).join('') +
      '</div></div></div></section>' +
      '<section class="isi-laporan muncul"><h2>Isi laporan setiap bulan</h2><dl>' +
      '<div><dt>Pertumbuhan fisik</dt><dd>Berat, tinggi, lingkar kepala, dan lingkar lengan atas, lengkap dengan grafik.</dd></div>' +
      '<div><dt>Literasi</dt><dd>Huruf dan suku kata di Kelas A. Target pribadi tiap anak di Kelas B.</dd></div>' +
      '<div><dt>Keagamaan</dt><dd>Surat pendek, doa harian, hijaiyah dan Iqra, serta hadits pendek.</dd></div>' +
      '<div><dt>Kebiasaan di rumah</dt><dd>Isian 7 KAIH, satu foto kegiatan, dan obrolan antara orang tua dan guru.</dd></div></dl>' +
      '<button class="tbl besar" data-masuk>Masuk sebagai orang tua, guru, atau admin</button></section></main>' +
      '<footer class="kaki"><img src="assets/logo.png" alt="Al Jam\'iyatul Washliyah" width="110" height="116" loading="lazy"><div><strong>' + UI.esc(sekolah.nama_sekolah) + '</strong><p>' +
      UI.esc(sekolah.alamat_sekolah) + '</p><p>' + UI.esc(sekolah.kontak_sekolah) + '</p></div></footer>';
    animasi();
  }

  function animasi() {
    var sampul = document.querySelector('.sampul');
    var bagian = document.querySelector('.sehari');
    var layar = bagian.querySelector('.layar');
    var momen = bagian.querySelectorAll('.momen');
    var titik = bagian.querySelectorAll('[data-momen]');
    var lapis = sampul.querySelectorAll('.lapis');
    var antre = false, kini = -1;

    function gulir() {
      antre = false;
      var y = window.scrollY;
      if (!reduksi.matches && y < sampul.offsetHeight) {
        lapis.forEach(function (l) { l.style.transform = 'translateY(' + (y * Number(l.dataset.d)).toFixed(1) + 'px)'; });
      }
      var r = bagian.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      layar.style.setProperty('--p', p.toFixed(3));
      var i = Math.min(HARI.length - 1, Math.floor(p * HARI.length));
      if (i === kini) return;
      kini = i;
      layar.style.setProperty('--atas', HARI[i][3]);
      layar.style.setProperty('--bawah', HARI[i][4]);
      layar.classList.toggle('malam', !!HARI[i][5]);
      momen.forEach(function (m, n) { m.classList.toggle('aktif', n === i); m.setAttribute('aria-hidden', n !== i); });
      titik.forEach(function (t, n) { t.setAttribute('aria-current', n === i ? 'step' : 'false'); });
    }
    // Layar sempit memakai bingkai yang lebih rapat supaya sekolah dan bulan sabit tetap terlihat.
    var lebar = window.matchMedia('(min-width: 1000px)');
    function bingkai() {
      sampul.querySelector('.pemandangan').setAttribute('viewBox', lebar.matches ? '0 0 1200 640' : '450 60 550 580');
      sampul.querySelector('.bulan-sabit').setAttribute('transform', lebar.matches ? '' : 'translate(-424 88)');
    }
    lebar.onchange = bingkai;
    bingkai();
    function saatGulir() { if (!antre) { antre = true; requestAnimationFrame(gulir); } }

    titik.forEach(function (t) {
      t.onclick = function () {
        var jarak = bagian.offsetHeight - window.innerHeight;
        window.scrollTo({ top: bagian.offsetTop + jarak * (Number(t.dataset.momen) + 0.5) / HARI.length, behavior: reduksi.matches ? 'auto' : 'smooth' });
      };
    });
    document.querySelector('[data-gulir]').onclick = function (e) {
      e.preventDefault();
      bagian.scrollIntoView({ behavior: reduksi.matches ? 'auto' : 'smooth' });
    };

    // Lapisan bergeser halus mengikuti penunjuk, hanya pada perangkat dengan mouse.
    if (!reduksi.matches && window.matchMedia('(pointer: fine)').matches) {
      sampul.onpointermove = function (e) {
        sampul.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5).toFixed(3));
      };
    }

    var pengamat = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('terlihat'); pengamat.unobserve(e.target); } });
    }, { threshold: 0.2 });
    document.querySelectorAll('.muncul').forEach(function (n) { pengamat.observe(n); });

    window.addEventListener('scroll', saatGulir, { passive: true });
    window.addEventListener('resize', saatGulir);
    gulir();
    lepas = function () {
      window.removeEventListener('scroll', saatGulir);
      window.removeEventListener('resize', saatGulir);
      pengamat.disconnect();
    };
  }

  return { render: render, lepas: function () { lepas(); lepas = function () {}; } };
})();
