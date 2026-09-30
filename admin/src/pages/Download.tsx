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
  const [guideTab, setGuideTab] = useState<'android' | 'windows' | 'ios'>('android');

  useEffect(() => {
    axios.get('/api/v1/app/version')
      .then(res => setVersionInfo(res.data))
      .catch(() => {
        // Fallback default
        setVersionInfo({
          latest_version: '1.0.9',
          build_number: 10,
          min_version: '1.0.9',
          title: 'Pembaruan Wajib Aplikasi CBT v1.0.9',
          changelog: [
            'Pembaruan wajib sematkan aplikasi (App Pinning): Menutup celah bypass dan menolak akses jika perizinan ditolak.',
            'Perbaikan tampilan responsif card persiapan ujian dan navigasi soal pada Desktop & Mobile.',
            'Peningkatan keamanan anti-cheating, deteksi unpin otomatis, dan kestabilan ujian.',
          ],
          download_url: '/download'
        });
      });
  }, []);

  const version = versionInfo?.latest_version || '1.0.9';

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
                href={`/downloads/AppUjian_Setup_v${version}.exe`}
                download={`AppUjian_Setup_v${version}.exe`}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.98] text-sm"
              >
                <Download size={18} />
                <span>Unduh Windows (.exe)</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Ukuran: ~11.5 MB • Versi {version}
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
                href={`/downloads/AppUjian_v${version}.apk`}
                download={`AppUjian_v${version}.apk`}
                className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-sky-900/30 active:scale-[0.98] text-sm"
              >
                <Download size={18} />
                <span>Unduh Android (.apk)</span>
              </a>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Ukuran: ~55.0 MB (APK) • Versi {version}
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
                href={`/downloads/AppUjian_v${version}.ipa`}
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

        {/* Security Assurance Banner */}
        <div className="mb-10 bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-sky-950/60 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                <ShieldCheck size={28} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-white text-base sm:text-lg">Aplikasi Resmi & 100% Aman</h4>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Terverifikasi
                  </span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  Aplikasi CBT SMKN 1 Beringin bebas virus dan malware. <b>Jangan mematikan proteksi perangkat</b> (Play Protect & Antivirus tetap aman aktif). Ikuti panduan 2 langkah di bawah jika muncul dialog konfirmasi instalasi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Installation Guide */}
        <div className="mb-10 bg-slate-900/70 border border-slate-700/80 rounded-2xl p-5 sm:p-7 backdrop-blur-md shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>Panduan Pemasangan Cepat (Bebas Blokir)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilih jenis perangkat Anda di bawah ini untuk melihat cara pasang tanpa mematikan proteksi:
              </p>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs font-medium">
              <button
                type="button"
                onClick={() => setGuideTab('android')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  guideTab === 'android'
                    ? 'bg-sky-600 text-white shadow-md font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={14} />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('windows')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  guideTab === 'windows'
                    ? 'bg-emerald-600 text-white shadow-md font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor size={14} />
                <span>Windows</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('ios')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  guideTab === 'ios'
                    ? 'bg-violet-600 text-white shadow-md font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Apple size={14} />
                <span>iOS / Mac</span>
              </button>
            </div>
          </div>

          {/* Tab Content: Android */}
          {guideTab === 'android' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm mb-2">
                      <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-xs">1</span>
                      <span>Saat Mengunduh di Google Chrome</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Jika muncul pemberitahuan <i>"File mungkin berbahaya. Tetap download AppUjian.apk?"</i>:
                    </p>
                    <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200">
                      👉 Tekan tombol <b className="text-sky-400">"Tetap download"</b> / <b className="text-sky-400">"Download anyway"</b>.
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 italic">
                    *Pesan ini adalah peringatan bawaan Chrome untuk semua file .apk dari luar Play Store.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm mb-2">
                      <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-xs">2</span>
                      <span>Saat Memasang (Google Play Protect)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Jika muncul dialog <i>"Aplikasi tidak dikenal"</i> atau <i>"Dicegah oleh Play Protect"</i>:
                    </p>
                    <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 space-y-1">
                      <div>1. Klik teks kecil <b className="text-amber-400">"Rincian"</b> atau <b className="text-amber-400">"Detail"</b> (bukan tombol Batal).</div>
                      <div>2. Lalu klik <b className="text-emerald-400">"Tetap instal (tidak aman)"</b>.</div>
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 mt-3 text-[11px] text-emerald-300">
                    ✅ <b>Selesai!</b> Aplikasi langsung terpasang tanpa perlu mematikan Play Protect.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Windows */}
          {guideTab === 'windows' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs">1</span>
                      <span>Saat Mengunduh di Browser Edge / Chrome</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Jika browser menampilkan peringatan <i>"File tidak umum diunduh"</i>:
                    </p>
                    <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200">
                      👉 Di daftar download, klik tanda titik tiga <b className="text-white">...</b> $\rightarrow$ pilih <b className="text-emerald-400">"Simpan / Keep"</b> $\rightarrow$ klik <b className="text-emerald-400">"Tetap simpan / Keep anyway"</b>.
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 italic">
                    *Browser Edge/Chrome secara otomatis menanyakan konfirmasi untuk semua file .exe baru.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs">2</span>
                      <span>Saat Menjalankan Installer (SmartScreen)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Jika muncul layar biru Microsoft Defender <i>"Windows protected your PC"</i>:
                    </p>
                    <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 space-y-1">
                      <div>1. Klik tautan teks <b className="text-sky-400">"More info"</b> (Info selengkapnya).</div>
                      <div>2. Lalu klik tombol <b className="text-emerald-400">"Run anyway"</b> (Tetap jalankan).</div>
                    </div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 mt-3 text-[11px] text-emerald-300">
                    ✅ <b>Selesai!</b> Installer akan berjalan dan membuat ikon aplikasi di Desktop.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: iOS */}
          {guideTab === 'ios' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300">
                <p className="font-semibold text-white mb-2 flex items-center gap-1.5">
                  <Apple size={16} className="text-violet-400" />
                  <span>Pemasangan di iPhone, iPad & Mac Silicon</span>
                </p>
                <p className="leading-relaxed mb-3 text-slate-400">
                  Perangkat Apple memerlukan sertifikasi profil atau aplikasi instalasi sideload mandiri karena tidak didistribusikan di App Store komersial:
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-slate-200">
                  <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3">
                    <p className="font-semibold text-violet-400 mb-1">iPhone / iPad:</p>
                    <p className="text-slate-300">Gunakan komputer dengan aplikasi <b>Sideloadly</b> atau <b>AltStore</b> untuk menyuntikkan file .ipa ke perangkat menggunakan Apple ID Anda.</p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-3">
                    <p className="font-semibold text-violet-400 mb-1">MacBook M1/M2/M3/M4:</p>
                    <p className="text-slate-300">Cukup pasang <b>PlayCover</b> di macOS, lalu seret (drag-and-drop) file <b>AppUjian.ipa</b> langsung ke PlayCover untuk membukanya.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info & Changelog Banner */}
        <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-start space-x-3">
            <Info size={20} className="text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white mb-0.5">Kenapa Peringatan Muncul?</p>
              <p className="text-slate-400 leading-relaxed">
                Google dan Microsoft secara ketat menandai file installer yang didistribusikan dari server mandiri sekolah (bukan toko komersial Play Store/Microsoft Store). Ini adalah verifikasi standar dan bukan tanda bahaya.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-start space-x-3">
            <Sparkles size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
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
