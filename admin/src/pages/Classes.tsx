import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  School, 
  Edit2,
  Trash2, 
  AlertCircle, 
  Layers, 
  CheckCircle2, 
  Search,
  Building2,
  GraduationCap,
  ArrowUpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';
import { useNavigate } from 'react-router-dom';

interface ClassItem {
  ID: number;
  level: string;
  department: string;
  number: string;
  name: string;
  CreatedAt: string;
}

const COMMON_DEPARTMENTS = [
  { code: 'PPLG', name: 'Pengembangan Perangkat Lunak dan Gim' },
  { code: 'TKJ', name: 'Teknik Komputer dan Jaringan' },
  { code: 'DKV', name: 'Desain Komunikasi Visual' },
  { code: 'AKL', name: 'Akuntansi dan Keuangan Lembaga' },
  { code: 'MPLB', name: 'Manajemen Perkantoran & Layanan Bisnis' },
  { code: 'TKR', name: 'Teknik Kendaraan Ringan' },
  { code: 'TBSM', name: 'Teknik dan Bisnis Sepeda Motor' },
];

const Classes = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');

  // Form State
  const [level, setLevel] = useState('X');
  const [department, setDepartment] = useState('PPLG');
  const [customDept, setCustomDept] = useState('');
  const [number, setNumber] = useState('1');

  const fetchClasses = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const finalDept = department === 'CUSTOM' ? customDept.trim().toUpperCase() : department;

    if (!finalDept) {
      setError('Jurusan harus diisi atau dipilih');
      setIsLoading(false);
      return;
    }

    try {
      await axios.post('http://localhost:8080/api/v1/admin/classes', {
        level,
        department: finalDept,
        number: number.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsModalOpen(false);
      fetchClasses();
      setNumber(String(Number(number) + 1)); // Increment for convenient next entry
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan data kelas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClass = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!(await confirmAction(`Hapus Kelas`, `Yakin ingin menghapus kelas ${name}?`))) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/classes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(classes.filter(c => c.ID !== id));
      showSuccessToast('Kelas dihapus');
    } catch (err) {
      showErrorToast('Gagal menghapus kelas');
    }
  };

  const handlePromoteClasses = async () => {
    const isConfirmed = await confirmAction(
      "Kenaikan Kelas Tahunan",
      "Perhatian! Tindakan ini akan meluluskan (menghapus permanen) seluruh siswa kelas XII. Siswa kelas XI akan naik ke kelas XII, dan kelas X akan naik ke kelas XI. Apakah Anda yakin ingin memproses kenaikan kelas?"
    );

    if (isConfirmed) {
      try {
        setIsLoading(true);
        await axios.post('http://localhost:8080/api/v1/admin/classes/promote', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Proses Kenaikan Kelas berhasil diselesaikan!');
        fetchClasses();
      } catch (err: any) {
        showErrorToast(err.response?.data?.error || 'Gagal memproses kenaikan kelas');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Filtered classes
  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'ALL' || c.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  // Calculate unique departments
  const uniqueDepts = Array.from(new Set(classes.map(c => c.department))).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Data Kelas SMK</h1>
            <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-primary-100">
              Rombongan Belajar
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola Tingkat, Jurusan, dan Rombel (Lokal) untuk pemetaan jadwal ujian SMK.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button 
            onClick={handlePromoteClasses}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs sm:text-sm font-bold transition-colors w-full sm:w-auto"
          >
            <ArrowUpCircle size={18} />
            <span>Kenaikan Kelas Tahunan</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center justify-center space-x-2 text-xs sm:text-sm py-2.5 px-4 w-full sm:w-auto shadow-xs"
          >
            <Plus size={18} />
            <span>Tambah Kelas</span>
          </button>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-bold">
            <School size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Rombel</p>
            <h3 className="text-2xl font-bold text-slate-800">{classes.length}</h3>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Konsentrasi Keahlian</p>
            <h3 className="text-2xl font-bold text-slate-800">{uniqueDepts} Jurusan</h3>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tingkatan Aktif</p>
            <div className="flex gap-1.5 mt-1">
              {['X', 'XI', 'XII'].map(lvl => (
                <span key={lvl} className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                  {lvl}: {classes.filter(c => c.level === lvl).length}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls: Search & Level Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {['ALL', 'X', 'XI', 'XII'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filterLevel === lvl
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl === 'ALL' ? 'Semua Tingkat' : `Kelas ${lvl}`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kelas atau jurusan..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <School className="text-slate-400" size={26} />
          </div>
          <p className="font-semibold text-slate-700 text-lg">Belum Ada Data Kelas</p>
          <p className="text-sm mt-1 text-slate-500 max-w-sm">
            Tambahkan rombongan belajar (Tingkat, Jurusan, dan Lokal) agar jadwal ujian dapat dipetakan secara presisi.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary mt-4 flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Tambah Kelas Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredClasses.map((item) => (
            <div 
              key={item.ID} 
              onClick={() => navigate(`/dashboard/classes/${item.ID}`)}
              className="glass-panel p-5 group hover:border-primary-200 hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  item.level === 'X' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  item.level === 'XI' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  Tingkat {item.level}
                </span>

                <button
                  onClick={(e) => handleDeleteClass(e, item.ID, item.name || `${item.level} ${item.department} ${item.number}`)}
                  className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                  title="Hapus Kelas"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mb-2">
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                  {item.name || `${item.level} ${item.department} ${item.number}`}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Jurusan {item.department} • Lokal {item.number}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>SMK N 1 Beringin</span>
                <span className="flex items-center text-emerald-600 font-semibold">
                  <CheckCircle2 size={12} className="mr-1" /> Aktif
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Kelas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-lg bg-white shadow-2xl relative z-10 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <Layers size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Tambah Kelas Baru (SMK)</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Tingkat */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Tingkat Kelas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['X', 'XI', 'XII'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`py-2.5 rounded-xl font-bold text-sm border transition-all ${
                        level === lvl
                          ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      Kelas {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jurusan / Konsentrasi Keahlian */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Jurusan / Konsentrasi Keahlian
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white font-medium"
                >
                  {COMMON_DEPARTMENTS.map(d => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Ketik Jurusan Lainnya...</option>
                </select>

                {department === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder="Contoh: TO (Teknik Otomotif)"
                    className="mt-2 w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm uppercase"
                    required
                  />
                )}
              </div>

              {/* Lokal / Rombel */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Lokal / Rombel Nomor
                </label>
                <div className="flex items-center space-x-2">
                  {['1', '2', '3', '4', '5'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumber(num)}
                      className={`flex-1 py-2 rounded-xl font-bold text-sm border transition-all ${
                        number === num
                          ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Atau ketik nomor rombel lain:</span>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm text-center font-bold"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <p className="text-xs text-slate-500 font-medium">Pratinjau Nama Kelas:</p>
                <p className="text-lg font-extrabold text-primary-700 mt-0.5">
                  {level} {department === 'CUSTOM' ? (customDept || 'JURUSAN') : department} {number || '1'}
                </p>
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span>{isLoading ? 'Menyimpan...' : 'Simpan Kelas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
