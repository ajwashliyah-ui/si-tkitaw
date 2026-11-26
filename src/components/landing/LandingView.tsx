import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';

const HARI: [string, string, string, string, string, boolean][] = [
  ['05.00', 'Bangun Pagi', 'Hari dimulai saat langit masih jingga. Anak belajar menyambut pagi dengan segar.', '#f6b48f', '#fde3b8', false],
  ['05.15', 'Beribadah', 'Berwudu, shalat bersama Ayah dan Bunda, lalu membaca doa.', '#f7cfa0', '#fff0cc', false],
  ['06.00', 'Berolahraga', 'Badan digerakkan: melompat, berlari, atau berjalan pagi.', '#a9d8ee', '#e5f5ea', false],
  ['07.00', 'Makan Sehat dan Bergizi', 'Sarapan dengan lauk, sayur, dan buah sebelum berangkat.', '#8fcdee', '#dcf1fb', false],
  ['09.00', 'Gemar Belajar', 'Di sekolah: huruf, Iqra, surat pendek, dan banyak bertanya.', '#7fc3ee', '#d3ecfa', false],
  ['16.00', 'Bermasyarakat', 'Sore hari bermain dengan teman, memberi salam kepada tetangga.', '#e99a6b', '#fbd59b', false],
  ['20.00', 'Tidur Cepat', 'Gawai disimpan, doa dibaca, dan anak beristirahat cukup.', '#122044', '#33487a', true],
];

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const j = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + j * Math.cos(a)).toFixed(1)},${(cy + j * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const FLOWERS: [number, number, string][] = [
  [60, 590, '#f2a7b5'],
  [170, 612, '#fffdf5'],
  [300, 580, '#f4c04f'],
  [430, 605, '#e2735d'],
  [790, 592, '#fffdf5'],
  [900, 610, '#f2a7b5'],
  [1040, 580, '#f4c04f'],
  [1140, 606, '#fffdf5'],
];

const CHILDREN: { x: number; y: number; baju: string; kerudung: string; i: number }[] = [
  { x: 520, y: 500, baju: '#e2735d', kerudung: '#f4c04f', i: 0 },
  { x: 600, y: 510, baju: '#3f7fb5', kerudung: '', i: 1 },
  { x: 680, y: 498, baju: '#8d5a97', kerudung: '#f2a7b5', i: 2 },
];

interface LandingViewProps {
  onOpenLogin: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onOpenLogin }) => {
  const { schoolInfo } = useApp();
  const sampulRef = useRef<HTMLElement | null>(null);
  const sehariRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reportRef = useRef<HTMLElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1000px)').matches : true
  );
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => {
    const mqWide = window.matchMedia('(min-width: 1000px)');
    const onMqChange = () => setIsWide(mqWide.matches);
    mqWide.addEventListener('change', onMqChange);
    return () => mqWide.removeEventListener('change', onMqChange);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let queued = false;

    const updateOnScroll = () => {
      queued = false;
      const y = window.scrollY;
      const sampul = sampulRef.current;
      if (!reduced && sampul && y < sampul.offsetHeight) {
        const layers = sampul.querySelectorAll<SVGGElement>('.lapis');
        layers.forEach((l) => {
          const d = Number(l.dataset.d || '0');
          l.style.transform = `translateY(${(y * d).toFixed(1)}px)`;
        });
      }

      const bagian = sehariRef.current;
      if (bagian) {
        const r = bagian.getBoundingClientRect();
        const span = Math.max(1, r.height - window.innerHeight);
        const p = Math.min(1, Math.max(0, -r.top / span));
        setProgress(p);
        const idx = Math.min(HARI.length - 1, Math.floor(p * HARI.length));
        setActiveIndex(idx);
      }
    };

    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(updateOnScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateOnScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setReportVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    if (reportRef.current) observer.observe(reportRef.current);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (sampulRef.current) {
      const mx = (e.clientX / window.innerWidth - 0.5).toFixed(3);
      sampulRef.current.style.setProperty('--mx', mx);
    }
  };

  const handleJumpStep = (idx: number) => {
    const bagian = sehariRef.current;
    if (!bagian) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const jarak = bagian.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: bagian.offsetTop + (jarak * (idx + 0.5)) / HARI.length,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  const handleScrollToSehari = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sehariRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  const currentHari = HARI[activeIndex];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="atas">
        <a className="merek" href="#isi">
          <img
            src="/assets/aistudio/lambang_4f3dfdc2.png"
            alt="Lambang Al-Washliyah"
            width={44}
            height={41}
          />
          <span>{schoolInfo.nama_sekolah}</span>
        </a>
        <button type="button" className="tbl" onClick={onOpenLogin}>
          Masuk
        </button>
      </header>

      <main id="isi" className="flex-1">
        <section ref={sampulRef} className="sampul" onPointerMove={handlePointerMove}>
          <div className="sapa">
            <p className="salam" lang="ar" dir="rtl">
              السَّلَامُ عَلَيْكُمْ
            </p>
            <h1>Tumbuh bersama, tercatat setiap bulan</h1>
            <p>
              Laporan perkembangan anak {schoolInfo.nama_sekolah}
              {schoolInfo.tahun_ajaran_aktif ? `, tahun ajaran ${schoolInfo.tahun_ajaran_aktif}` : ''}.
              Ayah, Bunda, dan guru membaca cerita yang sama tentang si kecil.
            </p>
            <div className="aksi-sampul">
              <button type="button" className="tbl besar" onClick={onOpenLogin}>
                Buka laporan anak
              </button>
              <a className="tbl besar polos" href="#sehari" onClick={handleScrollToSehari}>
                Lihat sehari si kecil
              </a>
            </div>
          </div>

          <svg
            ref={svgRef}
            className="pemandangan"
            viewBox={isWide ? '0 0 1200 640' : '450 60 550 580'}
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
          >
            <g className="lapis" data-d="0.35">
              <g
                className="bulan-sabit"
                fill="#176238"
                transform={isWide ? undefined : 'translate(-424 88)'}
              >
                <path d="M978 78a74 74 0 1 0 62 112a60 60 0 1 1-62-112Z" />
                {[
                  [1058, 150, 0],
                  [1090, 168, 0.5],
                  [1048, 184, 1.0],
                  [1080, 204, 1.5],
                  [1038, 218, 2.0],
                ].map(([sx, sy, delay], idx) => (
                  <polygon
                    key={idx}
                    points={starPoints(sx, sy, 13)}
                    className="bintang-kelip"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </g>
            </g>

            <g className="lapis awan" data-d="0.55" fill="#fffdf5">
              <g className="awan-mengalir">
                <path d="M90 190q8-44 52-38q22-40 66-14q46-8 46 34q30 6 22 30H92q-28-4-2-12Z" />
                <path d="M760 120q6-30 36-26q18-28 46-8q34-4 32 24q22 4 16 20H764q-22-2-4-10Z" />
              </g>
            </g>

            <g className="lapis" data-d="0.3">
              <path d="M0 430Q210 320 470 410T900 390T1200 380V640H0Z" fill="#bcd9a4" />
              <g transform="translate(1060 400) scale(1.35)">
                <rect x="-5" y="-30" width="10" height="42" rx="4" fill="#8a6242" />
                <ellipse cy="-62" rx="34" ry="46" fill="#4f8f5b" />
              </g>
              <g transform="translate(990 415) scale(0.85)">
                <rect x="-5" y="-30" width="10" height="42" rx="4" fill="#8a6242" />
                <ellipse cy="-62" rx="34" ry="46" fill="#6fa86a" />
              </g>
            </g>

            <g className="lapis" data-d="0.15">
              <path d="M0 500Q300 410 640 480T1200 455V640H0Z" fill="#93c27e" />
              <g transform="translate(790 352)">
                <rect width="170" height="118" fill="#fff6dc" />
                <path d="M-18 6L85-62L188 6Z" fill="#c9603f" />
                <path d="M66 118V80a19 19 0 0 1 38 0v38Z" fill="#176238" />
                <rect x="18" y="38" width="30" height="30" rx="14" fill="#8fcbe8" />
                <rect x="122" y="38" width="30" height="30" rx="14" fill="#8fcbe8" />
                <path d="M78 -28a14 14 0 1 0 14 22a11 11 0 1 1-14-22Z" fill="#fff6dc" />
              </g>
            </g>

            <g className="lapis" data-d="0">
              <path d="M0 560Q320 500 700 552T1200 530V640H0Z" fill="#5f9e63" />
              {CHILDREN.map((c) => (
                <g key={c.i} transform={`translate(${c.x} ${c.y})`}>
                  <g className="anak" style={{ ['--i' as string]: c.i }}>
                    <path d="M-24 62 Q-20 8 0 8 Q20 8 24 62Z" fill={c.baju} />
                    {c.kerudung && (
                      <path d="M-29 20 Q-30 -34 0 -34 Q30 -34 29 20 Q0 36 -29 20Z" fill={c.kerudung} />
                    )}
                    <circle cy="-8" r="20" fill="#f6cba4" />
                    {!c.kerudung && (
                      <>
                        <path d="M-21 -10 Q-18 -34 2 -30 Q22 -30 21 -8 Q8 -20 -21 -10Z" fill="#3b2a20" />
                        <path d="M-17 -25 Q0 -42 18 -24Z" fill="#176238" />
                      </>
                    )}
                    <circle cx="-7" cy="-7" r="2.4" fill="#33241c" />
                    <circle cx="7" cy="-7" r="2.4" fill="#33241c" />
                    <circle cx="-12" cy="0" r="4" fill="#ee9b8f" />
                    <circle cx="12" cy="0" r="4" fill="#ee9b8f" />
                    <path d="M-6 1 Q0 8 6 1" fill="none" stroke="#33241c" strokeWidth="2" strokeLinecap="round" />
                    <path
                      className="lambai"
                      d="M17 22 Q34 14 36 -4"
                      fill="none"
                      stroke={c.baju}
                      strokeWidth="9"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              ))}

              {FLOWERS.map(([x, y, warna], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <g className="bunga-goyang" style={{ animationDelay: `${(i * 0.45).toFixed(2)}s` }}>
                    <g className="mekar" style={{ ['--i' as string]: i }}>
                      {[0, 72, 144, 216, 288].map((a) => (
                        <ellipse key={a} cy="-9" rx="6" ry="9" fill={warna} transform={`rotate(${a})`} />
                      ))}
                      <circle r="5" fill="#f2b632" />
                    </g>
                  </g>
                </g>
              ))}
            </g>
          </svg>
        </section>

        <section ref={sehariRef} className="sehari" id="sehari" aria-labelledby="j-sehari">
          <div
            className={`layar ${currentHari[5] ? 'malam' : ''}`}
            style={{
              ['--p' as string]: progress.toFixed(3),
              ['--atas' as string]: currentHari[3],
              ['--bawah' as string]: currentHari[4],
            }}
          >
            <div className="langit" aria-hidden="true">
              <i className="surya" />
              <i className="rembulan" />
              <i className="kelip" />
              <i className="bukit" />
            </div>

            <div className="isi-hari">
              <h2 id="j-sehari">Sehari bersama 7 Kebiasaan Anak Indonesia Hebat</h2>
              <div className="panggung">
                {HARI.map((h, i) => (
                  <article
                    key={h[0]}
                    className={`momen ${i === activeIndex ? 'aktif' : ''}`}
                    aria-hidden={i !== activeIndex}
                  >
                    <time>{h[0]}</time>
                    <h3>{h[1]}</h3>
                    <p>{h[2]}</p>
                  </article>
                ))}
              </div>
              <div className="jejak">
                {HARI.map((h, i) => (
                  <button
                    key={h[0]}
                    type="button"
                    aria-label={h[1]}
                    aria-current={i === activeIndex ? 'step' : undefined}
                    onClick={() => handleJumpStep(i)}
                  >
                    <span>{h[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          ref={reportRef}
          className={`isi-laporan muncul ${reportVisible ? 'terlihat' : ''}`}
        >
          <h2>Isi laporan setiap bulan</h2>
          <dl>
            <div>
              <dt>Pertumbuhan fisik</dt>
              <dd>Berat, tinggi, lingkar kepala, dan lingkar lengan atas, lengkap dengan grafik.</dd>
            </div>
            <div>
              <dt>Literasi &amp; belajar harian</dt>
              <dd>Huruf dan suku kata di Kelas A, target pribadi tiap anak di Kelas B, serta catatan belajar Senin–Jumat.</dd>
            </div>
            <div>
              <dt>Keagamaan</dt>
              <dd>Surat pendek, doa harian, hijaiyah dan Iqra beserta halaman, serta hadits pendek.</dd>
            </div>
            <div>
              <dt>Kebiasaan di rumah</dt>
              <dd>Kalender 7 KAIH, foto kegiatan, tips untuk Ayah &amp; Bunda, dan obrolan bersama guru.</dd>
            </div>
          </dl>
          <button type="button" className="tbl besar" onClick={onOpenLogin}>
            Masuk sebagai orang tua, guru, atau admin
          </button>
        </section>
      </main>

      <footer className="kaki">
        <img
          src="/assets/aistudio/logo_76510846.png"
          alt="Al Jam'iyatul Washliyah"
          width={110}
          height={116}
          loading="lazy"
        />
        <div>
          <strong className="font-display text-lg text-[#0f4527] block mb-1">
            {schoolInfo.nama_sekolah}
          </strong>
          <p className="text-sm text-[#1d2b21]">{schoolInfo.alamat_sekolah}</p>
          <p className="text-sm text-[#55665a]">
            NPSN {schoolInfo.npsn} · Kepala Sekolah: {schoolInfo.kepala_sekolah}
          </p>
          <p className="text-sm text-[#55665a]">{schoolInfo.kontak_sekolah}</p>
        </div>
      </footer>
    </div>
  );
};
