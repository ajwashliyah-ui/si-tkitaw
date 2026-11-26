import React, { useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  Activity,
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Database,
  FileCheck2,
  Home,
  LineChart,
  Printer,
  Settings,
  Users,
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingView } from './components/landing/LandingView';
import { LoginView } from './components/auth/LoginView';
import { AppShell, NavItem } from './components/layout/AppShell';
import { ToastContainer } from './components/common/ToastContainer';

import { InputMateriHarianView } from './components/guru/InputMateriHarianView';
import { DaftarHadirView } from './components/guru/DaftarHadirView';
import { AsesmenView } from './components/guru/AsesmenView';
import { AntropometriKeagamaanView } from './components/guru/AntropometriKeagamaanView';
import { CetakRaporView } from './components/guru/CetakRaporView';
import { GuruKenaikanKelasView } from './components/guru/GuruKenaikanKelasView';

import { OrtuBerandaView } from './components/ortu/OrtuBerandaView';
import { KaihKalenderView } from './components/ortu/KaihKalenderView';
import { OrtuPerkembanganView } from './components/ortu/OrtuPerkembanganView';

import { AdminPengaturanView } from './components/admin/AdminPengaturanView';
import { AdminSiswaUsersView } from './components/admin/AdminSiswaUsersView';
import { AdminKenaikanKelasView } from './components/admin/AdminKenaikanKelasView';
import { AdminMasterGasView } from './components/admin/AdminMasterGasView';

const GURU_NAV: NavItem[] = [
  { id: 'materi', label: 'Materi harian', shortLabel: 'Harian', icon: BookOpenCheck },
  { id: 'hadir', label: 'Daftar hadir', shortLabel: 'Hadir', icon: ClipboardCheck },
  { id: 'asesmen', label: 'Asesmen', shortLabel: 'Asesmen', icon: FileCheck2 },
  { id: 'fisik_agama', label: 'Tumbuh & agama', shortLabel: 'Tumbuh', icon: Activity },
  { id: 'kenaikan', label: 'Kenaikan kelas', shortLabel: 'Kenaikan', icon: ArrowUpRight },
  { id: 'rapor', label: 'Cetak rapor', shortLabel: 'Rapor', icon: Printer },
];

const ORTU_NAV: NavItem[] = [
  { id: 'beranda', label: 'Beranda', shortLabel: 'Beranda', icon: Home },
  { id: 'kaih', label: '7 KAIH', shortLabel: '7 KAIH', icon: CalendarDays },
  { id: 'perkembangan', label: 'Laporan & rapor', shortLabel: 'Laporan', icon: LineChart },
];

const ADMIN_NAV: NavItem[] = [
  { id: 'kenaikan', label: 'Rekap & kenaikan', shortLabel: 'Rekap', icon: ArrowUpRight },
  { id: 'akun_siswa', label: 'Siswa & akun', shortLabel: 'Siswa', icon: Users },
  { id: 'master_gas', label: 'Master & GAS', shortLabel: 'Master', icon: Database },
  { id: 'pengaturan', label: 'Sekolah', shortLabel: 'Sekolah', icon: Settings },
];

const PortalRouter: React.FC = () => {
  const { currentUser, loading, db, schoolInfo } = useApp();
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedOrtuSiswaId, setSelectedOrtuSiswaId] = useState<string>('');
  const [loginOpen, setLoginOpen] = useState<boolean>(false);

  useEffect(() => {
    document.title = `${schoolInfo.nama_sekolah} — Laporan Perkembangan Anak`;
  }, [schoolInfo.nama_sekolah]);

  useEffect(() => {
    if (!currentUser) {
      setActiveTab('');
      return;
    }
    setLoginOpen(false);
    if (currentUser.role === 'Guru') setActiveTab('materi');
    else if (currentUser.role === 'OrangTua') setActiveTab('beranda');
    else setActiveTab('kenaikan');
  }, [currentUser]);

  const myChildren = useMemo(() => {
    if (!currentUser || currentUser.role !== 'OrangTua') return [];
    const linked = db.siswa.filter((s) => s.ortu_user_id === currentUser.user_id);
    return linked.length > 0 ? linked : db.siswa;
  }, [db.siswa, currentUser]);

  const effectiveOrtuSiswaId = useMemo(() => {
    if (myChildren.some((c) => c.siswa_id === selectedOrtuSiswaId)) return selectedOrtuSiswaId;
    return myChildren[0]?.siswa_id || '';
  }, [myChildren, selectedOrtuSiswaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbf6e7] flex items-center justify-center">
        <div className="text-center space-y-3">
          <img
            src="/assets/aistudio/lambang_4f3dfdc2.png"
            alt="Lambang Al-Washliyah"
            className="w-12 h-12 mx-auto object-contain"
          />
          <p className="text-sm font-semibold text-[#0f4527]">Membuka halaman sekolah...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LandingView onOpenLogin={() => setLoginOpen(true)} />
        <LoginView isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    );
  }

  if (currentUser.role === 'Guru') {
    const tab = GURU_NAV.some((n) => n.id === activeTab) ? activeTab : 'materi';
    return (
      <AppShell navItems={GURU_NAV} activeTab={tab} onSelectTab={setActiveTab}>
        {tab === 'materi' && <InputMateriHarianView />}
        {tab === 'hadir' && <DaftarHadirView />}
        {tab === 'asesmen' && <AsesmenView />}
        {tab === 'fisik_agama' && <AntropometriKeagamaanView />}
        {tab === 'kenaikan' && <GuruKenaikanKelasView />}
        {tab === 'rapor' && <CetakRaporView />}
      </AppShell>
    );
  }

  if (currentUser.role === 'OrangTua') {
    const tab = ORTU_NAV.some((n) => n.id === activeTab) ? activeTab : 'beranda';
    return (
      <AppShell navItems={ORTU_NAV} activeTab={tab} onSelectTab={setActiveTab}>
        {tab === 'beranda' && (
          <OrtuBerandaView
            selectedSiswaId={effectiveOrtuSiswaId}
            onSelectSiswa={setSelectedOrtuSiswaId}
            onNavigateTab={setActiveTab}
          />
        )}
        {tab === 'kaih' && <KaihKalenderView selectedSiswaId={effectiveOrtuSiswaId} />}
        {tab === 'perkembangan' && <OrtuPerkembanganView selectedSiswaId={effectiveOrtuSiswaId} />}
      </AppShell>
    );
  }

  const tab = ADMIN_NAV.some((n) => n.id === activeTab) ? activeTab : 'kenaikan';
  return (
    <AppShell navItems={ADMIN_NAV} activeTab={tab} onSelectTab={setActiveTab}>
      {tab === 'kenaikan' && <AdminKenaikanKelasView />}
      {tab === 'akun_siswa' && <AdminSiswaUsersView />}
      {tab === 'master_gas' && <AdminMasterGasView />}
      {tab === 'pengaturan' && <AdminPengaturanView />}
    </AppShell>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <PortalRouter />
        <ToastContainer />
      </AppProvider>
    </MotionConfig>
  );
}
