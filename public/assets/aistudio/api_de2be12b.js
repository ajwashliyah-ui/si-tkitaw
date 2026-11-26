var API = (function () {
  var URL_API = (window.APP_CONFIG && window.APP_CONFIG.GAS_WEBAPP_URL) || '';
  var demo = !URL_API;
  var KUNCI_DEMO = 'tk_demo_db_v1';
  var backend;

  // localStorage bisa menolak akses (mode privat), maka selalu dibungkus.
  var toko = {
    memori: {},
    ambil: function (k) { try { return localStorage.getItem(k); } catch (e) { return this.memori[k] || null; } },
    simpan: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { this.memori[k] = v; } },
    hapus: function (k) { try { localStorage.removeItem(k); } catch (e) { delete this.memori[k]; } }
  };

  function kirimDemo(isi) {
    if (!backend) backend = buatBackendDemo(JSON.parse(toko.ambil(KUNCI_DEMO) || 'null'));
    var jawab = JSON.parse(backend.doPost({ postData: { contents: isi } }).getContent());
    toko.simpan(KUNCI_DEMO, JSON.stringify(backend.db));
    return new Promise(function (r) { setTimeout(function () { r(jawab); }, 120); });
  }

  function fotoDemo(url) {
    var id = (/id=([^&]+)/.exec(url) || [])[1];
    var f = backend && backend.db.files[id];
    return f ? 'data:image/jpeg;base64,' + f.data : url;
  }

  function panggil(action, payload, teks) {
    var isi = JSON.stringify({ action: action, token: toko.ambil('tk_token') || '', payload: payload || {} });
    UI.memuat(true, teks || 'Memuat data');
    var kirim = demo ? Promise.resolve().then(function () { return kirimDemo(isi); })
      : fetch(URL_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: isi })
        .then(function (r) { return r.json(); });
    return kirim.catch(function () {
      return { ok: false, error: 'Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.' };
    }).then(function (j) {
      UI.memuat(false);
      if (j.ok) return j.data;
      if (j.code === 'SESI') { toko.hapus('tk_token'); location.hash = ''; window.dispatchEvent(new Event('sesi-habis')); }
      UI.toast(j.error, 'gagal');
      throw new Error(j.error);
    });
  }

  return { panggil: panggil, toko: toko, demo: demo, foto: function (u) { return demo ? fotoDemo(u) : u; } };
})();
