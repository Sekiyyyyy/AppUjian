import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  Apple, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Info
} from 'lucide-react';

interface VersionInfo {
  latest_version: string;
  build_number: number;
  min_version: string;
  title: string;
  changelog: string[];
  download_url: string;
}

const DownloadPage: React.FC = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    axios.get('/api/v1/app/version')
      .then(res => setVersionInfo(res.data))
      .catch(() => {
        // Fallback default
        setVersionInfo({
          latest_version: '1.0.0',
          build_number: 1,
          min_version: '1.0.0',
          title: 'Pembaruan Aplikasi CBT',
          changelog: [
            'Rilis resmi aplikasi CBT SMK Negeri 1 Beringin.',
            'Fitur keamanan anti-curang dan kunci layar otomatis.',
            'Tersambung langsung ke cloud server resmi.'
          ],
          download_url: '/download'
        });
      });
  }, []);

  const version = versionInfo?.latest_version || '1.0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header (Sticky / Fixed Top) */}
      <header className="sticky top-0 z-50 border-b border-slate-700/80 bg-slate-900/85 backdrop-blur-md shadow-lg transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="Logo SMKN 1 Beringin" 
              className="w-10 h-10 object-contain drop-shadow"
              onError={(e) => {
                // If logo.png fails, fallback gracefully
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="font-bold text-lg tracking-tight">CBT SMK Negeri 1 Beringin</h1>
              <p className="text-xs text-slate-400">Portal Unduh Aplikasi Resmi Siswa</p>
            </div>
          </div>

          {/* Server Status Badge (Tanpa Tombol Login Rahasia) */}
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium px-3.5 py-1.5 rounded-full shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline font-semibold">Server CBT:</span>
            <span>Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-1 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} />
            <span>Versi Terbaru v{version} Tersedia</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Unduh Aplikasi Ujian Berbasis Komputer
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Dapatkan aplikasi ujian resmi untuk perangkat Anda. Dilengkapi proteksi anti-curang, kunci layar otomatis, dan performa ujian yang stabil.
          </p>
        </div>

        {/* Download Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Windows Desktop Card */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-sm hover:border-emerald-500/50 transition-all shadow-xl group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Monitor size={26} />
                </div>
                <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  Lab Komputer / Laptop
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">Windows Desktop (.exe)</h3>
              <p className="text-slate-400 text-sm mb-5">
                Paket instalasi 1 file tunggal. Otomatis membuat ikon di Desktop komputer lab atau laptop siswa.
              </p>

              <div className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>1 File Installer Setup (Langsung Install)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Kiosk Mode & Layar Penuh Otomatis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Mendukung Windows 10 & 11 (64-bit)</span>
                </div>
              </div>
            </div>

            <div>
              <a
                href="/downloads/AppUjian_Setup.exe"
                download={`AppUjian_Setup_v${version}.exe`}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.98] text-sm"
              >
                <Download size={18} />
                <span>Unduh Windows (.exe)</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Ukuran: ~10.7 MB • Versi {version}
              </p>
            </div>
          </div>

          {/* Android Mobile Card */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-sm hover:border-sky-500/50 transition-all shadow-xl group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Smartphone size={26} />
                </div>
                <span className="text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-full">
                  HP / Tablet Android
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">Android Mobile (.apk)</h3>
              <p className="text-slate-400 text-sm mb-5">
                Aplikasi ujian ringan untuk smartphone Android. Dilengkapi deteksi kecurangan dan kunci aplikasi.
              </p>

              <div className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-sky-400 flex-shrink-0" />
                  <span>Kunci Aplikasi & Anti-Split Screen</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-sky-400 flex-shrink-0" />
                  <span>Deteksi Keluar / Pindah Aplikasi</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-sky-400 flex-shrink-0" />
                  <span>Mendukung Android 8.0 hingga 14+</span>
                </div>
              </div>
            </div>

            <div>
              <a
                href="/downloads/AppUjian.apk"
                download={`AppUjian_v${version}.apk`}
                className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-sky-900/30 active:scale-[0.98] text-sm"
              >
                <Download size={18} />
                <span>Unduh Android (.apk)</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Ukuran: ~54.4 MB (APK) • Versi {version}
              </p>
            </div>
          </div>

          {/* Apple iOS Card */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-sm hover:border-violet-500/50 transition-all shadow-xl group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform">
                  <Apple size={26} />
                </div>
                <span className="text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2.5 py-1 rounded-full">
                  iPhone / iPad / Mac M-Series
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">Apple iOS (.ipa)</h3>
              <p className="text-slate-400 text-sm mb-5">
                Paket instalasi ujian untuk perangkat Apple iOS (iPhone & iPad) serta MacBook Apple Silicon (M1/M2/M3/M4).
              </p>

              <div className="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-violet-400 flex-shrink-0" />
                  <span>Kunci Fokus & Mode Ujian Layar Penuh</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-violet-400 flex-shrink-0" />
                  <span>Deteksi Pindah Aplikasi & Multi-Window</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-violet-400 flex-shrink-0" />
                  <span>iPhone, iPad & Mac M1/M2/M3/M4 (PlayCover)</span>
                </div>
              </div>
            </div>

            <div>
              <a
                href="/downloads/AppUjian.ipa"
                download={`AppUjian_v${version}.ipa`}
                className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-violet-900/30 active:scale-[0.98] text-sm"
              >
                <Download size={18} />
                <span>Unduh Apple iOS (.ipa)</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Ukuran: ~7.8 MB • Versi {version}
              </p>
            </div>
          </div>
        </div>

        {/* Info & Changelog Banner */}
        <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-start space-x-3">
            <Apple size={20} className="text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white mb-0.5">Panduan Instalasi iOS (.ipa) & MacBook</p>
              <p className="text-slate-400 leading-relaxed">
                Untuk memasang di iPhone/iPad, gunakan alat sideload seperti <b>Sideloadly</b>, <b>AltStore</b>, atau profil MDM sekolah. Untuk <b>MacBook Apple Silicon (M1/M2/M3/M4)</b>, file .ipa ini dapat dijalankan langsung menggunakan <b>PlayCover</b> atau Sideloadly.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-start space-x-3">
            <Info size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white mb-0.5">Catatan Pembaruan v{version}</p>
              <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                {versionInfo?.changelog?.map((log, idx) => (
                  <li key={idx}>{log}</li>
                )) || <li>Rilis aplikasi CBT terbaru</li>}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} SMK Negeri 1 Beringin. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
};

export default DownloadPage;
