import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createInitialSeedDatabase } from '../src/data/seedDatabase';
import { KelasType, SchoolDatabase, User, UserRole } from '../src/types';
import { getNextClassTarget } from '../src/utils/kelas';
import { purgeStudentsFromDatabase } from '../src/utils/studentCleanup';

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'tk-alwashliyah-data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  (IS_VERCEL
    ? crypto
        .createHash('sha256')
        .update(`${process.env.VERCEL_PROJECT_ID || process.env.VERCEL_URL || 'session-v1'}:token`)
        .digest('hex')
    : crypto.randomBytes(32).toString('hex'));

export interface SessionEntry {
  user: Omit<User, 'password_hash' | 'password'>;
  expiresAt: number;
}

export interface SyncStatusState {
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  schoolName: string | null;
}

const revokedTokens = new Set<string>();
let memoryDbCache: SchoolDatabase | null = null;
let syncStatus: SyncStatusState = {
  connected: false,
  lastSyncAt: null,
  lastError: null,
  schoolName: null,
};

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

function isAdminClaimed(db: SchoolDatabase): boolean {
  return Boolean(db.pengaturanSekolah.admin_claimed) || db.users.some((u) => u.role === 'Admin' && u.status_aktif);
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
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
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

function applyDefaultGasUrl(db: SchoolDatabase): SchoolDatabase {
  if (!isAllowedGasUrl(db.pengaturanSekolah?.gas_webapp_url)) {
    const fallbackUrl = readDefaultGasUrl();
    if (fallbackUrl) {
      return {
        ...db,
        pengaturanSekolah: {
          ...db.pengaturanSekolah,
          gas_webapp_url: fallbackUrl,
        },
      };
    }
  }
  return db;
}

function readDb(): SchoolDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      let seed: SchoolDatabase | null = memoryDbCache;
      if (!seed && IS_VERCEL) {
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
      seed = applyDefaultGasUrl(seed);
      memoryDbCache = seed;
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = applyDefaultGasUrl(JSON.parse(raw) as SchoolDatabase);
    memoryDbCache = parsed;
    return parsed;
  } catch {
    if (!memoryDbCache) {
      memoryDbCache = applyDefaultGasUrl(createInitialSeedDatabase());
    }
    return memoryDbCache;
  }
}

function writeDb(db: SchoolDatabase): void {
  memoryDbCache = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Keep memory cache active if disk storage is ephemeral/restricted
  }
}

function getAuthenticatedSession(req: express.Request): SessionEntry | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return verifySignedToken(token);
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

function readDefaultGasUrl(): string {
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
      const match = content.match(/GAS_WEBAPP_URL\s*:\s*["'](https:\/\/script\.google\.com\/[^"']+)["']/);
      if (match?.[1] && isAllowedGasUrl(match[1])) {
        return match[1].trim();
      }
    } catch {
      // Ignore unreadable config file
    }
  }
  return '';
}

async function callGasBridge(
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
    const timer = setTimeout(() => controller.abort(), 15000);
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
    const json = JSON.parse(text);
    return json;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menghubungi Google Apps Script.',
    };
  }
}

async function triggerAutoSyncToSheets(db: SchoolDatabase): Promise<void> {
  const url = isAllowedGasUrl(db.pengaturanSekolah.gas_webapp_url)
    ? db.pengaturanSekolah.gas_webapp_url
    : readDefaultGasUrl();
  if (!isAllowedGasUrl(url)) return;
  const syncKey = db.pengaturanSekolah.gas_sync_key || 'WASHLIYAH_SYNC_2026';
  const res = await callGasBridge(url, syncKey, 'syncFullDb', db);
  if (res.ok) {
    syncStatus = {
      connected: true,
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      schoolName: db.pengaturanSekolah.nama_sekolah,
    };
  } else {
    syncStatus = {
      ...syncStatus,
      connected: false,
      lastError: res.error || 'Gagal menyinkronkan ke Google Sheets.',
    };
  }
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, vercel: IS_VERCEL });
  });

  // Public school identity (never expose sync keys or user hashes)
  app.get('/api/school-info', (_req, res) => {
    const db = readDb();
    const { gas_sync_key: _hidden, ...publicCfg } = db.pengaturanSekolah;
    res.json({
      ok: true,
      pengaturanSekolah: publicCfg,
      adminClaimed: isAdminClaimed(db),
      sheetsConfigured: isAllowedGasUrl(db.pengaturanSekolah.gas_webapp_url),
      syncStatus,
    });
  });

  // One-time initial Admin registration (locked permanently after first Admin is registered)
  app.post('/api/setup-admin', async (req, res) => {
    const db = readDb();
    if (isAdminClaimed(db)) {
      res.status(403).json({
        ok: false,
        error: 'Akun Admin sekolah sudah terdaftar. Pendaftaran Admin hanya dapat dilakukan satu kali.',
      });
      return;
    }

    const { username, password, nama_lengkap, no_hp } = (req.body || {}) as {
      username?: string;
      password?: string;
      nama_lengkap?: string;
      no_hp?: string;
    };

    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanNama = String(nama_lengkap || '').trim();
    const cleanPass = String(password || '');

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
    if (db.users.some((u) => u.username.toLowerCase() === cleanUser)) {
      res.status(409).json({ ok: false, error: 'Username sudah dipakai akun lain, pilih username lain.' });
      return;
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
    void triggerAutoSyncToSheets(db);

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

    res.json({
      ok: true,
      token,
      user: safeUser,
      adminClaimed: true,
      data: sanitizeDbForRole(db, 'Admin'),
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

    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanNama = String(nama_lengkap || '').trim();
    const cleanPass = String(password || '');

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

    const db = readDb();
    if (db.users.some((u) => u.username.toLowerCase() === cleanUser)) {
      res.status(409).json({ ok: false, error: 'Username sudah dipakai akun lain.' });
      return;
    }

    const allowedRole: UserRole = role === 'Guru' ? 'Guru' : 'OrangTua';
    const cleanKelasAmpu =
      allowedRole === 'Guru' ? String(kelas_ampu || '').trim().slice(0, 60) || 'Kelas A' : '';
    const newUser: User = {
      user_id: `USR-${Date.now().toString().slice(-6)}`,
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

    res.json({ ok: true, user: newUser, syncStatus });
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

    const db = readDb();
    const target = db.users.find((u) => u.user_id === targetUserId);
    if (!target) {
      res.status(404).json({ ok: false, error: 'Akun pengguna tidak ditemukan.' });
      return;
    }
    if (target.role === 'Admin' || target.user_id === session.user.user_id) {
      res.status(403).json({ ok: false, error: 'Akun Admin sekolah tidak dapat dihapus.' });
      return;
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

    res.json({
      ok: true,
      deletedUserId: targetUserId,
      users: db.users,
      siswa: db.siswa,
      riwayatKelas: db.riwayatKelas,
      syncStatus,
    });
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = (req.body || {}) as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ ok: false, error: 'Username dan password wajib diisi.' });
      return;
    }
    const db = readDb();
    const cleanUser = String(username).trim().toLowerCase();
    const user = db.users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser &&
        u.status_aktif &&
        verifyPassword(String(password), u.password_hash)
    );
    if (!user) {
      res.status(401).json({ ok: false, error: 'Username atau password tidak sesuai.' });
      return;
    }

    const safeUser: Omit<User, 'password_hash' | 'password'> = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      nama_lengkap: user.nama_lengkap,
      no_hp: user.no_hp,
      kelas_ampu: user.kelas_ampu,
      status_aktif: user.status_aktif,
    };
    const token = issueSignedToken(safeUser);

    res.json({
      ok: true,
      token,
      user: safeUser,
      data: sanitizeDbForRole(db, user.role),
      syncStatus,
    });
  });

  app.post('/api/logout', (req, res) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      revokedTokens.add(auth.slice(7).trim());
    }
    res.json({ ok: true });
  });

  app.post('/api/change-password', (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
      return;
    }
    const { lama, baru } = (req.body || {}) as { lama?: string; baru?: string };
    if (!lama || !baru || String(baru).length < 6) {
      res.status(400).json({ ok: false, error: 'Password baru minimal 6 karakter.' });
      return;
    }
    const db = readDb();
    const idx = db.users.findIndex((u) => u.user_id === session.user.user_id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Akun tidak ditemukan.' });
      return;
    }
    if (!verifyPassword(String(lama), db.users[idx].password_hash)) {
      res.status(401).json({ ok: false, error: 'Password lama tidak sesuai.' });
      return;
    }
    db.users[idx] = { ...db.users[idx], password_hash: hashPasswordScrypt(String(baru)) };
    writeDb(db);
    void triggerAutoSyncToSheets(db);

    const oldAuth = req.headers.authorization;
    if (oldAuth && oldAuth.startsWith('Bearer ')) {
      revokedTokens.add(oldAuth.slice(7).trim());
    }
    const newToken = issueSignedToken(session.user);
    res.json({ ok: true, token: newToken });
  });

  app.get('/api/db', (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ ok: false, error: 'Silakan masuk terlebih dahulu.' });
      return;
    }
    const db = readDb();
    res.json({
      ok: true,
      data: sanitizeDbForRole(db, session.user.role),
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
    const currentDb = readDb();
    const currentUserMap = new Map(currentDb.users.map((u) => [u.user_id, u]));
    const isAdmin = session.user.role === 'Admin';
    const isGuru = session.user.role === 'Guru';

    let nextUsers = currentDb.users;
    if (isAdmin && Array.isArray(incoming.users)) {
      const mappedUsers = incoming.users.map((u) => {
        const existing = currentUserMap.get(u.user_id);
        if (existing?.role === 'Admin') {
          return {
            ...u,
            role: 'Admin' as const,
            status_aktif: true,
            password_hash:
              u.password && u.password.trim()
                ? hashPasswordScrypt(u.password)
                : existing.password_hash,
          };
        }
        if (u.password && u.password.trim()) {
          const { password: _pw, ...rest } = u;
          return { ...rest, password_hash: hashPasswordScrypt(u.password) };
        }
        return {
          ...u,
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

    let nextDb: SchoolDatabase = {
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
            gas_webapp_url: isAllowedGasUrl(incoming.pengaturanSekolah.gas_webapp_url)
              ? incoming.pengaturanSekolah.gas_webapp_url.trim()
              : currentDb.pengaturanSekolah.gas_webapp_url || readDefaultGasUrl(),
            admin_claimed:
              isAdminClaimed(currentDb) || Boolean(incoming.pengaturanSekolah.admin_claimed),
          }
        : currentDb.pengaturanSekolah,
      users: nextUsers,
      siswa: nextSiswa,
    };

    const approvedPurgeIds = new Set<string>();
    if (isAdmin) {
      for (const id of requestedGraduatedIds) approvedPurgeIds.add(id);
      for (const s of nextDb.siswa) {
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
      for (const s of nextDb.siswa) {
        if (s.status_siswa === 'Lulus' || s.kelas_aktif === 'Lulus') {
          approvedPurgeIds.add(s.siswa_id);
        }
      }
    }

    if (approvedPurgeIds.size > 0) {
      nextDb = purgeStudentsFromDatabase(nextDb, approvedPurgeIds);
    }

    writeDb(nextDb);
    await triggerAutoSyncToSheets(nextDb);
    res.json({ ok: true, syncStatus });
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
      effectiveDb = {
        ...currentDb,
        ...dbSnapshot,
        users: mergedUsers,
        pengaturanSekolah: {
          ...currentDb.pengaturanSekolah,
          ...dbSnapshot.pengaturanSekolah,
          admin_claimed:
            isAdminClaimed(currentDb) || Boolean(dbSnapshot.pengaturanSekolah.admin_claimed),
        },
      };
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
    const targetUrl = db.pengaturanSekolah.gas_webapp_url || url || '';
    const targetKey = db.pengaturanSekolah.gas_sync_key || syncKey || 'WASHLIYAH_SYNC_2026';
    const result = await callGasBridge(targetUrl, targetKey, 'pullFullDb');
    if (!result.ok || !result.data) {
      res.status(400).json({ ok: false, error: result.error || 'Gagal menarik data dari Google Sheets.' });
      return;
    }
    const pulledUsers: User[] = Array.isArray(result.data.users) ? result.data.users : db.users;
    const currentAdmins = db.users.filter((u) => u.role === 'Admin');
    const mergedUsers = [...pulledUsers];
    for (const adm of currentAdmins) {
      if (!mergedUsers.some((u) => u.user_id === adm.user_id || u.role === 'Admin')) {
        mergedUsers.unshift(adm);
      }
    }

    const merged: SchoolDatabase = {
      ...db,
      ...result.data,
      users: mergedUsers,
      pengaturanSekolah: {
        ...db.pengaturanSekolah,
        ...(result.data.pengaturanSekolah || {}),
        gas_webapp_url: targetUrl,
        gas_sync_key: targetKey,
        admin_claimed:
          isAdminClaimed(db) || Boolean(result.data.pengaturanSekolah?.admin_claimed),
      },
    };
    writeDb(merged);
    syncStatus = {
      connected: true,
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      schoolName: merged.pengaturanSekolah.nama_sekolah,
    };
    res.json({ ok: true, data: merged, syncStatus });
  });

  return app;
}
