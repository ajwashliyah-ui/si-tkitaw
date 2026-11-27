import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createInitialSeedDatabase } from '../src/data/seedDatabase';
import { KelasType, SchoolDatabase, User, UserRole } from '../src/types';
import { getNextClassTarget } from '../src/utils/kelas';
import {
  isAdminClaimedDb,
  isUserActive,
  mergePulledGasDatabase,
  normalizeSchoolDatabase,
  normalizeUsernameStr,
} from '../src/utils/normalizeDb';
import { purgeStudentsFromDatabase } from '../src/utils/studentCleanup';

const SESSION_COOKIE_NAME = 'tk_aw_session';
const HYDRATE_TTL_MS = 15000;
const FORCE_HYDRATE_MIN_INTERVAL_MS = 2500;
const LEGACY_BROKEN_GAS_URLS = new Set([
  'https://script.google.com/macros/s/AKfycbx7YdlltbMU1AYi1wKghGf1fGL5g4HU2dZqB2dhJri0w36UuT3mgp43ivXTIA51niJn2g/exec',
]);

export interface SessionEntry {
  user: Omit<User, 'password_hash' | 'password'>;
  expiresAt: number;
}

export interface SyncStatusState {
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  schoolName: string | null;
  syncedVersion?: number;
}

export interface CreateApiAppOptions {
  dataDir?: string;
  isVercel?: boolean;
  defaultGasUrl?: string;
  gasBridgeFn?: (
    gasUrl: string,
    syncKey: string,
    action: string,
    payload?: unknown
  ) => Promise<{ ok: boolean; data?: any; school?: string; sheets?: number; error?: string }>;
}

function hashSha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hexHash] = parts;
    if (!salt || !hexHash) return false;
    try {
      const expectedBuf = Buffer.from(hexHash, 'hex');
      const actualBuf = crypto.scryptSync(password, salt, 64);
      return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const expectedBuf = Buffer.from(storedHash.toLowerCase(), 'hex');
    const actualBuf = Buffer.from(hashSha256(password), 'hex');
    return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
  }
  return false;
}

function verifyPasswordFlexible(rawPassword: unknown, storedHash: string): boolean {
  const raw = String(rawPassword ?? '');
  if (verifyPassword(raw, storedHash)) return true;
  const noNewlines = raw.replace(/[\r\n]+/g, '');
  if (noNewlines !== raw && verifyPassword(noNewlines, storedHash)) return true;
  return false;
}

function isAllowedGasUrl(rawUrl?: string): boolean {
  if (!rawUrl || !rawUrl.trim()) return false;
  if (rawUrl.includes('GANTI_DENGAN_DEPLOYMENT_ID_ANDA')) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'script.google.com' || parsed.hostname.endsWith('.googleusercontent.com'))
    );
  } catch {
    return false;
  }
}

function sanitizeDbForRole(db: SchoolDatabase, role: UserRole): SchoolDatabase {
  const isAdmin = role === 'Admin';
  return {
    ...db,
    pengaturanSekolah: isAdmin
      ? db.pengaturanSekolah
      : { ...db.pengaturanSekolah, gas_sync_key: '' },
    users: isAdmin ? db.users : db.users.map((u) => ({ ...u, password_hash: '' })),
  };
}

function parseCookies(req: express.Request): Record<string, string> {
  const raw = req.headers.cookie;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function isSecureRequest(req: express.Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const ssl = String(req.headers['x-forwarded-ssl'] || '')
    .trim()
    .toLowerCase();
  const origin = String(req.headers.origin || '').trim().toLowerCase();
  const referer = String(req.headers.referer || '').trim().toLowerCase();
  return Boolean(
    req.secure ||
      proto === 'https' ||
      ssl === 'on' ||
      origin.startsWith('https://') ||
      referer.startsWith('https://')
  );
}

function setSessionCookie(req: express.Request, res: express.Response, token: string): void {
  const secure = isSecureRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${60 * 60 * 12}`,
    'HttpOnly',
    secure ? 'SameSite=None' : 'SameSite=Lax',
    ...(secure ? ['Secure', 'Partitioned'] : []),
  ];
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: express.Request, res: express.Response): void {
  const secure = isSecureRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    secure ? 'SameSite=None' : 'SameSite=Lax',
    ...(secure ? ['Secure', 'Partitioned'] : []),
  ];
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function isCsrfSafeForCookieMutation(req: express.Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const xrw = String(req.headers['x-requested-with'] || '').trim().toLowerCase();
  if (xrw === 'xmlhttprequest') return true;

  const expectedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!expectedHost) return false;

  const origin = req.headers.origin;
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }
  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === expectedHost;
    } catch {
      return false;
    }
  }
  return false;
}

export function createApiApp(options: CreateApiAppOptions = {}): express.Express {
  const IS_VERCEL = options.isVercel ?? Boolean(process.env.VERCEL);
  const DATA_DIR = options.dataDir
    ? path.resolve(options.dataDir)
    : IS_VERCEL
    ? path.join('/tmp', 'tk-alwashliyah-data')
    : path.resolve(process.cwd(), 'data');
  const DB_FILE = path.join(DATA_DIR, 'db.json');
  const SECRET_FILE = path.join(DATA_DIR, '.session-secret');

  function loadOrCreateSessionSecret(): string {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    if (IS_VERCEL) {
      return crypto
        .createHash('sha256')
        .update(`${process.env.VERCEL_PROJECT_ID || process.env.VERCEL_URL || 'session-v1'}:token`)
        .digest('hex');
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(SECRET_FILE)) {
        const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
        if (existing.length >= 32) return existing;
      }
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
      return generated;
    } catch {
      return crypto
        .createHash('sha256')
        .update(`${process.cwd()}:tk-alwashliyah-session-v1`)
        .digest('hex');
    }
  }

  const TOKEN_SECRET = loadOrCreateSessionSecret();
  const revokedTokens = new Set<string>();
  let memoryDbCache: SchoolDatabase | null = null;
  let dbVersion = Date.now();
  let lastLocalMutationAt = 0;
  let lastGasHydrateAt = 0;
  let gasHydrationPromise: Promise<void> | null = null;
  let gasSyncRunning: Promise<void> | null = null;
  let pendingGasSyncDb: SchoolDatabase | null = null;
  let syncStatus: SyncStatusState = {
    connected: false,
    lastSyncAt: null,
    lastError: null,
    schoolName: null,
    syncedVersion: 0,
  };

  function readDefaultGasUrl(): string {
    if (options.defaultGasUrl && isAllowedGasUrl(options.defaultGasUrl)) {
      return options.defaultGasUrl.trim();
    }
    const fromEnv = process.env.GAS_WEBAPP_URL?.trim();
    if (isAllowedGasUrl(fromEnv)) return fromEnv!;

    const candidates = [
      path.resolve(process.cwd(), 'config.js'),
      path.resolve(process.cwd(), 'dist', 'config.js'),
      path.resolve(process.cwd(), 'public', 'config.js'),
    ];
    for (const filePath of candidates) {
      try {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(
          /GAS_WEBAPP_URL\s*:\s*["'](https:\/\/script\.google\.com\/[^"']+)["']/
        );
        if (match?.[1] && isAllowedGasUrl(match[1])) {
          return match[1].trim();
        }
      } catch {
        // Ignore unreadable config file
      }
    }
    return '';
  }

  function applyDefaultGasUrl(db: SchoolDatabase): SchoolDatabase {
    const fallbackUrl = readDefaultGasUrl();
    const currentUrl = String(db.pengaturanSekolah?.gas_webapp_url || '').trim();
    const shouldReplace =
      Boolean(fallbackUrl) &&
      (!isAllowedGasUrl(currentUrl) || LEGACY_BROKEN_GAS_URLS.has(currentUrl));
    if (shouldReplace) {
      return {
        ...db,
        pengaturanSekolah: {
          ...db.pengaturanSekolah,
          gas_webapp_url: fallbackUrl,
        },
      };
    }
    return db;
  }

  let dbMutationQueue: Promise<unknown> = Promise.resolve();
  function enqueueDbMutation<T>(fn: () => Promise<T> | T): Promise<T> {
    const next = dbMutationQueue.then(
      () => fn(),
      () => fn()
    );
    dbMutationQueue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  function readDb(): SchoolDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        let seed: SchoolDatabase | null = memoryDbCache;
        if (!seed && !options.dataDir) {
          const bundledDbPath = path.resolve(process.cwd(), 'data', 'db.json');
          if (fs.existsSync(bundledDbPath)) {
            try {
              seed = JSON.parse(fs.readFileSync(bundledDbPath, 'utf8')) as SchoolDatabase;
            } catch {
              seed = null;
            }
          }
        }
        if (!seed) {
          seed = createInitialSeedDatabase();
        }
        seed = applyDefaultGasUrl(normalizeSchoolDatabase(seed));
        memoryDbCache = seed;
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
        return seed;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = applyDefaultGasUrl(
        normalizeSchoolDatabase(JSON.parse(raw) as Partial<SchoolDatabase>)
      );
      memoryDbCache = parsed;
      return parsed;
    } catch {
      if (!memoryDbCache) {
        memoryDbCache = applyDefaultGasUrl(normalizeSchoolDatabase(createInitialSeedDatabase()));
      }
      return memoryDbCache;
    }
  }

  function writeDb(db: SchoolDatabase, markMutation = true): void {
    const normalized = applyDefaultGasUrl(normalizeSchoolDatabase(db));
    dbVersion = Math.max(Date.now(), dbVersion + 1);
    if (markMutation) {
      lastLocalMutationAt = Date.now();
    }
    memoryDbCache = normalized;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.${process.pid}.${Math.random().toString(36).slice(2, 7)}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(normalized, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch {
      // Keep memory cache active if disk storage is ephemeral/restricted
    }
  }

  function issueSignedToken(user: Omit<User, 'password_hash' | 'password'>): string {
    const payloadObj: SessionEntry = {
      user,
      expiresAt: Date.now() + 1000 * 60 * 60 * 12,
    };
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
    return `${payloadB64}.${sig}`;
  }

  function verifySignedToken(token: string): SessionEntry | null {
    if (!token || revokedTokens.has(token)) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payloadB64)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionEntry;
      if (!parsed?.user || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function getAuthContext(
    req: express.Request
  ): { session: SessionEntry; token: string; source: 'bearer' | 'cookie' } | null {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const bearerToken = auth.slice(7).trim();
      const session = verifySignedToken(bearerToken);
      if (session) {
        return { session, token: bearerToken, source: 'bearer' };
      }
    }

    const cookies = parseCookies(req);
    const cookieToken = cookies[SESSION_COOKIE_NAME];
    if (cookieToken) {
      if (!isCsrfSafeForCookieMutation(req)) {
        return null;
      }
      const session = verifySignedToken(cookieToken);
      if (session) {
        return { session, token: cookieToken, source: 'cookie' };
      }
    }
    return null;
  }

  function getAuthenticatedSession(req: express.Request): SessionEntry | null {
    return getAuthContext(req)?.session ?? null;
  }

  async function defaultCallGasBridge(
    gasUrl: string,
    syncKey: string,
    action: string,
    payload: unknown = {}
  ): Promise<{ ok: boolean; data?: any; school?: string; sheets?: number; error?: string }> {
    const effectiveUrl = isAllowedGasUrl(gasUrl) ? gasUrl.trim() : readDefaultGasUrl();
    if (!isAllowedGasUrl(effectiveUrl)) {
      return {
        ok: false,
        error: 'URL Web App harus menggunakan alamat resmi https://script.google.com/macros/s/.../exec',
      };
    }
    try {
      const controller = new AbortController();
      const timeoutMs = action === 'syncFullDb' || action === 'pullFullDb' ? 25000 : 8000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(effectiveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action,
          syncKey: syncKey || 'WASHLIYAH_SYNC_2026',
          payload,
        }),
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      if (text.trim().startsWith('<')) {
        return {
          ok: false,
          error:
            'Google Apps Script mengembalikan halaman HTML. Pastikan Deploy Web App menggunakan "Who has access: Anyone" dan versi deployment terbaru.',
        };
      }
      return JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Gagal menghubungi Google Apps Script.',
      };
    }
  }

  const callGasBridge = options.gasBridgeFn || defaultCallGasBridge;

  async function executeGasSyncOnce(db: SchoolDatabase): Promise<void> {
    const rawUrl = db.pengaturanSekolah.gas_webapp_url;
    const url = isAllowedGasUrl(rawUrl) ? rawUrl.trim() : '';
    if (!isAllowedGasUrl(url)) {
      if (!db.pengaturanSekolah.google_spreadsheet_id?.trim()) {
        syncStatus = {
          ...syncStatus,
          connected: false,
          lastError: null,
        };
      }
      return;
    }
    const syncKey = db.pengaturanSekolah.gas_sync_key || 'WASHLIYAH_SYNC_2026';
    const res = await callGasBridge(url, syncKey, 'syncFullDb', db);
    if (res.ok) {
      lastGasHydrateAt = Date.now();
      syncStatus = {
        connected: true,
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        schoolName: db.pengaturanSekolah.nama_sekolah,
        syncedVersion: dbVersion,
      };
    } else {
      syncStatus = {
        ...syncStatus,
        connected: false,
        lastError: res.error || 'Gagal menyinkronkan ke Google Sheets.',
      };
    }
  }

  async function triggerAutoSyncToSheets(db: SchoolDatabase): Promise<void> {
    const url = isAllowedGasUrl(db.pengaturanSekolah.gas_webapp_url)
      ? db.pengaturanSekolah.gas_webapp_url.trim()
      : '';
    if (!isAllowedGasUrl(url)) {
      if (!db.pengaturanSekolah.google_spreadsheet_id?.trim()) {
        syncStatus = {
          ...syncStatus,
          connected: false,
          lastError: null,
        };
      }
      return;
    }

    pendingGasSyncDb = db;
    if (gasSyncRunning) {
      await gasSyncRunning;
      return;
    }

    gasSyncRunning = (async () => {
      try {
        while (pendingGasSyncDb) {
          const nextSnapshot = pendingGasSyncDb;
          pendingGasSyncDb = null;
          await executeGasSyncOnce(nextSnapshot);
        }
      } finally {
        gasSyncRunning = null;
      }
    })();

    await gasSyncRunning;
  }

  async function ensureDbHydrated(forceRefresh = false): Promise<void> {
    const current = readDb();
    const gasUrl =
      (isAllowedGasUrl(current.pengaturanSekolah.gas_webapp_url)
        ? current.pengaturanSekolah.gas_webapp_url.trim()
        : '') || readDefaultGasUrl();

    if (!isAllowedGasUrl(gasUrl)) {
      return;
    }

    const now = Date.now();
    const minInterval = forceRefresh ? FORCE_HYDRATE_MIN_INTERVAL_MS : HYDRATE_TTL_MS;
    if (lastGasHydrateAt > 0 && now - lastGasHydrateAt < minInterval) {
      return;
    }

    if (gasHydrationPromise) {
      await gasHydrationPromise;
      return;
    }

    const requestStartedAt = Date.now();
    gasHydrationPromise = (async () => {
      try {
        const latestLocal = readDb();
        const syncKey =
          process.env.GAS_SYNC_KEY?.trim() ||
          latestLocal.pengaturanSekolah.gas_sync_key ||
          'WASHLIYAH_SYNC_2026';
        const pulled = await callGasBridge(gasUrl, syncKey, 'pullFullDb');
        // Never overwrite a newer local mutation with an older pull response
        if (lastLocalMutationAt > requestStartedAt) {
          lastGasHydrateAt = Date.now();
          return;
        }
        if (pulled.ok && pulled.data && Array.isArray(pulled.data.users)) {
          const mergeRes = mergePulledGasDatabase(latestLocal, pulled.data, {
            gasUrl,
            syncKey,
          });
          if (mergeRes.adoptedRemote) {
            writeDb(mergeRes.db, false);
          } else if (
            mergeRes.db.pengaturanSekolah.gas_webapp_url !==
            latestLocal.pengaturanSekolah.gas_webapp_url
          ) {
            writeDb(mergeRes.db, false);
          }
          syncStatus = {
            ...syncStatus,
            connected: true,
            lastSyncAt: syncStatus.lastSyncAt || new Date().toISOString(),
            lastError: null,
            schoolName: mergeRes.db.pengaturanSekolah.nama_sekolah,
          };
          lastGasHydrateAt = Date.now();
          if (mergeRes.shouldBootstrapRemote) {
            void triggerAutoSyncToSheets(mergeRes.db);
          }
        }
      } catch {
        // Fall back to local/bundled db.json if GAS is temporarily unreachable
      } finally {
        gasHydrationPromise = null;
      }
    })();

    await gasHydrationPromise;
  }

  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, vercel: IS_VERCEL });
  });

  // Public school identity (never expose sync keys or user hashes)
  app.get('/api/school-info', async (req, res) => {
    const preDb = readDb();
    if (!isAdminClaimedDb(preDb)) {
      await ensureDbHydrated();
    } else {
      void ensureDbHydrated();
    }
    const db = readDb();
    const authCtx = getAuthContext(req);
    const liveUser = authCtx
      ? db.users.find((u) => u.user_id === authCtx.session.user.user_id)
      : null;
    const authenticated = Boolean(liveUser && isUserActive(liveUser));
    const { gas_sync_key: _hidden, ...publicCfg } = db.pengaturanSekolah;
    res.json({
      ok: true,
      authenticated,
      pengaturanSekolah: publicCfg,
      adminClaimed: isAdminClaimedDb(db),
      sheetsConfigured:
        isAllowedGasUrl(db.pengaturanSekolah.gas_webapp_url) ||
        Boolean(db.pengaturanSekolah.google_spreadsheet_id?.trim()),
      dbVersion,
      syncStatus,
    });
  });

  app.get('/api/sync-status', async (req, res) => {
    const preDb = readDb();
    if (!isAdminClaimedDb(preDb)) {
      await ensureDbHydrated();
    } else {
      void ensureDbHydrated();
    }
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
      return;
    }
    const db = readDb();
    const liveUser = db.users.find((u) => u.user_id === session.user.user_id);
    if (!liveUser || !isUserActive(liveUser)) {
      clearSessionCookie(req, res);
      res.status(401).json({ ok: false, error: 'Akun tidak aktif atau telah dihapus.' });
      return;
    }
    res.json({
      ok: true,
      dbVersion,
      syncStatus,
    });
  });

  // One-time initial Admin registration (locked permanently after first Admin is registered)
  app.post('/api/setup-admin', async (req, res) => {
    await ensureDbHydrated(true);
    const { username, password, nama_lengkap, no_hp } = (req.body || {}) as {
      username?: string;
      password?: string;
      nama_lengkap?: string;
      no_hp?: string;
    };

    const cleanUser = normalizeUsernameStr(username);
    const cleanNama = String(nama_lengkap || '').trim();
    const cleanPass = String(password || '').replace(/[\r\n]+/g, '');

    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      res.status(400).json({
        ok: false,
        error: 'Username 3–32 karakter (hanya huruf kecil, angka, titik, garis bawah, atau tanda hubung).',
      });
      return;
    }
    if (cleanNama.length < 2) {
      res.status(400).json({ ok: false, error: 'Nama lengkap minimal 2 karakter.' });
      return;
    }
    if (cleanPass.length < 6) {
      res.status(400).json({ ok: false, error: 'Password minimal 6 karakter.' });
      return;
    }

    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      if (isAdminClaimedDb(db)) {
        return {
          status: 403 as const,
          error: 'Akun Admin sekolah sudah terdaftar. Pendaftaran Admin hanya dapat dilakukan satu kali.',
        };
      }
      if (db.users.some((u) => normalizeUsernameStr(u.username) === cleanUser)) {
        return { status: 409 as const, error: 'Username sudah dipakai akun lain, pilih username lain.' };
      }

      const adminUser: User = {
        user_id: `USR-ADM-${Date.now().toString().slice(-5)}`,
        username: cleanUser,
        password_hash: hashPasswordScrypt(cleanPass),
        role: 'Admin',
        nama_lengkap: cleanNama,
        no_hp: String(no_hp || '').trim(),
        kelas_ampu: '',
        status_aktif: true,
      };

      db.users = [adminUser, ...db.users.filter((u) => u.role !== 'Admin')];
      db.pengaturanSekolah = {
        ...db.pengaturanSekolah,
        admin_claimed: true,
      };
      writeDb(db);
      await triggerAutoSyncToSheets(db);

      const safeUser: Omit<User, 'password_hash' | 'password'> = {
        user_id: adminUser.user_id,
        username: adminUser.username,
        role: adminUser.role,
        nama_lengkap: adminUser.nama_lengkap,
        no_hp: adminUser.no_hp,
        kelas_ampu: adminUser.kelas_ampu,
        status_aktif: adminUser.status_aktif,
      };
      const token = issueSignedToken(safeUser);
      return { status: 200 as const, token, safeUser, db };
    });

    if (outcome.status !== 200) {
      res.status(outcome.status).json({ ok: false, adminClaimed: outcome.status === 403, error: outcome.error });
      return;
    }

    setSessionCookie(req, res, outcome.token);
    res.json({
      ok: true,
      token: outcome.token,
      user: outcome.safeUser,
      adminClaimed: true,
      data: sanitizeDbForRole(outcome.db, 'Admin'),
      dbVersion,
      syncStatus,
    });
  });

  // Public self-registration is disabled; Guru & Orang Tua accounts are created exclusively by Admin
  app.post('/api/register', (_req, res) => {
    res.status(403).json({
      ok: false,
      error: 'Pendaftaran akun baru ditutup. Akun Guru dan Orang Tua hanya dibuatkan oleh Admin sekolah.',
    });
  });

  // Admin-only account creation for Guru & Orang Tua (strictly preserves single Admin)
  app.post('/api/admin/users', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== 'Admin') {
      res.status(403).json({ ok: false, error: 'Hanya Admin yang dapat membuat akun baru.' });
      return;
    }

    const { username, password, nama_lengkap, role, no_hp, kelas_ampu } = (req.body || {}) as {
      username?: string;
      password?: string;
      nama_lengkap?: string;
      role?: UserRole;
      no_hp?: string;
      kelas_ampu?: KelasType;
    };

    if (role === 'Admin') {
      res.status(403).json({ ok: false, error: 'Hanya diperbolehkan satu akun Admin sekolah.' });
      return;
    }

    const cleanUser = normalizeUsernameStr(username);
    const cleanNama = String(nama_lengkap || '').trim();
    const cleanPass = String(password || '').replace(/[\r\n]+/g, '');

    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      res.status(400).json({
        ok: false,
        error: 'Username 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung).',
      });
      return;
    }
    if (cleanNama.length < 2) {
      res.status(400).json({ ok: false, error: 'Nama lengkap minimal 2 karakter.' });
      return;
    }
    if (cleanPass.length < 6) {
      res.status(400).json({ ok: false, error: 'Password minimal 6 karakter.' });
      return;
    }

    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      if (db.users.some((u) => normalizeUsernameStr(u.username) === cleanUser)) {
        return { conflict: true as const };
      }

      const allowedRole: UserRole = role === 'Guru' ? 'Guru' : 'OrangTua';
      const cleanKelasAmpu =
        allowedRole === 'Guru' ? String(kelas_ampu || '').trim().slice(0, 60) || 'Kelas A' : '';
      const newUser: User = {
        user_id: `USR-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
        username: cleanUser,
        password_hash: hashPasswordScrypt(cleanPass),
        role: allowedRole,
        nama_lengkap: cleanNama,
        no_hp: String(no_hp || '').trim(),
        kelas_ampu: cleanKelasAmpu,
        status_aktif: true,
      };

      db.users.push(newUser);
      writeDb(db);
      await triggerAutoSyncToSheets(db);
      return { conflict: false as const, newUser };
    });

    if (outcome.conflict) {
      res.status(409).json({ ok: false, error: 'Username sudah dipakai akun lain.' });
      return;
    }

    res.json({ ok: true, user: outcome.newUser, dbVersion, syncStatus });
  });

  // Admin-only account deletion (protects Admin accounts and detaches student/class links)
  app.delete('/api/admin/users', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== 'Admin') {
      res.status(403).json({ ok: false, error: 'Hanya Admin yang dapat menghapus akun pengguna.' });
      return;
    }

    const rawId = (req.body as { user_id?: unknown } | undefined)?.user_id ?? req.query?.user_id;
    const targetUserId = typeof rawId === 'string' ? rawId.trim() : '';
    if (!targetUserId) {
      res.status(400).json({ ok: false, error: 'ID akun pengguna wajib disertakan.' });
      return;
    }

    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      const target = db.users.find((u) => u.user_id === targetUserId);
      if (!target) {
        return { status: 404 as const, error: 'Akun pengguna tidak ditemukan.' };
      }
      if (target.role === 'Admin' || target.user_id === session.user.user_id) {
        return { status: 403 as const, error: 'Akun Admin sekolah tidak dapat dihapus.' };
      }

      db.users = db.users.filter((u) => u.user_id !== targetUserId);
      db.siswa = db.siswa.map((s) =>
        s.ortu_user_id === targetUserId ? { ...s, ortu_user_id: '' } : s
      );
      db.riwayatKelas = db.riwayatKelas.map((r) =>
        r.wali_kelas_id === targetUserId ? { ...r, wali_kelas_id: '' } : r
      );

      writeDb(db);
      await triggerAutoSyncToSheets(db);
      return {
        status: 200 as const,
        users: db.users,
        siswa: db.siswa,
        riwayatKelas: db.riwayatKelas,
      };
    });

    if (outcome.status !== 200) {
      res.status(outcome.status).json({ ok: false, error: outcome.error });
      return;
    }

    res.json({
      ok: true,
      deletedUserId: targetUserId,
      users: outcome.users,
      siswa: outcome.siswa,
      riwayatKelas: outcome.riwayatKelas,
      dbVersion,
      syncStatus,
    });
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = (req.body || {}) as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ ok: false, error: 'Username dan password wajib diisi.' });
      return;
    }
    const cleanUser = normalizeUsernameStr(username);

    let db = readDb();
    const localMatch = db.users.find(
      (u) =>
        normalizeUsernameStr(u.username) === cleanUser &&
        isUserActive(u) &&
        verifyPasswordFlexible(password, u.password_hash)
    );
    if (!localMatch) {
      await ensureDbHydrated(true);
      db = readDb();
    } else {
      void ensureDbHydrated();
    }

    const claimed = isAdminClaimedDb(db);
    const matchingByUsername = db.users.filter((u) => normalizeUsernameStr(u.username) === cleanUser);

    if (matchingByUsername.length === 0) {
      const vercelEphemeralReset =
        IS_VERCEL && !claimed && !isAllowedGasUrl(readDefaultGasUrl());
      res.status(401).json({
        ok: false,
        adminClaimed: claimed,
        error: vercelEphemeralReset
          ? 'Akun belum tersimpan di sesi server Vercel ini. Silakan klik tab "Daftar Admin" atau hubungkan Google Sheets.'
          : 'Username atau password tidak sesuai.',
      });
      return;
    }

    const user = matchingByUsername.find(
      (u) => isUserActive(u) && verifyPasswordFlexible(password, u.password_hash)
    );
    if (!user) {
      const hasActive = matchingByUsername.some((u) => isUserActive(u));
      if (!hasActive) {
        res.status(403).json({
          ok: false,
          adminClaimed: claimed,
          error: 'Akun Anda sedang dinonaktifkan oleh Admin sekolah.',
        });
        return;
      }
      const missingHash = matchingByUsername.some((u) => isUserActive(u) && !u.password_hash);
      if (missingHash) {
        res.status(401).json({
          ok: false,
          adminClaimed: claimed,
          error: 'Password akun belum tersinkron. Minta Admin mengatur ulang password di menu Siswa & akun.',
        });
        return;
      }
      res.status(401).json({
        ok: false,
        adminClaimed: claimed,
        error: 'Username atau password tidak sesuai.',
      });
      return;
    }

    const safeUser: Omit<User, 'password_hash' | 'password'> = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      nama_lengkap: user.nama_lengkap,
      no_hp: user.no_hp,
      kelas_ampu: user.kelas_ampu,
      status_aktif: isUserActive(user),
    };
    const token = issueSignedToken(safeUser);
    setSessionCookie(req, res, token);

    res.json({
      ok: true,
      token,
      user: safeUser,
      adminClaimed: claimed,
      data: sanitizeDbForRole(db, user.role),
      dbVersion,
      syncStatus,
    });
  });

  app.post('/api/logout', (req, res) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      revokedTokens.add(auth.slice(7).trim());
    }
    const cookies = parseCookies(req);
    if (cookies[SESSION_COOKIE_NAME]) {
      revokedTokens.add(cookies[SESSION_COOKIE_NAME]);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post('/api/change-password', async (req, res) => {
    const authCtx = getAuthContext(req);
    if (!authCtx) {
      res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
      return;
    }
    const session = authCtx.session;
    const { lama, baru } = (req.body || {}) as { lama?: string; baru?: string };
    const cleanBaru = String(baru || '').replace(/[\r\n]+/g, '');
    if (!lama || cleanBaru.length < 6) {
      res.status(400).json({ ok: false, error: 'Password baru minimal 6 karakter.' });
      return;
    }

    const outcome = await enqueueDbMutation(async () => {
      const db = readDb();
      const idx = db.users.findIndex((u) => u.user_id === session.user.user_id);
      if (idx === -1) {
        return { status: 404 as const, error: 'Akun tidak ditemukan.' };
      }
      if (!verifyPasswordFlexible(lama, db.users[idx].password_hash)) {
        return { status: 401 as const, error: 'Password lama tidak sesuai.' };
      }
      db.users[idx] = { ...db.users[idx], password_hash: hashPasswordScrypt(cleanBaru) };
      writeDb(db);
      await triggerAutoSyncToSheets(db);
      return { status: 200 as const };
    });

    if (outcome.status !== 200) {
      res.status(outcome.status).json({ ok: false, error: outcome.error });
      return;
    }

    revokedTokens.add(authCtx.token);
    const newToken = issueSignedToken(session.user);
    setSessionCookie(req, res, newToken);
    res.json({ ok: true, token: newToken });
  });

  app.get('/api/db', async (req, res) => {
    const preDb = readDb();
    if (!isAdminClaimedDb(preDb)) {
      await ensureDbHydrated();
    } else {
      void ensureDbHydrated();
    }
    const authCtx = getAuthContext(req);
    if (!authCtx) {
      res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
      return;
    }
    const db = readDb();
    const liveUser = db.users.find((u) => u.user_id === authCtx.session.user.user_id);
    if (!liveUser || !isUserActive(liveUser)) {
      clearSessionCookie(req, res);
      res.status(401).json({ ok: false, error: 'Akun tidak aktif atau telah dihapus.' });
      return;
    }
    const safeUser: Omit<User, 'password_hash' | 'password'> = {
      user_id: liveUser.user_id,
      username: liveUser.username,
      role: liveUser.role,
      nama_lengkap: liveUser.nama_lengkap,
      no_hp: liveUser.no_hp,
      kelas_ampu: liveUser.kelas_ampu,
      status_aktif: isUserActive(liveUser),
    };
    res.json({
      ok: true,
      token: authCtx.token,
      user: safeUser,
      adminClaimed: isAdminClaimedDb(db),
      data: sanitizeDbForRole(db, liveUser.role),
      dbVersion,
      syncStatus,
    });
  });

  app.put('/api/db', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
      return;
    }
    const rawBody = (req.body || {}) as SchoolDatabase & { graduatedSiswaIds?: unknown };
    const requestedGraduatedIds: string[] = Array.isArray(rawBody.graduatedSiswaIds)
      ? rawBody.graduatedSiswaIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];
    const { graduatedSiswaIds: _ignoredGradIds, ...incoming } = rawBody;

    if (!incoming || !incoming.pengaturanSekolah || !Array.isArray(incoming.siswa)) {
      res.status(400).json({ ok: false, error: 'Format data JSON tidak valid.' });
      return;
    }

    const nextDb = await enqueueDbMutation(async () => {
      const currentDb = readDb();
      const currentUserMap = new Map(currentDb.users.map((u) => [u.user_id, u]));
      const isAdmin = session.user.role === 'Admin';
      const isGuru = session.user.role === 'Guru';

      let nextUsers = currentDb.users;
      if (isAdmin && Array.isArray(incoming.users)) {
        const mappedUsers = incoming.users.map((u) => {
          const existing = currentUserMap.get(u.user_id);
          const cleanUname = normalizeUsernameStr(u.username) || existing?.username || '';
          const rawPw = typeof u.password === 'string' ? u.password.replace(/[\r\n]+/g, '') : '';
          if (existing?.role === 'Admin') {
            const { password: _pw, ...rest } = u;
            return {
              ...rest,
              username: cleanUname,
              role: 'Admin' as const,
              status_aktif: true,
              password_hash: rawPw.trim() ? hashPasswordScrypt(rawPw) : existing.password_hash,
            };
          }
          const safeRole: UserRole = u.role === 'Guru' ? 'Guru' : 'OrangTua';
          if (rawPw.trim()) {
            const { password: _pw, ...rest } = u;
            return {
              ...rest,
              username: cleanUname,
              role: safeRole,
              password_hash: hashPasswordScrypt(rawPw),
            };
          }
          const { password: _pw, ...rest } = u;
          return {
            ...rest,
            username: cleanUname,
            role: safeRole,
            password_hash: u.password_hash || existing?.password_hash || '',
          };
        });
        const existingAdmins = currentDb.users.filter((u) => u.role === 'Admin');
        for (const adm of existingAdmins) {
          if (!mappedUsers.some((u) => u.user_id === adm.user_id)) {
            mappedUsers.unshift(adm);
          }
        }
        nextUsers = mappedUsers;
      }

      let nextSiswa = currentDb.siswa;
      if (isAdmin) {
        nextSiswa = incoming.siswa;
      } else if (isGuru) {
        const incomingMap = new Map(incoming.siswa.map((s) => [s.siswa_id, s]));
        nextSiswa = currentDb.siswa.map((s) => incomingMap.get(s.siswa_id) || s);
      }

      const incomingGasRaw =
        typeof incoming.pengaturanSekolah.gas_webapp_url === 'string'
          ? incoming.pengaturanSekolah.gas_webapp_url.trim()
          : undefined;
      const resolvedGasUrl =
        incomingGasRaw === ''
          ? ''
          : incomingGasRaw && isAllowedGasUrl(incomingGasRaw)
          ? incomingGasRaw
          : currentDb.pengaturanSekolah.gas_webapp_url || '';

      let mergedDb: SchoolDatabase = normalizeSchoolDatabase({
        ...currentDb,
        ...(isAdmin ? incoming : {}),
        ...(isGuru
          ? {
              antropometri: incoming.antropometri ?? currentDb.antropometri,
              literasi: incoming.literasi ?? currentDb.literasi,
              keagamaan: incoming.keagamaan ?? currentDb.keagamaan,
              logMateriHarian: incoming.logMateriHarian ?? currentDb.logMateriHarian,
              daftarHadir: incoming.daftarHadir ?? currentDb.daftarHadir,
              asesmenAnekdot: incoming.asesmenAnekdot ?? currentDb.asesmenAnekdot,
              asesmenHasilKarya: incoming.asesmenHasilKarya ?? currentDb.asesmenHasilKarya,
              asesmenCeklis: incoming.asesmenCeklis ?? currentDb.asesmenCeklis,
              riwayatKelas: incoming.riwayatKelas ?? currentDb.riwayatKelas,
              ulasanOrtu: incoming.ulasanOrtu ?? currentDb.ulasanOrtu,
            }
          : {}),
        ...(session.user.role === 'OrangTua'
          ? {
              kaihHarian: incoming.kaihHarian ?? currentDb.kaihHarian,
              kaihFotoBulanan: incoming.kaihFotoBulanan ?? currentDb.kaihFotoBulanan,
              ulasanOrtu: incoming.ulasanOrtu ?? currentDb.ulasanOrtu,
            }
          : {}),
        pengaturanSekolah: isAdmin
          ? {
              ...incoming.pengaturanSekolah,
              gas_webapp_url: resolvedGasUrl,
              admin_claimed:
                isAdminClaimedDb(currentDb) || Boolean(incoming.pengaturanSekolah.admin_claimed),
            }
          : currentDb.pengaturanSekolah,
        users: nextUsers,
        siswa: nextSiswa,
      });

      const approvedPurgeIds = new Set<string>();
      if (isAdmin) {
        for (const id of requestedGraduatedIds) approvedPurgeIds.add(id);
        for (const s of mergedDb.siswa) {
          if (s.status_siswa === 'Lulus' || s.kelas_aktif === 'Lulus') {
            approvedPurgeIds.add(s.siswa_id);
          }
        }
      } else if (isGuru) {
        const currentSiswaMap = new Map(currentDb.siswa.map((s) => [s.siswa_id, s]));
        const incomingSiswaMap = new Map(incoming.siswa.map((s) => [s.siswa_id, s]));
        for (const id of requestedGraduatedIds) {
          const existing = currentSiswaMap.get(id);
          if (!existing) continue;
          const inc = incomingSiswaMap.get(id);
          const canGraduate =
            existing.status_siswa === 'Lulus' ||
            existing.kelas_aktif === 'Lulus' ||
            existing.keputusan_kenaikan === 'LULUS_KE_SD' ||
            inc?.keputusan_kenaikan === 'LULUS_KE_SD' ||
            inc?.status_siswa === 'Lulus' ||
            inc?.kelas_aktif === 'Lulus' ||
            getNextClassTarget(currentDb, existing.kelas_aktif).isFinal;
          if (canGraduate) {
            approvedPurgeIds.add(id);
          }
        }
        for (const s of mergedDb.siswa) {
          if (s.status_siswa === 'Lulus' || s.kelas_aktif === 'Lulus') {
            approvedPurgeIds.add(s.siswa_id);
          }
        }
      }

      if (approvedPurgeIds.size > 0) {
        mergedDb = purgeStudentsFromDatabase(mergedDb, approvedPurgeIds);
      }

      writeDb(mergedDb);
      await triggerAutoSyncToSheets(mergedDb);
      return mergedDb;
    });

    res.json({
      ok: true,
      data: sanitizeDbForRole(nextDb, session.user.role),
      dbVersion,
      syncStatus,
    });
  });

  app.post('/api/sheets/oauth-sync', (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
      return;
    }
    const { ok: syncOk, schoolName, syncedVersion, error } = (req.body || {}) as {
      ok?: boolean;
      schoolName?: string;
      syncedVersion?: number;
      error?: string;
    };
    const db = readDb();
    if (syncOk) {
      syncStatus = {
        connected: true,
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        schoolName: schoolName || db.pengaturanSekolah.nama_sekolah,
        syncedVersion: typeof syncedVersion === 'number' ? syncedVersion : dbVersion,
      };
    } else {
      syncStatus = {
        ...syncStatus,
        lastError: error || 'Gagal sinkronisasi ke Google Sheets.',
      };
    }
    res.json({ ok: true, dbVersion, syncStatus });
  });

  app.post('/api/sheets/test', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== 'Admin') {
      res.status(403).json({ ok: false, error: 'Hanya Admin yang dapat menguji koneksi.' });
      return;
    }
    const { url, syncKey } = (req.body || {}) as { url?: string; syncKey?: string };
    const db = readDb();
    const targetUrl =
      (isAllowedGasUrl(url) ? url!.trim() : '') ||
      db.pengaturanSekolah.gas_webapp_url ||
      readDefaultGasUrl();
    const targetKey = syncKey || db.pengaturanSekolah.gas_sync_key || 'WASHLIYAH_SYNC_2026';

    const result = await callGasBridge(targetUrl, targetKey, 'ping');
    if (result.ok) {
      if (targetUrl && db.pengaturanSekolah.gas_webapp_url !== targetUrl) {
        db.pengaturanSekolah.gas_webapp_url = targetUrl;
        db.pengaturanSekolah.gas_sync_key = targetKey;
        writeDb(db);
      }
      syncStatus = {
        connected: true,
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        schoolName: result.school || db.pengaturanSekolah.nama_sekolah,
      };
      res.json({ ok: true, result, syncStatus });
    } else {
      syncStatus = {
        ...syncStatus,
        connected: false,
        lastError: result.error || 'Koneksi gagal.',
      };
      res.status(400).json({ ok: false, error: result.error, syncStatus });
    }
  });

  app.post('/api/sheets/push', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== 'Admin') {
      res.status(403).json({ ok: false, error: 'Hanya Admin yang dapat mengirim data ke Sheet.' });
      return;
    }
    const { url, syncKey, dbSnapshot } = (req.body || {}) as {
      url?: string;
      syncKey?: string;
      dbSnapshot?: SchoolDatabase;
    };
    const currentDb = readDb();
    let effectiveDb = currentDb;
    if (dbSnapshot && dbSnapshot.pengaturanSekolah && Array.isArray(dbSnapshot.siswa)) {
      const currentUserMap = new Map(currentDb.users.map((u) => [u.user_id, u]));
      const mergedUsers = Array.isArray(dbSnapshot.users)
        ? dbSnapshot.users.map((u) => {
            const existing = currentUserMap.get(u.user_id);
            return {
              ...u,
              password_hash: existing?.password_hash || u.password_hash || '',
            };
          })
        : currentDb.users;
      effectiveDb = normalizeSchoolDatabase({
        ...currentDb,
        ...dbSnapshot,
        users: mergedUsers,
        pengaturanSekolah: {
          ...currentDb.pengaturanSekolah,
          ...dbSnapshot.pengaturanSekolah,
          admin_claimed:
            isAdminClaimedDb(currentDb) || Boolean(dbSnapshot.pengaturanSekolah.admin_claimed),
        },
      });
    }

    const targetUrl =
      (isAllowedGasUrl(url) ? url!.trim() : '') ||
      effectiveDb.pengaturanSekolah.gas_webapp_url ||
      readDefaultGasUrl();
    const targetKey =
      syncKey || effectiveDb.pengaturanSekolah.gas_sync_key || 'WASHLIYAH_SYNC_2026';

    if (targetUrl) {
      effectiveDb.pengaturanSekolah = {
        ...effectiveDb.pengaturanSekolah,
        gas_webapp_url: targetUrl,
        gas_sync_key: targetKey,
      };
    }
    writeDb(effectiveDb);

    const result = await callGasBridge(targetUrl, targetKey, 'syncFullDb', effectiveDb);
    if (result.ok) {
      lastGasHydrateAt = Date.now();
      syncStatus = {
        connected: true,
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        schoolName: effectiveDb.pengaturanSekolah.nama_sekolah,
      };
      res.json({ ok: true, syncStatus });
    } else {
      syncStatus = {
        ...syncStatus,
        connected: false,
        lastError: result.error || 'Gagal mengirim ke Google Sheets.',
      };
      res.status(400).json({ ok: false, error: syncStatus.lastError, syncStatus });
    }
  });

  app.post('/api/sheets/pull', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.user.role !== 'Admin') {
      res.status(403).json({ ok: false, error: 'Hanya Admin yang dapat menarik data dari Sheet.' });
      return;
    }
    const { url, syncKey } = (req.body || {}) as { url?: string; syncKey?: string };
    const db = readDb();
    const targetUrl =
      (isAllowedGasUrl(url) ? url!.trim() : '') ||
      db.pengaturanSekolah.gas_webapp_url ||
      readDefaultGasUrl();
    const targetKey = db.pengaturanSekolah.gas_sync_key || syncKey || 'WASHLIYAH_SYNC_2026';
    const result = await callGasBridge(targetUrl, targetKey, 'pullFullDb');
    if (!result.ok || !result.data) {
      res.status(400).json({ ok: false, error: result.error || 'Gagal menarik data dari Google Sheets.' });
      return;
    }

    const mergedRes = mergePulledGasDatabase(db, result.data, {
      gasUrl: targetUrl,
      syncKey: targetKey,
      forceRemote: true,
    });
    writeDb(mergedRes.db);
    lastGasHydrateAt = Date.now();
    syncStatus = {
      connected: true,
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      schoolName: mergedRes.db.pengaturanSekolah.nama_sekolah,
    };
    res.json({ ok: true, data: mergedRes.db, syncStatus });
  });

  return app;
}
