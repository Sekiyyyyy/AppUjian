import React, { useState } from 'react';
import { Save, Server, Globe, ShieldCheck, AlertCircle } from 'lucide-react';

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSuccess('Pengaturan berhasil disimpan!');
      setTimeout(() => setSuccess(''), 3000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Pengaturan Sistem</h1>
        <p className="text-slate-500 mt-1">Konfigurasi umum aplikasi Computer Based Test (CBT).</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Form Utama */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center border-b border-slate-100 pb-3">
                <Globe className="mr-2 text-primary-600" size={20} />
                Identitas Sekolah
              </h2>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Sekolah</label>
                <input
                  type="text"
                  defaultValue="SMK N 1 Beringin"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tahun Ajaran Aktif</label>
                <select className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium">
                  <option>2023/2024 Genap</option>
                  <option selected>2024/2025 Ganjil</option>
                  <option>2024/2025 Genap</option>
                </select>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center border-b border-slate-100 pb-3">
                <Server className="mr-2 text-primary-600" size={20} />
                Pengaturan Ujian & Keamanan
              </h2>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Kiosk Mode (Anti-Cheating)</h3>
                  <p className="text-xs text-slate-500">Otomatis submit ujian jika siswa keluar dari aplikasi.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Acak Soal Default</h3>
                  <p className="text-xs text-slate-500">Soal akan diacak urutannya secara default untuk setiap ujian.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Status & Save */}
          <div className="space-y-6">
            <div className="glass-panel p-6 bg-primary-50/50 border-primary-100">
              <h2 className="text-sm font-bold text-primary-800 mb-3 flex items-center">
                <ShieldCheck className="mr-1.5" size={18} /> Status Sistem
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Versi Backend</span>
                  <span className="font-bold text-slate-800">v1.2.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Koneksi Database</span>
                  <span className="font-bold text-emerald-600">Terhubung</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Mode Aplikasi</span>
                  <span className="font-bold text-blue-600">Production</span>
                </div>
              </div>
            </div>

            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl flex items-center text-sm font-medium border border-emerald-100 animate-fade-in-up">
                <ShieldCheck size={18} className="mr-2" />
                {success}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSaving}
              className="btn-primary w-full flex items-center justify-center space-x-2 py-3 shadow-lg shadow-primary-500/30"
            >
              <Save size={18} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-xs text-orange-800 leading-relaxed flex items-start">
              <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
              Perubahan pada Pengaturan Ujian & Keamanan akan berdampak pada seluruh sesi ujian CBT yang sedang berjalan atau akan datang.
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
