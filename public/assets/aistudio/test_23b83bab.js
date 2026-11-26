// Uji backend di Node dengan layanan Apps Script tiruan: node tools/test.js
const fs = require('fs'), assert = require('assert');
if (!globalThis.crypto) globalThis.crypto = require('crypto').webcrypto;
const buat = new Function(fs.readFileSync(__dirname + '/../js/demo-backend.js', 'utf8') + ';return {buatBackendDemo, buatShim};')();
const api = buat.buatBackendDemo();
const call = (action, payload, token) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify({ action, payload, token }) } }).getContent());
const ok = (...a) => { const r = call(...a); assert(r.ok, a[0] + ': ' + r.error); return r.data; };
const no = (...a) => assert(!call(...a).ok, 'harus ditolak: ' + a[0] + ' ' + JSON.stringify(a[1]));

const sha = buat.buatShim().Utilities.computeDigest(1, 'abc').map(b => b.toString(16).padStart(2, '0')).join('');
assert.strictEqual(sha, require('crypto').createHash('sha256').update('abc').digest('hex'));

const S = api.db.sheets;
assert.strictEqual(Object.keys(S).length, 12);
assert.strictEqual(S.Master_Materi.length - 1, 45);
assert.strictEqual(S.Master_Tips.length - 1, 34);
assert.strictEqual(new Set(S.Master_Tips.slice(1).map(r => r[2])).size, 34);

const login = (u, p) => ok('login', { username: u, password: p }).token;
const admin = login('admin', 'Admin#123'), ga = login('guru.a', 'Guru#123'), gb = login('guru.b', 'Guru#123');
const oh = login('ortu.hasan', 'Ortu#123'), oz = login('ortu.zahra', 'Ortu#123');
const periode = ok('publicInfo').periode;

no('adminData', {}, oz);
no('getReport', { siswa_id: 'S002' }, oh);
no('getReport', { siswa_id: 'S002' }, ga);
no('saveAntro', { siswa_id: 'S001', periode, bb_kg: 17, tb_cm: 105, lk_cm: 50, lila_cm: 16 }, oh);
no('listSiswa', {}, 'token-palsu');
no('constructor', {});

let r = ok('getReport', { siswa_id: 'S002', periode }, oz);
assert.deepStrictEqual(r.tips.map(t => t.kondisi_pemicu), ['ANTRO_TREN_STAGNAN', 'LIT_B_TRACK2_HIGH', 'KAIH_TIDUR_CEPAT_LOW', 'AGAMA_IQRA_LOW']);

assert.strictEqual(ok('saveAntro', { siswa_id: 'S001', periode, bb_kg: '11,5', tb_cm: 95, lk_cm: 50, lila_cm: 15 }, ga).kode, 'ANTRO_TB_PENDEK');
no('saveAntro', { siswa_id: 'S001', periode: '2099-01', bb_kg: 17, tb_cm: 105, lk_cm: 50, lila_cm: 16 }, ga);
ok('saveLiterasi', { siswa_id: 'S002', periode, track_level_dipilih: 'KUSTOM', target_kustom: '=1+1', nilai_dasar: 'BSH', nilai_lanjutan: 'BSH' }, gb);
ok('saveAgama', { siswa_id: 'S001', periode, materi_id: 'M001', status_progres: 'Menirukan' }, ga);
const kaih = { siswa_id: 'S001', periode, foto_base64: 'data:image/jpeg;base64,AAAA' };
['bangun_pagi','beribadah','berolahraga','makan_sehat','gemar_belajar','bermasyarakat','tidur_cepat'].forEach(a => kaih[a] = 'Sudah Terbiasa');
ok('saveKaih', kaih, oh);
ok('saveKaih', kaih, oh);
assert.deepStrictEqual(Object.values(api.db.files).map(f => f.trashed), [true, false]);
ok('addUlasan', { siswa_id: 'S001', ta_id: 'TA2026', periode, isi_pesan: 'Baik, Bunda.' }, ga);
ok('rekap', { periode }, admin);
ok('saveUser', { username: 'baru', password: 'password1', role: 'ORTU', nama_lengkap: 'Uji', status_aktif: 'YA' }, admin);

no('naikKelas', { konfirmasi: 'NAIK KELAS', ta_asal: 'salah' }, admin);
const h = ok('naikKelas', { konfirmasi: 'NAIK KELAS', ta_asal: 'TA2026' }, admin);
assert.deepStrictEqual([h.naik, h.lulus], [1, 1]);
no('naikKelas', { konfirmasi: 'NAIK KELAS', ta_asal: 'TA2026' }, admin);
r = ok('getReport', { siswa_id: 'S001', ta_id: 'TA2026', periode }, oh);
assert(r.arsip && r.antro.length === 3 && r.siswa.kelas_aktif === 'Kelas B');
no('addUlasan', { siswa_id: 'S001', ta_id: 'TA2026', periode, isi_pesan: 'x' }, oh);

const t = ok('changePassword', { lama: 'Ortu#123', baru: 'rahasia-baru' }, oh).token;
no('me', {}, oh); ok('me', {}, t);
for (let i = 0; i < 5; i++) no('login', { username: 'guru.a', password: 'x' });
no('login', { username: 'guru.a', password: 'Guru#123' });
console.log('Semua uji backend lulus');
