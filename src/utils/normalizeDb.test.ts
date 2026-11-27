import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSeedDatabase } from '../data/seedDatabase';
import {
  isAdminClaimedDb,
  mergePulledGasDatabase,
  normalizeSchoolDatabase,
} from './normalizeDb';

test('normalizeSchoolDatabase coerces numeric nis, npsn, dates, and boolean strings', () => {
  const seed = createInitialSeedDatabase();
  const dirty = {
    ...seed,
    pengaturanSekolah: {
      ...seed.pengaturanSekolah,
      npsn: 69991416 as unknown as string,
      admin_claimed: 'true' as unknown as boolean,
    },
    users: [
      {
        ...seed.users[0],
        username: ' @ObiAdmin ',
        no_hp: 8123456789 as unknown as string,
        status_aktif: 'false' as unknown as boolean,
      },
    ],
    siswa: [
      {
        ...seed.siswa[0],
        nis: 2627001 as unknown as string,
        tanggal_lahir: '2021-04-09T00:00:00.000Z',
        ortu_user_id: 12345 as unknown as string,
      },
    ],
  };

  const normalized = normalizeSchoolDatabase(dirty);
  assert.equal(typeof normalized.siswa[0].nis, 'string');
  assert.equal(normalized.siswa[0].nis, '2627001');
  assert.equal(normalized.siswa[0].tanggal_lahir, '2021-04-09');
  assert.equal(normalized.siswa[0].ortu_user_id, '12345');
  assert.equal(normalized.pengaturanSekolah.npsn, '69991416');
  assert.equal(normalized.pengaturanSekolah.admin_claimed, true);
  assert.equal(normalized.users[0].username, 'obiadmin');
  assert.equal(normalized.users[0].no_hp, '8123456789');
  assert.equal(normalized.users[0].status_aktif, false);
});

test('mergePulledGasDatabase does not wipe claimed local Admin with unclaimed remote Sheet', () => {
  const local = createInitialSeedDatabase();
  local.pengaturanSekolah.admin_claimed = true;
  local.users = [
    {
      user_id: 'USR-ADM-1',
      username: 'tkitaw',
      password_hash: 'scrypt$abc$def',
      role: 'Admin',
      nama_lengkap: 'Obi Abdulah Sapari',
      no_hp: '',
      kelas_ampu: '',
      status_aktif: true,
    },
    ...local.users,
  ];

  const remoteUnclaimed = createInitialSeedDatabase();
  remoteUnclaimed.pengaturanSekolah.admin_claimed = false;
  remoteUnclaimed.siswa = remoteUnclaimed.siswa.slice(0, 1);

  const result = mergePulledGasDatabase(local, remoteUnclaimed, {
    gasUrl: 'https://script.google.com/macros/s/NEW/exec',
    syncKey: 'WASHLIYAH_SYNC_2026',
  });

  assert.equal(result.adoptedRemote, false);
  assert.equal(result.shouldBootstrapRemote, true);
  assert.equal(isAdminClaimedDb(result.db), true);
  assert.equal(result.db.users.some((u) => u.username === 'tkitaw'), true);
  assert.equal(result.db.siswa.length, local.siswa.length);
  assert.equal(
    result.db.pengaturanSekolah.gas_webapp_url,
    'https://script.google.com/macros/s/NEW/exec'
  );
});

test('mergePulledGasDatabase adopts claimed remote Sheet and preserves local password_hash fallback', () => {
  const local = createInitialSeedDatabase();
  local.pengaturanSekolah.admin_claimed = true;
  local.users = [
    {
      user_id: 'USR-ADM-1',
      username: 'tkitaw',
      password_hash: 'scrypt$local$hash',
      role: 'Admin',
      nama_lengkap: 'Obi Abdulah Sapari',
      no_hp: '',
      kelas_ampu: '',
      status_aktif: true,
    },
  ];

  const remoteClaimed = createInitialSeedDatabase();
  remoteClaimed.pengaturanSekolah.admin_claimed = true;
  remoteClaimed.users = [
    {
      user_id: 'USR-ADM-1',
      username: 'tkitaw',
      password_hash: '',
      role: 'Admin',
      nama_lengkap: 'Obi Abdulah Sapari',
      no_hp: '081234',
      kelas_ampu: '',
      status_aktif: true,
    },
    {
      user_id: 'USR-GURU-99',
      username: 'guru_baru',
      password_hash: 'scrypt$remote$guru',
      role: 'Guru',
      nama_lengkap: 'Ibu Guru Baru',
      no_hp: '',
      kelas_ampu: 'Kelas B',
      status_aktif: true,
    },
  ];

  const result = mergePulledGasDatabase(local, remoteClaimed, {
    gasUrl: 'https://script.google.com/macros/s/NEW/exec',
    syncKey: 'WASHLIYAH_SYNC_2026',
  });

  assert.equal(result.adoptedRemote, true);
  assert.equal(result.shouldBootstrapRemote, false);
  const admin = result.db.users.find((u) => u.username === 'tkitaw');
  assert.equal(admin?.password_hash, 'scrypt$local$hash');
  assert.equal(admin?.no_hp, '081234');
  assert.equal(result.db.users.some((u) => u.username === 'guru_baru'), true);
});
