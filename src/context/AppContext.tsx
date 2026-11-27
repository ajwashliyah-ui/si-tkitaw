import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { KelasType, PengaturanSekolah, SchoolDatabase, User, UserRole } from '../types';
import { createInitialSeedDatabase } from '../data/seedDatabase';
import { purgeStudentsFromDatabase } from '../utils/studentCleanup';
import {
  getWorkspaceAccessToken,
  googleWorkspaceSignIn,
  googleWorkspaceSignOut,
  initGoogleWorkspaceAuth,
} from '../utils/googleWorkspaceAuth';
import {
  extractSpreadsheetId,
  pullSchoolDatabaseFromSpreadsheet,
  SpreadsheetMeta,
  syncSchoolDatabaseToSpreadsheet,
} from '../utils/googleSheetsDirect';

import { normalizeSchoolDatabase } from '../utils/normalizeDb';

export type SessionUser = Omit<User, 'password_hash' | 'password'>;

async function apiFetch(
  url: string,
  init: RequestInit = {},
  bearerToken?: string | null
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (bearerToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${bearerToken}`);
  }
  return fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
}

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
  syncedVersion?: number;
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
  googleUser: FirebaseUser | null;
  googleConnected: boolean;
  googleSyncing: boolean;
  needsGoogleReauth: boolean;
  celebration: CelebrationEvent | null;
  triggerCelebration: (label?: string) => void;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  setupAdmin: (payload: SetupAdminPayload) => Promise<{ ok: boolean; error?: string }>;
  refreshSchoolInfo: () => Promise<boolean>;
  createUserByAdmin: (payload: CreateUserByAdminPayload) => Promise<{ ok: boolean; error?: string }>;
  deleteUserByAdmin: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  deleteSiswaWithCleanup: (siswaId: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (lama: string, baru: string) => Promise<{ ok: boolean; error?: string }>;
  updateDb: (
    updater: (prev: SchoolDatabase) => SchoolDatabase,
    toastText?: string,
    options?: { graduatedSiswaIds?: string[]; skipOAuthAutoSync?: boolean }
  ) => Promise<boolean>;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: number) => void;
  resetDemoDatabase: () => Promise<void>;
  startCleanSchool: () => Promise<void>;
  testSheetsConnection: (url?: string, syncKey?: string) => Promise<{ ok: boolean; message: string }>;
  pushToSheets: () => Promise<void>;
  pullFromSheets: () => Promise<void>;
  connectGoogleSheets: () => Promise<boolean>;
  disconnectGoogleSheets: () => Promise<void>;
  syncDirectToSpreadsheet: (overrideSpreadsheetId?: string, overrideDb?: SchoolDatabase) => Promise<boolean>;
  pullDirectFromSpreadsheet: (overrideSpreadsheetId?: string) => Promise<boolean>;
  markDirectOAuthSynced: (meta: SpreadsheetMeta) => Promise<void>;
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

export function getClientDefaultGasUrl(): string {
  if (typeof window === 'undefined') return '';
  const raw = (window as any)?.APP_CONFIG?.GAS_WEBAPP_URL;
  if (
    typeof raw === 'string' &&
    raw.startsWith('https://script.google.com/macros/s/') &&
    !raw.includes('GANTI_DENGAN_DEPLOYMENT_ID_ANDA')
  ) {
    return raw.trim();
  }
  return '';
}

function isGoogleAuthFailureMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('401') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid authentication') ||
    lower.includes('token') ||
    lower.includes('expired')
  );
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
  const currentUserRef = useRef<SessionUser | null>(null);
  currentUserRef.current = currentUser;
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    connected: false,
    lastSyncAt: null,
    lastError: null,
    schoolName: null,
    syncedVersion: 0,
  });

  // Google Workspace OAuth direct Sheets state (access token kept strictly in memory)
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const googleConnectedRef = useRef<boolean>(false);
  googleConnectedRef.current = googleConnected;
  const [googleSyncing, setGoogleSyncing] = useState<boolean>(false);
  const [needsGoogleReauth, setNeedsGoogleReauth] = useState<boolean>(false);

  // Version & sync coordination refs
  const dbVersionRef = useRef<number>(0);
  const lastSyncedVersionRef = useRef<number>(0);
  const lastOAuthErrorToastAtRef = useRef<number>(0);
  const oauthSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sequential mutation queue prevents concurrent client-side writes from overwriting each other
  const mutationQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueMutation = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = mutationQueueRef.current.then(fn, fn);
    mutationQueueRef.current = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }, []);

  // Coalesced OAuth Sheets sync queue so every change syncs reliably in real-time
  const oauthSyncPendingRef = useRef<{
    db: SchoolDatabase;
    spreadsheetId: string;
    version: number;
  } | null>(null);
  const oauthSyncPromiseRef = useRef<Promise<boolean> | null>(null);

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
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
    const unsubscribe = initGoogleWorkspaceAuth(
      (user) => {
        setGoogleUser(user);
        setGoogleConnected(true);
        setNeedsGoogleReauth(false);
      },
      () => {
        setGoogleUser(null);
        setGoogleConnected(false);
        if (dbRef.current.pengaturanSekolah.google_spreadsheet_id?.trim()) {
          setNeedsGoogleReauth(true);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const hasSheetId = Boolean(db.pengaturanSekolah.google_spreadsheet_id?.trim());
    const autoEnabled = db.pengaturanSekolah.auto_sync_sheets !== false;
    if (hasSheetId && autoEnabled && !googleConnected) {
      setNeedsGoogleReauth(true);
    } else if (!hasSheetId || googleConnected) {
      setNeedsGoogleReauth(false);
    }
  }, [
    db.pengaturanSekolah.google_spreadsheet_id,
    db.pengaturanSekolah.auto_sync_sheets,
    googleConnected,
  ]);

  const notifyServerOAuthSyncResult = useCallback(
    async (
      ok: boolean,
      details: { schoolName?: string; syncedVersion?: number; error?: string }
    ) => {
      if (!currentUserRef.current && !tokenRef.current) return;
      try {
        const res = await apiFetch(
          '/api/sheets/oauth-sync',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ok,
              schoolName: details.schoolName,
              syncedVersion: details.syncedVersion,
              error: details.error,
            }),
          },
          tokenRef.current
        );
        const json = await safeJson(res);
        if (res.ok && json?.syncStatus) {
          setSyncStatus(json.syncStatus);
        }
      } catch {
        // Non-blocking status sync
      }
    },
    []
  );

  const markDirectOAuthSynced = useCallback(
    async (meta: SpreadsheetMeta) => {
      const version = dbVersionRef.current || Date.now();
      lastSyncedVersionRef.current = Math.max(lastSyncedVersionRef.current, version);
      setNeedsGoogleReauth(false);
      setGoogleConnected(true);
      setSyncStatus({
        connected: true,
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        schoolName: meta.title || dbRef.current.pengaturanSekolah.nama_sekolah,
        syncedVersion: version,
      });
      await notifyServerOAuthSyncResult(true, {
        schoolName: meta.title || dbRef.current.pengaturanSekolah.nama_sekolah,
        syncedVersion: version,
      });
    },
    [notifyServerOAuthSyncResult]
  );

  const runDirectOAuthSync = useCallback(
    async (
      snapshot: SchoolDatabase,
      overrideSpreadsheetId?: string,
      targetVersion?: number,
      showErrorToast = false
    ): Promise<boolean> => {
      const sheetId = extractSpreadsheetId(
        overrideSpreadsheetId || snapshot.pengaturanSekolah.google_spreadsheet_id || ''
      );
      if (!sheetId) return false;

      const accessToken = await getWorkspaceAccessToken();
      if (!accessToken) {
        setGoogleConnected(false);
        setNeedsGoogleReauth(true);
        return false;
      }

      const jobVersion = targetVersion ?? dbVersionRef.current ?? Date.now();
      oauthSyncPendingRef.current = {
        db: snapshot,
        spreadsheetId: sheetId,
        version: jobVersion,
      };
      if (oauthSyncPromiseRef.current) {
        return oauthSyncPromiseRef.current;
      }

      const runner = (async (): Promise<boolean> => {
        let lastOk = false;
        setGoogleSyncing(true);
        try {
          while (oauthSyncPendingRef.current) {
            const job = oauthSyncPendingRef.current;
            oauthSyncPendingRef.current = null;
            const liveToken = await getWorkspaceAccessToken();
            if (!liveToken) {
              setGoogleConnected(false);
              setNeedsGoogleReauth(true);
              lastOk = false;
              break;
            }
            const res = await syncSchoolDatabaseToSpreadsheet(
              liveToken,
              job.spreadsheetId,
              job.db
            );
            lastSyncedVersionRef.current = Math.max(lastSyncedVersionRef.current, job.version);
            const schoolName = res.meta.title || job.db.pengaturanSekolah.nama_sekolah;
            setNeedsGoogleReauth(false);
            setGoogleConnected(true);
            setSyncStatus({
              connected: true,
              lastSyncAt: new Date().toISOString(),
              lastError: null,
              schoolName,
              syncedVersion: lastSyncedVersionRef.current,
            });
            void notifyServerOAuthSyncResult(true, {
              schoolName,
              syncedVersion: lastSyncedVersionRef.current,
            });
            lastOk = true;
          }
          return lastOk;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Gagal sinkron ke Google Sheets.';
          if (isGoogleAuthFailureMessage(msg)) {
            setNeedsGoogleReauth(true);
            setGoogleConnected(false);
          }
          setSyncStatus((prev) => ({
            ...prev,
            lastError: msg,
          }));
          void notifyServerOAuthSyncResult(false, { error: msg });
          if (showErrorToast) {
            const now = Date.now();
            if (now - lastOAuthErrorToastAtRef.current > 8000) {
              lastOAuthErrorToastAtRef.current = now;
              addToast(
                `Data tersimpan di aplikasi, tetapi gagal sinkron ke Google Sheets: ${msg}`,
                'error'
              );
            }
          }
          return false;
        } finally {
          setGoogleSyncing(false);
          oauthSyncPromiseRef.current = null;
        }
      })();

      oauthSyncPromiseRef.current = runner;
      return runner;
    },
    [addToast, notifyServerOAuthSyncResult]
  );

  const scheduleRealtimeOAuthSync = useCallback(
    (snapshot: SchoolDatabase, targetVersion?: number, immediate = false) => {
      if (currentUserRef.current?.role !== 'Admin') return;
      const sheetId = extractSpreadsheetId(snapshot.pengaturanSekolah.google_spreadsheet_id || '');
      if (!sheetId) return;
      if (snapshot.pengaturanSekolah.auto_sync_sheets === false) return;
      if (!googleConnectedRef.current) return;

      if (oauthSyncTimerRef.current) {
        clearTimeout(oauthSyncTimerRef.current);
        oauthSyncTimerRef.current = null;
      }

      if (immediate) {
        void runDirectOAuthSync(snapshot, sheetId, targetVersion, true);
        return;
      }

      oauthSyncTimerRef.current = setTimeout(() => {
        oauthSyncTimerRef.current = null;
        void runDirectOAuthSync(dbRef.current, sheetId, targetVersion ?? dbVersionRef.current, true);
      }, 350);
    },
    [runDirectOAuthSync]
  );

  const syncDirectToSpreadsheet = useCallback(
    async (overrideSpreadsheetId?: string, overrideDb?: SchoolDatabase): Promise<boolean> => {
      const targetDb = overrideDb || dbRef.current;
      const ok = await runDirectOAuthSync(
        targetDb,
        overrideSpreadsheetId,
        dbVersionRef.current,
        true
      );
      return ok;
    },
    [runDirectOAuthSync]
  );

  const loadDbWithToken = useCallback(async (authToken?: string | null): Promise<boolean> => {
    try {
      const dbRes = await apiFetch('/api/db', {}, authToken);
      if (dbRes.status === 401) {
        setToken(null);
        setCurrentUser(null);
        return false;
      }
      const dbJson = await safeJson(dbRes);
      if (dbRes.ok && dbJson?.ok && dbJson.data) {
        const next = normalizeSchoolDatabase(dbJson.data as SchoolDatabase);
        dbRef.current = next;
        setDb(next);
        setSchoolInfo(next.pengaturanSekolah);
        if (typeof dbJson.adminClaimed === 'boolean') {
          setAdminClaimed(dbJson.adminClaimed);
        }
        const effectiveToken =
          typeof dbJson.token === 'string' && dbJson.token ? dbJson.token : authToken || null;
        if (effectiveToken) {
          setToken(effectiveToken);
        }
        if (dbJson.user) {
          setCurrentUser(dbJson.user);
        }
        if (typeof dbJson.dbVersion === 'number') {
          dbVersionRef.current = dbJson.dbVersion;
        }
        if (dbJson.syncStatus) {
          setSyncStatus(dbJson.syncStatus);
          if (typeof dbJson.syncStatus.syncedVersion === 'number') {
            lastSyncedVersionRef.current = Math.max(
              lastSyncedVersionRef.current,
              dbJson.syncStatus.syncedVersion
            );
          }
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const refreshSchoolInfo = useCallback(async (): Promise<boolean> => {
    try {
      const infoRes = await apiFetch('/api/school-info');
      const json = await safeJson(infoRes);
      if (json?.ok && json.pengaturanSekolah) {
        setSchoolInfo(json.pengaturanSekolah);
        if (typeof json.adminClaimed === 'boolean') {
          setAdminClaimed(json.adminClaimed);
        }
        if (typeof json.dbVersion === 'number') {
          dbVersionRef.current = json.dbVersion;
        }
        if (json.syncStatus) {
          setSyncStatus(json.syncStatus);
          if (typeof json.syncStatus.syncedVersion === 'number') {
            lastSyncedVersionRef.current = Math.max(
              lastSyncedVersionRef.current,
              json.syncStatus.syncedVersion
            );
          }
        }
        return Boolean(json.authenticated);
      }
      return false;
    } catch {
      // Fallback to existing metadata if offline or static host
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const hasCookieSession = await refreshSchoolInfo();
      if (hasCookieSession && active) {
        const restored = await loadDbWithToken(null);
        if (!restored && active) {
          setToken(null);
          setCurrentUser(null);
        }
      } else if (active) {
        setToken(null);
        setCurrentUser(null);
      }
      if (active) setLoading(false);
    };
    void init();
    return () => {
      active = false;
    };
  }, [loadDbWithToken, refreshSchoolInfo]);

  // Real-time background sync watcher (polls lightweight /api/sync-status every 4s while visible)
  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    const checkServerUpdates = async () => {
      if (!active || document.visibilityState === 'hidden') return;
      const authToken = tokenRef.current;
      try {
        const res = await apiFetch('/api/sync-status', {}, authToken);
        if (!active) return;
        if (res.status === 401) {
          setToken(null);
          setCurrentUser(null);
          return;
        }
        const json = await safeJson(res);
        if (!res.ok || !json?.ok) return;

        const serverVersion = typeof json.dbVersion === 'number' ? json.dbVersion : 0;
        if (json.syncStatus && !oauthSyncPromiseRef.current) {
          setSyncStatus(json.syncStatus);
          if (typeof json.syncStatus.syncedVersion === 'number') {
            lastSyncedVersionRef.current = Math.max(
              lastSyncedVersionRef.current,
              json.syncStatus.syncedVersion
            );
          }
        }

        if (serverVersion > dbVersionRef.current) {
          const refreshed = await loadDbWithToken(authToken);
          if (refreshed && active) {
            const latestDb = dbRef.current;
            const sheetId = extractSpreadsheetId(
              latestDb.pengaturanSekolah.google_spreadsheet_id || ''
            );
            if (
              currentUserRef.current?.role === 'Admin' &&
              googleConnectedRef.current &&
              latestDb.pengaturanSekolah.auto_sync_sheets !== false &&
              sheetId &&
              dbVersionRef.current > lastSyncedVersionRef.current
            ) {
              void runDirectOAuthSync(latestDb, sheetId, dbVersionRef.current, true);
            }
          }
        } else if (
          currentUserRef.current?.role === 'Admin' &&
          googleConnectedRef.current &&
          dbRef.current.pengaturanSekolah.auto_sync_sheets !== false &&
          extractSpreadsheetId(dbRef.current.pengaturanSekolah.google_spreadsheet_id || '') &&
          serverVersion > lastSyncedVersionRef.current &&
          !oauthSyncPromiseRef.current
        ) {
          const sheetId = extractSpreadsheetId(
            dbRef.current.pengaturanSekolah.google_spreadsheet_id || ''
          );
          void runDirectOAuthSync(dbRef.current, sheetId, serverVersion, true);
        }
      } catch {
        // Ignore transient background poll errors
      }
    };

    const intervalId = setInterval(() => {
      void checkServerUpdates();
    }, 4000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkServerUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser, loadDbWithToken, runDirectOAuthSync]);

  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase();
        const cleanPassword = password.replace(/[\r\n]+/g, '');
        const res = await apiFetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
        });
        const data = await safeJson(res);
        if (typeof data?.adminClaimed === 'boolean') {
          setAdminClaimed(data.adminClaimed);
        }
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
          const next = normalizeSchoolDatabase(data.data as SchoolDatabase);
          dbRef.current = next;
          setDb(next);
          setSchoolInfo(next.pengaturanSekolah);
          if (typeof data.dbVersion === 'number') {
            dbVersionRef.current = data.dbVersion;
          }
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
        const cleanPayload: SetupAdminPayload = {
          ...payload,
          username: payload.username.trim().replace(/^@+/, '').toLowerCase(),
          password: payload.password.replace(/[\r\n]+/g, ''),
          nama_lengkap: payload.nama_lengkap.trim(),
          no_hp: payload.no_hp?.trim() || '',
        };
        const res = await apiFetch('/api/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPayload),
        });
        const data = await safeJson(res);
        if (!res.ok || !data?.ok) {
          if (typeof data?.adminClaimed === 'boolean') {
            setAdminClaimed(data.adminClaimed);
          } else if (res.status === 403) {
            setAdminClaimed(true);
          }
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
          const next = normalizeSchoolDatabase(data.data as SchoolDatabase);
          dbRef.current = next;
          setDb(next);
          setSchoolInfo(next.pengaturanSekolah);
          if (typeof data.dbVersion === 'number') {
            dbVersionRef.current = data.dbVersion;
          }
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
      return enqueueMutation(async () => {
        const authToken = tokenRef.current;
        if (!authToken && !currentUserRef.current) {
          return { ok: false, error: 'Sesi berakhir. Silakan masuk kembali.' };
        }
        setSaving(true);
        try {
          const res = await apiFetch(
            '/api/admin/users',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
            authToken
          );
          const data = await safeJson(res);
          if (res.status === 401) {
            setToken(null);
            setCurrentUser(null);
            addToast('Sesi login berakhir. Silakan masuk kembali.', 'error');
            return { ok: false, error: 'Sesi login berakhir.' };
          }
          if (!res.ok || !data?.ok || !data.user) {
            const msg = data?.error || 'Gagal membuat akun pengguna.';
            addToast(msg, 'error');
            return { ok: false, error: msg };
          }
          const nextDb: SchoolDatabase = normalizeSchoolDatabase({
            ...dbRef.current,
            users: [...dbRef.current.users, data.user],
          });
          dbRef.current = nextDb;
          setDb(nextDb);
          if (typeof data.dbVersion === 'number') {
            dbVersionRef.current = data.dbVersion;
          }
          if (data.syncStatus) setSyncStatus(data.syncStatus);
          addToast(`Akun ${data.user.nama_lengkap} berhasil dibuat.`, 'success');
          scheduleRealtimeOAuthSync(nextDb, data.dbVersion);
          return { ok: true };
        } catch {
          const msg = 'Tidak dapat terhubung ke server aplikasi.';
          addToast(msg, 'error');
          return { ok: false, error: msg };
        } finally {
          setSaving(false);
        }
      });
    },
    [enqueueMutation, addToast, scheduleRealtimeOAuthSync]
  );

  const deleteUserByAdmin = useCallback(
    async (userId: string): Promise<{ ok: boolean; error?: string }> => {
      return enqueueMutation(async () => {
        const authToken = tokenRef.current;
        if (!authToken && !currentUserRef.current) {
          return { ok: false, error: 'Sesi berakhir. Silakan masuk kembali.' };
        }
        setSaving(true);
        try {
          const res = await apiFetch(
            '/api/admin/users',
            {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            },
            authToken
          );
          const data = await safeJson(res);
          if (res.status === 401) {
            setToken(null);
            setCurrentUser(null);
            addToast('Sesi login berakhir. Silakan masuk kembali.', 'error');
            return { ok: false, error: 'Sesi login berakhir.' };
          }
          if (!res.ok || !data?.ok) {
            const msg = data?.error || 'Gagal menghapus akun pengguna.';
            addToast(msg, 'error');
            return { ok: false, error: msg };
          }
          const nextDb: SchoolDatabase = normalizeSchoolDatabase({
            ...dbRef.current,
            users: Array.isArray(data.users)
              ? data.users
              : dbRef.current.users.filter((u) => u.user_id !== userId),
            siswa: Array.isArray(data.siswa)
              ? data.siswa
              : dbRef.current.siswa.map((s) =>
                  s.ortu_user_id === userId ? { ...s, ortu_user_id: '' } : s
                ),
            riwayatKelas: Array.isArray(data.riwayatKelas)
              ? data.riwayatKelas
              : dbRef.current.riwayatKelas.map((r) =>
                  r.wali_kelas_id === userId ? { ...r, wali_kelas_id: '' } : r
                ),
          });
          dbRef.current = nextDb;
          setDb(nextDb);
          if (typeof data.dbVersion === 'number') {
            dbVersionRef.current = data.dbVersion;
          }
          if (data.syncStatus) setSyncStatus(data.syncStatus);
          addToast('Akun pengguna berhasil dihapus.', 'success');
          scheduleRealtimeOAuthSync(nextDb, data.dbVersion);
          return { ok: true };
        } catch {
          const msg = 'Tidak dapat terhubung ke server aplikasi.';
          addToast(msg, 'error');
          return { ok: false, error: msg };
        } finally {
          setSaving(false);
        }
      });
    },
    [enqueueMutation, addToast, scheduleRealtimeOAuthSync]
  );

  const logout = useCallback(async () => {
    if (oauthSyncTimerRef.current) {
      clearTimeout(oauthSyncTimerRef.current);
      oauthSyncTimerRef.current = null;
    }
    const authToken = tokenRef.current;
    try {
      await apiFetch('/api/logout', { method: 'POST' }, authToken);
    } catch {
      // Ignore network errors during logout
    }
    setToken(null);
    setCurrentUser(null);
  }, []);

  const changePassword = useCallback(
    async (lama: string, baru: string): Promise<{ ok: boolean; error?: string }> => {
      const authToken = tokenRef.current;
      if (!authToken && !currentUserRef.current) return { ok: false, error: 'Sesi berakhir.' };
      try {
        const res = await apiFetch(
          '/api/change-password',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lama, baru }),
          },
          authToken
        );
        const data = await safeJson(res);
        if (!res.ok || !data?.ok) {
          return { ok: false, error: data?.error || 'Gagal mengganti password.' };
        }
        setToken(data.token);
        addToast('Password berhasil diganti', 'success');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Tidak dapat terhubung ke server.' };
      }
    },
    [addToast]
  );

  const updateDb = useCallback(
    async (
      updater: (prev: SchoolDatabase) => SchoolDatabase,
      toastText?: string,
      options?: { graduatedSiswaIds?: string[]; skipOAuthAutoSync?: boolean }
    ): Promise<boolean> => {
      return enqueueMutation(async () => {
        const prevDb = dbRef.current;
        const finalDb = normalizeSchoolDatabase(updater(prevDb));
        dbRef.current = finalDb;
        setDb(finalDb);
        setSchoolInfo(finalDb.pengaturanSekolah);

        const authToken = tokenRef.current;
        if (!authToken && !currentUserRef.current) return false;

        setSaving(true);
        try {
          const payload =
            options?.graduatedSiswaIds && options.graduatedSiswaIds.length > 0
              ? { ...finalDb, graduatedSiswaIds: options.graduatedSiswaIds }
              : finalDb;
          const res = await apiFetch(
            '/api/db',
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
            authToken
          );
          const json = await safeJson(res);

          if (res.status === 401) {
            // Rollback optimistic update & clear stale session
            dbRef.current = prevDb;
            setDb(prevDb);
            setSchoolInfo(prevDb.pengaturanSekolah);
            setToken(null);
            setCurrentUser(null);
            addToast('Sesi login berakhir. Perubahan dibatalkan, silakan masuk kembali.', 'error');
            return false;
          }

          if (!res.ok || !json?.ok) {
            // Rollback optimistic state so UI never lies about failed persistence
            dbRef.current = prevDb;
            setDb(prevDb);
            setSchoolInfo(prevDb.pengaturanSekolah);
            addToast(json?.error || 'Gagal menyimpan perubahan ke server.', 'error');
            return false;
          }

          const authoritativeDb = normalizeSchoolDatabase((json.data as SchoolDatabase) || finalDb);
          dbRef.current = authoritativeDb;
          setDb(authoritativeDb);
          setSchoolInfo(authoritativeDb.pengaturanSekolah);
          if (typeof json.dbVersion === 'number') {
            dbVersionRef.current = json.dbVersion;
          }
          if (json.syncStatus) setSyncStatus(json.syncStatus);
          if (toastText) addToast(toastText, 'success');

          if (
            authoritativeDb.pengaturanSekolah.gas_webapp_url &&
            json.syncStatus?.lastError
          ) {
            addToast(
              `Data tersimpan di aplikasi, namun gagal sinkron ke Google Sheets: ${json.syncStatus.lastError}`,
              'error'
            );
          }

          if (!options?.skipOAuthAutoSync) {
            scheduleRealtimeOAuthSync(authoritativeDb, json.dbVersion);
          }
          return true;
        } catch {
          dbRef.current = prevDb;
          setDb(prevDb);
          setSchoolInfo(prevDb.pengaturanSekolah);
          addToast('Koneksi terputus saat menyimpan data. Perubahan dibatalkan.', 'error');
          return false;
        } finally {
          setSaving(false);
        }
      });
    },
    [enqueueMutation, addToast, scheduleRealtimeOAuthSync]
  );

  const deleteSiswaWithCleanup = useCallback(
    async (siswaId: string) => {
      const target = dbRef.current.siswa.find((s) => s.siswa_id === siswaId);
      const label = target
        ? `Data murid ${target.nama_anak} dan seluruh catatannya dihapus.`
        : 'Data murid dihapus.';
      await updateDb((prev) => purgeStudentsFromDatabase(prev, [siswaId]), label);
    },
    [updateDb]
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
          gas_webapp_url: prev.pengaturanSekolah.gas_webapp_url || '',
          gas_sync_key: prev.pengaturanSekolah.gas_sync_key || fresh.pengaturanSekolah.gas_sync_key,
          google_spreadsheet_id: prev.pengaturanSekolah.google_spreadsheet_id || '',
          google_spreadsheet_url: prev.pengaturanSekolah.google_spreadsheet_url || '',
          auto_sync_sheets: prev.pengaturanSekolah.auto_sync_sheets ?? true,
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
      const authToken = tokenRef.current;
      if (!authToken && !currentUserRef.current) return { ok: false, message: 'Sesi berakhir.' };
      try {
        const res = await apiFetch(
          '/api/sheets/test',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, syncKey }),
          },
          authToken
        );
        const json = await safeJson(res);
        if (json?.syncStatus) setSyncStatus(json.syncStatus);
        if (res.ok && json?.ok) {
          const msg = `Terhubung ke Google Sheet (${json.result?.sheets || 0} tab sheet).`;
          addToast(msg, 'success');
          return { ok: true, message: msg };
        }
        const errMsg = json?.error || 'Gagal terhubung ke Google Sheets.';
        addToast(errMsg, 'error');
        return { ok: false, message: errMsg };
      } catch {
        return { ok: false, message: 'Gagal menghubungi server aplikasi.' };
      }
    },
    [addToast]
  );

  const connectGoogleSheets = useCallback(async (): Promise<boolean> => {
    try {
      const result = await googleWorkspaceSignIn();
      if (!result) return false;
      setGoogleUser(result.user);
      setGoogleConnected(true);
      setNeedsGoogleReauth(false);
      addToast(
        `Terhubung dengan Google: ${result.user.email || result.user.displayName}`,
        'success'
      );

      if (tokenRef.current) {
        await loadDbWithToken(tokenRef.current);
      }

      const sheetId = extractSpreadsheetId(
        dbRef.current.pengaturanSekolah.google_spreadsheet_id || ''
      );
      if (sheetId && dbRef.current.pengaturanSekolah.auto_sync_sheets !== false) {
        const synced = await runDirectOAuthSync(
          dbRef.current,
          sheetId,
          dbVersionRef.current,
          true
        );
        if (synced) {
          addToast('Sinkronisasi real-time Google Sheets aktif & diperbarui.', 'success');
        }
      }
      return true;
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.',
        'error'
      );
      return false;
    }
  }, [addToast, loadDbWithToken, runDirectOAuthSync]);

  const disconnectGoogleSheets = useCallback(async () => {
    if (oauthSyncTimerRef.current) {
      clearTimeout(oauthSyncTimerRef.current);
      oauthSyncTimerRef.current = null;
    }
    await googleWorkspaceSignOut();
    setGoogleUser(null);
    setGoogleConnected(false);
    if (dbRef.current.pengaturanSekolah.google_spreadsheet_id?.trim()) {
      setNeedsGoogleReauth(true);
    }
    addToast('Koneksi akun Google diputuskan.', 'info');
  }, [addToast]);

  const pullDirectFromSpreadsheet = useCallback(
    async (overrideSpreadsheetId?: string): Promise<boolean> => {
      const sheetId = extractSpreadsheetId(
        overrideSpreadsheetId || dbRef.current.pengaturanSekolah.google_spreadsheet_id || ''
      );
      if (!sheetId) {
        addToast('Belum ada ID Google Spreadsheet yang dipilih.', 'error');
        return false;
      }
      const accessToken = await getWorkspaceAccessToken();
      if (!accessToken) {
        setNeedsGoogleReauth(true);
        addToast('Silakan masuk dengan akun Google terlebih dahulu.', 'error');
        return false;
      }

      setGoogleSyncing(true);
      setSaving(true);
      try {
        const pulled = await pullSchoolDatabaseFromSpreadsheet(accessToken, sheetId, dbRef.current);
        const savedOk = await updateDb(
          () => ({
            ...pulled.db,
            pengaturanSekolah: {
              ...pulled.db.pengaturanSekolah,
              google_spreadsheet_id: pulled.meta.spreadsheetId,
              google_spreadsheet_url: pulled.meta.spreadsheetUrl,
            },
          }),
          `Data berhasil ditarik dari "${pulled.meta.title}".`,
          { skipOAuthAutoSync: true }
        );
        if (savedOk) {
          await markDirectOAuthSynced(pulled.meta);
          triggerCelebration('Data Sheet ditarik!');
        }
        return savedOk;
      } catch (err) {
        addToast(
          err instanceof Error ? err.message : 'Gagal menarik data dari Google Spreadsheet.',
          'error'
        );
        return false;
      } finally {
        setGoogleSyncing(false);
        setSaving(false);
      }
    },
    [addToast, markDirectOAuthSynced, triggerCelebration, updateDb]
  );

  const pushToSheets = useCallback(async () => {
    const authToken = tokenRef.current;
    if (!authToken && !currentUserRef.current) return;

    const currentDb = dbRef.current;
    const directSheetId = extractSpreadsheetId(
      currentDb.pengaturanSekolah.google_spreadsheet_id || ''
    );
    const gasUrl = currentDb.pengaturanSekolah.gas_webapp_url?.trim() || getClientDefaultGasUrl();

    if (!directSheetId && !gasUrl) {
      addToast(
        'Belum ada Google Sheets yang terhubung. Buka menu Sekolah untuk menghubungkan Google Spreadsheet.',
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      let didDirectSuccess = false;
      if (directSheetId) {
        const accessToken = await getWorkspaceAccessToken();
        if (accessToken) {
          didDirectSuccess = await runDirectOAuthSync(
            currentDb,
            directSheetId,
            dbVersionRef.current,
            true
          );
          if (didDirectSuccess && !gasUrl) {
            triggerCelebration('Tersinkron ke Sheet!');
            addToast('Seluruh data berhasil dikirim ke Google Spreadsheet.', 'success');
            return;
          }
        } else if (!gasUrl) {
          setNeedsGoogleReauth(true);
          addToast(
            'Sesi Google berakhir. Klik "Sambungkan Google" di bagian atas untuk mengirim langsung ke Spreadsheet.',
            'error'
          );
          return;
        }
      }

      if (gasUrl) {
        const res = await apiFetch(
          '/api/sheets/push',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: gasUrl,
              syncKey: currentDb.pengaturanSekolah.gas_sync_key,
              dbSnapshot: currentUserRef.current?.role === 'Admin' ? currentDb : undefined,
            }),
          },
          authToken
        );
        const json = await safeJson(res);
        if (json?.syncStatus) setSyncStatus(json.syncStatus);
        if (res.ok && json?.ok) {
          triggerCelebration('Tersinkron ke Sheet!');
          addToast('Seluruh data berhasil dikirim ke Google Sheets.', 'success');
        } else if (didDirectSuccess) {
          triggerCelebration('Tersinkron ke Sheet!');
          addToast('Data terkirim ke Google Spreadsheet langsung.', 'success');
        } else {
          addToast(json?.error || 'Gagal mengirim ke Google Sheets.', 'error');
        }
      } else if (!didDirectSuccess) {
        addToast('Gagal mengirim ke Google Spreadsheet. Periksa koneksi Google Anda.', 'error');
      }
    } catch {
      addToast('Koneksi terputus saat sinkronisasi.', 'error');
    } finally {
      setSaving(false);
    }
  }, [addToast, runDirectOAuthSync, triggerCelebration]);

  const pullFromSheets = useCallback(async () => {
    const authToken = tokenRef.current;
    if (!authToken && !currentUserRef.current) return;
    const currentDb = dbRef.current;
    const gasUrl = currentDb.pengaturanSekolah.gas_webapp_url?.trim() || '';
    const directSheetId = extractSpreadsheetId(
      currentDb.pengaturanSekolah.google_spreadsheet_id || ''
    );

    if (!gasUrl && directSheetId) {
      await pullDirectFromSpreadsheet(directSheetId);
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(
        '/api/sheets/pull',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: gasUrl,
            syncKey: currentDb.pengaturanSekolah.gas_sync_key,
          }),
        },
        authToken
      );
      const json = await safeJson(res);
      if (json?.syncStatus) setSyncStatus(json.syncStatus);
      if (res.ok && json?.ok && json.data) {
        const nextDb = normalizeSchoolDatabase(json.data as SchoolDatabase);
        dbRef.current = nextDb;
        setDb(nextDb);
        setSchoolInfo(nextDb.pengaturanSekolah);
        if (typeof json.dbVersion === 'number') {
          dbVersionRef.current = json.dbVersion;
        }
        addToast('Data terbaru berhasil ditarik dari Google Sheets.', 'success');
      } else {
        addToast(json?.error || 'Gagal menarik data dari Google Sheets.', 'error');
      }
    } catch {
      addToast('Koneksi terputus saat menarik data.', 'error');
    } finally {
      setSaving(false);
    }
  }, [addToast, pullDirectFromSpreadsheet]);

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
        googleUser,
        googleConnected,
        googleSyncing,
        needsGoogleReauth,
        celebration,
        triggerCelebration,
        login,
        setupAdmin,
        refreshSchoolInfo,
        createUserByAdmin,
        deleteUserByAdmin,
        deleteSiswaWithCleanup,
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
        connectGoogleSheets,
        disconnectGoogleSheets,
        syncDirectToSpreadsheet,
        pullDirectFromSpreadsheet,
        markDirectOAuthSynced,
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
