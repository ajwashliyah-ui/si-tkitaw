import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
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
  const { schoolInfo, currentUser, logout, changePassword, saving } = useApp();
  const [showPassModal, setShowPassModal] = useState(false);
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [passError, setPassError] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);

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
          <span className="text-[#1d2b21] truncate max-w-[200px]">
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
