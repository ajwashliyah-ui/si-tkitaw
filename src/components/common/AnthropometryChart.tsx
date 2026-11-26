import React, { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
} from 'chart.js';
import { AntropometriRecord } from '../../types';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip
);

const METRICS: { key: keyof AntropometriRecord; label: string; color: string }[] = [
  { key: 'bb_kg', label: 'Berat badan (kg)', color: '#176238' },
  { key: 'tb_cm', label: 'Tinggi badan (cm)', color: '#b4531f' },
  { key: 'lk_cm', label: 'Lingkar kepala (cm)', color: '#2f5f9e' },
  { key: 'lila_cm', label: 'Lingkar lengan atas (cm)', color: '#8a4a86' },
];

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatBulanLabel(periode: string): string {
  const [y, m] = periode.split('-');
  const idx = Number(m) - 1;
  return `${(BULAN_NAMA[idx] || m).slice(0, 3)} ${(y || '').slice(2, 4)}`;
}

interface AnthropometryChartProps {
  records: AntropometriRecord[];
  studentName: string;
}

export const AnthropometryChart: React.FC<AnthropometryChartProps> = ({ records, studentName }) => {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const chartRefs = useRef<Chart[]>([]);

  useEffect(() => {
    chartRefs.current.forEach((c) => c.destroy());
    chartRefs.current = [];

    const sorted = [...records].sort((a, b) => a.periode_bulan.localeCompare(b.periode_bulan));
    if (sorted.length === 0) return;

    METRICS.forEach((m, idx) => {
      const canvas = canvasRefs.current[idx];
      if (!canvas) return;
      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: sorted.map((a) => formatBulanLabel(a.periode_bulan)),
          datasets: [
            {
              data: sorted.map((a) => Number(a[m.key])),
              borderColor: m.color,
              backgroundColor: m.color,
              tension: 0.3,
              pointRadius: 5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              grace: '15%',
              grid: { color: 'rgba(29, 43, 33, 0.08)' },
            },
            x: {
              grid: { display: false },
            },
          },
        },
      });
      chartRefs.current.push(chart);
    });

    return () => {
      chartRefs.current.forEach((c) => c.destroy());
      chartRefs.current = [];
    };
  }, [records, studentName]);

  if (records.length === 0) {
    return (
      <p className="kosong">
        Belum ada data pengukuran untuk {studentName}. Grafik muncul setelah guru mengisi bulan pertama.
      </p>
    );
  }

  return (
    <div className="grafik-kisi" data-testid="anthropometry-chart">
      {METRICS.map((m, idx) => (
        <figure key={m.key}>
          <figcaption>{m.label}</figcaption>
          <div className="kanvas">
            <canvas
              ref={(el) => {
                canvasRefs.current[idx] = el;
              }}
              aria-label={`${m.label} per bulan untuk ${studentName}`}
            />
          </div>
        </figure>
      ))}
    </div>
  );
};
