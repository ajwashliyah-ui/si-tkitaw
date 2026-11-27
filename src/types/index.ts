export type UserRole = 'Admin' | 'Guru' | 'OrangTua';

export type KelasType = string;
export type JenjangKurikulum = 'A' | 'B';
export type StatusSiswa = 'Aktif' | 'Lulus' | 'Pindah';
export type JenisKelamin = 'L' | 'P';

export type TrackKelasB = 'TRACK_1' | 'TRACK_2' | 'TRACK_3' | 'TRACK_4' | 'KUSTOM';
export type SkalaLiterasi = 'Belum Berkembang (BB)' | 'Mulai Berkembang (MB)' | 'Berkembang Sesuai Harapan (BSH)' | 'Berkembang Sangat Baik (BSB)';
export type StatusPenguasaanHarian = 'Belum Mengenal' | 'Mulai Mengenal' | 'Perlu Latihan' | 'Lancar';
export type StatusKeagamaan = 'Baru Mengenalkan' | 'Menirukan' | 'Hafal/Lancar dengan Bantuan' | 'Hafal/Lancar Mandiri';
export type SkalaKaih = 'Belum Terbiasa' | 'Mulai Terbiasa' | 'Sudah Terbiasa';
export type StatusAbsensi = 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA';
export type SemesterType = 'Semester 1' | 'Semester 2';

export type AspekKaihKey =
  | 'bangun_pagi'
  | 'beribadah'
  | 'berolahraga'
  | 'makan_sehat'
  | 'gemar_belajar'
  | 'bermasyarakat'
  | 'tidur_cepat';

export interface PengaturanSekolah {
  nama_sekolah: string;
  npsn: string;
  alamat_sekolah: string;
  kontak_sekolah: string;
  kepala_sekolah: string;
  tahun_ajaran_aktif: string;
  semester_aktif: SemesterType;
  folder_drive_id: string;
  gas_webapp_url: string;
  gas_sync_key?: string;
  google_spreadsheet_id?: string;
  google_spreadsheet_url?: string;
  auto_sync_sheets?: boolean;
  admin_claimed?: boolean;
}

export interface User {
  user_id: string;
  username: string;
  password?: string;
  password_hash: string;
  role: UserRole;
  nama_lengkap: string;
  no_hp: string;
  kelas_ampu?: KelasType | '';
  status_aktif: boolean;
}

export interface TahunAjaran {
  ta_id: string;
  nama_ta: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status_aktif: boolean;
}

export interface MasterKelas {
  kelas_id: string;
  nama_kelas: string;
  jenjang: JenjangKurikulum;
  urutan: number;
  aktif: boolean;
}

export type KeputusanKenaikan =
  | 'BELUM_DITENTUKAN'
  | 'NAIK_KELAS_NEXT'
  | 'NAIK_KELAS_B'
  | 'LULUS_KE_SD'
  | 'TINGGAL_KELAS';

export interface Siswa {
  siswa_id: string;
  nis: string;
  nama_anak: string;
  jenis_kelamin: JenisKelamin;
  tanggal_lahir: string;
  ortu_user_id: string;
  kelas_aktif: KelasType | 'Lulus';
  status_siswa: StatusSiswa;
  target_literasi_kelas_b: TrackKelasB;
  target_kustom_kelas_b?: string;
  keputusan_kenaikan?: KeputusanKenaikan;
  catatan_kenaikan?: string;
  keputusan_diatur_oleh?: string;
}

export interface RiwayatKelas {
  riwayat_id: string;
  siswa_id: string;
  ta_id: string;
  nama_ta: string;
  kelas: KelasType | 'Lulus';
  wali_kelas_id: string;
  status_akhir: 'Berjalan' | 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus';
  catatan?: string;
}

export interface AntropometriRecord {
  log_id: string;
  siswa_id: string;
  ta_id: string;
  periode_bulan: string; // YYYY-MM
  usia_bulan: number;
  bb_kg: number;
  tb_cm: number;
  lk_cm: number;
  lila_cm: number;
  status_gizi_otomatis: string;
  kode_pemicu_tips: string;
  catatan_guru: string;
  updated_at: string;
}

export interface LiterasiRecord {
  lit_id: string;
  siswa_id: string;
  ta_id: string;
  periode_bulan: string;
  kelas: KelasType;
  track_level_dipilih: TrackKelasB | 'STANDAR_A';
  target_kustom: string;
  nilai_huruf_atau_dasar: SkalaLiterasi;
  nilai_sukukata_atau_lanjutan: SkalaLiterasi;
  nilai_kalimat_opsional?: SkalaLiterasi | '';
  catatan_guru: string;
  updated_at: string;
}

export interface KeagamaanRecord {
  agama_id: string;
  siswa_id: string;
  ta_id: string;
  periode_bulan: string;
  kategori: 'Surat Pendek' | 'Doa Harian' | 'Hijaiyah / Iqra' | 'Hadits Pendek';
  materi_id: string;
  nama_materi: string;
  status_progres: StatusKeagamaan;
  catatan_guru: string;
  updated_at: string;
}

export interface KaihHarianRecord {
  kaih_harian_id: string;
  siswa_id: string;
  ta_id: string;
  tanggal: string; // YYYY-MM-DD (setiap hari Senin-Minggu)
  periode_bulan: string; // YYYY-MM
  bangun_pagi: SkalaKaih;
  beribadah: SkalaKaih;
  berolahraga: SkalaKaih;
  makan_sehat: SkalaKaih;
  gemar_belajar: SkalaKaih;
  bermasyarakat: SkalaKaih;
  tidur_cepat: SkalaKaih;
  catatan_ortu: string;
  updated_at: string;
}

export interface KaihFotoAspekBulanan {
  foto_id: string;
  siswa_id: string;
  ta_id: string;
  periode_bulan: string; // YYYY-MM
  aspek_kaih: AspekKaihKey;
  foto_drive_id: string;
  foto_url: string;
  keterangan: string;
  updated_at: string;
}

export interface UlasanOrtu {
  ulasan_id: string;
  siswa_id: string;
  ta_id: string;
  periode_bulan: string;
  pengirim_role: 'OrangTua' | 'Guru';
  pengirim_nama: string;
  isi_pesan: string;
  created_at: string;
}

export interface MasterMateri {
  materi_id: string;
  kategori: 'Surat Pendek' | 'Doa Harian' | 'Hijaiyah / Iqra' | 'Hadits Pendek';
  nama_materi: string;
  urutan: number;
  aktif: boolean;
}

export interface MasterTips {
  tips_id: string;
  kategori_pemicu: 'Antropometri' | 'Literasi' | '7 KAIH' | 'Keagamaan';
  kondisi_pemicu: string;
  judul_tips: string;
  isi_tips_ayah_bunda: string;
  aktif: boolean;
}

export interface BankMateriHarian {
  kode_item: string;
  bidang: 'Literasi' | 'Hijaiyah_Iqra';
  level_track: string;
  kategori: 'Huruf' | 'Suku Kata' | 'Kata' | 'Kalimat' | 'Paragraf' | 'Hijaiyah' | 'Iqra';
  label_kelompok: string;
  isi_item: string; // pipe-separated
  pertanyaan_cek: string;
  aktif: boolean;
}

export interface LogMateriHarian {
  id_log: string;
  tanggal: string; // YYYY-MM-DD (Senin-Jumat)
  id_siswa: string;
  nama_siswa: string;
  kelas: KelasType;
  ta_id: string;
  bidang: 'Literasi' | 'Hijaiyah_Iqra';
  kategori: 'Huruf' | 'Suku Kata' | 'Kata' | 'Kalimat' | 'Paragraf' | 'Hijaiyah' | 'Iqra';
  kode_item: string;
  item_dipilih: string; // comma-separated
  halaman_iqra: string;
  status_penguasaan: StatusPenguasaanHarian;
  catatan_guru: string;
  nama_guru: string;
  timestamp: string;
}

export interface DaftarHadirRecord {
  absen_id: string;
  tanggal: string; // YYYY-MM-DD
  periode_bulan: string; // YYYY-MM
  semester: SemesterType;
  ta_id: string;
  siswa_id: string;
  nama_anak: string;
  kelas: KelasType;
  status: StatusAbsensi;
  diinput_oleh: string;
  updated_at: string;
}

export interface AsesmenAnekdot {
  anekdot_id: string;
  tanggal: string;
  periode_bulan: string;
  semester: SemesterType;
  ta_id: string;
  siswa_id: string;
  nama_anak: string;
  kelas: KelasType;
  deskripsi_kejadian: string;
  analisis_nabp: string;
  analisis_jd: string;
  analisis_lmstrs: string;
  umpan_balik: string;
  guru_nama: string;
  updated_at: string;
}

export interface AsesmenHasilKarya {
  karya_id: string;
  tanggal: string;
  periode_bulan: string;
  semester: SemesterType;
  ta_id: string;
  siswa_id: string;
  nama_anak: string;
  kelas: KelasType;
  foto_drive_id: string;
  foto_url: string;
  deskripsi_karya: string;
  analisis_nabp: string;
  analisis_jd: string;
  analisis_lmstrs: string;
  guru_nama: string;
  updated_at: string;
}

export interface AsesmenCeklis {
  ceklis_id: string;
  tanggal: string;
  periode_bulan: string;
  semester: SemesterType;
  ta_id: string;
  siswa_id: string;
  nama_anak: string;
  kelas: KelasType;
  elemen: 'Nilai Agama & Budi Pekerti' | 'Jati Diri' | 'Literasi & STEAM';
  kode_atp: string;
  tujuan_pembelajaran: string;
  konteks: string;
  status_muncul: 'Belum Muncul' | 'Sudah Muncul';
  kejadian_teramati: string;
  guru_nama: string;
  updated_at: string;
}

export interface MasterAtp {
  atp_uid: string;
  kelompok: 'Kelompok A' | 'Kelompok B';
  semester_target: 'Semester 1' | 'Semester 2' | 'Semester 1 & 2';
  elemen: 'Nilai Agama & Budi Pekerti' | 'Jati Diri' | 'Literasi & STEAM';
  kode_atp: string;
  tujuan_pembelajaran: string;
  aktif: boolean;
}

export interface SchoolDatabase {
  pengaturanSekolah: PengaturanSekolah;
  users: User[];
  tahunAjaran: TahunAjaran[];
  siswa: Siswa[];
  riwayatKelas: RiwayatKelas[];
  antropometri: AntropometriRecord[];
  literasi: LiterasiRecord[];
  keagamaan: KeagamaanRecord[];
  kaihHarian: KaihHarianRecord[];
  kaihFotoBulanan: KaihFotoAspekBulanan[];
  ulasanOrtu: UlasanOrtu[];
  masterMateri: MasterMateri[];
  masterTips: MasterTips[];
  bankMateriHarian: BankMateriHarian[];
  logMateriHarian: LogMateriHarian[];
  daftarHadir: DaftarHadirRecord[];
  asesmenAnekdot: AsesmenAnekdot[];
  asesmenHasilKarya: AsesmenHasilKarya[];
  asesmenCeklis: AsesmenCeklis[];
  masterAtp: MasterAtp[];
  masterKelas?: MasterKelas[];
}
