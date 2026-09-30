import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  RefreshCw, 
  AlertCircle, 
  Filter, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Search, 
  FileSpreadsheet, 
  Lock, 
  Unlock, 
  Pause, 
  Play, 
  ShieldAlert, 
  List
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';

interface ExamParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: number;
  examTitle: string;
  initialClassId?: number | 'ALL';
}

interface Participant {
  id: number;
  name: string;
  nis: string;
  class_id: number;
  class?: {
    ID: number;
    level: string;
    department: string;
    number: string;
  };
  session_status: string; // "BELUM MULAI", "ONGOING", "FINISHED", "SUBMITTED", "TIMEOUT", "LOCKED", "PAUSED"
  lock_reason?: string;
  score?: number;
  can_unlock?: boolean;
  is_supervisor?: boolean;
  can_export?: boolean;
}

const ExamParticipantsModal: React.FC<ExamParticipantsModalProps> = ({ 
  isOpen, 
  onClose, 
  examId, 
  examTitle,
  initialClassId 
}) => {
  const { token, user: currentUser } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'ONGOING' | 'PAUSED' | 'FINISHED'>('ALL');

  const fetchParticipants = async () => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/v1/admin/exams/${examId}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParticipants(response.data || []);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      showErrorToast("Gagal mengambil data peserta ujian");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
      if (initialClassId !== undefined) {
        setSelectedClassId(initialClassId);
      } else {
        setSelectedClassId('ALL');
      }
      setSearchTerm('');
      setStatusFilter('ALL');
      setSelectedStudentIds([]);
    }
  }, [isOpen, examId, initialClassId]);

  // Reset student selection when filter changes
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedClassId, searchTerm, statusFilter]);

  // Extract unique classes for filter
  const uniqueClasses = Array.from(new Set(participants.map(p => p.class_id)))
    .map(classId => participants.find(p => p.class_id === classId)?.class)
    .filter(Boolean);

  const filteredParticipants = participants.filter(p => {
    const matchesClass = selectedClassId === 'ALL' || p.class_id === selectedClassId;
    const matchesSearch = !searchTerm || 
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.nis && p.nis.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  const totalCount = filteredParticipants.length;
  const lockedCount = filteredParticipants.filter(p => p.session_status === 'LOCKED').length;
  const ongoingCount = filteredParticipants.filter(p => p.session_status === 'ONGOING').length;
  const pausedCount = filteredParticipants.filter(p => p.session_status === 'PAUSED').length;
  const finishedCount = filteredParticipants.filter(p => 
    p.session_status === 'FINISHED' || p.session_status === 'SUBMITTED' || p.session_status === 'TIMEOUT'
  ).length;

  const displayParticipants = filteredParticipants.filter(p => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'LOCKED') return p.session_status === 'LOCKED';
    if (statusFilter === 'ONGOING') return p.session_status === 'ONGOING';
    if (statusFilter === 'PAUSED') return p.session_status === 'PAUSED';
    if (statusFilter === 'FINISHED') {
      return p.session_status === 'FINISHED' || p.session_status === 'SUBMITTED' || p.session_status === 'TIMEOUT';
    }
    return true;
  });

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const canExport = isAdmin || (participants.length > 0 && participants[0].can_export === true);

  // Multi-select helpers: based on current displayed list
  const controllableParticipants = displayParticipants.filter(
    p => p.session_status === 'ONGOING' || p.session_status === 'PAUSED'
  );

  const isAllSelected = controllableParticipants.length > 0 && 
    controllableParticipants.every(p => selectedStudentIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(controllableParticipants.map(p => p.id));
    }
  };

  const toggleSelectStudent = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Actions
  const handleReset = async (studentId: number, studentName: string) => {
    const isConfirmed = await confirmAction(
      "Reset Ujian Siswa",
      `Apakah Anda yakin ingin mereset ujian untuk ${studentName}? Seluruh jawaban dan riwayat pengerjaannya akan dihapus permanen!`
    );

    if (isConfirmed) {
      try {
        await axios.delete(`/api/v1/admin/exams/${examId}/reset/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast(`Berhasil mereset ujian untuk ${studentName}`);
        fetchParticipants();
      } catch (error: any) {
        showErrorToast(error.response?.data?.error || "Gagal mereset ujian");
      }
    }
  };

  const handleUnlock = async (studentId: number, studentName: string) => {
    const isConfirmed = await confirmAction(
      "Buka Kunci Ujian",
      `Buka kembali kunci ujian untuk ${studentName}? Siswa akan dapat melanjutkan pengerjaan ujian dengan seluruh jawaban sebelumnya tetap tersimpan.`
    );

    if (isConfirmed) {
      try {
        await axios.post(`/api/v1/admin/exams/${examId}/unlock/${studentId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast(`Berhasil membuka kunci ujian untuk ${studentName}`);
        fetchParticipants();
      } catch (error: any) {
        showErrorToast(error.response?.data?.error || "Gagal membuka kunci ujian");
      }
    }
  };

  // Pause single student
  const handlePauseSingle = async (studentId: number, studentName: string) => {
    const isConfirmed = await confirmAction(
      "Hentikan Sementara Ujian",
      `Hentikan sementara ujian untuk siswa ${studentName}? Layar ujian siswa akan dibekukan dengan pemberitahuan dari pengawas karena berisik / tidak tertib.`
    );
    if (!isConfirmed) return;

    try {
      await axios.post(`/api/v1/admin/exams/${examId}/pause-students`, {
        student_ids: [studentId],
        reason: 'Ujian dihentikan sementara oleh pengawas karena berisik / tidak tertib'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast(`Ujian untuk ${studentName} berhasil dihentikan sementara`);
      fetchParticipants();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal menghentikan sementara ujian siswa");
    }
  };

  // Resume single student
  const handleResumeSingle = async (studentId: number, studentName: string) => {
    try {
      await axios.post(`/api/v1/admin/exams/${examId}/resume-students`, {
        student_ids: [studentId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast(`Ujian untuk ${studentName} berhasil dilanjutkan`);
      fetchParticipants();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal melanjutkan ujian siswa");
    }
  };

  // Batch pause selected
  const handlePauseSelected = async () => {
    if (selectedStudentIds.length === 0) return;
    const isConfirmed = await confirmAction(
      "Hentikan Siswa Terpilih",
      `Hentikan sementara ujian untuk ${selectedStudentIds.length} siswa yang dipilih? Layar ujian mereka akan dibekukan.`
    );
    if (!isConfirmed) return;

    try {
      await axios.post(`/api/v1/admin/exams/${examId}/pause-students`, {
        student_ids: selectedStudentIds,
        reason: 'Ujian dihentikan sementara oleh pengawas karena berisik / tidak tertib'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast(`Berhasil menghentikan sementara ${selectedStudentIds.length} siswa`);
      setSelectedStudentIds([]);
      fetchParticipants();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal menghentikan ujian siswa terpilih");
    }
  };

  // Batch resume selected
  const handleResumeSelected = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      await axios.post(`/api/v1/admin/exams/${examId}/resume-students`, {
        student_ids: selectedStudentIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast(`Berhasil melanjutkan ujian untuk ${selectedStudentIds.length} siswa terpilih`);
      setSelectedStudentIds([]);
      fetchParticipants();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal melanjutkan ujian siswa terpilih");
    }
  };

  // Pause all ongoing students in the view
  const handlePauseAll = async () => {
    const isConfirmed = await confirmAction(
      "Hentikan Semua Siswa",
      `Hentikan sementara ujian untuk seluruh siswa yang sedang aktif mengerjakan di kelas/tampilan ini?`
    );
    if (!isConfirmed) return;

    try {
      const payload: any = {
        reason: 'Ujian dihentikan sementara oleh pengawas ruang karena suasana berisik'
      };
      if (selectedClassId !== 'ALL') {
        payload.class_id = Number(selectedClassId);
      } else {
        const ongoingIds = filteredParticipants.filter(p => p.session_status === 'ONGOING').map(p => p.id);
        if (ongoingIds.length === 0) {
          showErrorToast('Tidak ada siswa yang sedang mengerjakan untuk dihentikan');
          return;
        }
        payload.student_ids = ongoingIds;
      }

      await axios.post(`/api/v1/admin/exams/${examId}/pause-students`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast('Seluruh ujian siswa yang aktif berhasil dihentikan sementara');
      fetchParticipants();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal menghentikan sementara ujian");
    }
  };

  // Resume all paused students in the view
  const handleResumeAll = async () => {
    try {
      const payload: any = {};
      if (selectedClassId !== 'ALL') {
        payload.class_id = Number(selectedClassId);
      } else {
        const pausedIds = filteredParticipants.filter(p => p.session_status === 'PAUSED').map(p => p.id);
        if (pausedIds.length === 0) {
          showErrorToast('Tidak ada siswa yang dihentikan untuk dilanjutkan');
          return;
        }
        payload.student_ids = pausedIds;
      }

      await axios.post(`/api/v1/admin/exams/${examId}/resume-students`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast('Seluruh ujian siswa berhasil dilanjutkan');
      fetchParticipants();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal melanjutkan ujian");
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    if (!canExport) {
      showErrorToast("Akses ditolak: Hanya guru pembuat ujian ini dan admin yang berwenang mengunduh rekap nilai Excel");
      return;
    }

    if (filteredParticipants.length === 0) {
      showErrorToast("Tidak ada data peserta untuk diexport");
      return;
    }

    try {
      setIsExporting(true);
      const url = `/api/v1/admin/exams/${examId}/export-grades${
        selectedClassId !== 'ALL' ? `?class_id=${selectedClassId}` : ''
      }`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `Rekap_Nilai_${examTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match && match[1]) {
          filename = match[1].replace(/["']/g, '');
        }
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showSuccessToast('Berhasil mengunduh rekap nilai Excel resmi!');
    } catch (err: any) {
      console.error('Failed to export excel:', err);
      showErrorToast('Gagal mengunduh file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Peserta & Kontrol Ujian</h3>
              {lockedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                  {lockedCount} Terkunci
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{examTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Controls & Filters Bar */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 space-y-2.5 bg-slate-50/60">
          {/* Row 1: Search, Class, View Mode & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Class Filter */}
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0 max-w-[150px] sm:max-w-none shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer truncate"
                >
                  <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
                  {uniqueClasses.map((cls: any) => (
                    <option key={cls.ID} value={cls.ID}>
                      {cls.level} {cls.department} {cls.number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search input */}
              <div className="relative flex-1 min-w-[120px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama atau NIS..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-slate-300 focus:border-slate-400 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">

              {ongoingCount > 0 && (
                <button 
                  onClick={handlePauseAll}
                  className="flex items-center space-x-1 px-2 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors shadow-2xs"
                  title="Hentikan sementara seluruh siswa aktif"
                >
                  <Pause className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Hentikan Semua ({ongoingCount})</span>
                  <span className="sm:hidden">Hentikan ({ongoingCount})</span>
                </button>
              )}

              {pausedCount > 0 && (
                <button 
                  onClick={handleResumeAll}
                  className="flex items-center space-x-1 px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs"
                  title="Lanjutkan seluruh siswa yang dihentikan"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Lanjutkan Semua ({pausedCount})</span>
                  <span className="sm:hidden">Lanjutkan ({pausedCount})</span>
                </button>
              )}

              {canExport && (
                <button 
                  onClick={handleExportExcel}
                  disabled={filteredParticipants.length === 0 || isExporting}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-xl transition-colors border border-emerald-200 shadow-2xs"
                  title="Unduh Rekap Nilai Excel"
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-600 ${isExporting ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Excel'}</span>
                </button>
              )}

              <button 
                onClick={fetchParticipants}
                className="p-1.5 text-slate-600 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-2xs"
                title="Segarkan Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Row 2: Status Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              Semua ({totalCount})
            </button>

            <button
              onClick={() => setStatusFilter('LOCKED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                statusFilter === 'LOCKED'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : lockedCount > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Terkunci ({lockedCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('ONGOING')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                statusFilter === 'ONGOING'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : ongoingCount > 0
                  ? 'bg-white text-slate-700 border border-slate-200 font-semibold'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Clock className="w-3 h-3 text-blue-500" />
              <span>Aktif ({ongoingCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('PAUSED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                statusFilter === 'PAUSED'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : pausedCount > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Pause className="w-3 h-3 fill-current text-amber-500" />
              <span>Dihentikan ({pausedCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('FINISHED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                statusFilter === 'FINISHED'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : finishedCount > 0
                  ? 'bg-white text-slate-700 border border-slate-200 font-semibold'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>Selesai ({finishedCount})</span>
            </button>
          </div>
        </div>

        {/* Selected Batch Actions Bar (when checkboxes are selected) */}
        {selectedStudentIds.length > 0 && (
          <div className="px-4 sm:px-6 py-2.5 bg-indigo-50 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-indigo-900 font-semibold">
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[11px]">
                {selectedStudentIds.length} Siswa Terpilih
              </span>
              <span className="hidden sm:inline">Pilih tindakan bersama:</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePauseSelected}
                className="flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors"
                title="Hentikan sementara ujian untuk siswa terpilih"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Terpilih</span>
              </button>
              <button
                onClick={handleResumeSelected}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors"
                title="Lanjutkan kembali ujian untuk siswa terpilih"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lanjutkan Terpilih</span>
              </button>
              <button
                onClick={() => setSelectedStudentIds([])}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Content Body: Card Grid or Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold text-slate-500">Memuat data peserta ujian...</span>
              </div>
            </div>
          ) : displayParticipants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-8 max-w-md mx-auto">
              <div className="mx-auto w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Tidak Ada Peserta</h3>
              <p className="text-slate-500 text-xs">
                {statusFilter !== 'ALL' 
                  ? 'Tidak ada siswa dengan filter status ini.' 
                  : 'Belum ada siswa di kelas atau kata kunci pencarian yang dipilih.'}
              </p>
              {statusFilter !== 'ALL' && (
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-colors border border-indigo-200"
                >
                  Tampilkan Semua Peserta
                </button>
              )}
            </div>
          ) : (
            /* ================= TAMPILAN RESPONSIVE: RINGKAS (MOBILE) & TABEL (DESKTOP) ================= */
            <div>
              {/* --- 1. MODE MOBILE: DAFTAR SISWA RINGKAS (TIDAK ADA YANG TERPOTONG) --- */}
              <div className="md:hidden space-y-2.5">
                {displayParticipants.map((p) => {
                  const isControllable = p.session_status === 'ONGOING' || p.session_status === 'PAUSED';
                  const isSelected = selectedStudentIds.includes(p.id);

                  let StatusIcon = AlertCircle;
                  let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                  let statusText = p.session_status;
                  let canReset = false;
                  let canUnlock = false;
                  let canPause = false;
                  let canResume = false;
                  let isLockedWithoutPermission = false;

                  if (p.session_status === "ONGOING") {
                    StatusIcon = Clock;
                    statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                    statusText = "Mengerjakan";
                    canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                    canPause = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                  } else if (p.session_status === "PAUSED") {
                    StatusIcon = Pause;
                    statusColor = "bg-amber-50 text-amber-800 border-amber-200";
                    statusText = "Dihentikan";
                    canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                    canResume = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                  } else if (p.session_status === "LOCKED") {
                    StatusIcon = Lock;
                    statusColor = "bg-rose-50 text-rose-700 border-rose-200";
                    statusText = "Terkunci";
                    canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                    if (p.can_unlock !== false && (currentUser?.role !== 'TEACHER' || p.is_supervisor)) {
                      canUnlock = true;
                    } else {
                      isLockedWithoutPermission = true;
                    }
                  } else if (p.session_status === "FINISHED" || p.session_status === "SUBMITTED") {
                    StatusIcon = CheckCircle;
                    statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    statusText = "Selesai";
                    canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                  } else if (p.session_status === "TIMEOUT") {
                    StatusIcon = AlertCircle;
                    statusColor = "bg-slate-100 text-slate-600 border-slate-200";
                    statusText = "Waktu Habis";
                    canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                  } else {
                    statusText = "Belum Mulai";
                  }

                  const isFinished = p.session_status === "FINISHED" || p.session_status === "SUBMITTED" || p.session_status === "TIMEOUT";

                  return (
                    <div 
                      key={p.id}
                      className={`bg-white rounded-xl border p-3 transition-colors ${
                        p.session_status === 'LOCKED' 
                          ? 'border-rose-200 bg-rose-50/20' 
                          : isSelected 
                          ? 'border-slate-400 ring-1 ring-slate-400/20' 
                          : 'border-slate-200/80 shadow-2xs'
                      }`}
                    >
                      {/* Top: Checkbox, Name, Class & Score */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2 min-w-0 flex-1">
                          {isControllable ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStudent(p.id)}
                              className="mt-0.5 rounded border-slate-300 text-slate-800 focus:ring-slate-400 w-4 h-4 cursor-pointer shrink-0"
                            />
                          ) : (
                            <div className="w-1.5 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {p.name || 'Tanpa Nama'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                              <span className="font-medium text-slate-600">
                                {p.class ? `${p.class.level} ${p.class.department} ${p.class.number}` : '-'}
                              </span>
                              {p.nis && <span className="font-mono text-slate-400">• NIS: {p.nis}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Nilai */}
                        <div className="shrink-0 text-right">
                          {isFinished ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                              {p.score ?? 0} pts
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </div>

                      {/* Bottom: Status Pill & Action Buttons */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${statusColor} shrink-0`}>
                          <StatusIcon className="w-3 h-3 mr-1 shrink-0" />
                          <span>{statusText}</span>
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canUnlock && (
                            <button
                              onClick={() => handleUnlock(p.id, p.name)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-2xs transition-all"
                              title="Buka Kunci Ujian Siswa"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Kunci</span>
                            </button>
                          )}

                          {canPause && (
                            <button
                              onClick={() => handlePauseSingle(p.id, p.name)}
                              className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                              title="Hentikan sementara siswa ini"
                            >
                              <Pause className="w-3 h-3 fill-current" />
                              <span>Hentikan</span>
                            </button>
                          )}

                          {canResume && (
                            <button
                              onClick={() => handleResumeSingle(p.id, p.name)}
                              className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                              title="Lanjutkan kembali ujian siswa ini"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Lanjutkan</span>
                            </button>
                          )}

                          {isLockedWithoutPermission && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Bukan Pengawas
                            </span>
                          )}

                          {canReset && (
                            <button
                              onClick={() => handleReset(p.id, p.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Reset Ujian"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {p.lock_reason && (
                        <div className="mt-1.5 p-1.5 rounded-lg bg-rose-50/80 border border-rose-200 text-[10px] text-rose-800">
                          ⚠️ {p.lock_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* --- 2. MODE DESKTOP: TABEL LENGKAP & ELEGAN --- */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input 
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          disabled={controllableParticipants.length === 0}
                          title="Pilih semua siswa yang aktif/dihentikan"
                          className="rounded border-slate-300 text-slate-800 focus:ring-slate-400 cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-3.5 min-w-[200px]">Nama Siswa & NIS</th>
                      <th className="px-4 py-3.5 min-w-[130px]">Kelas / Rombel</th>
                      <th className="px-5 py-3.5 min-w-[170px]">Status Ujian</th>
                      <th className="px-4 py-3.5 min-w-[90px]">Nilai</th>
                      <th className="px-5 py-3.5 text-right min-w-[190px] md:sticky md:right-0 bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)] z-10">
                        Kontrol & Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayParticipants.map((p) => {
                      const isControllable = p.session_status === 'ONGOING' || p.session_status === 'PAUSED';
                      const isSelected = selectedStudentIds.includes(p.id);

                      let StatusIcon = AlertCircle;
                      let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                      let statusText = p.session_status;
                      let canReset = false;
                      let canUnlock = false;
                      let canPause = false;
                      let canResume = false;
                      let isLockedWithoutPermission = false;

                      if (p.session_status === "ONGOING") {
                        StatusIcon = Clock;
                        statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                        statusText = "Sedang Mengerjakan";
                        canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                        canPause = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                      } else if (p.session_status === "PAUSED") {
                        StatusIcon = Pause;
                        statusColor = "bg-amber-50 text-amber-800 border-amber-200";
                        statusText = "Dihentikan Pengawas";
                        canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                        canResume = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                      } else if (p.session_status === "LOCKED") {
                        StatusIcon = Lock;
                        statusColor = "bg-rose-50 text-rose-700 border-rose-200";
                        statusText = "Terkunci (Keluar Aplikasi)";
                        canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                        if (p.can_unlock !== false && (currentUser?.role !== 'TEACHER' || p.is_supervisor)) {
                          canUnlock = true;
                        } else {
                          isLockedWithoutPermission = true;
                        }
                      } else if (p.session_status === "FINISHED" || p.session_status === "SUBMITTED") {
                        StatusIcon = CheckCircle;
                        statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        statusText = "Selesai";
                        canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                      } else if (p.session_status === "TIMEOUT") {
                        StatusIcon = AlertCircle;
                        statusColor = "bg-slate-100 text-slate-600 border-slate-200";
                        statusText = "Waktu Habis";
                        canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                      } else {
                        statusText = "Belum Mulai";
                      }

                      const isFinished = p.session_status === "FINISHED" || p.session_status === "SUBMITTED" || p.session_status === "TIMEOUT";

                      return (
                        <tr 
                          key={p.id} 
                          className={`group transition-colors ${
                            p.session_status === 'LOCKED'
                              ? 'bg-rose-50/30'
                              : isSelected 
                              ? 'bg-slate-100/60' 
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3.5 text-center">
                            {isControllable ? (
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectStudent(p.id)}
                                className="rounded border-slate-300 text-slate-800 focus:ring-slate-400 cursor-pointer"
                              />
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>

                          {/* Nama Siswa + NIS dengan Avatar Inisial */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {p.name ? p.name.charAt(0) : '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-sm leading-snug">{p.name || 'Tanpa Nama'}</p>
                                <p className="text-xs text-slate-400 font-mono">NIS: {p.nis || '-'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Kelas */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200">
                              {p.class ? `${p.class.level} ${p.class.department} ${p.class.number}` : '-'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                                {statusText}
                              </span>
                              {p.lock_reason && (
                                <p className="text-[11px] text-rose-700 italic max-w-xs truncate" title={p.lock_reason}>
                                  ⚠️ {p.lock_reason}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Score */}
                          <td className="px-4 py-3.5 font-semibold text-slate-800">
                            {isFinished ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                                {p.score ?? 0} pts
                              </span>
                            ) : '-'}
                          </td>

                          {/* Actions (STICKY RIGHT COLUMN ON DESKTOP ONLY) */}
                          <td className="px-5 py-3.5 text-right md:sticky md:right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)] z-10">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Unlock */}
                              {canUnlock && (
                                <button
                                  onClick={() => handleUnlock(p.id, p.name)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs shrink-0"
                                  title="Buka Kunci Ujian Siswa"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Buka Kunci</span>
                                </button>
                              )}

                              {/* Pause ongoing student */}
                              {canPause && (
                                <button
                                  onClick={() => handlePauseSingle(p.id, p.name)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-2xs shrink-0"
                                  title="Hentikan sementara siswa ini"
                                >
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                  <span>Hentikan</span>
                                </button>
                              )}

                              {/* Resume paused student */}
                              {canResume && (
                                <button
                                  onClick={() => handleResumeSingle(p.id, p.name)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs shrink-0"
                                  title="Lanjutkan kembali ujian siswa ini"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Lanjutkan</span>
                                </button>
                              )}

                              {/* Locked without permission */}
                              {isLockedWithoutPermission && (
                                <span
                                  className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed shrink-0"
                                  title="Hanya guru pengawas yang ditugaskan di kelas ini yang dapat membuka kunci"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Bukan Pengawas</span>
                                </span>
                              )}

                              {/* Reset */}
                              {canReset && (
                                <button
                                  onClick={() => handleReset(p.id, p.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                  title="Reset Ujian"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      </div>
    </div>
  );
};

export default ExamParticipantsModal;
