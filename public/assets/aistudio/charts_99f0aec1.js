var Grafik = (function () {
  var aktif = [];
  var METRIK = [['bb_kg', 'Berat badan (kg)', '#1d6b3a'], ['tb_cm', 'Tinggi badan (cm)', '#b4531f'],
    ['lk_cm', 'Lingkar kepala (cm)', '#2f5f9e'], ['lila_cm', 'Lingkar lengan atas (cm)', '#8a4a86']];

  function tabel(data) {
    return '<div class="geser"><table><thead><tr><th>Bulan</th><th>Usia</th><th>BB</th><th>TB</th><th>LK</th><th>LiLA</th><th>Status</th></tr></thead><tbody>' +
      data.map(function (a) {
        return '<tr><td>' + UI.esc(UI.bulan(a.periode_bulan)) + '</td><td>' + UI.esc(a.usia_bulan) + ' bln</td><td>' + UI.esc(a.bb_kg) +
          '</td><td>' + UI.esc(a.tb_cm) + '</td><td>' + UI.esc(a.lk_cm) + '</td><td>' + UI.esc(a.lila_cm) + '</td><td>' + UI.esc(a.status_gizi_otomatis) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function pasang(wadah, data) {
    aktif.forEach(function (c) { c.destroy(); });
    aktif = [];
    if (!data.length) { wadah.innerHTML = UI.kosong('Belum ada data pengukuran. Grafik muncul setelah guru mengisi bulan pertama.'); return; }
    var adaChart = typeof Chart !== 'undefined';
    wadah.innerHTML = (adaChart ? '<div class="grafik-kisi">' + METRIK.map(function (m) {
      return '<figure><figcaption>' + m[1] + '</figcaption><div class="kanvas"><canvas data-m="' + m[0] + '" aria-label="' + m[1] + ' per bulan"></canvas></div></figure>';
    }).join('') + '</div>' : '<p class="kosong">Grafik tidak bisa dimuat. Angka lengkap ada pada tabel di bawah.</p>') + tabel(data);
    if (!adaChart) return;
    METRIK.forEach(function (m) {
      aktif.push(new Chart(wadah.querySelector('[data-m="' + m[0] + '"]'), {
        type: 'line',
        data: {
          labels: data.map(function (a) { return UI.bulan(a.periode_bulan).slice(0, 3) + ' ' + a.periode_bulan.slice(2, 4); }),
          datasets: [{ data: data.map(function (a) { return Number(a[m[0]]); }), borderColor: m[2], backgroundColor: m[2], tension: 0.3, pointRadius: 5 }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grace: '15%' } } }
      }));
    });
  }

  return { pasang: pasang };
})();
