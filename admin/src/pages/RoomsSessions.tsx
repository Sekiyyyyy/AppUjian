import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Layers, 
  DoorOpen, 
  Clock, 
  Server, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  RefreshCw, 
  Printer, 
  School, 
  Users, 
  CheckSquare, 
  Square, 
  X, 
  Check, 
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorToast, confirmAction } from '../utils/alert';
import { useDebounce } from '../hooks/useDebounce';

interface ClassItem {
  ID: number;
  level: string;
  department: string;
  number: string;
  name: string;
  ruangan?: string;
  sesi?: string;
  server_name?: string;
  CreatedAt?: string;
}

const ROOM_PRESETS = [
  'Ruang 01', 'Ruang 02', 'Ruang 03', 'Ruang 04', 'Ruang 05',
  'Ruang 06', 'Ruang 07', 'Ruang 08', 'Ruang 09', 'Ruang 10',
  'Lab TKJ 1', 'Lab TKJ 2', 'Lab RPL', 'Lab DKV', 'Lab AKL', 'Lab Bahasa'
];

const SESSION_PRESETS = [
  'Sesi 1', 'Sesi 2', 'Sesi 3', 'Sesi 4'
];

const SERVER_PRESETS = [
  'Server CBT-01', 'Server CBT-02', 'Server CBT-03', 'Server Utama'
];

const RoomsSessions: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CONFIGURED' | 'UNCONFIGURED'>('ALL');
  const [filterRoom, setFilterRoom] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');

  // Batch selection
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [batchRuangan, setBatchRuangan] = useState('');
  const [batchSesi, setBatchSesi] = useState('');
  const [batchServerName, setBatchServerName] = useState('');

  // Single edit modal state
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editForm, setEditForm] = useState({
    ruangan: '',
    sesi: '',
    server_name: ''
  });

  // Fetch classes and students
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [classRes, studentRes] = await Promise.all([
        axios.get('/api/v1/admin/classes', { headers }),
        axios.get('/api/v1/admin/students', { headers }).catch(() => ({ data: [] }))
      ]);

      setClasses(classRes.data || []);
      setStudents(studentRes.data || []);
    } catch (err: any) {
      console.error('Error fetching room/session data:', err);
      showErrorToast('Gagal memuat data kelas dan siswa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map students count per class ID
  const studentCountMap = useMemo(() => {
    const map = new Map<number, number>();
    students.forEach((s) => {
      const cId = s.class_id;
      map.set(cId, (map.get(cId) || 0) + 1);
    });
    return map;
  }, [students]);

  // Unique rooms and sessions currently in use
  const uniqueRooms = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.ruangan && c.ruangan.trim()) set.add(c.ruangan.trim());
    });
    return Array.from(set).sort();
  }, [classes]);

  const uniqueSessions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.sesi && c.sesi.trim()) set.add(c.sesi.trim());
    });
    return Array.from(set).sort();
  }, [classes]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter(item => {
      const className = item.name || `${item.level} ${item.department} ${item.number}`;
      const searchMatch = !debouncedSearchTerm || 
        className.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (item.ruangan && item.ruangan.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (item.sesi && item.sesi.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (item.server_name && item.server_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      const levelMatch = filterLevel === 'ALL' || item.level === filterLevel;

      const isConfigured = Boolean(item.ruangan && item.ruangan.trim() && item.sesi && item.sesi.trim());
      const statusMatch = filterStatus === 'ALL' || 
        (filterStatus === 'CONFIGURED' && isConfigured) ||
        (filterStatus === 'UNCONFIGURED' && !isConfigured);

      const roomMatch = filterRoom === 'ALL' || item.ruangan === filterRoom;
      const sessionMatch = filterSession === 'ALL' || item.sesi === filterSession;

      return searchMatch && levelMatch && statusMatch && roomMatch && sessionMatch;
    });
  }, [classes, debouncedSearchTerm, filterLevel, filterStatus, filterRoom, filterSession]);

  // Stats calculation
  const totalClasses = classes.length;
  const configuredClasses = classes.filter(c => c.ruangan && c.ruangan.trim() && c.sesi && c.sesi.trim()).length;
  const unconfiguredClasses = totalClasses - configuredClasses;

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedClassIds.length === filteredClasses.length && filteredClasses.length > 0) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(filteredClasses.map(c => c.ID));
    }
  };

  const handleToggleSelectClass = (id: number) => {
    setSelectedClassIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open single edit modal
  const handleOpenEditModal = (item: ClassItem) => {
    setEditingClass(item);
    setEditForm({
      ruangan: item.ruangan || '',
      sesi: item.sesi || '',
      server_name: item.server_name || ''
    });
  };

  // Save single edit
  const handleSaveSingleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setIsSaving(true);
    try {
      await axios.put(`/api/v1/admin/classes/${editingClass.ID}/room-session`, {
        ruangan: editForm.ruangan.trim(),
        sesi: editForm.sesi.trim(),
        server_name: editForm.server_name.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast(`Ruangan & sesi kelas ${editingClass.name} berhasil diperbarui`);
      setEditingClass(null);
      fetchData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  // Batch update
  const handleApplyBatch = async () => {
    if (selectedClassIds.length === 0) {
      showErrorToast('Pilih minimal satu kelas terlebih dahulu');
      return;
    }

    if (!batchRuangan && !batchSesi && !batchServerName) {
      showErrorToast('Isi minimal Ruangan atau Sesi untuk diterapkan massal');
      return;
    }

    const confirmed = await confirmAction(
      'Terapkan Pengaturan Massal?',
      `Anda akan memperbarui ruangan/sesi untuk ${selectedClassIds.length} kelas terpilih.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const payload: any = {
        class_ids: selectedClassIds
      };
      if (batchRuangan) payload.ruangan = batchRuangan.trim();
      if (batchSesi) payload.sesi = batchSesi.trim();
      if (batchServerName) payload.server_name = batchServerName.trim();

      const res = await axios.post('/api/v1/admin/classes/batch-room-session', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast(res.data?.message || 'Pengaturan massal berhasil diterapkan');
      setSelectedClassIds([]);
      setBatchRuangan('');
      setBatchSesi('');
      setBatchServerName('');
      fetchData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Gagal menerapkan pengaturan massal');
    } finally {
      setIsSaving(false);
    }
  };

  // Batch reset / clear
  const handleResetBatch = async () => {
    if (selectedClassIds.length === 0) return;

    const confirmed = await confirmAction(
      'Kosongkan Ruang & Sesi?',
      `Pengaturan ruang dan sesi untuk ${selectedClassIds.length} kelas terpilih akan dihapus.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const emptyStr = '';
      await axios.post('/api/v1/admin/classes/batch-room-session', {
        class_ids: selectedClassIds,
        ruangan: emptyStr,
        sesi: emptyStr,
        server_name: emptyStr
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast('Ruangan dan sesi untuk kelas terpilih telah dikosongkan');
      setSelectedClassIds([]);
      fetchData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Gagal mengosongkan data');
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate to cards page for class
  const handleOpenClassCard = (classId: number) => {
    navigate(`/dashboard/cards?class_id=${classId}`);
  };

  // Navigate to cards page for all
  const handleOpenAllCards = () => {
    navigate('/dashboard/cards');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Ruang & Sesi Kelas
            </h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5">
              <Layers size={13} />
              Alokasi Ujian CBT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Atur alokasi ruangan ujian, sesi pelaksanaan, dan server CBT untuk setiap rombongan belajar. Data ini otomatis tercetak pada kartu ujian peserta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh data"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
          </button>

          <button
            onClick={handleOpenAllCards}
            className="btn-primary flex items-center justify-center space-x-2 text-xs sm:text-sm py-2.5 px-4 w-full sm:w-auto shadow-xs"
          >
            <Printer size={17} />
            <span>Cetak Kartu Ujian (PDF)</span>
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 sm:p-5 flex items-center space-x-3.5 border-l-4 border-l-indigo-500">
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Rombel</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{totalClasses} Kelas</h3>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 flex items-center space-x-3.5 border-l-4 border-l-emerald-500">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Sudah Terjadwal</p>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-700">{configuredClasses} Kelas</h3>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 flex items-center space-x-3.5 border-l-4 border-l-amber-500">
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Belum Terjadwal</p>
            <h3 className="text-xl sm:text-2xl font-bold text-amber-700">{unconfiguredClasses} Kelas</h3>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5 flex items-center space-x-3.5 border-l-4 border-l-purple-500">
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <DoorOpen size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Ruangan Aktif</p>
            <h3 className="text-xl sm:text-2xl font-bold text-purple-700">{uniqueRooms.length} Ruang</h3>
          </div>
        </div>
      </div>

      {/* Batch Action Bar (Sticky / Highlighted when classes are selected) */}
      {selectedClassIds.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-indigo-700/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-500/20 text-indigo-300 rounded-xl flex items-center justify-center font-bold border border-indigo-400/30 shrink-0">
              <CheckSquare size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base">
                  {selectedClassIds.length} Kelas Dipilih
                </span>
                <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/20">
                  Aksi Massal
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Terapkan alokasi ruangan dan sesi secara serentak ke rombel terpilih.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Ruang Input / Select */}
            <div className="relative min-w-[140px] flex-1 sm:flex-none">
              <input
                type="text"
                list="batch-room-presets"
                value={batchRuangan}
                onChange={(e) => setBatchRuangan(e.target.value)}
                placeholder="Pilih/Ketik Ruang..."
                className="w-full px-3 py-2 bg-slate-800/90 text-white placeholder-slate-400 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-400"
              />
              <datalist id="batch-room-presets">
                {ROOM_PRESETS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>

            {/* Sesi Input / Select */}
            <div className="relative min-w-[110px] flex-1 sm:flex-none">
              <select
                value={batchSesi}
                onChange={(e) => setBatchSesi(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/90 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-400"
              >
                <option value="">Pilih Sesi...</option>
                {SESSION_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Server Input */}
            <div className="relative min-w-[130px] flex-1 sm:flex-none">
              <input
                type="text"
                list="batch-server-presets"
                value={batchServerName}
                onChange={(e) => setBatchServerName(e.target.value)}
                placeholder="Server (opsional)..."
                className="w-full px-3 py-2 bg-slate-800/90 text-white placeholder-slate-400 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-400"
              />
              <datalist id="batch-server-presets">
                {SERVER_PRESETS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <button
              onClick={handleApplyBatch}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5 shrink-0"
            >
              <Check size={15} />
              <span>{isSaving ? 'Menyimpan...' : 'Terapkan'}</span>
            </button>

            <button
              onClick={handleResetBatch}
              disabled={isSaving}
              className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-medium rounded-xl transition-colors shrink-0"
              title="Kosongkan ruangan & sesi"
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={() => setSelectedClassIds([])}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Batal pilih"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Level Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {(['ALL', 'X', 'XI', 'XII'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterLevel === lvl
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl === 'ALL' ? 'Semua Tingkat' : `Kelas ${lvl}`}
            </button>
          ))}
        </div>

        {/* Dropdown Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            <option value="ALL">Semua Status</option>
            <option value="CONFIGURED">Sudah Terjadwal (Lengkap)</option>
            <option value="UNCONFIGURED">Belum Terjadwal</option>
          </select>

          {/* Room Filter */}
          {uniqueRooms.length > 0 && (
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="ALL">Semua Ruang</option>
              {uniqueRooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}

          {/* Session Filter */}
          {uniqueSessions.length > 0 && (
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="ALL">Semua Sesi</option>
              {uniqueSessions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kelas, ruang, sesi..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      {filteredClasses.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Layers className="text-slate-400" size={26} />
          </div>
          <p className="font-semibold text-slate-700 text-lg">Tidak Ada Kelas yang Sesuai</p>
          <p className="text-sm mt-1 text-slate-500 max-w-sm">
            {searchTerm || filterLevel !== 'ALL' || filterStatus !== 'ALL'
              ? 'Coba atur ulang filter atau kata kunci pencarian Anda.'
              : 'Belum ada data rombongan belajar. Silakan tambahkan kelas terlebih dahulu di Manajemen Kelas.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Pilih semua yang tampil"
                    >
                      {selectedClassIds.length > 0 && selectedClassIds.length === filteredClasses.length ? (
                        <CheckSquare size={17} className="text-indigo-600" />
                      ) : (
                        <Square size={17} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5 w-12 text-center">No</th>
                  <th className="px-6 py-3.5">Nama Rombel / Kelas</th>
                  <th className="px-6 py-3.5">Ruangan Ujian</th>
                  <th className="px-6 py-3.5">Sesi Ujian</th>
                  <th className="px-6 py-3.5">Server CBT</th>
                  <th className="px-4 py-3.5 text-center">Siswa</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((item, idx) => {
                  const isSelected = selectedClassIds.includes(item.ID);
                  const className = item.name || `${item.level} ${item.department} ${item.number}`;
                  const isConfigured = Boolean(item.ruangan && item.ruangan.trim() && item.sesi && item.sesi.trim());
                  const studentCount = studentCountMap.get(item.ID) || 0;

                  return (
                    <tr 
                      key={item.ID}
                      className={`hover:bg-indigo-50/40 transition-colors ${isSelected ? 'bg-indigo-50/60' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleSelectClass(item.ID)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={17} className="text-indigo-600" />
                          ) : (
                            <Square size={17} />
                          )}
                        </button>
                      </td>

                      {/* No */}
                      <td className="px-4 py-4 text-center font-medium text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Nama Kelas */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <School size={17} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {className}
                              </span>
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.level === 'X' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                item.level === 'XI' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {item.level}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Jurusan: {item.department}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Ruangan */}
                      <td className="px-6 py-4">
                        {item.ruangan && item.ruangan.trim() ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <DoorOpen size={13} className="text-purple-500" />
                            {item.ruangan}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 bg-slate-100 border border-dashed border-slate-300">
                            Belum diatur
                          </span>
                        )}
                      </td>

                      {/* Sesi */}
                      <td className="px-6 py-4">
                        {item.sesi && item.sesi.trim() ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                            item.sesi.toLowerCase().includes('1') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            item.sesi.toLowerCase().includes('2') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            item.sesi.toLowerCase().includes('3') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            <Clock size={13} />
                            {item.sesi}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 bg-slate-100 border border-dashed border-slate-300">
                            Belum diatur
                          </span>
                        )}
                      </td>

                      {/* Server Name */}
                      <td className="px-6 py-4">
                        {item.server_name && item.server_name.trim() ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                            <Server size={12} className="text-slate-400" />
                            {item.server_name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Siswa Count */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Users size={12} className="text-slate-400" />
                          {studentCount}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        {isConfigured ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 size={13} className="mr-1 text-emerald-500" />
                            Lengkap
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                            <AlertCircle size={13} className="mr-1 text-amber-500" />
                            Belum
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Atur Ruang & Sesi"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenClassCard(item.ID)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Cetak Kartu Ujian Kelas Ini (A4 PDF)"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Edit Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <DoorOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Atur Ruangan & Sesi</h3>
                  <p className="text-xs text-slate-500">Kelas: <span className="font-semibold text-slate-700">{editingClass.name}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setEditingClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSingleEdit} className="space-y-4">
              {/* Ruangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ruangan Ujian / Laboratorium
                </label>
                <input
                  type="text"
                  list="modal-room-presets"
                  value={editForm.ruangan}
                  onChange={(e) => setEditForm(prev => ({ ...prev, ruangan: e.target.value }))}
                  placeholder="Contoh: Ruang 01, Lab TKJ 1, dsb."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="modal-room-presets">
                  {ROOM_PRESETS.map(r => <option key={r} value={r} />)}
                </datalist>

                {/* Quick Presets Buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ROOM_PRESETS.slice(0, 6).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, ruangan: r }))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                        editForm.ruangan === r 
                          ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' 
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sesi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sesi Pelaksanaan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {SESSION_PRESETS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, sesi: s }))}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                        editForm.sesi === s
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editForm.sesi}
                  onChange={(e) => setEditForm(prev => ({ ...prev, sesi: e.target.value }))}
                  placeholder="Atau ketik sesi khusus (cth: Sesi 1 (08.00 - 10.00))"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Server Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Server CBT <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                <input
                  type="text"
                  list="modal-server-presets"
                  value={editForm.server_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, server_name: e.target.value }))}
                  placeholder="Contoh: Server 01, Server CBT-02"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="modal-server-presets">
                  {SERVER_PRESETS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-xs"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoomsSessions;
