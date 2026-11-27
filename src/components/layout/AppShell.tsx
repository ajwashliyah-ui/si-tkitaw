import React, { useState } from 'react';
import { CheckCircle2, CloudOff, LucideIcon, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StickerCelebration } from '../common/StickerCelebration';

export interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

interface AppShellProps {
  navItems: NavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  navItems,
  activeTab,
  onSelectTab,
  children,
}) => {
  const {
    db,
    schoolInfo,
    currentUser,
    logout,
    changePassword,
    saving,
    googleSyncing,
    needsGoogleReauth,
    syncStatus,
    connectGoogleSheets,
  } = useApp();
  const [showPassModal, setShowPassModal] = useState(false);
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [passError, setPassError] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [reconnectingGoogle, setReconnectingGoogle] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';
  const hasDirectSheet = Boolean(db.pengaturanSekolah.google_spreadsheet_id?.trim());
  const autoSyncEnabled = db.pengaturanSekolah.auto_sync_sheets !== false;

  const handleReconnectGoogle = async () => {
    setReconnectingGoogle(true);
    try {
      await connectGoogleSheets();
    } finally {
      setReconnectingGoogle(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (baru.length < 6) {
      setPassError('Password baru minimal 6 karakter.');
      return;
    }
    setPassSubmitting(true);
    const res = await changePassword(lama, baru);
    setPassSubmitting(false);
    if (!res.ok) {
      setPassError(res.error || 'Gagal mengganti password.');
      return;
    }
    setLama('');
    setBaru('');
    setShowPassModal(false);
  };

  return (
    <div className="di-dalam min-h-screen bg-[#fbf6e7] text-[#1d2b21]">
      {/* Sticky Warm Top Bar */}
      <header className="atas no-print">
        <span className="merek">
          <img
            src="/assets/aistudio/lambang_4f3dfdc2.png"
            alt="Lambang Al-Washliyah"
            width={44}
            height={41}
          />
          <span className="min-w-0 truncate">
            {schoolInfo.nama_sekolah}
            {schoolInfo.tahun_ajaran_aktif && (
              <small>Tahun ajaran {schoolInfo.tahun_ajaran_aktif}</small>
            )}
          </span>
        </span>

        <div className="akun">
          {isAdmin && (
            <>
              {googleSyncing ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#dcebd2]/70 text-[#0f4527] text-xs font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyinkronkan Sheet...</span>
                </span>
              ) : hasDirectSheet && autoSyncEnabled && needsGoogleReauth ? (
                <button
                  type="button"
                  disabled={reconnectingGoogle}
                  onClick={handleReconnectGoogle}
                  className="tbl polos kecil"
                  title="Sesi Google Sheets berakhir setelah muat ulang halaman. Klik untuk menyambungkan kembali sinkronisasi real-time."
                >
                  <CloudOff className="w-3.5 h-3.5 text-[#b45309]" />
                  <span>{reconnectingGoogle ? 'Menghubungkan...' : 'Sambungkan Google'}</span>
                </button>
              ) : syncStatus.connected ? (
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#dcebd2]/70 text-[#0f4527] text-xs font-bold"
                  title={
                    syncStatus.lastSyncAt
                      ? `Tersinkron real-time (${new Date(syncStatus.lastSyncAt).toLocaleString('id-ID')})`
                      : 'Google Sheets terhubung'
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#176238]" />
                  <span>Sheets Real-Time</span>
                </span>
              ) : null}
            </>
          )}

          <span className="text-[#1d2b21] truncate max-w-[180px]">
            {currentUser?.nama_lengkap}
          </span>
          <button
            type="button"
            onClick={() => {
              setPassError('');
              setShowPassModal(true);
            }}
            className="tbl polos kecil"
          >
            Password
          </button>
          <button type="button" onClick={logout} className="tbl polos kecil">
            Keluar
          </button>
        </div>
      </header>

      {/* Saving Pill */}
      {saving && (
        <div id="memuat" role="status" className="no-print">
          <span className="putar" />
          <span>Menyimpan...</span>
        </div>
      )}

      {/* Celebratory Storybook Sticker Pill */}
      <StickerCelebration />

      {/* Main Workspace: Sidebar + Content */}
      <div className="badan">
        <nav className="menu no-print" aria-label="Menu utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onSelectTab(item.id);
                  window.scrollTo({ top: 0 });
                }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="xl:hidden">{item.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <main id="isi" tabIndex={-1}>
          <div className="halaman">{children}</div>
        </main>
      </div>

      {/* Change Password Modal */}
      {showPassModal && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f2c1c]/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-ganti-password"
          onClick={(e) => {
            if (e.target === e.currentTarget && !passSubmitting) setShowPassModal(false);
          }}
        >
          <div className="w-full max-w-[440px] rounded-[26px] bg-[#fffdf7] text-[#1d2b21] p-6 shadow-2xl border border-[#d9d5c0] animate-[naik_.25s_both]">
            <h2 id="dialog-ganti-password" className="text-xl text-[#0f4527] mb-4">
              Ganti password
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <label className="block">
                <span className="block font-extrabold text-sm mb-1">Password lama</span>
                <input
                  type="password"
                  required
                  value={lama}
                  onChange={(e) => setLama(e.target.value)}
                  className="isian-kontrol"
                />
              </label>
              <label className="block">
                <span className="block font-extrabold text-sm mb-1">
                  Password baru (minimal 6 karakter)
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={baru}
                  onChange={(e) => setBaru(e.target.value)}
                  className="isian-kontrol"
                />
              </label>
              {passError && (
                <div className="p-3 rounded-xl bg-[#f8dcd6] border border-[#a33a25]/40 text-xs font-semibold text-[#a33a25]">
                  {passError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={passSubmitting}
                  onClick={() => setShowPassModal(false)}
                  className="tbl polos"
                >
                  Batal
                </button>
                <button type="submit" disabled={passSubmitting} className="tbl">
                  {passSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
