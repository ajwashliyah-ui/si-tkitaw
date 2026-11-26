import { MasterMateri } from '../types';

export const MASTER_MATERI_SEED: MasterMateri[] = [
  // 1. Surat Pendek (14 Surat)
  { materi_id: 'SRT-01', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Fatihah', urutan: 1, aktif: true },
  { materi_id: 'SRT-02', kategori: 'Surat Pendek', nama_materi: 'QS. An-Nas', urutan: 2, aktif: true },
  { materi_id: 'SRT-03', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Falaq', urutan: 3, aktif: true },
  { materi_id: 'SRT-04', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Ikhlas', urutan: 4, aktif: true },
  { materi_id: 'SRT-05', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Lahab', urutan: 5, aktif: true },
  { materi_id: 'SRT-06', kategori: 'Surat Pendek', nama_materi: 'QS. An-Nasr', urutan: 6, aktif: true },
  { materi_id: 'SRT-07', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Kafirun', urutan: 7, aktif: true },
  { materi_id: 'SRT-08', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Kautsar', urutan: 8, aktif: true },
  { materi_id: 'SRT-09', kategori: 'Surat Pendek', nama_materi: "QS. Al-Ma'un", urutan: 9, aktif: true },
  { materi_id: 'SRT-10', kategori: 'Surat Pendek', nama_materi: 'QS. Quraisy', urutan: 10, aktif: true },
  { materi_id: 'SRT-11', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Fil', urutan: 11, aktif: true },
  { materi_id: 'SRT-12', kategori: 'Surat Pendek', nama_materi: 'QS. Al-Asr', urutan: 12, aktif: true },
  { materi_id: 'SRT-13', kategori: 'Surat Pendek', nama_materi: 'QS. At-Takatsur', urutan: 13, aktif: true },
  { materi_id: 'SRT-14', kategori: 'Surat Pendek', nama_materi: "QS. Al-Qari'ah", urutan: 14, aktif: true },

  // 2. Doa Harian (14 Doa)
  { materi_id: 'DOA-01', kategori: 'Doa Harian', nama_materi: 'Doa Sebelum Belajar', urutan: 15, aktif: true },
  { materi_id: 'DOA-02', kategori: 'Doa Harian', nama_materi: 'Doa Sebelum Makan', urutan: 16, aktif: true },
  { materi_id: 'DOA-03', kategori: 'Doa Harian', nama_materi: 'Doa Sesudah Makan', urutan: 17, aktif: true },
  { materi_id: 'DOA-04', kategori: 'Doa Harian', nama_materi: 'Doa Untuk Kedua Orang Tua', urutan: 18, aktif: true },
  { materi_id: 'DOA-05', kategori: 'Doa Harian', nama_materi: 'Doa Sebelum Tidur', urutan: 19, aktif: true },
  { materi_id: 'DOA-06', kategori: 'Doa Harian', nama_materi: 'Doa Bangun Tidur', urutan: 20, aktif: true },
  { materi_id: 'DOA-07', kategori: 'Doa Harian', nama_materi: 'Doa Masuk Kamar Mandi', urutan: 21, aktif: true },
  { materi_id: 'DOA-08', kategori: 'Doa Harian', nama_materi: 'Doa Keluar Kamar Mandi', urutan: 22, aktif: true },
  { materi_id: 'DOA-09', kategori: 'Doa Harian', nama_materi: 'Doa Keluar Rumah', urutan: 23, aktif: true },
  { materi_id: 'DOA-10', kategori: 'Doa Harian', nama_materi: 'Doa Naik Kendaraan', urutan: 24, aktif: true },
  { materi_id: 'DOA-11', kategori: 'Doa Harian', nama_materi: 'Doa Kebaikan Dunia & Akhirat', urutan: 25, aktif: true },
  { materi_id: 'DOA-12', kategori: 'Doa Harian', nama_materi: 'Doa Bercermin', urutan: 26, aktif: true },
  { materi_id: 'DOA-13', kategori: 'Doa Harian', nama_materi: 'Doa Masuk Masjid', urutan: 27, aktif: true },
  { materi_id: 'DOA-14', kategori: 'Doa Harian', nama_materi: 'Doa Keluar Masjid', urutan: 28, aktif: true },

  // 3. Hijaiyah / Iqra (7 Tahap)
  { materi_id: 'IQR-01', kategori: 'Hijaiyah / Iqra', nama_materi: 'Pengenalan Huruf Hijaiyah Tunggal (Alif–Ya)', urutan: 29, aktif: true },
  { materi_id: 'IQR-02', kategori: 'Hijaiyah / Iqra', nama_materi: 'Iqra Jilid 1 (Harakat Fathah)', urutan: 30, aktif: true },
  { materi_id: 'IQR-03', kategori: 'Hijaiyah / Iqra', nama_materi: 'Iqra Jilid 2 (Huruf Sambung & Mad)', urutan: 31, aktif: true },
  { materi_id: 'IQR-04', kategori: 'Hijaiyah / Iqra', nama_materi: 'Iqra Jilid 3 (Kasrah, Dhammah & Mad)', urutan: 32, aktif: true },
  { materi_id: 'IQR-05', kategori: 'Hijaiyah / Iqra', nama_materi: 'Iqra Jilid 4 (Tanwin, Sukun & Qalqalah)', urutan: 33, aktif: true },
  { materi_id: 'IQR-06', kategori: 'Hijaiyah / Iqra', nama_materi: 'Iqra Jilid 5 (Alif Lam, Tasydid & Waqaf)', urutan: 34, aktif: true },
  { materi_id: 'IQR-07', kategori: 'Hijaiyah / Iqra', nama_materi: "Iqra Jilid 6 (Tajwid Dasar & Persiapan Al-Qur'an)", urutan: 35, aktif: true },

  // 4. Hadits Pendek (10 Hadits)
  { materi_id: 'HDT-01', kategori: 'Hadits Pendek', nama_materi: 'Hadits Kebersihan', urutan: 36, aktif: true },
  { materi_id: 'HDT-02', kategori: 'Hadits Pendek', nama_materi: 'Hadits Senyum adalah Sedekah', urutan: 37, aktif: true },
  { materi_id: 'HDT-03', kategori: 'Hadits Pendek', nama_materi: 'Hadits Kasih Sayang', urutan: 38, aktif: true },
  { materi_id: 'HDT-04', kategori: 'Hadits Pendek', nama_materi: 'Hadits Larangan Marah', urutan: 39, aktif: true },
  { materi_id: 'HDT-05', kategori: 'Hadits Pendek', nama_materi: 'Hadits Adab Makan & Minum', urutan: 40, aktif: true },
  { materi_id: 'HDT-06', kategori: 'Hadits Pendek', nama_materi: 'Hadits Menuntut Ilmu', urutan: 41, aktif: true },
  { materi_id: 'HDT-07', kategori: 'Hadits Pendek', nama_materi: 'Hadits Surga di Bawah Telapak Kaki Ibu', urutan: 42, aktif: true },
  { materi_id: 'HDT-08', kategori: 'Hadits Pendek', nama_materi: 'Hadits Sesama Muslim Bersaudara', urutan: 43, aktif: true },
  { materi_id: 'HDT-09', kategori: 'Hadits Pendek', nama_materi: 'Hadits Berkata Baik atau Diam', urutan: 44, aktif: true },
  { materi_id: 'HDT-10', kategori: 'Hadits Pendek', nama_materi: "Hadits Keutamaan Belajar & Mengajarkan Al-Qur'an", urutan: 45, aktif: true },
];
