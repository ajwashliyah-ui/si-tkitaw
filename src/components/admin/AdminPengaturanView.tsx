import React, { useEffect, useState } from 'react';
import {
  Building2,
  RotateCcw,
  Save,
  AlertTriangle,
  Sheet,
  PlugZap,
  UploadCloud,
  DownloadCloud,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PengaturanSekolah, SemesterType } from '../../types';
import { GoogleSheetsDirectPanel } from './GoogleSheetsDirectPanel';

export const AdminPengaturanView: React.FC = () => {
  const {
    db,
    updateDb,
    resetDemoDatabase,
    startCleanSchool,
    syncStatus,
    testSheetsConnection,
    pushToSheets,
    pullFromSheets,
    triggerCelebration,
  } = useApp();

  const [form, setForm] = useState<PengaturanSekolah>(() => ({ ...db.pengaturanSekolah }));
  const [showSyncKey, setShowSyncKey] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmPull, setConfirmPull] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setForm({ ...db.pengaturanSekolah });
  }, [db.pengaturanSekolah]);

  const buildCleanedForm = (): PengaturanSekolah => ({
    ...form,
    nama_sekolah: form.nama_sekolah.trim(),
    npsn: form.npsn.trim(),
    alamat_sekolah: form.alamat_sekolah.trim(),
    kontak_sekolah: form.kontak_sekolah.trim(),
    kepala_sekolah: form.kepala_sekolah.trim(),
    tahun_ajaran_aktif: form.tahun_ajaran_aktif.trim(),
    folder_drive_id: form.folder_drive_id.trim(),
    gas_webapp_url: form.gas_webapp_url.trim(),
    gas_sync_key: (form.gas_sync_key || 'WASHLIYAH_SYNC_2026').trim(),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_sekolah.trim()) return;
    const cleaned = buildCleanedForm();
    await updateDb(
      (prev) => ({
        ...prev,
        pengaturanSekolah: cleaned,
      }),
      'Pengaturan sekolah tersimpan.'
    );
    triggerCelebration('Pengaturan sekolah tersimpan!');
  };

  const handleSaveAndTestSheets = async () => {
    const cleaned = buildCleanedForm();
    setTestResultMsg(null);
    setTestingConn(true);
    await updateDb((prev) => ({
      ...prev,
      pengaturanSekolah: cleaned,
    }));
    const res = await testSheetsConnection(cleaned.gas_webapp_url, cleaned.gas_sync_key);
    setTestingConn(false);
    setTestResultMsg({ ok: res.ok, text: res.message });
    if (res.ok) {
      triggerCelebration('Google Sheets terhubung!');
    }
  };

  const handleConfirmClean = async () => {
    await startCleanSchool();
    setConfirmClean(false);
    triggerCelebration('Sekolah baru siap diisi!');
  };

  const handleConfirmReset = async () => {
    await resetDemoDatabase();
    setConfirmReset(false);
  };

  return (
    <div className="halaman space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Pengaturan sekolah</h1>
        <p className="text-sm text-[#55665a] mt-1">
          Identitas sekolah, tahun ajaran aktif, dan integrasi Google Sheets tampil otomatis di header serta kop rapor.
        </p>
      </div>

      {/* Identitas Lembaga */}
      <form onSubmit={handleSave} className="kartu space-y-5">
        <div className="judul-baris pb-3 border-b border-[#d9d5c0]">
          <h2 className="text-lg text-[#0f4527] inline-flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#176238]" />
            <span>Identitas lembaga</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cfg-nama" className="block text-xs font-bold text-[#55665a] mb-1">
              Nama lembaga
            </label>
            <input
              id="cfg-nama"
              type="text"
              required
              value={form.nama_sekolah}
              onChange={(e) => setForm({ ...form, nama_sekolah: e.target.value })}
              className="isian-kontrol"
            />
          </div>

          <div>
            <label htmlFor="cfg-npsn" className="block text-xs font-bold text-[#55665a] mb-1">
              NPSN
            </label>
            <input
              id="cfg-npsn"
              type="text"
              value={form.npsn}
              onChange={(e) => setForm({ ...form, npsn: e.target.value })}
              className="isian-kontrol font-mono-tabular"
            />
          </div>

          <div>
            <label htmlFor="cfg-kepsek" className="block text-xs font-bold text-[#55665a] mb-1">
              Kepala sekolah
            </label>
            <input
              id="cfg-kepsek"
              type="text"
              value={form.kepala_sekolah}
              onChange={(e) => setForm({ ...form, kepala_sekolah: e.target.value })}
              className="isian-kontrol"
            />
          </div>

          <div>
            <label htmlFor="cfg-kontak" className="block text-xs font-bold text-[#55665a] mb-1">
              Kontak sekolah
            </label>
            <input
              id="cfg-kontak"
              type="text"
              value={form.kontak_sekolah}
              onChange={(e) => setForm({ ...form, kontak_sekolah: e.target.value })}
              className="isian-kontrol"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="cfg-alamat" className="block text-xs font-bold text-[#55665a] mb-1">
              Alamat sekolah
            </label>
            <input
              id="cfg-alamat"
              type="text"
              value={form.alamat_sekolah}
              onChange={(e) => setForm({ ...form, alamat_sekolah: e.target.value })}
              className="isian-kontrol"
            />
          </div>

          <div>
            <label htmlFor="cfg-ta" className="block text-xs font-bold text-[#55665a] mb-1">
              Tahun ajaran aktif
            </label>
            <input
              id="cfg-ta"
              type="text"
              value={form.tahun_ajaran_aktif}
              onChange={(e) => setForm({ ...form, tahun_ajaran_aktif: e.target.value })}
              className="isian-kontrol font-mono-tabular"
            />
          </div>

          <div>
            <label htmlFor="cfg-semester" className="block text-xs font-bold text-[#55665a] mb-1">
              Semester aktif
            </label>
            <select
              id="cfg-semester"
              value={form.semester_aktif}
              onChange={(e) => setForm({ ...form, semester_aktif: e.target.value as SemesterType })}
              className="isian-kontrol"
            >
              <option value="Semester 1">Semester 1 (Juli – Desember)</option>
              <option value="Semester 2">Semester 2 (Januari – Juni)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="cfg-drive" className="block text-xs font-bold text-[#55665a] mb-1">
              ID folder Google Drive (foto kegiatan &amp; karya)
            </label>
            <input
              id="cfg-drive"
              type="text"
              value={form.folder_drive_id}
              onChange={(e) => setForm({ ...form, folder_drive_id: e.target.value })}
              placeholder="Otomatis terisi saat menjalankan Setup.gs"
              className="isian-kontrol font-mono-tabular"
            />
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="tbl">
            <Save className="w-4 h-4" />
            <span>Simpan identitas</span>
          </button>
        </div>
      </form>

      {/* Google Sheets Direct OAuth (Sign in with Google) */}
      <GoogleSheetsDirectPanel />

      {/* Integrasi Google Sheets (GAS Web App Bridge) */}
      <section className="kartu space-y-5" aria-labelledby="judul-integrasi-sheets">
        <div className="judul-baris pb-3 border-b border-[#d9d5c0]">
          <div>
            <h2 id="judul-integrasi-sheets" className="text-lg text-[#0f4527] inline-flex items-center gap-2">
              <Sheet className="w-4 h-4 text-[#176238]" />
              <span>Integrasi Google Sheets</span>
            </h2>
            <p className="text-xs text-[#55665a] mt-0.5 m-0">
              Setiap kali Guru, Orang Tua, atau Admin menyimpan data, server otomatis menyinkronkan ke Google Sheets sekolah.
            </p>
          </div>
          <span className={`nilai ${syncStatus.connected ? '' : 'emas'}`}>
            {syncStatus.connected ? 'Terhubung ke Sheets' : 'Belum tersambung'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="cfg-gas" className="block text-xs font-bold text-[#55665a] mb-1">
              URL Google Apps Script Web App
            </label>
            <input
              id="cfg-gas"
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={form.gas_webapp_url}
              onChange={(e) => setForm({ ...form, gas_webapp_url: e.target.value })}
              className="isian-kontrol text-xs font-mono-tabular"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="cfg-sync-key" className="block text-xs font-bold text-[#55665a] mb-1">
              Kunci Sinkronisasi (SYNC_KEY di Code.gs)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="cfg-sync-key"
                type={showSyncKey ? 'text' : 'password'}
                placeholder="WASHLIYAH_SYNC_2026"
                value={form.gas_sync_key || ''}
                onChange={(e) => setForm({ ...form, gas_sync_key: e.target.value })}
                className="isian-kontrol text-xs font-mono-tabular"
              />
              <button
                type="button"
                onClick={() => setShowSyncKey((v) => !v)}
                aria-label={showSyncKey ? 'Sembunyikan kunci' : 'Tampilkan kunci'}
                className="tbl polos kecil"
              >
                {showSyncKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {testResultMsg && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              testResultMsg.ok
                ? 'bg-[#dcebd2]/70 border-[#176238]/40 text-[#0f4527]'
                : 'bg-[#f8dcd6] border-[#a33a25]/40 text-[#a33a25]'
            }`}
          >
            {testResultMsg.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResultMsg.text}</span>
          </div>
        )}

        {syncStatus.lastSyncAt && (
          <p className="text-xs text-[#55665a] m-0">
            Sinkron terakhir:{' '}
            <strong className="text-[#0f4527] font-mono-tabular">
              {new Date(syncStatus.lastSyncAt).toLocaleString('id-ID')}
            </strong>
            {syncStatus.lastError ? ` · Catatan: ${syncStatus.lastError}` : ''}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={testingConn}
            onClick={handleSaveAndTestSheets}
            className="tbl"
          >
            <PlugZap className="w-4 h-4" />
            <span>{testingConn ? 'Menguji koneksi...' : 'Simpan & Tes Koneksi'}</span>
          </button>

          <button
            type="button"
            disabled={!form.gas_webapp_url.trim()}
            onClick={pushToSheets}
            className="tbl polos"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Kirim ke Sheet</span>
          </button>

          {!confirmPull ? (
            <button
              type="button"
              disabled={!form.gas_webapp_url.trim()}
              onClick={() => setConfirmPull(true)}
              className="tbl polos"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Tarik dari Sheet</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-[#fdeab5]/70 border border-[#f2b632] rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-[#7c4d03]">Timpa data lokal dengan isi Sheet?</span>
              <button
                type="button"
                onClick={async () => {
                  setConfirmPull(false);
                  await pullFromSheets();
                }}
                className="tbl kecil"
              >
                Ya, tarik
              </button>
              <button
                type="button"
                onClick={() => setConfirmPull(false)}
                className="tbl polos kecil"
              >
                Batal
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[18px] border border-[#d9d5c0] bg-[#fbf6e7] p-4 space-y-2 text-xs text-[#1d2b21]">
          <p className="font-extrabold text-[#0f4527] m-0">
            Panduan cepat menghubungkan ke Google Sheets (3 langkah):
          </p>
          <ol className="list-decimal list-inside space-y-1 m-0 pl-0.5 text-[#55665a]">
            <li>
              Buka Google Spreadsheet sekolah Anda → <strong>Extensions → Apps Script</strong>.
            </li>
            <li>
              Salin <strong>Setup.gs</strong> dan <strong>Code.gs</strong> dari menu{' '}
              <strong>Master &amp; GAS</strong>, jalankan fungsi{' '}
              <code className="font-mono-tabular text-[#0f4527]">setupDatabase()</code> sekali, lalu klik{' '}
              <strong>Deploy → New Deployment → Web App</strong> (<em>Execute as: Me</em>,{' '}
              <em>Who has access: Anyone</em>).
            </li>
            <li>
              Tempel URL Web App di atas, samakan <code className="font-mono-tabular text-[#0f4527]">SYNC_KEY</code>{' '}
              (bawaan: <code className="font-mono-tabular">WASHLIYAH_SYNC_2026</code>), lalu klik{' '}
              <strong>Simpan &amp; Tes Koneksi</strong>.
            </li>
          </ol>
        </div>
      </section>

      {/* Mulai Sekolah Baru & Reset Data Contoh */}
      <section className="kartu space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#d9d5c0]">
          <div>
            <h3 className="text-base text-[#0f4527] m-0 inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#176238]" />
              <span>Mulai sekolah baru (hapus data contoh)</span>
            </h3>
            <p className="text-xs text-[#55665a] mt-1 m-0">
              Menghapus siswa contoh, riwayat kelas, dan catatan contoh. Akun Admin dan seluruh Master Materi/ATP tetap aman.
            </p>
          </div>
          {!confirmClean ? (
            <button
              type="button"
              onClick={() => setConfirmClean(true)}
              className="tbl polos kecil"
            >
              Mulai sekolah baru
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-[#fdeab5]/70 border border-[#f2b632] rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-[#7c4d03] shrink-0" />
              <span className="text-xs font-bold text-[#7c4d03]">Hapus semua data contoh?</span>
              <button type="button" onClick={handleConfirmClean} className="tbl kecil">
                Ya, bersihkan
              </button>
              <button
                type="button"
                onClick={() => setConfirmClean(false)}
                className="tbl polos kecil"
              >
                Batal
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base text-[#a33a25] m-0">Kembalikan data contoh</h3>
            <p className="text-xs text-[#55665a] mt-1 m-0">
              Mengembalikan seluruh data siswa, catatan harian, 7 KAIH, dan absensi ke kondisi awal bawaan.
            </p>
          </div>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="tbl merah kecil"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset data</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-[#f8dcd6]/60 border border-[#a33a25]/40 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-[#a33a25] shrink-0" />
              <span className="text-xs font-bold text-[#a33a25]">Yakin reset semua data?</span>
              <button type="button" onClick={handleConfirmReset} className="tbl merah kecil">
                Ya, reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="tbl polos kecil"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
