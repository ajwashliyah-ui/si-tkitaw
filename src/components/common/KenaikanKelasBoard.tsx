import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  GraduationCap,
  GripVertical,
  RotateCcw,
  Search,
  Square,
  UploadCloud,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { KeputusanKenaikan, RiwayatKelas, Siswa } from '../../types';
import {
  getMasterKelasList,
  getNextClassTarget,
  isPromoteDecision,
} from '../../utils/kelas';

interface KenaikanKelasBoardProps {
  mode: 'admin' | 'guru';
  defaultKelasFilter?: string;
}

type ColumnTarget = string; // Any custom class name or 'Lulus'

interface PendingTransfer {
  siswaList: Siswa[];
  targetColumn: ColumnTarget | 'TINGGAL_KELAS_ACTION';
  sourceLabel: string;
}

function getDecisionLabel(
  s: Siswa,
  nextLabel: string
): { text: string; tone: 'emerald' | 'amber' | 'sky' | 'neutral' } {
  const k = s.keputusan_kenaikan;
  if (s.kelas_aktif === 'Lulus' || s.status_siswa === 'Lulus') {
    return { text: 'Lulus · Lanjut ke SD', tone: 'emerald' };
  }
  if (k === 'TINGGAL_KELAS') {
    return { text: `Tinggal di ${s.kelas_aktif}`, tone: 'amber' };
  }
  if (isPromoteDecision(k)) {
    return { text: `Konfirmasi: ${nextLabel}`, tone: k === 'LULUS_KE_SD' ? 'emerald' : 'sky' };
  }
  return { text: 'Belum dikonfirmasi', tone: 'neutral' };
}

export const KenaikanKelasBoard: React.FC<KenaikanKelasBoardProps> = ({
  mode,
  defaultKelasFilter = 'Semua',
}) => {
  const { db, currentUser, updateDb, pushToSheets, syncStatus, triggerCelebration } = useApp();

  const kelasList = useMemo(() => getMasterKelasList(db), [db]);

  const [viewMode, setViewMode] = useState<'konfirmasi' | 'papan'>(
    mode === 'admin' ? 'papan' : 'konfirmasi'
  );
  const [kelasFilter, setKelasFilter] = useState<string>(defaultKelasFilter);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedSiswaId, setDraggedSiswaId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnTarget | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [confirmApplyModal, setConfirmApplyModal] = useState(false);

  const actorLabel = currentUser
    ? `${currentUser.nama_lengkap} (${currentUser.role})`
    : mode === 'admin'
    ? 'Admin'
    : 'Guru';

  const activeTa = useMemo(
    () => db.tahunAjaran.find((t) => t.status_aktif) || db.tahunAjaran[0],
    [db.tahunAjaran]
  );

  const lastKelasName = kelasList[kelasList.length - 1]?.nama_kelas || 'Kelas B';

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.siswa.filter((s) => {
      if (s.status_siswa === 'Pindah') return false;
      if (kelasFilter !== 'Semua' && s.kelas_aktif !== kelasFilter) return false;
      if (q && !s.nama_anak.toLowerCase().includes(q) && !s.nis.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [db.siswa, kelasFilter, search]);

  const columnGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchSearch = (s: Siswa) =>
      !q || s.nama_anak.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);

    const groups: Record<string, Siswa[]> = {};
    for (const k of kelasList) {
      groups[k.nama_kelas] = db.siswa.filter(
        (s) => s.status_siswa === 'Aktif' && s.kelas_aktif === k.nama_kelas && matchSearch(s)
      );
    }
    groups['Lulus'] = db.siswa.filter(
      (s) => (s.kelas_aktif === 'Lulus' || s.status_siswa === 'Lulus') && matchSearch(s)
    );
    return groups;
  }, [db.siswa, kelasList, search]);

  const setStudentDecision = async (
    siswaId: string,
    decision: KeputusanKenaikan,
    customNote?: string
  ) => {
    await updateDb((prev) => ({
      ...prev,
      siswa: prev.siswa.map((s) =>
        s.siswa_id === siswaId
          ? {
              ...s,
              keputusan_kenaikan: decision,
              catatan_kenaikan: customNote !== undefined ? customNote : s.catatan_kenaikan || '',
              keputusan_diatur_oleh: actorLabel,
            }
          : s
      ),
    }));
  };

  const setBatchDecision = async (targetClass: string, decision: KeputusanKenaikan) => {
    const count = db.siswa.filter(
      (s) => s.status_siswa === 'Aktif' && s.kelas_aktif === targetClass
    ).length;
    if (count === 0) return;

    await updateDb(
      (prev) => ({
        ...prev,
        siswa: prev.siswa.map((s) =>
          s.status_siswa === 'Aktif' && s.kelas_aktif === targetClass
            ? {
                ...s,
                keputusan_kenaikan: decision,
                keputusan_diatur_oleh: actorLabel,
              }
            : s
        ),
      }),
      `${count} murid ${targetClass} ditandai.`
    );
  };

  const saveStudentNote = async (siswaId: string) => {
    const note = (editingNotes[siswaId] ?? '').trim();
    await updateDb(
      (prev) => ({
        ...prev,
        siswa: prev.siswa.map((s) =>
          s.siswa_id === siswaId
            ? {
                ...s,
                catatan_kenaikan: note,
                keputusan_diatur_oleh: s.keputusan_diatur_oleh || actorLabel,
              }
            : s
        ),
      }),
      'Catatan konfirmasi kelas tersimpan.'
    );
  };

  const toggleSelect = (siswaId: string) => {
    setSelectedIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

  const toggleSelectColumn = (col: ColumnTarget) => {
    const colIds = (columnGroups[col] || []).map((s) => s.siswa_id);
    if (colIds.length === 0) return;
    const allSelected = colIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !colIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...colIds])));
    }
  };

  const openTransferDialog = (
    siswaList: Siswa[],
    targetColumn: ColumnTarget | 'TINGGAL_KELAS_ACTION',
    sourceLabel: string
  ) => {
    if (siswaList.length === 0) return;
    setTransferNote(siswaList.length === 1 ? siswaList[0].catatan_kenaikan || '' : '');
    setPendingTransfer({ siswaList, targetColumn, sourceLabel });
  };

  const executeTransfer = async (outcome: 'MOVE' | 'STAY_TINGGAL_KELAS') => {
    if (!pendingTransfer) return;
    const { siswaList, targetColumn } = pendingTransfer;
    const ids = new Set(siswaList.map((s) => s.siswa_id));
    const noteTrim = transferNote.trim();

    if (outcome === 'STAY_TINGGAL_KELAS' || targetColumn === 'TINGGAL_KELAS_ACTION') {
      await updateDb((prev) => {
        const waliMap = new Map(
          prev.users
            .filter((u) => u.role === 'Guru' && u.kelas_ampu)
            .map((u) => [u.kelas_ampu as string, u.user_id])
        );
        const newHistoryRows: RiwayatKelas[] = [];
        const fallbackClass = kelasList[0]?.nama_kelas || 'Kelas A';
        const nextSiswa = prev.siswa.map((s) => {
          if (!ids.has(s.siswa_id)) return s;
          const stayClass = s.kelas_aktif === 'Lulus' ? lastKelasName : s.kelas_aktif || fallbackClass;
          if (activeTa) {
            newHistoryRows.push({
              riwayat_id: `RWY-${Date.now()}-${s.siswa_id}`,
              siswa_id: s.siswa_id,
              ta_id: activeTa.ta_id,
              nama_ta: activeTa.nama_ta,
              kelas: stayClass,
              wali_kelas_id: waliMap.get(stayClass) || '',
              status_akhir: 'Tinggal Kelas',
              catatan: noteTrim || `Konfirmasi tinggal di ${stayClass}`,
            });
          }
          return {
            ...s,
            kelas_aktif: stayClass,
            status_siswa: 'Aktif' as const,
            keputusan_kenaikan: 'TINGGAL_KELAS' as const,
            catatan_kenaikan: noteTrim || s.catatan_kenaikan || '',
            keputusan_diatur_oleh: actorLabel,
          };
        });
        return {
          ...prev,
          siswa: nextSiswa,
          riwayatKelas: [...prev.riwayatKelas, ...newHistoryRows],
        };
      }, `${siswaList.length} murid dikonfirmasi Tinggal Kelas.`);

      setPendingTransfer(null);
      setSelectedIds([]);
      return;
    }

    const dest = targetColumn;
    await updateDb(
      (prev) => {
        const waliMap = new Map(
          prev.users
            .filter((u) => u.role === 'Guru' && u.kelas_ampu)
            .map((u) => [u.kelas_ampu as string, u.user_id])
        );

        const newHistoryRows: RiwayatKelas[] = [];
        const updatedRiwayat = prev.riwayatKelas.map((r) => {
          if (ids.has(r.siswa_id) && r.ta_id === activeTa?.ta_id && r.status_akhir === 'Berjalan') {
            if (dest === 'Lulus') {
              return {
                ...r,
                status_akhir: 'Lulus' as const,
                catatan: noteTrim || 'Lulus · Melanjutkan ke SD',
              };
            }
            if (r.kelas !== dest) {
              return {
                ...r,
                status_akhir: 'Naik Kelas' as const,
                catatan: noteTrim || `Pindah ke ${dest}`,
              };
            }
          }
          return r;
        });

        const nextSiswa = prev.siswa.map((s) => {
          if (!ids.has(s.siswa_id)) return s;
          if (dest === 'Lulus') {
            return {
              ...s,
              kelas_aktif: 'Lulus' as const,
              status_siswa: 'Lulus' as const,
              keputusan_kenaikan: 'LULUS_KE_SD' as const,
              catatan_kenaikan: noteTrim || s.catatan_kenaikan || 'Melanjutkan ke SD',
              keputusan_diatur_oleh: actorLabel,
            };
          }
          if (activeTa && s.kelas_aktif !== dest) {
            newHistoryRows.push({
              riwayat_id: `RWY-${Date.now()}-${s.siswa_id}`,
              siswa_id: s.siswa_id,
              ta_id: activeTa.ta_id,
              nama_ta: activeTa.nama_ta,
              kelas: dest,
              wali_kelas_id: waliMap.get(dest) || '',
              status_akhir: 'Berjalan',
              catatan: noteTrim || `Dipindahkan ke ${dest}`,
            });
          }
          return {
            ...s,
            kelas_aktif: dest,
            status_siswa: 'Aktif' as const,
            keputusan_kenaikan: 'BELUM_DITENTUKAN' as const,
            catatan_kenaikan: noteTrim || s.catatan_kenaikan || '',
            keputusan_diatur_oleh: actorLabel,
          };
        });

        return {
          ...prev,
          siswa: nextSiswa,
          riwayatKelas: [...updatedRiwayat, ...newHistoryRows],
        };
      },
      dest === 'Lulus'
        ? `${siswaList.length} murid dikonfirmasi Lulus (melanjutkan ke SD).`
        : `${siswaList.length} murid dipindahkan ke ${dest}.`
    );

    triggerCelebration(dest === 'Lulus' ? 'Lulus ke SD!' : `Pindah ke ${dest}!`);
    setPendingTransfer(null);
    setSelectedIds([]);
  };

  // Apply confirmed decisions directly (for Guru or Admin without advancing Tahun Ajaran yet)
  const confirmedBreakdown = useMemo(() => {
    const active = db.siswa.filter((s) => s.status_siswa === 'Aktif');
    const naikList: Array<{ siswa: Siswa; nextClass: string }> = [];
    const lulusList: Siswa[] = [];
    const tinggalList: Siswa[] = [];
    const belumList: Siswa[] = [];

    for (const s of active) {
      if (s.keputusan_kenaikan === 'TINGGAL_KELAS') {
        tinggalList.push(s);
        continue;
      }
      if (isPromoteDecision(s.keputusan_kenaikan)) {
        const target = getNextClassTarget(db, s.kelas_aktif);
        if (target.isFinal || s.keputusan_kenaikan === 'LULUS_KE_SD') {
          lulusList.push(s);
        } else {
          naikList.push({ siswa: s, nextClass: target.nextClassName });
        }
        continue;
      }
      belumList.push(s);
    }

    return { naikList, lulusList, tinggalList, belumList };
  }, [db]);

  const handleApplyConfirmedDecisions = async () => {
    const naikMap = new Map(confirmedBreakdown.naikList.map((n) => [n.siswa.siswa_id, n.nextClass]));
    const lulusSet = new Set(confirmedBreakdown.lulusList.map((s) => s.siswa_id));
    const tinggalSet = new Set(confirmedBreakdown.tinggalList.map((s) => s.siswa_id));

    if (naikMap.size + lulusSet.size + tinggalSet.size === 0) return;

    await updateDb((prev) => {
      const waliMap = new Map(
        prev.users
          .filter((u) => u.role === 'Guru' && u.kelas_ampu)
          .map((u) => [u.kelas_ampu as string, u.user_id])
      );
      const newRows: RiwayatKelas[] = [];

      const updatedRiwayat = prev.riwayatKelas.map((r) => {
        if (r.ta_id === activeTa?.ta_id && r.status_akhir === 'Berjalan') {
          const nextCls = naikMap.get(r.siswa_id);
          if (nextCls) {
            return { ...r, status_akhir: 'Naik Kelas' as const, catatan: `Naik ke ${nextCls}` };
          }
          if (lulusSet.has(r.siswa_id)) {
            return { ...r, status_akhir: 'Lulus' as const, catatan: 'Lulus · Melanjutkan ke SD' };
          }
          if (tinggalSet.has(r.siswa_id)) {
            return { ...r, status_akhir: 'Tinggal Kelas' as const, catatan: `Tinggal di ${r.kelas}` };
          }
        }
        return r;
      });

      const nextSiswa = prev.siswa.map((s) => {
        const nextCls = naikMap.get(s.siswa_id);
        if (nextCls) {
          if (activeTa) {
            newRows.push({
              riwayat_id: `RWY-${Date.now()}-${s.siswa_id}`,
              siswa_id: s.siswa_id,
              ta_id: activeTa.ta_id,
              nama_ta: activeTa.nama_ta,
              kelas: nextCls,
              wali_kelas_id: waliMap.get(nextCls) || '',
              status_akhir: 'Berjalan',
              catatan: s.catatan_kenaikan || `Naik dari ${s.kelas_aktif}`,
            });
          }
          return {
            ...s,
            kelas_aktif: nextCls,
            keputusan_kenaikan: 'BELUM_DITENTUKAN' as const,
            keputusan_diatur_oleh: actorLabel,
          };
        }
        if (lulusSet.has(s.siswa_id)) {
          return {
            ...s,
            kelas_aktif: 'Lulus' as const,
            status_siswa: 'Lulus' as const,
            keputusan_kenaikan: 'LULUS_KE_SD' as const,
            keputusan_diatur_oleh: actorLabel,
          };
        }
        if (tinggalSet.has(s.siswa_id)) {
          return {
            ...s,
            keputusan_kenaikan: 'TINGGAL_KELAS' as const,
            keputusan_diatur_oleh: actorLabel,
          };
        }
        return s;
      });

      return {
        ...prev,
        siswa: nextSiswa,
        riwayatKelas: [...updatedRiwayat, ...newRows],
      };
    }, `${naikMap.size} naik kelas, ${lulusSet.size} lulus ke SD, ${tinggalSet.size} tinggal kelas.`);

    triggerCelebration('Status kenaikan diterapkan!');
    setConfirmApplyModal(false);
  };

  const renderColumn = (
    col: ColumnTarget,
    title: string,
    subtitle: string,
    accent: string,
    colIndex: number
  ) => {
    const items = columnGroups[col] || [];
    const allChecked = items.length > 0 && items.every((s) => selectedIds.includes(s.siswa_id));
    const isLulusCol = col === 'Lulus';
    const prevCol = colIndex > 0 ? kelasList[colIndex - 1]?.nama_kelas : null;
    const nextCol = isLulusCol
      ? null
      : colIndex < kelasList.length - 1
      ? kelasList[colIndex + 1]?.nama_kelas
      : 'Lulus';

    return (
      <div
        key={col}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverColumn(col);
        }}
        onDragLeave={() => setDragOverColumn((prev) => (prev === col ? null : prev))}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverColumn(null);
          const id = e.dataTransfer.getData('text/plain') || draggedSiswaId;
          setDraggedSiswaId(null);
          if (!id) return;
          const student = db.siswa.find((s) => s.siswa_id === id);
          if (!student || student.kelas_aktif === col) return;
          openTransferDialog([student], col, String(student.kelas_aktif));
        }}
        className={`rounded-[22px] border p-4 transition-colors space-y-3 min-h-[260px] ${
          dragOverColumn === col
            ? 'border-[#176238] bg-[#dcebd2]/70 ring-2 ring-[#176238]/30'
            : 'border-[#d9d5c0] bg-[#fbf6e7]'
        }`}
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#d9d5c0]">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${accent}`} />
              <h3 className="text-base font-bold text-[#0f4527] m-0">{title}</h3>
              <span className="text-xs font-mono-tabular font-bold px-2 py-0.5 rounded-full bg-[#fffdf7] border border-[#d9d5c0] text-[#1d2b21]">
                {items.length}
              </span>
            </div>
            <p className="text-[11px] text-[#55665a] mt-0.5 m-0">{subtitle}</p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => toggleSelectColumn(col)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0f4527] hover:underline cursor-pointer shrink-0"
            >
              {allChecked ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>{allChecked ? 'Batal' : 'Pilih semua'}</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#55665a] border border-dashed border-[#d9d5c0] rounded-xl bg-[#fffdf7]/60">
            Seret kartu murid ke sini atau gunakan tombol ceklis.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((s) => {
              const checked = selectedIds.includes(s.siswa_id);
              const targetInfo = getNextClassTarget(db, s.kelas_aktif);
              const badge = getDecisionLabel(s, targetInfo.label);
              return (
                <div
                  key={s.siswa_id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', s.siswa_id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedSiswaId(s.siswa_id);
                  }}
                  onDragEnd={() => {
                    setDraggedSiswaId(null);
                    setDragOverColumn(null);
                  }}
                  className={`p-3 rounded-xl border bg-[#fffdf7] transition-all flex items-start gap-2.5 ${
                    checked
                      ? 'border-[#176238] ring-2 ring-[#176238]/20'
                      : 'border-[#d9d5c0] hover:border-[#176238]/50'
                  } ${draggedSiswaId === s.siswa_id ? 'opacity-50' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSelect(s.siswa_id)}
                    aria-label={`Pilih ${s.nama_anak}`}
                    className="mt-0.5 text-[#176238] cursor-pointer shrink-0"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-[#55665a]" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <GripVertical
                        className="w-3.5 h-3.5 text-[#8a968d] shrink-0 cursor-grab"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-bold text-[#1d2b21] truncate m-0">
                        {s.nama_anak}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#55665a] font-mono-tabular mt-0.5 m-0">
                      NIS {s.nis}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          badge.tone === 'emerald'
                            ? 'bg-[#dcebd2] text-[#0f4527]'
                            : badge.tone === 'amber'
                            ? 'bg-[#fdeab5] text-[#7c4d03]'
                            : badge.tone === 'sky'
                            ? 'bg-[#e0f2fe] text-[#075985]'
                            : 'bg-[#f3efe0] text-[#55665a]'
                        }`}
                      >
                        {badge.text}
                      </span>
                    </div>
                    {s.catatan_kenaikan && (
                      <p className="text-[11px] text-[#55665a] mt-1 italic m-0 truncate">
                        “{s.catatan_kenaikan}”
                      </p>
                    )}
                  </div>

                  {/* Quick arrow controls for touch/mobile */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {!isLulusCol && nextCol && (
                      <button
                        type="button"
                        onClick={() => openTransferDialog([s], nextCol, s.kelas_aktif)}
                        title={
                          nextCol === 'Lulus'
                            ? 'Konfirmasi Lulus ke SD / Tinggal Kelas'
                            : `Pindahkan ke ${nextCol}`
                        }
                        aria-label={`Pindahkan ${s.nama_anak} ke ${nextCol}`}
                        className="p-1.5 rounded-lg border border-[#d9d5c0] text-[#0f4527] hover:bg-[#dcebd2] cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isLulusCol && prevCol && (
                      <button
                        type="button"
                        onClick={() => openTransferDialog([s], prevCol, s.kelas_aktif)}
                        title={`Pindahkan ke ${prevCol}`}
                        aria-label={`Pindahkan ${s.nama_anak} ke ${prevCol}`}
                        className="p-1.5 rounded-lg border border-[#d9d5c0] text-[#55665a] hover:bg-[#f3efe0] cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isLulusCol && (
                      <button
                        type="button"
                        onClick={() => openTransferDialog([s], lastKelasName, 'Lulus')}
                        title={`Kembalikan ke ${lastKelasName} (Tinggal Kelas)`}
                        aria-label={`Kembalikan ${s.nama_anak} ke ${lastKelasName}`}
                        className="p-1.5 rounded-lg border border-[#d9d5c0] text-[#7c4d03] hover:bg-[#fdeab5] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const selectedStudents = useMemo(
    () => db.siswa.filter((s) => selectedIds.includes(s.siswa_id)),
    [db.siswa, selectedIds]
  );

  const gridColClass =
    kelasList.length + 1 <= 2
      ? 'lg:grid-cols-2'
      : kelasList.length + 1 === 3
      ? 'lg:grid-cols-3'
      : 'md:grid-cols-2 xl:grid-cols-4';

  const isTargetNextStep = useMemo(() => {
    if (!pendingTransfer || pendingTransfer.targetColumn === 'TINGGAL_KELAS_ACTION') return false;
    if (pendingTransfer.targetColumn === 'Lulus') return true;
    return pendingTransfer.siswaList.some(
      (s) =>
        s.kelas_aktif !== 'Lulus' &&
        getNextClassTarget(db, s.kelas_aktif).nextClassName === pendingTransfer.targetColumn
    );
  }, [pendingTransfer, db]);

  return (
    <section className="kartu space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#d9d5c0]">
        <div>
          <h2 className="text-lg sm:text-xl text-[#0f4527] inline-flex items-center gap-2 m-0">
            <GraduationCap className="w-5 h-5 text-[#176238]" />
            <span>
              {mode === 'admin'
                ? 'Pengaturan perpindahan kelas, tinggal kelas & kelulusan ke SD'
                : 'Konfirmasi kenaikan kelas, tinggal kelas & kelulusan ke SD'}
            </span>
          </h2>
          <p className="text-xs text-[#55665a] mt-1 m-0">
            {mode === 'admin'
              ? 'Ceklis murid atau seret (drag & drop) antar kolom kelas custom untuk memindahkan kelas, mengonfirmasi tinggal kelas, atau meluluskan ke SD. Otomatis tersinkron ke Google Sheets.'
              : 'Tentukan tiap murid lanjut ke kelas berikutnya / melanjutkan ke SD atau tinggal kelas, lalu simpan atau terapkan. Pengaturan juga terbaca oleh Admin dan Google Sheets.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'admin' && Boolean(db.pengaturanSekolah.gas_webapp_url) && (
            <button
              type="button"
              onClick={pushToSheets}
              className="tbl polos kecil"
              title="Kirim pembaruan kelas ke Google Sheets sekarang"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{syncStatus.connected ? 'Sinkron ke Sheet' : 'Kirim ke Sheet'}</span>
            </button>
          )}
          {mode === 'admin' && (
            <div className="tab-bar" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'papan'}
                onClick={() => setViewMode('papan')}
                className={`tab-btn ${viewMode === 'papan' ? 'aktif' : ''}`}
              >
                Papan Drag &amp; Ceklis
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'konfirmasi'}
                onClick={() => setViewMode('konfirmasi')}
                className={`tab-btn ${viewMode === 'konfirmasi' ? 'aktif' : ''}`}
              >
                Daftar Konfirmasi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[210px] max-w-sm">
          <Search className="w-4 h-4 text-[#55665a] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama anak atau NIS..."
            className="isian-kontrol min-h-[38px] pl-9 text-xs"
          />
        </div>

        {viewMode === 'konfirmasi' && (
          <div className="tab-bar">
            <button
              type="button"
              onClick={() => setKelasFilter('Semua')}
              className={`tab-btn ${kelasFilter === 'Semua' ? 'aktif' : ''}`}
            >
              Semua
            </button>
            {kelasList.map((k) => (
              <button
                key={k.kelas_id}
                type="button"
                onClick={() => setKelasFilter(k.nama_kelas)}
                className={`tab-btn ${kelasFilter === k.nama_kelas ? 'aktif' : ''}`}
              >
                {k.nama_kelas}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setKelasFilter('Lulus')}
              className={`tab-btn ${kelasFilter === 'Lulus' ? 'aktif' : ''}`}
            >
              Sudah Lulus (SD)
            </button>
          </div>
        )}
      </div>

      {/* VIEW: DRAG & DROP + CHECKLIST BOARD (ADMIN) */}
      {mode === 'admin' && viewMode === 'papan' && (
        <div className="space-y-4">
          {selectedStudents.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#dcebd2]/85 border border-[#176238]/40 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-extrabold text-[#0f4527] m-0">
                {selectedStudents.length} murid dipilih:{' '}
                <span className="font-normal">
                  {selectedStudents
                    .slice(0, 3)
                    .map((s) => s.nama_anak)
                    .join(', ')}
                  {selectedStudents.length > 3 ? ` +${selectedStudents.length - 3} lainnya` : ''}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {kelasList.map((k) => (
                  <button
                    key={k.kelas_id}
                    type="button"
                    onClick={() =>
                      openTransferDialog(selectedStudents, k.nama_kelas, 'Ceklis Pilihan')
                    }
                    className="tbl polos kecil"
                  >
                    Pindah ke {k.nama_kelas}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => openTransferDialog(selectedStudents, 'Lulus', 'Ceklis Pilihan')}
                  className="tbl kecil"
                >
                  Luluskan (Ke SD)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openTransferDialog(selectedStudents, 'TINGGAL_KELAS_ACTION', 'Ceklis Pilihan')
                  }
                  className="tbl polos kecil"
                >
                  Tandai Tinggal Kelas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-bold text-[#a33a25] px-2 py-1 hover:underline cursor-pointer"
                >
                  Batal pilih
                </button>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 ${gridColClass} gap-4 items-start`}>
            {kelasList.map((k, idx) => {
              const target = getNextClassTarget(db, k.nama_kelas);
              const accent =
                k.jenjang === 'B' ? 'bg-[#0284c7]' : idx % 2 === 0 ? 'bg-[#176238]' : 'bg-[#0f766e]';
              return renderColumn(
                k.nama_kelas,
                k.nama_kelas,
                `Konfirmasi ${target.label.toLowerCase()} atau tinggal di ${k.nama_kelas}`,
                accent,
                idx
              );
            })}
            {renderColumn(
              'Lulus',
              'Lulus (Lanjut ke SD)',
              'Alumni yang sudah melanjutkan ke SD (bisa dikembalikan jika batal)',
              'bg-[#d97706]',
              kelasList.length
            )}
          </div>
        </div>
      )}

      {/* VIEW: KONFIRMASI PER MURID (GURU & ADMIN) */}
      {viewMode === 'konfirmasi' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#fbf6e7] border border-[#d9d5c0]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#0f4527]">Aksi cepat konfirmasi:</span>
              {kelasList.map((k) => {
                const target = getNextClassTarget(db, k.nama_kelas);
                return (
                  <button
                    key={k.kelas_id}
                    type="button"
                    onClick={() =>
                      setBatchDecision(
                        k.nama_kelas,
                        target.isFinal ? 'LULUS_KE_SD' : 'NAIK_KELAS_NEXT'
                      )
                    }
                    className="tbl polos kecil"
                  >
                    Semua {k.nama_kelas} → {target.label}
                  </button>
                );
              })}
            </div>

            {confirmedBreakdown.naikList.length +
              confirmedBreakdown.lulusList.length +
              confirmedBreakdown.tinggalList.length >
              0 && (
              <button
                type="button"
                onClick={() => setConfirmApplyModal(true)}
                className="tbl kecil"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terapkan Perpindahan Sekarang</span>
              </button>
            )}
          </div>

          {filteredStudents.length === 0 ? (
            <p className="kosong">Tidak ada murid pada filter ini.</p>
          ) : (
            <div className="space-y-2.5">
              {filteredStudents.map((s) => {
                const currentNote =
                  editingNotes[s.siswa_id] !== undefined
                    ? editingNotes[s.siswa_id]
                    : s.catatan_kenaikan || '';
                const noteDirty =
                  editingNotes[s.siswa_id] !== undefined &&
                  editingNotes[s.siswa_id] !== (s.catatan_kenaikan || '');
                const targetInfo = getNextClassTarget(db, s.kelas_aktif);
                const promoteSelected =
                  s.keputusan_kenaikan !== 'TINGGAL_KELAS' && isPromoteDecision(s.keputusan_kenaikan);

                return (
                  <div
                    key={s.siswa_id}
                    className="p-3.5 rounded-2xl border border-[#d9d5c0] bg-[#fffdf7] flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-[#1d2b21] m-0">{s.nama_anak}</p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#dcebd2]/70 text-[#0f4527]">
                          {s.kelas_aktif === 'Lulus' ? 'Lulus (Ke SD)' : s.kelas_aktif}
                        </span>
                      </div>
                      <p className="text-xs text-[#55665a] font-mono-tabular mt-0.5 m-0">
                        NIS {s.nis}
                        {s.keputusan_diatur_oleh ? ` · Disetel oleh: ${s.keputusan_diatur_oleh}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      {s.kelas_aktif !== 'Lulus' ? (
                        <div className="inline-flex rounded-xl border border-[#d9d5c0] bg-[#fbf6e7] p-1 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setStudentDecision(
                                s.siswa_id,
                                targetInfo.isFinal ? 'LULUS_KE_SD' : 'NAIK_KELAS_NEXT'
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              promoteSelected
                                ? 'bg-[#176238] text-white'
                                : 'text-[#1d2b21] hover:bg-[#dcebd2]/60'
                            }`}
                          >
                            {targetInfo.label}
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentDecision(s.siswa_id, 'TINGGAL_KELAS')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              s.keputusan_kenaikan === 'TINGGAL_KELAS'
                                ? 'bg-[#d97706] text-white'
                                : 'text-[#7c4d03] hover:bg-[#fdeab5]/70'
                            }`}
                          >
                            Tinggal di {s.kelas_aktif}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openTransferDialog([s], lastKelasName, 'Lulus')}
                          className="tbl polos kecil"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kembalikan ke {lastKelasName} (Tinggal Kelas)</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={currentNote}
                          onChange={(e) =>
                            setEditingNotes((prev) => ({
                              ...prev,
                              [s.siswa_id]: e.target.value,
                            }))
                          }
                          placeholder={
                            targetInfo.isFinal
                              ? 'Catatan SD tujuan / tinggal kelas...'
                              : 'Catatan kenaikan kelas...'
                          }
                          className="isian-kontrol min-h-[34px] py-1 text-xs w-48"
                        />
                        {noteDirty && (
                          <button
                            type="button"
                            onClick={() => saveStudentNote(s.siswa_id)}
                            className="tbl kecil"
                          >
                            Simpan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Konfirmasi Pindah / Lulus ke SD / Tinggal Kelas */}
      {pendingTransfer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-konf-pindah"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPendingTransfer(null);
          }}
        >
          <div className="w-full max-w-md bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="judul-konf-pindah" className="text-xl text-[#0f4527] m-0">
                {pendingTransfer.targetColumn === 'Lulus'
                  ? 'Konfirmasi kelulusan ke SD'
                  : pendingTransfer.targetColumn === 'TINGGAL_KELAS_ACTION'
                  ? 'Konfirmasi tinggal kelas'
                  : `Konfirmasi pindah ke ${pendingTransfer.targetColumn}`}
              </h2>
              <button
                type="button"
                onClick={() => setPendingTransfer(null)}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fbf6e7] border border-[#d9d5c0] text-xs space-y-1.5">
              <p className="font-bold text-[#0f4527] m-0">
                {pendingTransfer.siswaList.length} murid dipilih ({pendingTransfer.sourceLabel}):
              </p>
              <p className="text-[#1d2b21] m-0">
                {pendingTransfer.siswaList.map((s) => `${s.nama_anak} (${s.kelas_aktif})`).join(', ')}
              </p>
            </div>

            <p className="text-sm text-[#1d2b21] leading-relaxed m-0">
              {pendingTransfer.targetColumn === 'Lulus'
                ? 'Apakah murid di atas dinyatakan Lulus dan melanjutkan ke SD, atau ada yang tinggal di kelasnya saat ini?'
                : isTargetNextStep
                ? `Apakah murid di atas lanjut naik ke ${pendingTransfer.targetColumn}, atau tinggal di kelasnya saat ini?`
                : pendingTransfer.targetColumn === 'TINGGAL_KELAS_ACTION'
                ? 'Murid akan tetap berada di kelasnya saat ini dengan status konfirmasi Tinggal Kelas dan tercatat di riwayat kelas.'
                : `Murid akan dipindahkan ke ${pendingTransfer.targetColumn} dan statusnya diaktifkan kembali jika sebelumnya sudah Lulus.`}
            </p>

            <div>
              <label htmlFor="catatan-pindah" className="block text-xs font-bold text-[#55665a] mb-1">
                Catatan (opsional, mis. nama SD tujuan / alasan tinggal kelas)
              </label>
              <input
                id="catatan-pindah"
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder={
                  pendingTransfer.targetColumn === 'Lulus'
                    ? 'Contoh: Melanjutkan ke SDN 1 Sukamajukaler'
                    : 'Contoh: Pindah rombel / perlu penguatan membaca'
                }
                className="isian-kontrol text-xs"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingTransfer(null)}
                className="tbl polos"
              >
                Batal
              </button>

              {isTargetNextStep && (
                <button
                  type="button"
                  onClick={() => executeTransfer('STAY_TINGGAL_KELAS')}
                  className="tbl polos"
                >
                  Tandai Tinggal Kelas
                </button>
              )}

              {pendingTransfer.targetColumn === 'TINGGAL_KELAS_ACTION' ? (
                <button
                  type="button"
                  onClick={() => executeTransfer('STAY_TINGGAL_KELAS')}
                  className="tbl"
                >
                  Ya, Tandai Tinggal Kelas
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => executeTransfer('MOVE')}
                  className="tbl"
                >
                  {pendingTransfer.targetColumn === 'Lulus'
                    ? 'Ya, Lulus (Lanjut ke SD)'
                    : `Ya, Pindahkan ke ${pendingTransfer.targetColumn}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Terapkan Keputusan Konfirmasi (Guru & Admin) */}
      {confirmApplyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1f14]/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-terapkan-konfirmasi"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmApplyModal(false);
          }}
        >
          <div className="w-full max-w-md bg-[#fffdf7] rounded-[26px] border border-[#d9d5c0] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="judul-terapkan-konfirmasi" className="text-xl text-[#0f4527] m-0">
                Terapkan konfirmasi kenaikan?
              </h2>
              <button
                type="button"
                onClick={() => setConfirmApplyModal(false)}
                aria-label="Tutup dialog"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#55665a] hover:bg-[#dcebd2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="text-sm text-[#1d2b21] space-y-1.5 pl-4 list-disc">
              <li>
                <strong>{confirmedBreakdown.naikList.length} anak</strong> → naik ke kelas berikutnya
              </li>
              <li>
                <strong>{confirmedBreakdown.lulusList.length} anak</strong> →{' '}
                <strong>Lulus (Melanjutkan ke SD)</strong>
              </li>
              <li>
                <strong>{confirmedBreakdown.tinggalList.length} anak</strong> →{' '}
                <strong>Tinggal Kelas</strong> (tetap di kelas saat ini)
              </li>
            </ul>

            {confirmedBreakdown.belumList.length > 0 && (
              <p className="text-xs text-[#7c4d03] bg-[#fdeab5]/70 border border-[#f2b632] rounded-xl p-2.5 m-0">
                {confirmedBreakdown.belumList.length} anak yang statusnya masih “Belum dikonfirmasi” tidak akan dipindahkan.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmApplyModal(false)}
                className="tbl polos"
              >
                Batal
              </button>
              <button type="button" onClick={handleApplyConfirmedDecisions} className="tbl">
                Ya, Terapkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
