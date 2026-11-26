import React, { useMemo, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AspekKaihKey, KaihFotoAspekBulanan, KaihHarianRecord, SkalaKaih } from '../../types';
import {
  getDailyKaihCompletion,
  getMonthCalendarGrid,
  getMonthlyKaihSummary,
  KAIH_ASPEK_LIST,
} from '../../utils/kaih';
import { compressImageFile } from '../../utils/imageCompress';

const SKALA_OPTIONS: SkalaKaih[] = ['Belum Terbiasa', 'Mulai Terbiasa', 'Sudah Terbiasa'];
const HARI_HEADER = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

interface KaihKalenderViewProps {
  selectedSiswaId: string;
}

export const KaihKalenderView: React.FC<KaihKalenderViewProps> = ({ selectedSiswaId }) => {
  const { db, currentUser, updateDb, addToast, triggerCelebration } = useApp();

  const myChildren = useMemo(() => {
    const linked = db.siswa.filter((s) => s.ortu_user_id === currentUser?.user_id);
    return linked.length > 0 ? linked : db.siswa;
  }, [db.siswa, currentUser]);

  const student = useMemo(
    () => myChildren.find((s) => s.siswa_id === selectedSiswaId) || myChildren[0],
    [myChildren, selectedSiswaId]
  );

  const [periodeBulan, setPeriodeBulan] = useState<string>('2026-11');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-26');

  const [yearNum, monthNum] = useMemo(() => {
    const [y, m] = periodeBulan.split('-').map(Number);
    return [y || 2026, m || 11];
  }, [periodeBulan]);

  const calendarCells = useMemo(
    () => getMonthCalendarGrid(yearNum, monthNum),
    [yearNum, monthNum]
  );

  const dailyMap = useMemo(() => {
    const map = new Map<string, KaihHarianRecord>();
    if (!student) return map;
    for (const row of db.kaihHarian) {
      if (row.siswa_id === student.siswa_id && row.periode_bulan === periodeBulan) {
        map.set(row.tanggal, row);
      }
    }
    return map;
  }, [db.kaihHarian, student, periodeBulan]);

  const existingDayRecord = dailyMap.get(selectedDate);

  const [formValues, setFormValues] = useState<Record<AspekKaihKey, SkalaKaih>>(() => ({
    bangun_pagi: existingDayRecord?.bangun_pagi || 'Sudah Terbiasa',
    beribadah: existingDayRecord?.beribadah || 'Sudah Terbiasa',
    berolahraga: existingDayRecord?.berolahraga || 'Mulai Terbiasa',
    makan_sehat: existingDayRecord?.makan_sehat || 'Sudah Terbiasa',
    gemar_belajar: existingDayRecord?.gemar_belajar || 'Mulai Terbiasa',
    bermasyarakat: existingDayRecord?.bermasyarakat || 'Mulai Terbiasa',
    tidur_cepat: existingDayRecord?.tidur_cepat || 'Mulai Terbiasa',
  }));
  const [catatanOrtu, setCatatanOrtu] = useState<string>(existingDayRecord?.catatan_ortu || '');

  const handleSelectCalendarDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    const rec = dailyMap.get(dateStr);
    setFormValues({
      bangun_pagi: rec?.bangun_pagi || 'Sudah Terbiasa',
      beribadah: rec?.beribadah || 'Sudah Terbiasa',
      berolahraga: rec?.berolahraga || 'Mulai Terbiasa',
      makan_sehat: rec?.makan_sehat || 'Sudah Terbiasa',
      gemar_belajar: rec?.gemar_belajar || 'Mulai Terbiasa',
      bermasyarakat: rec?.bermasyarakat || 'Mulai Terbiasa',
      tidur_cepat: rec?.tidur_cepat || 'Mulai Terbiasa',
    });
    setCatatanOrtu(rec?.catatan_ortu || '');
  };

  const handleSaveDailyKaih = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const activeTa = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
    const record: KaihHarianRecord = {
      kaih_harian_id: `KAIH-${selectedDate.replace(/-/g, '')}-${student.siswa_id}`,
      siswa_id: student.siswa_id,
      ta_id: activeTa,
      tanggal: selectedDate,
      periode_bulan: selectedDate.slice(0, 7),
      ...formValues,
      catatan_ortu: catatanOrtu.trim(),
      updated_at: new Date().toISOString(),
    };

    await updateDb((prev) => {
      const rest = prev.kaihHarian.filter(
        (r) => !(r.siswa_id === student.siswa_id && r.tanggal === selectedDate)
      );
      return { ...prev, kaihHarian: [...rest, record] };
    }, 'Isian 7 KAIH tersimpan');

    const filledCountNow = KAIH_ASPEK_LIST.filter(
      (a) => formValues[a.key] !== 'Belum Terbiasa'
    ).length;
    triggerCelebration(
      filledCountNow === 7
        ? 'MasyaAllah! 7/7 kebiasaan hari ini!'
        : `Kebiasaan ${student.nama_anak} tercatat!`
    );
  };

  const monthlySummary = useMemo(() => {
    if (!student) return null;
    return getMonthlyKaihSummary(db.kaihHarian, student.siswa_id, periodeBulan);
  }, [db.kaihHarian, student, periodeBulan]);

  const monthlyPhotosMap = useMemo(() => {
    const map = new Map<AspekKaihKey, KaihFotoAspekBulanan>();
    if (!student) return map;
    for (const p of db.kaihFotoBulanan) {
      if (p.siswa_id === student.siswa_id && p.periode_bulan === periodeBulan) {
        map.set(p.aspek_kaih, p);
      }
    }
    return map;
  }, [db.kaihFotoBulanan, student, periodeBulan]);

  const handleUploadAspectPhoto = async (
    aspekKey: AspekKaihKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.7);
      const activeTa = db.tahunAjaran.find((t) => t.status_aktif)?.ta_id || 'TA-2026-2027';
      const photoRow: KaihFotoAspekBulanan = {
        foto_id: `KF-${periodeBulan}-${student.siswa_id}-${aspekKey}`,
        siswa_id: student.siswa_id,
        ta_id: activeTa,
        periode_bulan: periodeBulan,
        aspek_kaih: aspekKey,
        foto_drive_id: '',
        foto_url: compressed.base64DataUrl,
        keterangan: `Foto kegiatan ${aspekKey}`,
        updated_at: new Date().toISOString(),
      };
      await updateDb((prev) => {
        const rest = prev.kaihFotoBulanan.filter(
          (p) =>
            !(
              p.siswa_id === student.siswa_id &&
              p.periode_bulan === periodeBulan &&
              p.aspek_kaih === aspekKey
            )
        );
        return { ...prev, kaihFotoBulanan: [...rest, photoRow] };
      }, `Foto tersimpan (${compressed.sizeKb} KB)`);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Foto tidak bisa dibaca. Coba format JPG atau PNG.', 'error');
    }
  };

  const handleDeleteAspectPhoto = async (aspekKey: AspekKaihKey) => {
    if (!student) return;
    await updateDb((prev) => ({
      ...prev,
      kaihFotoBulanan: prev.kaihFotoBulanan.filter(
        (p) =>
          !(
            p.siswa_id === student.siswa_id &&
            p.periode_bulan === periodeBulan &&
            p.aspek_kaih === aspekKey
          )
      ),
    }), 'Foto dihapus');
  };

  if (!student) return null;

  return (
    <div className="space-y-6">
      <div className="identitas">
        <span className="inisial" aria-hidden="true">
          {student.nama_anak.charAt(0)}
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl text-[#0f4527]">7 KAIH, {student.nama_anak}</h1>
          <p className="text-sm text-[#1d2b21]">
            Catat kebiasaan harian di rumah dan unggah 1 foto kegiatan tiap aspek bulan ini.
          </p>
        </div>
        <label className="block w-44">
          <span className="block font-extrabold text-xs text-[#0f4527] mb-1">Bulan</span>
          <input
            id="kaih-bulan"
            type="month"
            value={periodeBulan}
            onChange={(e) => {
              const val = e.target.value;
              setPeriodeBulan(val);
              setSelectedDate(`${val}-01`);
            }}
            className="isian-kontrol font-mono-tabular"
          />
        </label>
      </div>

      <dl className="status">
        <div>
          <dt>Status bulan {periodeBulan}</dt>
          <dd>
            {monthlySummary && monthlySummary.totalDaysFilled > 0
              ? `Sudah Diisi (${monthlySummary.totalDaysFilled} hari)`
              : 'Belum Diisi'}
          </dd>
        </div>
        <div>
          <dt>Foto kegiatan bulanan</dt>
          <dd>{monthlyPhotosMap.size} dari 7 aspek</dd>
        </div>
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Kalender */}
        <section className="lg:col-span-5 kartu space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-[#0f4527]">Kalender harian</h2>
            <span className="text-xs text-[#55665a]">Pilih tanggal</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-extrabold text-[#55665a]">
            {HARI_HEADER.map((h) => (
              <div key={h} className="py-1">{h}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="Kalender 7 KAIH Harian">
            {calendarCells.map((cell, idx) => {
              if (!cell.dateStr || !cell.dayNumber) {
                return <div key={`empty-${idx}`} className="h-12 rounded-[10px] bg-[#fbf6e7]/50" />;
              }
              const rec = dailyMap.get(cell.dateStr);
              const comp = getDailyKaihCompletion(rec);
              const isSelected = cell.dateStr === selectedDate;
              const isFilled = Boolean(rec);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => cell.dateStr && handleSelectCalendarDay(cell.dateStr)}
                  aria-label={`Tanggal ${cell.dateStr}${isFilled ? ', sudah diisi' : ', belum diisi'}`}
                  aria-pressed={isSelected}
                  className={`h-12 rounded-[10px] border flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#176238] border-[#176238] text-white font-bold'
                      : isFilled
                      ? 'bg-[#dcebd2] border-[#9ec48e] text-[#0f4527] hover:bg-[#cfe3c2]'
                      : 'bg-white border-[#d9d5c0] text-[#1d2b21] hover:border-[#176238]'
                  }`}
                >
                  <span className="text-xs font-mono-tabular leading-none">{cell.dayNumber}</span>
                  <span
                    className={`text-[9px] mt-1 font-mono-tabular leading-none ${
                      isSelected ? 'text-white/90' : isFilled ? 'text-[#176238] font-bold' : 'text-[#55665a]'
                    }`}
                  >
                    {isFilled ? `${comp.terbiasaCount + comp.mulaiCount}/7` : '–'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Formulir Isian 7 KAIH */}
        <form onSubmit={handleSaveDailyKaih} className="lg:col-span-7 kartu space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#d9d5c0]">
            <div>
              <h2 className="text-lg text-[#0f4527]">
                Tanggal <span className="font-mono-tabular">{selectedDate}</span>
              </h2>
              <p className="text-xs text-[#55665a]">
                {existingDayRecord ? 'Sudah tercatat. Anda bisa mengubahnya di bawah.' : 'Belum diisi untuk tanggal ini.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="nilai emas font-mono-tabular">
                {KAIH_ASPEK_LIST.filter((a) => formValues[a.key] !== 'Belum Terbiasa').length}/7 kebiasaan
              </span>
              {existingDayRecord && <span className="nilai">Sudah Diisi</span>}
            </div>
          </div>

          {KAIH_ASPEK_LIST.every((a) => formValues[a.key] !== 'Belum Terbiasa') && (
            <div className="rounded-[18px] border border-[#9ec48e] bg-[#dcebd2]/65 px-3.5 py-2.5 flex items-center gap-3">
              <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0 anim-bounce" aria-hidden="true">
                <circle cx="18" cy="18" r="16" fill="#f2b632" />
                <circle cx="13.5" cy="16" r="1.7" fill="#1d2b21" />
                <circle cx="22.5" cy="16" r="1.7" fill="#1d2b21" />
                <path d="M13 21 q5 4.5 10 0" fill="none" stroke="#1d2b21" strokeWidth="2.1" strokeLinecap="round" />
              </svg>
              <p className="text-xs font-bold text-[#0f4527] m-0">
                MasyaAllah! 7/7 kebiasaan hari ini lengkap! Tekan simpan untuk mencatatnya di kalender.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {KAIH_ASPEK_LIST.map((aspek) => {
              const currentVal = formValues[aspek.key];
              return (
                <fieldset key={aspek.key} className="border-0 p-0 m-0">
                  <legend className="text-base text-[#1d2b21] mb-1.5">
                    {aspek.label}
                  </legend>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={aspek.label}>
                    {SKALA_OPTIONS.map((skala) => {
                      const active = currentVal === skala;
                      return (
                        <button
                          key={skala}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            setFormValues((prev) => ({ ...prev, [aspek.key]: skala }))
                          }
                          className={`min-h-[46px] px-2 py-1.5 rounded-[14px] border-2 text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#176238] border-[#176238] text-white cap-pop'
                              : 'bg-white border-[#d9d5c0] text-[#1d2b21] hover:border-[#176238]'
                          }`}
                        >
                          {skala}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <label className="block">
            <span className="block font-extrabold text-sm mb-1">Catatan orang tua</span>
            <textarea
              id="kaih-catatan-harian"
              rows={2}
              value={catatanOrtu}
              onChange={(e) => setCatatanOrtu(e.target.value)}
              placeholder="Ceritakan momen baik atau catatan kebiasaan hari ini..."
              className="isian-kontrol"
            />
          </label>

          <button type="submit" className="tbl">
            Simpan isian
          </button>
        </form>
      </div>

      {/* Foto Kegiatan Bulanan */}
      <section className="kartu space-y-4">
        <div>
          <h2 className="text-lg text-[#0f4527]">Foto kegiatan (1 per aspek setiap bulan)</h2>
          <p className="text-xs text-[#55665a]">
            Pilih foto yang pantas dibagikan bersama guru kelas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KAIH_ASPEK_LIST.map((aspek) => {
            const existingPhoto = monthlyPhotosMap.get(aspek.key);
            const inputId = `kaih-photo-${aspek.key}`;
            return (
              <div
                key={aspek.key}
                className="galeri-foto rounded-[14px] border border-[#d9d5c0] p-3.5 flex flex-col justify-between gap-3 bg-[#fbf6e7]/60"
              >
                <div>
                  <p className="text-xs font-extrabold text-[#1d2b21]">{aspek.label}</p>
                  <p className="text-[11px] text-[#55665a] mt-0.5">{aspek.description}</p>
                </div>

                {existingPhoto ? (
                  <div className="space-y-2">
                    <img
                      src={existingPhoto.foto_url}
                      alt={`Foto ${aspek.shortLabel}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-32 object-cover rounded-[10px] border border-[#d9d5c0]"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={inputId}
                        className="tbl polos kecil flex-1 text-center cursor-pointer"
                      >
                        Ganti foto
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteAspectPhoto(aspek.key)}
                        aria-label={`Hapus foto ${aspek.shortLabel}`}
                        className="p-2 rounded-full text-[#a33a25] hover:bg-[#f8dcd6] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor={inputId}
                    className="h-32 rounded-[10px] border-2 border-dashed border-[#d9d5c0] bg-white hover:border-[#176238] flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-[#55665a] hover:text-[#0f4527] cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Pilih foto</span>
                  </label>
                )}
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadAspectPhoto(aspek.key, e)}
                  className="sr-only"
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
