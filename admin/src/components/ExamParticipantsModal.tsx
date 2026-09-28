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
  CheckSquare, 
  Square 
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
      setSelectedStudentIds([]);
    }
  }, [isOpen, examId, initialClassId]);

  // Reset student selection when filter changes
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedClassId, searchTerm]);

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

  const ongoingCount = filteredParticipants.filter(p => p.session_status === 'ONGOING').length;
  const pausedCount = filteredParticipants.filter(p => p.session_status === 'PAUSED').length;

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const canExport = isAdmin || (participants.length > 0 && participants[0].can_export === true);

  // Multi-select helpers
  const controllableParticipants = filteredParticipants.filter(
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Peserta & Kontrol Ujian</h3>
            <p className="text-sm text-gray-500 mt-0.5">{examTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Controls & Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between bg-white">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="ALL">Semua Kelas</option>
                {uniqueClasses.map((cls: any) => (
                  <option key={cls.ID} value={cls.ID}>
                    {cls.level} {cls.department} {cls.number}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau NIS..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Quick Room-Level Control Buttons */}
          <div className="flex items-center space-x-2">
            {ongoingCount > 0 && (
              <button 
                onClick={handlePauseAll}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-xs"
                title="Hentikan sementara ujian untuk seluruh siswa yang sedang aktif (misal kelas berisik)"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Semua ({ongoingCount})</span>
              </button>
            )}

            {pausedCount > 0 && (
              <button 
                onClick={handleResumeAll}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                title="Lanjutkan kembali ujian untuk seluruh siswa yang dihentikan sementara"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lanjutkan Semua ({pausedCount})</span>
              </button>
            )}

            {canExport && (
              <button 
                onClick={handleExportExcel}
                disabled={filteredParticipants.length === 0 || isExporting}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-emerald-200 shadow-sm"
                title="Unduh Rekap Nilai Format Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className={`w-4 h-4 text-emerald-600 ${isExporting ? 'animate-spin' : ''}`} />
                <span>{isExporting ? 'Mengunduh...' : 'Download Excel'}</span>
              </button>
            )}

            <button 
              onClick={fetchParticipants}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Selected Batch Actions Bar (when checkboxes are selected) */}
        {selectedStudentIds.length > 0 && (
          <div className="px-6 py-2.5 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-indigo-900 font-semibold">
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[11px]">
                {selectedStudentIds.length} Siswa Terpilih
              </span>
              <span>Pilih tindakan untuk siswa yang dipilih:</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePauseSelected}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors"
                title="Hentikan sementara ujian untuk siswa-siswa yang dipilih karena berisik"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Hentikan Siswa Terpilih</span>
              </button>
              <button
                onClick={handleResumeSelected}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors"
                title="Lanjutkan kembali ujian untuk siswa-siswa yang dipilih"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lanjutkan Siswa Terpilih</span>
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

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Tidak Ada Peserta</h3>
              <p className="text-gray-500 text-sm">Belum ada siswa di kelas yang dipilih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-4 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        disabled={controllableParticipants.length === 0}
                        title="Pilih semua siswa yang aktif/dihentikan"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-5 py-4">Nama Siswa</th>
                    <th className="px-5 py-4">NIS</th>
                    <th className="px-5 py-4">Kelas</th>
                    <th className="px-5 py-4">Status Ujian</th>
                    <th className="px-5 py-4">Nilai</th>
                    <th className="px-5 py-4 text-right">Kontrol & Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredParticipants.map((p) => {
                    const isControllable = p.session_status === 'ONGOING' || p.session_status === 'PAUSED';
                    const isSelected = selectedStudentIds.includes(p.id);

                    // Status styling
                    let StatusIcon = AlertCircle;
                    let statusColor = "bg-gray-100 text-gray-700 border-gray-200";
                    let statusText = p.session_status;
                    let canReset = false;
                    let canUnlock = false;
                    let canPause = false;
                    let canResume = false;
                    let isLockedWithoutPermission = false;

                    if (p.session_status === "ONGOING") {
                      StatusIcon = Clock;
                      statusColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
                      statusText = "Sedang Mengerjakan";
                      canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                      canPause = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                    } else if (p.session_status === "PAUSED") {
                      StatusIcon = Pause;
                      statusColor = "bg-amber-100 text-amber-800 border-amber-300";
                      statusText = "Dihentikan Pengawas";
                      canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                      canResume = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                    } else if (p.session_status === "LOCKED") {
                      StatusIcon = Lock;
                      statusColor = "bg-red-50 text-red-700 border-red-200";
                      statusText = "Terkunci (Keluar Aplikasi)";
                      canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                      if (p.can_unlock !== false && (currentUser?.role !== 'TEACHER' || p.is_supervisor)) {
                        canUnlock = true;
                      } else {
                        isLockedWithoutPermission = true;
                      }
                    } else if (p.session_status === "FINISHED" || p.session_status === "SUBMITTED") {
                      StatusIcon = CheckCircle;
                      statusColor = "bg-green-50 text-green-700 border-green-200";
                      statusText = "Selesai";
                      canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                    } else if (p.session_status === "TIMEOUT") {
                      StatusIcon = AlertCircle;
                      statusColor = "bg-orange-50 text-orange-700 border-orange-200";
                      statusText = "Waktu Habis";
                      canReset = currentUser?.role !== 'TEACHER' || (p.is_supervisor ?? true);
                    } else {
                      statusText = "Belum Mulai";
                    }

                    const isFinished = p.session_status === "FINISHED" || p.session_status === "SUBMITTED" || p.session_status === "TIMEOUT";

                    return (
                      <tr 
                        key={p.id} 
                        className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50/50'}`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-4 text-center">
                          {isControllable ? (
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStudent(p.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-5 py-4 font-medium text-gray-900">{p.name || 'Tanpa Nama'}</td>
                        
                        {/* NIS */}
                        <td className="px-5 py-4 text-gray-600">{p.nis || '-'}</td>
                        
                        {/* Class */}
                        <td className="px-5 py-4 text-gray-600">
                          <div className="flex items-center space-x-1.5">
                            <span>{p.class ? `${p.class.level} ${p.class.department} ${p.class.number}` : '-'}</span>
                            {currentUser?.role === 'TEACHER' && p.is_supervisor && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                                Tugas Anda
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                              {statusText}
                            </span>
                            {p.lock_reason && (
                              <p className="text-[11px] text-amber-700 italic max-w-xs truncate" title={p.lock_reason}>
                                ⚠️ {p.lock_reason}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Score */}
                        <td className="px-5 py-4 font-semibold text-gray-800">
                          {isFinished ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">
                              {p.score ?? 0} pts
                            </span>
                          ) : '-'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Pause ongoing student */}
                            {canPause && (
                              <button
                                onClick={() => handlePauseSingle(p.id, p.name)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-xs"
                                title="Hentikan sementara siswa ini (misal berisik)"
                              >
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Hentikan</span>
                              </button>
                            )}

                            {/* Resume paused student */}
                            {canResume && (
                              <button
                                onClick={() => handleResumeSingle(p.id, p.name)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                                title="Lanjutkan kembali ujian siswa ini"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Lanjutkan</span>
                              </button>
                            )}

                            {/* Unlock */}
                            {canUnlock && (
                              <button
                                onClick={() => handleUnlock(p.id, p.name)}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-sm"
                                title="Buka Kunci Ujian Siswa"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Buka Kunci</span>
                              </button>
                            )}

                            {/* Locked without permission */}
                            {isLockedWithoutPermission && (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
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
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamParticipantsModal;
