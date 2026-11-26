var UI = (function () {
  var el = function (id) { return document.getElementById(id); };
  var timerToast, sibuk = 0;

  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(pesan, jenis) {
    var t = el('toast');
    t.textContent = pesan;
    t.className = 'tampil ' + (jenis || '');
    clearTimeout(timerToast);
    timerToast = setTimeout(function () { t.className = ''; }, jenis === 'gagal' ? 6000 : 3200);
  }

  function memuat(aktif, teks) {
    sibuk = Math.max(0, sibuk + (aktif ? 1 : -1));
    if (teks) el('memuat-teks').textContent = teks;
    el('memuat').hidden = sibuk === 0;
  }

  function opsi(daftar, terpilih) {
    return daftar.map(function (d) {
      var v = Array.isArray(d) ? d[0] : d, l = Array.isArray(d) ? d[1] : d;
      return '<option value="' + esc(v) + '"' + (v === terpilih ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }

  // tipe: text, password, date, number, month, textarea, atau array pilihan
  function isian(f, nilai) {
    var v = nilai === undefined || nilai === null ? '' : nilai;
    var attr = ' name="' + f.n + '"' + (f.wajib ? ' required' : '') + (f.attr ? ' ' + f.attr : '');
    var kontrol = Array.isArray(f.t) ? '<select' + attr + '>' + opsi(f.t, v) + '</select>'
      : f.t === 'textarea' ? '<textarea rows="3" maxlength="1000"' + attr + '>' + esc(v) + '</textarea>'
      : '<input type="' + (f.t || 'text') + '" value="' + esc(v) + '"' + attr + '>';
    return '<label class="isian"><span>' + esc(f.l) + '</span>' + kontrol + '</label>';
  }

  function dataForm(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = v; });
    return o;
  }

  function dialog(judul, isi, saatKirim, labelKirim) {
    var d = el('dialog');
    d.innerHTML = '<form><h2>' + esc(judul) + '</h2>' + isi +
      '<div class="aksi"><button type="button" class="tbl polos" data-tutup>Batal</button>' +
      '<button class="tbl">' + esc(labelKirim || 'Simpan') + '</button></div></form>';
    d.querySelector('[data-tutup]').onclick = function () { d.close(); };
    d.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      var tombol = e.target.querySelector('button.tbl:not(.polos)');
      tombol.disabled = true;
      Promise.resolve(saatKirim(dataForm(e.target), e.target))
        .then(function () { d.close(); })
        .catch(function () {})
        .then(function () { tombol.disabled = false; });
    };
    d.showModal();
  }

  var namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function bulan(p) {
    var x = String(p).split('-');
    return namaBulan[Number(x[1]) - 1] + ' ' + x[0];
  }

  function kosong(teks) { return '<p class="kosong">' + esc(teks) + '</p>'; }

  return { el: el, esc: esc, toast: toast, memuat: memuat, opsi: opsi, isian: isian, dataForm: dataForm, dialog: dialog, bulan: bulan, kosong: kosong };
})();
