import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { KelasType, PengaturanSekolah, SchoolDatabase, User, UserRole } from '../types';
import { createInitialSeedDatabase } from '../data/seedDatabase';

export type SessionUser = Omit<User, 'password_hash' | 'password'>;

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface SyncStatusInfo {
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  schoolName: string | null;
}

export interface CelebrationEvent {
  id: number;
  label: string;
}

interface SetupAdminPayload {
  username: string;
  password: string;
  nama_lengkap: string;
  no_hp?: string;
}

interface CreateUserByAdminPayload {
  username: string;
  password: string;
  nama_lengkap: string;
  role: Extract<UserRole, 'OrangTua' | 'Guru'>;
  no_hp?: string;
  kelas_ampu?: KelasType;
}

interface AppContextValue {
  db: SchoolDatabase;
  schoolInfo: PengaturanSekolah;
  adminClaimed: boolean;
  currentUser: SessionUser | null;
  token: string | null;
  loading: boolean;
  saving: boolean;
  toasts: ToastMessage[];
  syncStatus: SyncStatusInfo;
  celebration: CelebrationEvent | null;
  triggerCelebration: (label?: string) => void;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  setupAdmin: (payload: SetupAdminPayload) => Promise<{ ok: boolean; error?: string }>;
  createUserByAdmin: (payload: CreateUserByAdminPayload) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (lama: string, baru: string) => Promise<{ ok: boolean; error?: string }>;
  updateDb: (updater: (prev: SchoolDatabase) => SchoolDatabase, toastText?: string) => Promise<void>;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: number) => void;
  resetDemoDatabase: () => Promise<void>;
  startCleanSchool: () => Promise<void>;
  testSheetsConnection: (url?: string, syncKey?: string) => Promise<{ ok: boolean; message: string }>;
  pushToSheets: () => Promise<void>;
  pullFromSheets: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

async function safeJson<T = any>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    try {
      const txt = await res.text();
      return JSON.parse(txt) as T;
    } catch {
      return null;
    }
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SchoolDatabase>(() => createInitialSeedDatabase());
  const dbRef = useRef<SchoolDatabase>(db);
  dbRef.current = db;
  const [schoolInfo, setSchoolInfo] = useState<PengaturanSekolah>(
    () => createInitialSeedDatabase().pengaturanSekolah
  );
  const [adminClaimed, setAdminClaimed] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    connected: false,
    lastSyncAt: null,
    lastError: null,
    schoolName: null,
  });

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerCelebration = useCallback((label = 'Tersimpan!') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setCelebration({ id, label });
    setTimeout(() => {
      setCelebration((prev) => (prev?.id === id ? null : prev));
    }, 1500);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/school-info')
      .then((res) => safeJson(res))
      .then((json) => {
        if (active && json?.ok && json.pengaturanSekolah) {
          setSchoolInfo(json.pengaturanSekolah);
          if (typeof json.adminClaimed === 'boolean') {
            setAdminClaimed(json.adminClaimed);
          }
          if (json.syncStatus) setSyncStatus(json.syncStatus);
        }
      })
      .catch(() => {
        // Fallback to seed metadata if offline or static host
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadDbWithToken = useCallback(async (authToken: string) => {
    const dbRes = await fetch('/api/db', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const dbJson = await safeJson(dbRes);
    if (dbRes.ok && dbJson?.ok && dbJson.data) {
      dbRef.current = dbJson.data;
      setDb(dbJson.data);
      setSchoolInfo(dbJson.data.pengaturanSekolah);
      if (dbJson.syncStatus) setSyncStatus(dbJson.syncStatus);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await safeJson(res);
        if (!res.ok || !data?.ok) {
          return {
            ok: false,
            error:
              data?.error ||
              (res.status === 404
                ? 'Endpoint /api tidak aktif di host ini. Pastikan vercel.json terpasang atau deploy ulang.'
                : `Gagal masuk (kode ${res.status}). Periksa akun Anda.`),
          };
        }
        if (data.data) {
          dbRef.current = data.data;
          setDb(data.data);
          setSchoolInfo(data.data.pengaturanSekolah);
          if (data.syncStatus) setSyncStatus(data.syncStatus);
        } else {
          await loadDbWithToken(data.token);
        }
        setToken(data.token);
        setCurrentUser(data.user);
        addToast(`Selamat datang, ${data.user.nama_lengkap}`, 'success');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Tidak dapat terhubung ke server aplikasi.' };
      }
    },
    [addToast, loadDbWithToken]
  );

  const setupAdmin = useCallback(
    async (payload: SetupAdminPayload): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await safeJson(res);
        if (!res.ok || !data?.ok) {
          if (res.status === 403) setAdminClaimed(true);
          return {
            ok: false,
            error:
              data?.error ||
              (res.status === 404
                ? 'Endpoint /api tidak aktif di host ini. Pastikan vercel.json terpasang.'
                : `Gagal mendaftarkan Admin sekolah (kode ${res.status}).`),
          };
        }
        setAdminClaimed(true);
        if (data.data) {
          dbRef.current = data.data;
          setDb(data.data);
          setSchoolInfo(data.data.pengaturanSekolah);
          if (data.syncStatus) setSyncStatus(data.syncStatus);
        } else {
          await loadDbWithToken(data.token);
        }
        setToken(data.token);
        setCurrentUser(data.user);
        triggerCelebration('Akun Admin siap!');
        addToast(`Selamat datang, ${data.user.nama_lengkap}. Akun Admin berhasil dibuat.`, 'success');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Tidak dapat terhubung ke server aplikasi.' };
      }
    },
    [addToast, loadDbWithToken, triggerCelebration]
  );

  const createUserByAdmin = useCallback(
    async (payload: CreateUserByAdminPayload): Promise<{ ok: boolean; error?: string }> => {
      if (!token) return { ok: false, error: 'Sesi berakhir.' };
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await safeJson(res);
        if (!res.ok || !data?.ok || !data.user) {
          const msg = data?.error || 'Gagal membuat akun pengguna.';
          addToast(msg, 'error');
          return { ok: false, error: msg };
        }
        const nextDb: SchoolDatabase = {
          ...dbRef.current,
          users: [...dbRef.current.users, data.user],
        };
        dbRef.current = nextDb;
        setDb(nextDb);
        addToast(`Akun ${data.user.nama_lengkap} berhasil dibuat.`, 'success');
        return { ok: true };
      } catch {
        const msg = 'Tidak dapat terhubung ke server aplikasi.';
        addToast(msg, 'error');
        return { ok: false, error: msg };
      }
    },
    [token, addToast]
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors during logout
      }
    }
    setToken(null);
    setCurrentUser(null);
  }, [token]);

  const changePassword = useCallback(
    async (lama: string, baru: string): Promise<{ ok: boolean; error?: string }> => {
      if (!token) return { ok: false, error: 'Sesi berakhir.' };
      try {
        const res = await fetch('/api/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lama, baru }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Gagal mengganti password.' };
        }
        setToken(data.token);
        addToast('Password berhasil diganti', 'success');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Tidak dapat terhubung ke server.' };
      }
    },
    [token, addToast]
  );

  const updateDb = useCallback(
    async (updater: (prev: SchoolDatabase) => SchoolDatabase, toastText?: string) => {
      const finalDb = updater(dbRef.current);
      dbRef.current = finalDb;
      setDb(finalDb);
      setSchoolInfo(finalDb.pengaturanSekolah);

      if (!token) return;
      setSaving(true);
      try {
        const res = await fetch('/api/db', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalDb),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          addToast(json.error || 'Gagal menyimpan perubahan ke server.', 'error');
        } else {
          if (json.syncStatus) setSyncStatus(json.syncStatus);
          if (toastText) addToast(toastText, 'success');
        }
      } catch {
        addToast('Koneksi terputus saat menyimpan data.', 'error');
      } finally {
        setSaving(false);
      }
    },
    [token, addToast]
  );

  const resetDemoDatabase = useCallback(async () => {
    const fresh = createInitialSeedDatabase();
    await updateDb((prev) => {
      const keepAdmins = prev.users.filter((u) => u.role === 'Admin');
      return {
        ...fresh,
        pengaturanSekolah: {
          ...fresh.pengaturanSekolah,
          admin_claimed: prev.pengaturanSekolah.admin_claimed || keepAdmins.length > 0,
        },
        users: [
          ...keepAdmins,
          ...fresh.users.filter(
            (fu) => !keepAdmins.some((ka) => ka.username.toLowerCase() === fu.username.toLowerCase())
          ),
        ],
      };
    }, 'Data contoh sekolah dikembalikan ke kondisi awal.');
  }, [updateDb]);

  const startCleanSchool = useCallback(async () => {
    await updateDb((prev) => {
      const keepAdmins = prev.users.filter((u) => u.role === 'Admin' || u.user_id === currentUser?.user_id);
      return {
        ...prev,
        users: keepAdmins.length > 0 ? keepAdmins : prev.users,
        siswa: [],
        riwayatKelas: [],
        antropometri: [],
        literasi: [],
        keagamaan: [],
        kaihHarian: [],
        kaihFotoBulanan: [],
        ulasanOrtu: [],
        logMateriHarian: [],
        daftarHadir: [],
        asesmenAnekdot: [],
        asesmenHasilKarya: [],
        asesmenCeklis: [],
      };
    }, 'Data contoh dibersihkan. Silakan mulai isi data sekolah Anda!');
  }, [updateDb, currentUser?.user_id]);

  const testSheetsConnection = useCallback(
    async (url?: string, syncKey?: string) => {
      if (!token) return { ok: false, message: 'Sesi berakhir.' };
      try {
        const res = await fetch('/api/sheets/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url, syncKey }),
        });
        const json = await res.json();
        if (json.syncStatus) setSyncStatus(json.syncStatus);
        if (res.ok && json.ok) {
          const msg = `Terhubung ke Google Sheet (${json.result?.sheets || 0} tab sheet).`;
          addToast(msg, 'success');
          return { ok: true, message: msg };
        }
        const errMsg = json.error || 'Gagal terhubung ke Google Sheets.';
        addToast(errMsg, 'error');
        return { ok: false, message: errMsg };
      } catch {
        return { ok: false, message: 'Gagal menghubungi server aplikasi.' };
      }
    },
    [token, addToast]
  );

  const pushToSheets = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sheets/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: dbRef.current.pengaturanSekolah.gas_webapp_url,
          syncKey: dbRef.current.pengaturanSekolah.gas_sync_key,
        }),
      });
      const json = await res.json();
      if (json.syncStatus) setSyncStatus(json.syncStatus);
      if (res.ok && json.ok) {
        triggerCelebration('Tersinkron ke Sheet!');
        addToast('Seluruh data berhasil dikirim ke Google Sheets.', 'success');
      } else {
        addToast(json.error || 'Gagal mengirim ke Google Sheets.', 'error');
      }
    } catch {
      addToast('Koneksi terputus saat sinkronisasi.', 'error');
    } finally {
      setSaving(false);
    }
  }, [token, addToast, triggerCelebration]);

  const pullFromSheets = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sheets/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: dbRef.current.pengaturanSekolah.gas_webapp_url,
          syncKey: dbRef.current.pengaturanSekolah.gas_sync_key,
        }),
      });
      const json = await res.json();
      if (json.syncStatus) setSyncStatus(json.syncStatus);
      if (res.ok && json.ok && json.data) {
        dbRef.current = json.data;
        setDb(json.data);
        setSchoolInfo(json.data.pengaturanSekolah);
        addToast('Data terbaru berhasil ditarik dari Google Sheets.', 'success');
      } else {
        addToast(json.error || 'Gagal menarik data dari Google Sheets.', 'error');
      }
    } catch {
      addToast('Koneksi terputus saat menarik data.', 'error');
    } finally {
      setSaving(false);
    }
  }, [token, addToast]);

  return (
    <AppContext.Provider
      value={{
        db,
        schoolInfo,
        adminClaimed,
        currentUser,
        token,
        loading,
        saving,
        toasts,
        syncStatus,
        celebration,
        triggerCelebration,
        login,
        setupAdmin,
        createUserByAdmin,
        logout,
        changePassword,
        updateDb,
        addToast,
        dismissToast,
        resetDemoDatabase,
        startCleanSchool,
        testSheetsConnection,
        pushToSheets,
        pullFromSheets,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus digunakan di dalam AppProvider');
  return ctx;
}
