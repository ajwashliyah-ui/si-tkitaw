import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  FolderSearch,
  LogOut,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import {
  getWorkspaceAccessToken,
  googleWorkspaceSignIn,
  googleWorkspaceSignOut,
  initGoogleWorkspaceAuth,
} from '../../utils/googleWorkspaceAuth';
import {
  createSchoolSpreadsheet,
  DriveSpreadsheetFile,
  fetchSpreadsheetMeta,
  listUserSpreadsheets,
  SpreadsheetMeta,
  syncSchoolDatabaseToSpreadsheet,
} from '../../utils/googleSheetsDirect';

type PendingMutation =
  | { kind: 'create'; title: string }
  | { kind: 'sync'; spreadsheetId: string; title: string }
  | null;

export const GoogleSheetsDirectPanel: React.FC = () => {
  const { db, updateDb, addToast, triggerCelebration } = useApp();

  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(true);
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [spreadsheetId, setSpreadsheetId] = useState(
    () => db.pengaturanSekolah.google_spreadsheet_id || ''
  );
  const [meta, setMeta] = useState<SpreadsheetMeta | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [busyMutation, setBusyMutation] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState(
    () => `Database ${db.pengaturanSekolah.nama_sekolah} (${db.pengaturanSekolah.tahun_ajaran_aktif})`
  );
  const [pendingConfirm, setPendingConfirm] = useState<PendingMutation>(null);

  useEffect(() => {
    setSpreadsheetId(db.pengaturanSekolah.google_spreadsheet_id || '');
  }, [db.pengaturanSekolah.google_spreadsheet_id]);

  useEffect(() => {
    const unsubscribe = initGoogleWorkspaceAuth(
      (user) => {
        setGoogleUser(user);
        setNeedsGoogleAuth(false);
      },
      () => {
        setGoogleUser(null);
        setNeedsGoogleAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const result = await googleWorkspaceSignIn();
      if (result) {
        setGoogleUser(result.user);
        setNeedsGoogleAuth(false);
        addToast(`Terhubung dengan Google: ${result.user.email || result.user.displayName}`, 'success');
        if (spreadsheetId.trim()) {
          try {
            const loadedMeta = await fetchSpreadsheetMeta(result.accessToken, spreadsheetId.trim());
            setMeta(loadedMeta);
          } catch {
            // Keep manual entry ready if stored ID is inaccessible
          }
        }
      }
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.',
        'error'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleWorkspaceSignOut();
    setGoogleUser(null);
    setNeedsGoogleAuth(true);
    setDriveFiles([]);
    setMeta(null);
    addToast('Koneksi akun Google diputuskan.', 'info');
  };

  const handleLoadDriveSheets = async () => {
    const token = await getWorkspaceAccessToken();
    if (!token) {
      setNeedsGoogleAuth(true);
      return;
    }
    setLoadingFiles(true);
    try {
      const files = await listUserSpreadsheets(token);
      setDriveFiles(files);
      if (files.length === 0) {
        addToast('Belum ada Google Spreadsheet di Drive akun ini.', 'info');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Gagal memuat daftar Spreadsheet.', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleInspectSpreadsheet = async (targetId: string) => {
    const cleanId = targetId.trim();
    if (!cleanId) return;
    const token = await getWorkspaceAccessToken();
    if (!token) {
      setNeedsGoogleAuth(true);
      return;
    }
    setLoadingFiles(true);
    try {
      const info = await fetchSpreadsheetMeta(token, cleanId);
      setMeta(info);
      setSpreadsheetId(info.spreadsheetId);
      await updateDb(
        (prev) => ({
          ...prev,
          pengaturanSekolah: {
            ...prev.pengaturanSekolah,
            google_spreadsheet_id: info.spreadsheetId,
            google_spreadsheet_url: info.spreadsheetUrl,
          },
        }),
        `Spreadsheet "${info.title}" (${info.sheetNames.length} tab) siap digunakan.`
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Spreadsheet tidak dapat dibaca.', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  const executeConfirmedMutation = async () => {
    if (!pendingConfirm) return;
    const token = await getWorkspaceAccessToken();
    if (!token) {
      setPendingConfirm(null);
      setNeedsGoogleAuth(true);
      addToast('Sesi Google habis, silakan masuk kembali.', 'error');
      return;
    }

    setBusyMutation(true);
    try {
      if (pendingConfirm.kind === 'create') {
        const createdMeta = await createSchoolSpreadsheet(token, pendingConfirm.title, db);
        setMeta(createdMeta);
        setSpreadsheetId(createdMeta.spreadsheetId);
        await updateDb((prev) => ({
          ...prev,
          pengaturanSekolah: {
            ...prev.pengaturanSekolah,
            google_spreadsheet_id: createdMeta.spreadsheetId,
            google_spreadsheet_url: createdMeta.spreadsheetUrl,
          },
        }));
        triggerCelebration('Spreadsheet baru dibuat!');
        addToast(`Spreadsheet "${createdMeta.title}" berhasil dibuat dan diisi.`, 'success');
      } else if (pendingConfirm.kind === 'sync') {
        const res = await syncSchoolDatabaseToSpreadsheet(
          token,
          pendingConfirm.spreadsheetId,
          db
        );
        setMeta(res.meta);
        await updateDb((prev) => ({
          ...prev,
          pengaturanSekolah: {
            ...prev.pengaturanSekolah,
            google_spreadsheet_id: res.meta.spreadsheetId,
            google_spreadsheet_url: res.meta.spreadsheetUrl,
          },
        }));
        triggerCelebration('Google Sheets tersinkron!');
        addToast(`Berhasil menulis ${res.tabsUpdated} tab data ke "${res.meta.title}".`, 'success');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Gagal menyinkronkan ke Google Sheets.', 'error');
    } finally {
      setBusyMutation(false);
      setPendingConfirm(null);
    }
  };

  return (
    <section className="kartu space-y-5" aria-labelledby="judul-sheets-oauth">
      <div className="judul-baris pb-3 border-b border-[#d9d5c0]">
        <div>
          <h2 id="judul-sheets-oauth" className="text-lg text-[#0f4527] m-0">
            Google Sheets Langsung (Sign in with Google)
          </h2>
          <p className="text-xs text-[#55665a] mt-0.5 m-0">
            Terhubung langsung ke Google Drive &amp; Google Sheets API menggunakan akun Google Operator sekolah tanpa copy-paste skrip.
          </p>
        </div>
        <span className={`nilai ${!needsGoogleAuth ? '' : 'netral'}`}>
          {!needsGoogleAuth ? 'Google Tersambung' : 'Perlu Login Google'}
        </span>
      </div>

      {needsGoogleAuth ? (
        <div className="rounded-[18px] border border-[#d9d5c0] bg-[#fbf6e7] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#0f4527] m-0">
              Masuk dengan akun Google sekolah untuk akses Google Sheets API langsung
            </p>
            <p className="text-xs text-[#55665a] m-0">
              Dengan izin Anda, aplikasi dapat membuat Spreadsheet baru, membaca daftar file Spreadsheet, dan memperbarui tab data perkembangan anak.
            </p>
          </div>

          <button
            type="button"
            disabled={signingIn}
            onClick={handleGoogleSignIn}
            className="gsi-material-button shrink-0"
          >
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {signingIn ? 'Menghubungkan...' : 'Sign in with Google'}
              </span>
              <span style={{ display: 'none' }}>Sign in with Google</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[18px] border border-[#9ec48e] bg-[#dcebd2]/45 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#176238] shrink-0" />
              <span>
                Masuk sebagai{' '}
                <strong className="text-[#0f4527]">
                  {googleUser?.displayName || googleUser?.email}
                </strong>
                {googleUser?.email ? ` (${googleUser.email})` : ''}
              </span>
            </div>
            <button type="button" onClick={handleGoogleSignOut} className="tbl polos kecil">
              <LogOut className="w-3.5 h-3.5" />
              <span>Putuskan Google</span>
            </button>
          </div>

          {/* Pilih Spreadsheet yang Sudah Ada atau Tempel ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="oauth-sheet-id" className="block text-xs font-bold text-[#55665a]">
                ID Google Spreadsheet Terhubung
              </label>
              <div className="flex gap-2">
                <input
                  id="oauth-sheet-id"
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="isian-kontrol text-xs font-mono-tabular"
                />
                <button
                  type="button"
                  disabled={loadingFiles || !spreadsheetId.trim()}
                  onClick={() => handleInspectSpreadsheet(spreadsheetId)}
                  className="tbl polos kecil shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cek Tab</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loadingFiles}
                  onClick={handleLoadDriveSheets}
                  className="tbl polos kecil"
                >
                  <FolderSearch className="w-3.5 h-3.5" />
                  <span>{loadingFiles ? 'Memuat Drive...' : 'Pilih dari Google Drive'}</span>
                </button>

                <button
                  type="button"
                  disabled={busyMutation || !spreadsheetId.trim()}
                  onClick={() =>
                    setPendingConfirm({
                      kind: 'sync',
                      spreadsheetId: spreadsheetId.trim(),
                      title: meta?.title || spreadsheetId.trim(),
                    })
                  }
                  className="tbl kecil"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Sinkronkan ke Spreadsheet Ini</span>
                </button>
              </div>
            </div>

            {/* Buat Spreadsheet Sekolah Baru */}
            <div className="space-y-2">
              <label htmlFor="oauth-new-title" className="block text-xs font-bold text-[#55665a]">
                Atau buat Spreadsheet Sekolah Baru di Google Drive
              </label>
              <div className="flex gap-2">
                <input
                  id="oauth-new-title"
                  type="text"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  className="isian-kontrol text-xs"
                />
                <button
                  type="button"
                  disabled={busyMutation || !newSheetTitle.trim()}
                  onClick={() =>
                    setPendingConfirm({ kind: 'create', title: newSheetTitle.trim() })
                  }
                  className="tbl kecil shrink-0"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Buat Baru</span>
                </button>
              </div>
              <p className="text-[11px] text-[#55665a] m-0">
                Membuat file Google Sheets baru berisi 14 tab data sekolah langsung di Drive Anda.
              </p>
            </div>
          </div>

          {driveFiles.length > 0 && (
            <div className="rounded-[14px] border border-[#d9d5c0] bg-[#fbf6e7] p-3 space-y-2">
              <p className="text-xs font-extrabold text-[#0f4527] m-0">
                Pilih Spreadsheet dari Google Drive:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {driveFiles.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleInspectSpreadsheet(f.id)}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                      spreadsheetId === f.id
                        ? 'bg-[#dcebd2] border-[#176238] text-[#0f4527] font-bold'
                        : 'bg-white border-[#d9d5c0] text-[#1d2b21] hover:border-[#176238]'
                    }`}
                  >
                    <div className="truncate font-bold">{f.name}</div>
                    <div className="text-[10px] text-[#55665a] font-mono-tabular truncate">{f.id}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {meta && (
            <div className="rounded-[14px] border border-[#d9d5c0] bg-[#fffdf7] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1 min-w-0">
                <p className="font-bold text-[#0f4527] m-0">
                  Spreadsheet aktif: {meta.title} ({meta.sheetNames.length} tab)
                </p>
                <p className="text-[#55665a] m-0 truncate">
                  Tab terdeteksi: {meta.sheetNames.slice(0, 8).join(', ')}
                  {meta.sheetNames.length > 8 ? `, +${meta.sheetNames.length - 8} lainnya` : ''}
                </p>
              </div>
              <a
                href={meta.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tbl polos kecil"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Sheet</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Mandatory Explicit Confirmation Modal before mutating Google Sheets/Drive */}
      {pendingConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-workspace-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#0f2c1c]/60 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-[460px] rounded-[26px] bg-[#fffdf7] text-[#1d2b21] p-6 shadow-2xl border border-[#d9d5c0] space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#d97706] shrink-0 mt-0.5" />
              <div>
                <h3 id="confirm-workspace-title" className="text-lg text-[#0f4527] m-0">
                  {pendingConfirm.kind === 'create'
                    ? 'Buat Google Spreadsheet Baru?'
                    : 'Perbarui Isi Google Spreadsheet?'}
                </h3>
                <p className="text-xs text-[#55665a] mt-1.5 leading-relaxed">
                  {pendingConfirm.kind === 'create'
                    ? `Aplikasi akan membuat file Spreadsheet baru berjudul "${pendingConfirm.title}" di Google Drive Anda dan mengisinya dengan 14 tab data sekolah (${db.siswa.length} siswa, ${db.logMateriHarian.length} catatan harian).`
                    : `Aplikasi akan memperbarui 14 tab data (${db.siswa.length} siswa, ${db.logMateriHarian.length} catatan harian, ${db.daftarHadir.length} daftar hadir) pada Spreadsheet "${pendingConfirm.title}". Data lama pada 14 tab tersebut akan digantikan dengan data terbaru dari aplikasi.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={busyMutation}
                onClick={() => setPendingConfirm(null)}
                className="tbl polos"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busyMutation}
                onClick={executeConfirmedMutation}
                className="tbl"
              >
                {busyMutation
                  ? 'Memproses...'
                  : pendingConfirm.kind === 'create'
                  ? 'Ya, Buat Spreadsheet'
                  : 'Ya, Sinkronkan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
