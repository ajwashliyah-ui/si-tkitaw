import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApiApp } from './app';
import { createInitialSeedDatabase } from '../src/data/seedDatabase';

function startTestServer(app: ReturnType<typeof createApiApp>): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise<void>((resClose) => {
            server.close(() => resClose());
          }),
      });
    });
  });
}

test('HttpOnly cookie reload persistence, CSRF check, and real-time GAS cold-start hydration', async () => {
  const tmpDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-test-a-'));
  const tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-test-b-'));

  // Shared mock Google Sheets backing store (starts empty / unclaimed)
  let remoteSheetDb = createInitialSeedDatabase();
  remoteSheetDb.pengaturanSekolah.admin_claimed = false;
  let syncCalls = 0;

  const mockGasBridge = async (
    _gasUrl: string,
    _syncKey: string,
    action: string,
    payload?: unknown
  ) => {
    if (action === 'ping') {
      return { ok: true, school: remoteSheetDb.pengaturanSekolah.nama_sekolah, sheets: 22 };
    }
    if (action === 'syncFullDb') {
      syncCalls += 1;
      remoteSheetDb = JSON.parse(JSON.stringify(payload));
      return { ok: true };
    }
    if (action === 'pullFullDb') {
      return { ok: true, data: JSON.parse(JSON.stringify(remoteSheetDb)) };
    }
    return { ok: false, error: 'Unknown action' };
  };

  // Seed container A with an unclaimed DB
  const seedA = createInitialSeedDatabase();
  seedA.pengaturanSekolah.admin_claimed = false;
  seedA.pengaturanSekolah.gas_webapp_url = 'https://script.google.com/macros/s/MOCK_SHEET/exec';
  fs.writeFileSync(path.join(tmpDirA, 'db.json'), JSON.stringify(seedA, null, 2), 'utf8');

  const appA = createApiApp({
    dataDir: tmpDirA,
    isVercel: true,
    defaultGasUrl: 'https://script.google.com/macros/s/MOCK_SHEET/exec',
    gasBridgeFn: mockGasBridge,
  });
  const srvA = await startTestServer(appA);

  try {
    // 1. Before setup, school-info shows adminClaimed: false
    const preInfo = await fetch(`${srvA.baseUrl}/api/school-info`).then((r) => r.json());
    assert.equal(preInfo.adminClaimed, false);

    // 2. Claim Admin once via setup-admin
    const setupRes = await fetch(`${srvA.baseUrl}/api/setup-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        username: 'admin_sekolah',
        password: 'password123',
        nama_lengkap: 'Kepala Sekolah TK',
        no_hp: '08123456789',
      }),
    });
    assert.equal(setupRes.status, 200);
    const setCookie = setupRes.headers.get('set-cookie') || '';
    assert.match(setCookie, /tk_aw_session=/);
    assert.match(setCookie, /HttpOnly/i);
    const cookiePair = setCookie.split(';')[0];
    const setupJson = await setupRes.json();
    assert.equal(setupJson.adminClaimed, true);
    assert.equal(syncCalls >= 1, true);
    assert.equal(remoteSheetDb.pengaturanSekolah.admin_claimed, true);

    // 3. Second setup-admin must fail with 403
    const dupSetupRes = await fetch(`${srvA.baseUrl}/api/setup-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        username: 'admin2',
        password: 'password123',
        nama_lengkap: 'Admin Kedua',
      }),
    });
    assert.equal(dupSetupRes.status, 403);

    // 4. Reload simulation: GET /api/db using ONLY HttpOnly cookie (no Authorization header)
    const reloadDbRes = await fetch(`${srvA.baseUrl}/api/db`, {
      headers: {
        Cookie: cookiePair,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    assert.equal(reloadDbRes.status, 200);
    const reloadDbJson = await reloadDbRes.json();
    assert.equal(reloadDbJson.ok, true);
    assert.equal(reloadDbJson.user.username, 'admin_sekolah');
    assert.equal(reloadDbJson.adminClaimed, true);
    assert.ok(reloadDbJson.token);

    // 5. CSRF check: cookie-authenticated PUT /api/db without X-Requested-With & Origin is rejected
    const csrfBlockedRes = await fetch(`${srvA.baseUrl}/api/db`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookiePair,
      },
      body: JSON.stringify(reloadDbJson.data),
    });
    assert.equal(csrfBlockedRes.status, 401);

    // 6. Cookie-authenticated PUT /api/db WITH X-Requested-With succeeds & pushes to Google Sheets
    const updatedSiswaPayload = {
      ...reloadDbJson.data,
      siswa: [
        ...reloadDbJson.data.siswa,
        {
          siswa_id: 'SIS-NEW-999',
          nis: '2627999',
          nama_anak: 'Murid Baru Sync',
          jenis_kelamin: 'L',
          tanggal_lahir: '2021-01-15',
          ortu_user_id: '',
          kelas_aktif: 'Kelas A',
          status_siswa: 'Aktif',
          target_literasi_kelas_b: 'TRACK_1',
        },
      ],
    };
    const putOkRes = await fetch(`${srvA.baseUrl}/api/db`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookiePair,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(updatedSiswaPayload),
    });
    assert.equal(putOkRes.status, 200);
    assert.equal(remoteSheetDb.siswa.some((s) => s.siswa_id === 'SIS-NEW-999'), true);

    // 7. Cross-container cold start (Container B starts with blank tmp dir pointing at mock Sheet)
    const appB = createApiApp({
      dataDir: tmpDirB,
      isVercel: true,
      defaultGasUrl: 'https://script.google.com/macros/s/MOCK_SHEET/exec',
      gasBridgeFn: mockGasBridge,
    });
    const srvB = await startTestServer(appB);
    try {
      const infoB = await fetch(`${srvB.baseUrl}/api/school-info`).then((r) => r.json());
      assert.equal(infoB.adminClaimed, true);

      const loginBRes = await fetch(`${srvB.baseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          username: 'admin_sekolah',
          password: 'password123',
        }),
      });
      assert.equal(loginBRes.status, 200);
      const loginBJson = await loginBRes.json();
      assert.equal(loginBJson.adminClaimed, true);
      assert.equal(
        loginBJson.data.siswa.some((s: { siswa_id: string }) => s.siswa_id === 'SIS-NEW-999'),
        true
      );
    } finally {
      await srvB.close();
    }

    // 8. Logout revokes cookie & clears session
    const logoutRes = await fetch(`${srvA.baseUrl}/api/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookiePair,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    assert.equal(logoutRes.status, 200);
    const afterLogoutRes = await fetch(`${srvA.baseUrl}/api/db`, {
      headers: {
        Cookie: cookiePair,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    assert.equal(afterLogoutRes.status, 401);
  } finally {
    await srvA.close();
    fs.rmSync(tmpDirA, { recursive: true, force: true });
    fs.rmSync(tmpDirB, { recursive: true, force: true });
  }
});

test('Claimed local db.json automatically bootstraps unclaimed remote Google Sheet on hydration', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-test-boot-'));
  let remoteSheetDb = createInitialSeedDatabase();
  remoteSheetDb.pengaturanSekolah.admin_claimed = false;
  let pushedToSheet = false;

  const localDb = createInitialSeedDatabase();
  localDb.pengaturanSekolah.admin_claimed = true;
  localDb.pengaturanSekolah.gas_webapp_url = 'https://script.google.com/macros/s/MOCK_BOOT/exec';
  localDb.users = [
    {
      user_id: 'USR-ADM-1',
      username: 'tkitaw',
      password_hash: 'scrypt$salt$deadbeef',
      role: 'Admin',
      nama_lengkap: 'Obi Abdulah Sapari',
      no_hp: '',
      kelas_ampu: '',
      status_aktif: true,
    },
  ];
  fs.writeFileSync(path.join(tmpDir, 'db.json'), JSON.stringify(localDb, null, 2), 'utf8');

  const app = createApiApp({
    dataDir: tmpDir,
    defaultGasUrl: 'https://script.google.com/macros/s/MOCK_BOOT/exec',
    gasBridgeFn: async (_url, _key, action, payload) => {
      if (action === 'pullFullDb') {
        return { ok: true, data: JSON.parse(JSON.stringify(remoteSheetDb)) };
      }
      if (action === 'syncFullDb') {
        pushedToSheet = true;
        remoteSheetDb = JSON.parse(JSON.stringify(payload));
        return { ok: true };
      }
      return { ok: true };
    },
  });

  const srv = await startTestServer(app);
  try {
    const info = await fetch(`${srv.baseUrl}/api/school-info`).then((r) => r.json());
    assert.equal(info.adminClaimed, true);
    // Allow background bootstrap push to finish
    for (let i = 0; i < 20 && !pushedToSheet; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.equal(pushedToSheet, true);
    assert.equal(remoteSheetDb.pengaturanSekolah.admin_claimed, true);
    assert.equal(remoteSheetDb.users.some((u) => u.username === 'tkitaw'), true);
  } finally {
    await srv.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
