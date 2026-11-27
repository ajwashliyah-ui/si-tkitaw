import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAutoParentDisplayName,
  buildAutoParentUsername,
  createStudentWithOptionalAutoParent,
} from './parentAccountAuto';
import { User } from '../types';

const SAMPLE_USERS: User[] = [
  {
    user_id: 'USR-1',
    username: 'ortu_ali_202601',
    password_hash: 'abc',
    role: 'OrangTua',
    nama_lengkap: 'Wali Ali',
    no_hp: '',
    status_aktif: true,
  },
];

test('buildAutoParentUsername generates clean valid username and resolves collisions', () => {
  const u1 = buildAutoParentUsername('Aisyah Humaira!', '2026-011', []);
  assert.match(u1, /^[a-z0-9._-]{3,32}$/);
  assert.equal(u1, 'ortu_aisyah_2026011');

  const u2 = buildAutoParentUsername('Ali', '202601', ['ortu_ali_202601']);
  assert.equal(u2, 'ortu_ali_202601_2');
});

test('buildAutoParentDisplayName falls back to Wali <Nama Anak> when blank', () => {
  assert.equal(buildAutoParentDisplayName('', 'Muhammad Umar'), 'Wali Muhammad Umar');
  assert.equal(buildAutoParentDisplayName('  Ibu Aminah  ', 'Muhammad Umar'), 'Ibu Aminah');
});

test('createStudentWithOptionalAutoParent creates linked parent user & riwayat atomically', () => {
  const res = createStudentWithOptionalAutoParent({
    nis: '2026099',
    nama_anak: 'Fatimah Azzahra',
    jenis_kelamin: 'P',
    tanggal_lahir: '2021-04-12',
    kelas_aktif: 'Kelas A',
    target_literasi_kelas_b: 'TRACK_1',
    existingUsers: SAMPLE_USERS,
    activeTa: { ta_id: 'TA-2026', nama_ta: '2026/2027' },
    waliKelasId: 'USR-GRU-A1',
    autoCreateParent: true,
    parentPassword: 'password123',
    nowMs: 1700000000000,
  });

  assert.ok(res.newParentUser);
  assert.equal(res.newParentUser.role, 'OrangTua');
  assert.equal(res.newParentUser.nama_lengkap, 'Wali Fatimah Azzahra');
  assert.equal(res.newParentUser.username, 'ortu_fatimah_2026099');
  assert.equal(res.newParentUser.password, 'password123');
  assert.equal(res.siswa.ortu_user_id, res.newParentUser.user_id);
  assert.ok(res.riwayat);
  assert.equal(res.riwayat.wali_kelas_id, 'USR-GRU-A1');
  assert.equal(res.credentials?.username, 'ortu_fatimah_2026099');
});
