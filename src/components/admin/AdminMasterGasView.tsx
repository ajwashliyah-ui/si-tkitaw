import React, { useMemo, useState } from 'react';
import { Copy, Download, Database, CheckCircle2, FileCode2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateCodeGs, generateConfigJs, generateSetupGs } from '../../utils/gasExport';

type MasterTab = 'materi' | 'tips' | 'bank' | 'atp' | 'export';

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const AdminMasterGasView: React.FC = () => {
  const { db, updateDb, addToast } = useApp();
  const [tab, setTab] = useState<MasterTab>('export');
  const [atpFilter, setAtpFilter] = useState<'Semua' | 'Kelompok A' | 'Kelompok B'>('Semua');
  const [bankFilter, setBankFilter] = useState<'Semua' | 'Literasi' | 'Hijaiyah_Iqra'>('Semua');

  const filteredAtp = useMemo(
    () => db.masterAtp.filter((a) => atpFilter === 'Semua' || a.kelompok === atpFilter),
    [db.masterAtp, atpFilter]
  );

  const filteredBank = useMemo(
    () => db.bankMateriHarian.filter((b) => bankFilter === 'Semua' || b.bidang === bankFilter),
    [db.bankMateriHarian, bankFilter]
  );

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} disalin.`, 'success');
    } catch {
      addToast('Gagal menyalin otomatis, silakan unduh file.', 'error');
    }
  };

  const toggleMateriAktif = async (materiId: string) => {
    await updateDb((prev) => ({
      ...prev,
      masterMateri: prev.masterMateri.map((m) =>
        m.materi_id === materiId ? { ...m, aktif: !m.aktif } : m
      ),
    }));
  };

  const toggleTipsAktif = async (tipsId: string) => {
    await updateDb((prev) => ({
      ...prev,
      masterTips: prev.masterTips.map((t) =>
        t.tips_id === tipsId ? { ...t, aktif: !t.aktif } : t
      ),
    }));
  };

  const toggleBankAktif = async (kode: string) => {
    await updateDb((prev) => ({
      ...prev,
      bankMateriHarian: prev.bankMateriHarian.map((b) =>
        b.kode_item === kode ? { ...b, aktif: !b.aktif } : b
      ),
    }));
  };

  const toggleAtpAktif = async (uid: string) => {
    await updateDb((prev) => ({
      ...prev,
      masterAtp: prev.masterAtp.map((a) =>
        a.atp_uid === uid ? { ...a, aktif: !a.aktif } : a
      ),
    }));
  };

  const setupGs = useMemo(() => generateSetupGs(db), [db]);
  const codeGs = useMemo(() => generateCodeGs(), []);
  const configJs = useMemo(
    () => generateConfigJs(db.pengaturanSekolah.gas_webapp_url),
    [db.pengaturanSekolah.gas_webapp_url]
  );
  const fullJson = useMemo(() => JSON.stringify(db, null, 2), [db]);

  return (
    <div className="halaman">
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Master materi & ekspor GAS</h1>
        <p className="text-sm text-[#55665a] mt-1">
          Kelola materi sekolah, tips Ayah & Bunda, serta unduh file siap pasang untuk Google Sheets.
        </p>
      </div>

      <div className="tab-bar mb-5" role="tablist">
        {[
          { id: 'export', label: 'Ekspor GAS & JSON' },
          { id: 'materi', label: `Materi (${db.masterMateri.length})` },
          { id: 'tips', label: `Tips (${db.masterTips.length})` },
          { id: 'bank', label: `Bank Harian (${db.bankMateriHarian.length})` },
          { id: 'atp', label: `Master ATP (${db.masterAtp.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id as MasterTab)}
            className={`tab-btn ${tab === item.id ? 'aktif' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'export' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {[
              {
                title: '1. Setup.gs (Pembentuk Google Sheets)',
                desc: 'Membuat otomatis 18+ sheet, folder Google Drive foto KAIH & hasil karya, serta mengisi seluruh data master awal.',
                filename: 'Setup.gs',
                content: setupGs,
                mime: 'text/plain;charset=utf-8',
              },
              {
                title: '2. Code.gs (Web App API GAS)',
                desc: 'Endpoint doPost anti-CORS, autentikasi SHA-256 + token, unggah foto base64 ke Drive, dan cetak rapor bulanan.',
                filename: 'Code.gs',
                content: codeGs,
                mime: 'text/plain;charset=utf-8',
              },
              {
                title: '3. config.js (Konfigurasi GitHub Pages)',
                desc: 'Menyimpan URL Web App GAS terpusat untuk tampilan statis di GitHub Pages.',
                filename: 'config.js',
                content: configJs,
                mime: 'application/javascript;charset=utf-8',
              },
              {
                title: '4. database.json (Cadangan Data Sekolah)',
                desc: 'Salinan penuh seluruh tabel data sekolah dalam format JSON untuk arsip offline.',
                filename: 'tk-it-alwashliyah-database.json',
                content: fullJson,
                mime: 'application/json;charset=utf-8',
              },
            ].map((item) => (
              <section key={item.filename} className="kartu mb-0 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#0f4527]">
                    <FileCode2 className="w-4 h-4 shrink-0" />
                    <h2 className="text-base m-0">{item.title}</h2>
                  </div>
                  <p className="mt-2 text-xs text-[#55665a] leading-relaxed">{item.desc}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#d9d5c0]">
                  <button
                    type="button"
                    onClick={() => downloadTextFile(item.filename, item.content, item.mime)}
                    className="tbl kecil"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh {item.filename}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(item.filename, item.content)}
                    className="tbl polos kecil"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </button>
                </div>
              </section>
            ))}
          </div>

          <section className="kartu space-y-3">
            <div className="flex items-center gap-2 text-[#0f4527]">
              <Database className="w-4 h-4" />
              <h3 className="text-base m-0">Langkah pasang ke Google Sheets</h3>
            </div>
            <ol className="space-y-1.5 text-sm text-[#1d2b21] list-decimal list-inside">
              <li>
                Buat Google Spreadsheet baru lalu buka <strong>Extensions → Apps Script</strong>.
              </li>
              <li>
                Tempel isi <strong>Setup.gs</strong> dan jalankan{' '}
                <code className="font-mono-tabular text-[#0f4527]">setupDatabase()</code> satu kali.
              </li>
              <li>
                Tempel isi <strong>Code.gs</strong>, pilih <strong>Deploy → New Deployment → Web App</strong>{' '}
                (Execute as: <em>Me</em>, Who has access: <em>Anyone</em>), lalu salin URL-nya.
              </li>
              <li>
                Masukkan URL tersebut di menu <strong>Sekolah</strong> atau perbarui file{' '}
                <strong>config.js</strong>.
              </li>
            </ol>
          </section>
        </div>
      )}

      {tab === 'materi' && (
        <section className="kartu">
          <div className="geser max-h-[540px]">
            <table className="tabel-bersih">
              <thead className="sticky top-0">
                <tr>
                  <th>Kode</th>
                  <th>Kategori</th>
                  <th>Nama materi</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {db.masterMateri.map((m) => (
                  <tr key={m.materi_id}>
                    <td className="font-mono-tabular text-xs text-[#55665a]">{m.materi_id}</td>
                    <td className="font-semibold text-[#1d2b21]">{m.kategori}</td>
                    <td>{m.nama_materi}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleMateriAktif(m.materi_id)}
                        className={`tbl polos kecil ${m.aktif ? '' : 'opacity-60'}`}
                      >
                        {m.aktif ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'tips' && (
        <section className="kartu">
          <div className="geser max-h-[540px]">
            <table className="tabel-bersih">
              <thead className="sticky top-0">
                <tr>
                  <th>Kategori</th>
                  <th>Pemicu</th>
                  <th>Judul & isi tips Ayah & Bunda</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {db.masterTips.map((t) => (
                  <tr key={t.tips_id}>
                    <td className="font-bold text-[#0f4527] whitespace-nowrap">{t.kategori_pemicu}</td>
                    <td className="font-mono-tabular text-xs text-[#55665a]">{t.kondisi_pemicu}</td>
                    <td>
                      <p className="font-bold text-[#1d2b21]">{t.judul_tips}</p>
                      <p className="text-xs text-[#55665a] mt-0.5">{t.isi_tips_ayah_bunda}</p>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleTipsAktif(t.tips_id)}
                        className={`tbl polos kecil ${t.aktif ? '' : 'opacity-60'}`}
                      >
                        {t.aktif ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'bank' && (
        <section className="kartu">
          <div className="judul-baris">
            <div className="tab-bar">
              {(['Semua', 'Literasi', 'Hijaiyah_Iqra'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setBankFilter(f)}
                  className={`tab-btn ${bankFilter === f ? 'aktif' : ''}`}
                >
                  {f === 'Hijaiyah_Iqra' ? 'Hijaiyah & Iqra' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="geser max-h-[540px]">
            <table className="tabel-bersih">
              <thead className="sticky top-0">
                <tr>
                  <th>Kode & level</th>
                  <th>Kelompok materi</th>
                  <th>Item pilihan</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBank.map((b) => (
                  <tr key={b.kode_item}>
                    <td>
                      <p className="font-mono-tabular font-bold text-[#1d2b21]">{b.kode_item}</p>
                      <p className="text-xs text-[#55665a]">{b.level_track}</p>
                    </td>
                    <td>
                      <p className="font-bold text-[#1d2b21]">{b.label_kelompok}</p>
                      <p className="text-xs text-[#55665a]">{b.kategori}</p>
                    </td>
                    <td className="text-xs text-[#55665a] max-w-md">
                      {b.isi_item.split('|').join(' · ')}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleBankAktif(b.kode_item)}
                        className={`tbl polos kecil ${b.aktif ? '' : 'opacity-60'}`}
                      >
                        {b.aktif ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'atp' && (
        <section className="kartu">
          <div className="judul-baris">
            <div className="tab-bar">
              {(['Semua', 'Kelompok A', 'Kelompok B'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAtpFilter(k)}
                  className={`tab-btn ${atpFilter === k ? 'aktif' : ''}`}
                >
                  {k}
                </button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0f4527]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {filteredAtp.length} indikator ATP
            </span>
          </div>

          <div className="geser max-h-[540px]">
            <table className="tabel-bersih">
              <thead className="sticky top-0">
                <tr>
                  <th>Kode & kelompok</th>
                  <th>Elemen & semester</th>
                  <th>Tujuan pembelajaran</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAtp.map((a) => (
                  <tr key={a.atp_uid}>
                    <td>
                      <p className="font-mono-tabular font-bold text-[#1d2b21]">{a.kode_atp}</p>
                      <p className="text-xs text-[#55665a]">{a.kelompok}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-[#1d2b21]">{a.elemen}</p>
                      <p className="text-xs text-[#55665a]">{a.semester_target}</p>
                    </td>
                    <td className="text-xs text-[#1d2b21] max-w-md">{a.tujuan_pembelajaran}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleAtpAktif(a.atp_uid)}
                        className={`tbl polos kecil ${a.aktif ? '' : 'opacity-60'}`}
                      >
                        {a.aktif ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
