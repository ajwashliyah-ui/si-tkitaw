import React from 'react';
import { useApp } from '../../context/AppContext';
import { KenaikanKelasBoard } from '../common/KenaikanKelasBoard';

export const GuruKenaikanKelasView: React.FC = () => {
  const { currentUser } = useApp();

  return (
    <div className="halaman space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl text-[#0f4527]">Konfirmasi kenaikan &amp; kelulusan</h1>
        <p className="text-sm text-[#55665a] mt-1">
          Atur konfirmasi tiap anak apakah lanjut ke kelas berikutnya / melanjutkan ke SD, atau tinggal kelas. Pengaturan ini langsung tersinkron dengan Admin dan Google Sheets.
        </p>
      </div>

      <KenaikanKelasBoard
        mode="guru"
        defaultKelasFilter={currentUser?.kelas_ampu || 'Semua'}
      />
    </div>
  );
};
