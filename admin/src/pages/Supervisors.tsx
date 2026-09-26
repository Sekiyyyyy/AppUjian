import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  UserCheck, 
  Plus, 
  Download, 
  Upload, 
  Search, 
  Calendar, 
  Clock, 
  BookOpen, 
  School, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  X, 
  Users, 
  Eye, 
  Info,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';
import ExamParticipantsModal from '../components/ExamParticipantsModal';
import { useDebounce } from '../hooks/useDebounce';

interface UserItem {
  id: number;
  name: string;
  username: string;
  role: string;
  nip?: string;
  jabatan?: string;
}

interface ClassItem {
  ID: number;
  name: string;
  level: string;
  department: string;
  number: string;
}

interface SubjectItem {
  ID: number;
  name: string;
}

interface ExamItem {
  ID: number;
  title: string;
  start_time: string;
  end_time: string;
  duration: number;
  subject?: SubjectItem;
  classes?: ClassItem[];
}

interface ExamSupervisor {
  ID: number;
  exam_id: number;
  exam?: ExamItem;
  class_id: number;
  class?: ClassItem;
  teacher_id: number;
  teacher?: UserItem;
  ruangan: string;
  notes: string;
  CreatedAt: string;
}

const Supervisors = () => {
  const { token, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Data States
  const [supervisors, setSupervisors] = useState<ExamSupervisor[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedExamId, setSelectedExamId] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');

  // Manual Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formExamId, setFormExamId] = useState<number | ''>('');
  const [formClassId, setFormClassId] = useState<number | ''>('');
  const [formTeacherId, setFormTeacherId] = useState<number | ''>('');
  const [formRuangan, setFormRuangan] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Upload Excel Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ message: string; imported_count: number; errors?: string[] } | null>(null);

  // Template Download State
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Participants Monitor Modal State
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [monitorExam, setMonitorExam] = useState<{ id: number; title: string; classId?: number } | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const supervisorEndpoint = isAdmin 
        ? '/api/v1/admin/supervisors' 
        : '/api/v1/admin/supervisors/my-schedules';

      const [supRes, examsRes, classesRes, usersRes] = await Promise.all([
        axios.get(supervisorEndpoint, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/admin/exams', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/admin/classes', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setSupervisors(supRes.data || []);
      setExams(examsRes.data || []);
      setClasses(classesRes.data || []);
      setTeachers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to load supervisor data:', error);
      showErrorToast('Gagal memuat jadwal pengawas ujian');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered classes available for the selected exam in the form
  const availableClassesForSelectedExam = useMemo(() => {
    if (!formExamId) return classes;
    const currentExam = exams.find(e => e.ID === Number(formExamId));
    if (currentExam && currentExam.classes && currentExam.classes.length > 0) {
      return currentExam.classes;
    }
    return classes;
  }, [formExamId, exams, classes]);

  // Download Excel Template
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await axios.get('/api/v1/admin/supervisors/template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Jadwal_Pengawas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccessToast('Template Excel berhasil diunduh. Berisi lengkap daftar guru, ujian, dan kelas.');
    } catch (error) {
      console.error('Download template error:', error);
      showErrorToast('Gagal mengunduh template Excel pengawas');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Upload Excel
  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showErrorToast('Pilih file Excel (.xlsx) terlebih dahulu');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await axios.post('/api/v1/admin/supervisors/import-excel', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadResult(res.data);
      showSuccessToast(res.data.message || 'Jadwal pengawas berhasil diproses!');
      fetchData();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Gagal mengunggah file Excel jadwal pengawas';
      showErrorToast(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormExamId(exams.length > 0 ? exams[0].ID : '');
    setFormClassId('');
    setFormTeacherId('');
    setFormRuangan('');
    setFormNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (s: ExamSupervisor) => {
    setIsEditMode(true);
    setEditingId(s.ID);
    setFormExamId(s.exam_id);
    setFormClassId(s.class_id);
    setFormTeacherId(s.teacher_id);
    setFormRuangan(s.ruangan || '');
    setFormNotes(s.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Manual Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExamId || !formClassId || !formTeacherId) {
      setFormError('Ujian, Kelas, dan Guru Pengawas wajib dipilih');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    const payload = {
      exam_id: Number(formExamId),
      class_id: Number(formClassId),
      teacher_id: Number(formTeacherId),
      ruangan: formRuangan.trim(),
      notes: formNotes.trim()
    };

    try {
      if (isEditMode && editingId) {
        await axios.put(`/api/v1/admin/supervisors/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Jadwal pengawas berhasil diperbarui');
      } else {
        await axios.post('/api/v1/admin/supervisors', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Jadwal pengawas berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Gagal menyimpan jadwal pengawas');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Supervisor Assignment
  const handleDeleteSupervisor = async (id: number, teacherName: string, className: string) => {
    const confirmed = await confirmAction(
      'Hapus Jadwal Pengawas',
      `Apakah Anda yakin ingin menghapus penugasan pengawas ${teacherName} di kelas ${className}?`
    );

    if (confirmed) {
      try {
        await axios.delete(`/api/v1/admin/supervisors/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Jadwal pengawas berhasil dihapus');
        fetchData();
      } catch (error: any) {
        showErrorToast(error.response?.data?.error || 'Gagal menghapus jadwal pengawas');
      }
    }
  };

  // Open Participants Monitor
  const handleOpenMonitor = (examId: number, examTitle: string, classId?: number) => {
    setMonitorExam({ id: examId, title: examTitle, classId });
    setIsParticipantsModalOpen(true);
  };

  // Filtered List
  const filteredSupervisors = useMemo(() => {
    return supervisors.filter(s => {
      // Query filter
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const teacherName = s.teacher?.name?.toLowerCase() || '';
        const teacherUser = s.teacher?.username?.toLowerCase() || '';
        const examTitle = s.exam?.title?.toLowerCase() || '';
        const className = s.class?.name?.toLowerCase() || '';
        const ruangan = s.ruangan?.toLowerCase() || '';
        const notes = s.notes?.toLowerCase() || '';

        const match = teacherName.includes(q) || 
                      teacherUser.includes(q) || 
                      examTitle.includes(q) || 
                      className.includes(q) || 
                      ruangan.includes(q) || 
                      notes.includes(q);
        if (!match) return false;
      }

      // Exam Filter
      if (selectedExamId !== 'ALL' && s.exam_id !== Number(selectedExamId)) {
        return false;
      }

      // Class Filter
      if (selectedClassId !== 'ALL' && s.class_id !== Number(selectedClassId)) {
        return false;
      }

      // Teacher Filter
      if (selectedTeacherId !== 'ALL' && s.teacher_id !== Number(selectedTeacherId)) {
        return false;
      }

      return true;
    });
  }, [supervisors, debouncedSearch, selectedExamId, selectedClassId, selectedTeacherId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                Jadwal Pengawas Ujian
              </h1>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">
              {isAdmin 
                ? 'Kelola pembagian tugas pengawas ujian per ruang & rombel kelas. Anda dapat mengunduh template Excel lengkap dan mengunggah jadwal sekaligus.'
                : 'Daftar penugasan pengawasan ujian Anda. Guru hanya berwenang membuka kunci ujian bagi peserta di rombel kelas yang ditugaskan.'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  title="Unduh template Excel dengan sheet Guru, Ujian, dan Kelas terisi lengkap"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>{isDownloadingTemplate ? 'Mengunduh...' : 'Unduh Template Excel'}</span>
                </button>

                <button
                  onClick={() => {
                    setUploadFile(null);
                    setUploadResult(null);
                    setIsUploadModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unggah Jadwal Excel</span>
                </button>

                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pengawas</span>
                </button>
              </>
            )}

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              title="Muat Ulang Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Teacher Mode Notice */}
        {!isAdmin && (
          <div className="mt-5 p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start space-x-3 text-blue-900 text-sm">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Hak Akses Pembukaan Kunci Pengawas</p>
              <p className="text-blue-700 text-xs mt-0.5 leading-relaxed">
                Anda hanya dapat membuka kunci ujian yang terkunci (akibat siswa keluar aplikasi/pindah jendela) untuk kelas yang sedang Anda awasi pada jadwal ujian terkait.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Penugasan</p>
            <p className="text-xl font-bold text-slate-800">{supervisors.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Ujian Terjadwal</p>
            <p className="text-xl font-bold text-slate-800">{exams.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <School className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Rombel Kelas</p>
            <p className="text-xl font-bold text-slate-800">{classes.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{isAdmin ? 'Guru Tersedia' : 'Tugas Pengawasan Saya'}</p>
            <p className="text-xl font-bold text-slate-800">{isAdmin ? teachers.length : supervisors.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru, judul ujian, kelas, atau ruangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Exam Filter */}
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Semua Ujian</option>
            {exams.map(e => (
              <option key={e.ID} value={e.ID}>{e.title}</option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map(c => (
              <option key={c.ID} value={c.ID}>{c.name}</option>
            ))}
          </select>

          {/* Teacher Filter (Admin only) */}
          {isAdmin && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Guru</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Jadwal Ujian</th>
                <th className="px-6 py-4">Kelas / Rombel</th>
                <th className="px-6 py-4">Guru Pengawas</th>
                <th className="px-6 py-4">Ruangan</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>Memuat data jadwal pengawas...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSupervisors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <UserCheck className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Tidak ada jadwal pengawas yang ditemukan</p>
                      <p className="text-xs text-slate-400">
                        {isAdmin ? 'Tambahkan pengawas secara manual atau unggah file Excel' : 'Anda belum memiliki jadwal tugas pengawasan'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSupervisors.map((s) => {
                  const examTitle = s.exam?.title || 'Ujian Tanpa Judul';
                  const subjectName = s.exam?.subject?.name || '-';
                  const className = s.class?.name || `Kelas #${s.class_id}`;
                  const teacherName = s.teacher?.name || `Guru #${s.teacher_id}`;
                  const teacherUser = s.teacher?.username || '';
                  const ruangan = s.ruangan || '-';
                  const notes = s.notes || '-';

                  return (
                    <tr key={s.ID} className="hover:bg-slate-50/60 transition-colors">
                      {/* Exam Column */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 leading-snug">{examTitle}</p>
                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {subjectName}
                            </span>
                            {s.exam?.duration && (
                              <span className="inline-flex items-center text-slate-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {s.exam.duration} mnt
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Class Column */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-200">
                          <School className="w-3.5 h-3.5 mr-1" />
                          {className}
                        </span>
                      </td>

                      {/* Teacher Column */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{teacherName}</p>
                          {teacherUser && (
                            <p className="text-xs text-slate-400">@{teacherUser}</p>
                          )}
                        </div>
                      </td>

                      {/* Room Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 text-slate-700 font-medium text-xs">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{ruangan}</span>
                        </div>
                      </td>

                      {/* Notes Column */}
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {notes}
                      </td>

                      {/* Action Column */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Pantau & Buka Kunci Modal */}
                          <button
                            onClick={() => handleOpenMonitor(s.exam_id, examTitle, s.class_id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors shadow-xs"
                            title="Pantau peserta ujian & buka kunci siswa di kelas ini"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pantau & Kunci</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(s)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Penugasan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSupervisor(s.ID, teacherName, className)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Penugasan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Manual Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {isEditMode ? 'Edit Penugasan Pengawas' : 'Tambah Penugasan Pengawas'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Exam Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jadwal Ujian <span className="text-red-500">*</span>
                </label>
                <select
                  value={formExamId}
                  onChange={(e) => setFormExamId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Pilih Jadwal Ujian</option>
                  {exams.map(e => (
                    <option key={e.ID} value={e.ID}>{e.title}</option>
                  ))}
                </select>
              </div>

              {/* Class Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelas / Rombel <span className="text-red-500">*</span>
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Pilih Rombel Kelas</option>
                  {availableClassesForSelectedExam.map(c => (
                    <option key={c.ID} value={c.ID}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guru Pengawas <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Pilih Guru Pengawas</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.nip ? `(NIP: ${t.nip})` : `(@${t.username})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ruangan / Lab (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lab Komputer 1, Ruang 04"
                  value={formRuangan}
                  onChange={(e) => setFormRuangan(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengawas 1, Sesi Pagi"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Tambah Pengawas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Excel */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">
                  Unggah Jadwal Pengawas (Excel)
                </h3>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Petunjuk Pengunggahan:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Gunakan file template Excel yang disediakan agar format kolom sesuai.</li>
                <li>Sheet 2 berisi lengkap daftar Guru yang tersedia, Sheet 3 berisi Ujian, Sheet 4 berisi Kelas.</li>
                <li>Sistem mendukung pencocokan melalui ID maupun Nama Guru/Ujian/Kelas.</li>
              </ul>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template Excel Pengawas</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleUploadExcel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih File Excel (.xlsx) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {/* Upload Result Info */}
              {uploadResult && (
                <div className={`p-4 rounded-xl text-xs space-y-2 ${
                  uploadResult.errors && uploadResult.errors.length > 0 
                    ? 'bg-amber-50 text-amber-900 border border-amber-200' 
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                }`}>
                  <div className="flex items-center space-x-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{uploadResult.message}</span>
                  </div>

                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-amber-200/60">
                      <p className="font-semibold text-amber-800">Catatan Baris Bermasalah:</p>
                      <ul className="list-disc list-inside max-h-32 overflow-y-auto space-y-0.5 text-[11px] text-amber-700">
                        {uploadResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Memproses...' : 'Unggah & Proses'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monitor & Unlock Modal */}
      {isParticipantsModalOpen && monitorExam && (
        <ExamParticipantsModal
          isOpen={isParticipantsModalOpen}
          onClose={() => {
            setIsParticipantsModalOpen(false);
            setMonitorExam(null);
          }}
          examId={monitorExam.id}
          examTitle={monitorExam.title}
          initialClassId={monitorExam.classId}
        />
      )}
    </div>
  );
};

export default Supervisors;
