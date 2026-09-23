import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Clock,
  BookOpen,
  School,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Edit2,
  Users,
  Calculator,
  Target,
  FileSpreadsheet,
  Download,
  Sparkles,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';
import ExamParticipantsModal from '../components/ExamParticipantsModal';
import ClassBadgesList from '../components/ClassBadgesList';
import { useDebounce } from '../hooks/useDebounce';

interface CategoryItem {
  ID: number;
  name: string;
}

interface ClassItem {
  ID: number;
  level: string;
  department: string;
  number: string;
  name: string;
}

interface SubjectItem {
  ID: number;
  name: string;
  type: string;
  class: string;
  tahun?: string;
  semester?: string;
  classes?: ClassItem[];
  parent_id?: number;
}

interface QuestionItem {
  ID: number;
  subject_id: number;
  type: string;
  content: string;
  points: number;
}

interface ExamItem {
  ID: number;
  title: string;
  category_id: number;
  category?: CategoryItem;
  subject_id: number;
  subject?: SubjectItem;
  is_makeup_open: boolean;
  start_time: string;
  end_time: string;
  duration: number;
  total_points: number;
  status: string;
  tahun?: string;
  semester?: string;
  proktor?: string;
  pengawas?: string;
  classes?: ClassItem[];
  questions?: QuestionItem[];
  CreatedAt: string;
}

const Exams = () => {
  const { token, user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);

  // Participants Modal State
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [selectedExamForParticipants, setSelectedExamForParticipants] = useState<{ id: number, title: string } | null>(null);

  // Download Grades Excel Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedExamForDownload, setSelectedExamForDownload] = useState<ExamItem | null>(null);
  const [selectedClassForDownload, setSelectedClassForDownload] = useState<number | 'ALL'>('ALL');
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const handleDownloadExcel = async (examId: number, examTitle: string, classId: number | 'ALL') => {
    try {
      setIsDownloadingExcel(true);
      const url = `/api/v1/admin/exams/${examId}/export-grades${
        classId !== 'ALL' ? `?class_id=${classId}` : ''
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

      showSuccessToast('Berhasil mengunduh nilai Excel!');
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      console.error('Failed to download excel:', err);
      showErrorToast('Gagal mengunduh nilai Excel');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Form State
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(90);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [classFilterLevel, setClassFilterLevel] = useState('ALL');
  const [autoIncludeAllQuestions, setAutoIncludeAllQuestions] = useState(true);
  const [selectedQuestionIds] = useState<number[]>([]);
  const [tahun, setTahun] = useState('');
  const [semester, setSemester] = useState('Ganjil');
  const [proktor, setProktor] = useState('');
  const [pengawas, setPengawas] = useState('');
  const [templatePreset, setTemplatePreset] = useState<'ALL' | '35' | '40' | '45'>('ALL');

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [examsRes, subjectsRes, classesRes, questionsRes, categoriesRes] = await Promise.all([
        axios.get('/api/v1/admin/exams', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/admin/subjects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/admin/classes', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/admin/questions', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/v1/admin/categories', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setExams(examsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setClasses(classesRes.data || []);
      setQuestions(questionsRes.data || []);
      setCategories(categoriesRes.data || []);

      if (subjectsRes.data?.length > 0 && subjectId === '') {
        setSubjectId(subjectsRes.data[0].ID);
      }
      if (categoriesRes.data?.length > 0 && categoryId === '') {
        setCategoryId(categoriesRes.data[0].ID);
      }
    } catch (err) {
      console.error('Error fetching exam dependencies:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Default times: starting in 1 hour, ending 3 hours later
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    // Format YYYY-MM-DDTHH:mm
    const formatLocalISO = (d: Date) => {
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartTime(formatLocalISO(start));
    setEndTime(formatLocalISO(end));
  }, []);

  // Handle URL query params to auto-open create modal or schedule modal for a specific exam
  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    const examParam = searchParams.get('exam');
    const actionParam = searchParams.get('action');

    if (subjectParam) {
      setSubjectId(Number(subjectParam));
    }

    if (actionParam === 'create') {
      resetForm();
      setIsModalOpen(true);
    } else if (actionParam === 'schedule' && examParam && exams.length > 0) {
      const found = exams.find(e => e.ID === Number(examParam));
      if (found) {
        handleEditClick(found);
      }
    }
  }, [searchParams, exams]);

  // Filtered available questions for chosen subject
  const availableQuestions = questions.filter(q => q.subject_id === Number(subjectId));

  // Toggle class selection
  const handleToggleClass = (classId: number) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  const handleSelectAllFilteredClasses = () => {
    const matchingClasses = classes.filter(c => classFilterLevel === 'ALL' || c.level === classFilterLevel);
    const matchingIds = matchingClasses.map(c => c.ID);

    // If all are already selected, deselect them
    const allSelected = matchingIds.every(id => selectedClassIds.includes(id));
    if (allSelected) {
      setSelectedClassIds(selectedClassIds.filter(id => !matchingIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedClassIds, ...matchingIds]));
      setSelectedClassIds(merged);
    }
  };

  const handleEditClick = (exam: ExamItem) => {
    setEditingExam(exam);
    setEditingId(exam.ID);
    setTitle(exam.title);
    setSubjectId(exam.subject_id);
    if (exam.category_id) setCategoryId(exam.category_id);
    setStartTime(exam.start_time ? exam.start_time.substring(0, 16) : '');
    setEndTime(exam.end_time ? exam.end_time.substring(0, 16) : '');
    setDuration(exam.duration || 90);
    setTahun(exam.tahun || '');
    setSemester(exam.semester || 'Ganjil');
    setProktor(exam.proktor || '');
    setPengawas(exam.pengawas || '');
    setSelectedClassIds(exam.classes?.map(c => c.ID) || []);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingExam(null);
    setEditingId(null);
    setTitle('');
    setSubjectId('');
    setCategoryId('');
    setStartTime('');
    setEndTime('');
    setDuration(90);
    setTahun('');
    setSemester('Ganjil');
    setProktor('');
    setPengawas('');
    setSelectedClassIds([]);
    setTemplatePreset('ALL');
    setError('');
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!subjectId) {
      setError('Silakan pilih mata pelajaran terlebih dahulu');
      setIsLoading(false);
      return;
    }

    if (selectedClassIds.length === 0) {
      setError('Silakan pilih minimal satu kelas/rombel yang akan mengikuti ujian');
      setIsLoading(false);
      return;
    }

    try {
      let questionIdsToSend: number[] | undefined = undefined;
      if (!editingId) {
        let ids = autoIncludeAllQuestions
          ? availableQuestions.map(q => q.ID)
          : selectedQuestionIds;

        if (templatePreset !== 'ALL') {
          const targetCount = Number(templatePreset);
          if (ids.length > targetCount) {
            ids = ids.slice(0, targetCount);
          }
        }
        questionIdsToSend = ids;
      } else if (autoIncludeAllQuestions && (!editingExam?.questions || editingExam.questions.length === 0)) {
        let ids = availableQuestions.map(q => q.ID);
        if (templatePreset !== 'ALL') {
          const targetCount = Number(templatePreset);
          if (ids.length > targetCount) ids = ids.slice(0, targetCount);
        }
        questionIdsToSend = ids;
      }

      const payload: any = {
        title,
        subject_id: Number(subjectId),
        category_id: categoryId ? Number(categoryId) : undefined,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration: Number(duration),
        total_points: 100,
        status: 'SCHEDULED',
        class_ids: selectedClassIds,
        tahun,
        semester,
        proktor,
        pengawas
      };

      if (questionIdsToSend && questionIdsToSend.length > 0) {
        payload.question_ids = questionIdsToSend;
      }

      if (editingId) {
        await axios.put(`/api/v1/admin/exams/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Jadwal ujian berhasil diperbarui');
      } else {
        await axios.post('/api/v1/admin/exams', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Jadwal ujian berhasil dibuat');
      }

      setIsModalOpen(false);
      fetchData();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal membuat jadwal ujian');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExam = async (id: number, examTitle: string) => {
    if (!(await confirmAction('Hapus Jadwal Ujian', `Yakin ingin menghapus jadwal ujian "${examTitle}"?`))) return;

    try {
      await axios.delete(`/api/v1/admin/exams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(exams.filter(e => e.ID !== id));
      showSuccessToast('Jadwal ujian dihapus');
    } catch {
      showErrorToast('Gagal menghapus jadwal ujian');
    }
  };

  const handleToggleMakeup = async (id: number, currentStatus: boolean) => {
    const actionName = currentStatus ? "menutup" : "membuka";
    if (!(await confirmAction('Akses Ujian Susulan', `Yakin ingin ${actionName} akses ujian susulan?`))) return;
    try {
      await axios.post(`/api/v1/admin/exams/${id}/toggle-makeup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showSuccessToast(`Akses ujian susulan berhasil di${actionName}`);
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || `Gagal ${actionName} ujian susulan`);
    }
  };

  const getExamStatusInfo = (exam: ExamItem) => {
    if (exam.is_makeup_open) {
      return { text: "SUSULAN DIBUKA", color: "bg-amber-100 text-amber-700 border-amber-200" };
    }

    if (exam.status === 'DRAFT') {
      return { text: "DRAFT / BELUM TERJADWAL", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }

    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    if (now < start) {
      return { text: "TERJADWAL", color: "bg-blue-50 text-blue-700 border-blue-200" };
    } else if (now >= start && now <= end) {
      return { text: "SEDANG BERLANGSUNG", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    } else {
      return { text: "SELESAI", color: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  };

  const filteredExams = useMemo(() => {
    return exams.filter(e =>
      e.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      e.subject?.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [exams, debouncedSearchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Jadwal Ujian SMK</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100">
              CBT Manager
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Atur pelaksanaan ujian, alokasi waktu, serta distribusi soal ke kelas, jurusan, dan rombel SMK.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto shrink-0 shadow-sm"
        >
          <Plus size={18} />
          <span>Jadwalkan Ujian Baru</span>
        </button>
      </header>

      {/* Workflow Step Guide Bar */}
      <div className="bg-gradient-to-r from-primary-50 via-white to-emerald-50 border border-primary-200/70 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 font-bold text-primary-900 uppercase tracking-wider">
            <Sparkles size={16} className="text-primary-600" />
            <span>Alur Pembuatan Ujian:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-semibold">
            <Link 
              to="/dashboard/subjects"
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:border-primary-300 text-slate-700 px-3 py-1.5 rounded-xl transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">✓</span>
              <span>Pilih Mapel</span>
            </Link>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">✓</span>
              <span>Buat Ujian</span>
            </div>
            <Link 
              to="/dashboard/questions"
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:border-primary-300 text-slate-700 px-3 py-1.5 rounded-xl transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">✓</span>
              <span>Masukkan Soal</span>
            </Link>
            <div className="flex items-center space-x-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">4</span>
              <span>Atur Jadwal (Aktif)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari judul ujian atau mata pelajaran..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
          />
        </div>
        <div className="text-xs sm:text-sm font-medium text-slate-500">
          Total: <span className="font-bold text-slate-800">{filteredExams.length}</span> Jadwal Ujian
        </div>
      </div>

      {/* Exam Cards Grid */}
      {filteredExams.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Calendar className="text-slate-400" size={26} />
          </div>
          <p className="font-semibold text-slate-700 text-lg">Belum Ada Jadwal Ujian</p>
          <p className="text-sm mt-1 text-slate-500 max-w-md">
            Mulai jadwalkan ujian baru dengan memilih Mata Pelajaran dan menugaskan Rombel/Jurusan SMK yang berhak mengikuti ujian.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary mt-4 flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Buat Jadwal Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredExams.map((exam) => {
            const startDate = new Date(exam.start_time);
            const endDate = new Date(exam.end_time);
            const statusInfo = getExamStatusInfo(exam);
            const isExpired = new Date() > endDate;
            const isJurusan = exam.subject?.type === 'JURUSAN';

            return (
              <div
                key={exam.ID}
                className="glass-panel p-6 group hover:shadow-lg transition-all duration-300 relative border border-slate-200/80 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Subject Badge & Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isJurusan
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                        {exam.subject?.name || 'Mata Pelajaran'} ({isJurusan ? 'Kejuruan' : 'Akademik'})
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>

                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setSelectedExamForDownload(exam);
                          setSelectedClassForDownload('ALL');
                          setIsDownloadModalOpen(true);
                        }}
                        className="text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors"
                        title="Download Nilai Per Kelas (Excel)"
                      >
                        <FileSpreadsheet size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedExamForParticipants({ id: exam.ID, title: exam.title });
                          setIsParticipantsModalOpen(true);
                        }}
                        className="text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                        title="Daftar Peserta"
                      >
                        <Users size={16} />
                      </button>
                      <button
                        onClick={() => handleEditClick(exam)}
                        className="text-slate-300 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors"
                        title="Edit Jadwal"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.ID, exam.title)}
                        className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Hapus Jadwal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-800 mb-2 leading-snug">
                    {exam.title}
                  </h3>

                  {/* Timing Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-2 font-semibold text-primary-700">
                      <Tag size={13} className="text-primary-600" />
                      <span>Kategori: {exam.category?.name || 'Umum'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={14} className="text-slate-400" />
                      <span>Durasi Pengerjaan: <strong className="text-slate-800">{exam.duration} Menit</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span>
                        Mulai: {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span>
                        Selesai: {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Classes Assigned (SMK Rombel) */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                      <School size={14} className="mr-1.5 text-primary-600" />
                      Peserta Ujian ({exam.classes?.length || 0} Kelas):
                    </p>
                    <ClassBadgesList 
                      classes={exam.classes} 
                      maxVisible={4} 
                      containerClassName="w-full"
                      badgeClassName="bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold px-2 py-0.5 rounded-lg"
                      emptyText="Belum ada kelas dipilih"
                    />
                  </div>
                </div>

                {/* Footer: Question count & Points & Toggle Makeup */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Link
                      to={`/dashboard/questions?subject=${exam.subject_id}&exam_id=${exam.ID}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center space-x-1 transition-all"
                      title="Kelola & Masukkan Butir Soal"
                    >
                      <BookOpen size={13} className="text-slate-500" />
                      <span>{exam.questions?.length || 0} Soal (Kelola)</span>
                    </Link>

                    {exam.status === 'DRAFT' && (
                      <button
                        onClick={() => handleEditClick(exam)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1 shadow-2xs transition-all"
                      >
                        <Clock size={13} />
                        <span>Atur Jadwal</span>
                      </button>
                    )}
                  </div>

                  {isExpired && currentUser?.role === 'ADMIN' ? (
                    <button
                      onClick={() => handleToggleMakeup(exam.ID, exam.is_makeup_open)}
                      className={`px-3 py-1 text-white rounded font-bold shadow-sm transition-colors ${exam.is_makeup_open ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
                        }`}
                    >
                      {exam.is_makeup_open ? 'Tutup Susulan' : 'Buka Susulan'}
                    </button>
                  ) : (
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Total: {exam.total_points || 100} Poin
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Jadwal Ujian */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-2xl bg-white shadow-2xl relative z-10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Buat Jadwal Ujian SMK</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateExam} className="p-6 overflow-y-auto space-y-5 flex-1">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Judul Ujian */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Judul Pelaksanaan Ujian
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: PTS Ganjil 2026 - Pemrograman Berorientasi Objek"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pilih Kategori */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Kategori / Semester
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white font-medium"
                    required
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map(c => (
                      <option key={c.ID} value={c.ID}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Pilih Mata Pelajaran */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Mata Pelajaran
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => {
                      const newSubId = Number(e.target.value);
                      setSubjectId(newSubId);
                      const foundSub = subjects.find(s => s.ID === newSubId);
                      if (foundSub) {
                        if (foundSub.tahun && !tahun) setTahun(foundSub.tahun);
                        if (foundSub.semester) setSemester(foundSub.semester);
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white font-medium"
                    required
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {subjects.map(s => {
                      const classList = s.classes && s.classes.length > 0 ? s.classes.map(c => c.name).join(', ') : s.class;
                      const info = [s.tahun, s.semester, classList].filter(Boolean).join(' • ');
                      return (
                        <option key={s.ID} value={s.ID}>
                          {s.name} {info ? `(${info})` : `(${s.type === 'JURUSAN' ? 'Mapel Kejuruan SMK' : 'Mapel Umum/Akademik'})`}
                        </option>
                      );
                    })}
                  </select>
                  {subjectId && (
                    <p className="text-xs text-primary-600 mt-1 font-medium">
                      ✓ Ditemukan {availableQuestions.length} soal di bank soal.
                    </p>
                  )}
                </div>
              </div>

              {/* Kelengkapan Administrasi */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 flex items-center mb-4">
                  <AlertCircle size={16} className="mr-1.5 text-primary-600" />
                  Kelengkapan Administrasi (Opsional)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tahun Ajaran</label>
                    <input
                      type="text"
                      value={tahun}
                      onChange={(e) => setTahun(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                      placeholder="Contoh: 2026/2027"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Proktor</label>
                    <input
                      type="text"
                      value={proktor}
                      onChange={(e) => setProktor(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                      placeholder="Nama Proktor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Pengawas</label>
                    <input
                      type="text"
                      value={pengawas}
                      onChange={(e) => setPengawas(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                      placeholder="Nama Pengawas"
                    />
                  </div>
                </div>
              </div>

              {/* Waktu & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Waktu Mulai
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Waktu Selesai
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              {/* PEMETAAN KELAS, JURUSAN & ROMBEL (SMK DOMAIN LOGIC) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center">
                      <School size={16} className="mr-1.5 text-primary-600" />
                      Pilih Kelas & Jurusan yang Mengikuti Ujian
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih rombel yang berhak mengakses token & mengerjakan ujian ini.
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredClasses}
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
                    >
                      Pilih / Batal Semua
                    </button>
                  </div>
                </div>

                {/* Filter Level Tabs */}
                <div className="flex space-x-1 border-b border-slate-200 pb-2">
                  {['ALL', 'X', 'XI', 'XII'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setClassFilterLevel(lvl)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${classFilterLevel === lvl
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {lvl === 'ALL' ? 'Semua' : `Tingkat ${lvl}`}
                    </button>
                  ))}
                </div>

                {/* Class Chips / Checkbox Grid */}
                {classes.length === 0 ? (
                  <p className="text-xs text-amber-600 italic py-2">
                    Belum ada data kelas yang dibuat Admin. Silakan buat di menu "Data Kelas" terlebih dahulu.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {classes
                      .filter(c => classFilterLevel === 'ALL' || c.level === classFilterLevel)
                      .map((c) => {
                        const isSelected = selectedClassIds.includes(c.ID);
                        return (
                          <div
                            key={c.ID}
                            onClick={() => handleToggleClass(c.ID)}
                            className={`cursor-pointer p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all select-none ${isSelected
                                ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                          >
                            <span>{c.name || `${c.level} ${c.department} ${c.number}`}</span>
                            {isSelected && <CheckCircle2 size={16} className="text-primary-600 flex-shrink-0" />}
                          </div>
                        );
                      })}
                  </div>
                )}

                <div className="text-xs font-semibold text-slate-600 pt-1 flex justify-between">
                  <span>Terpilih: <strong className="text-primary-600">{selectedClassIds.length}</strong> Kelas / Rombel</span>
                  {selectedClassIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedClassIds([])}
                      className="text-red-500 hover:underline"
                    >
                      Reset Pilihan
                    </button>
                  )}
                </div>
              </div>

              {/* OPSI SOAL & PRESET TEMPLATE */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Target size={16} className="mr-1.5 text-primary-600" />
                    Format Preset Template Soal & Perhitungan Nilai
                  </h4>
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
                    Skala Standar 100 Poin
                  </span>
                </div>

                {/* Preset Options Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Pilih Target Butir Soal Ujian:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'ALL', label: 'Semua Soal', desc: `${availableQuestions.length} Soal Ada` },
                      { id: '35', label: 'Template 35', desc: '35 Butir Soal' },
                      { id: '40', label: 'Template 40', desc: 'Standar 40 Butir' },
                      { id: '45', label: 'Template 45', desc: '45 Butir Soal' }
                    ].map((p) => {
                      const isSelected = templatePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setTemplatePreset(p.id as any);
                            setAutoIncludeAllQuestions(true);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {p.label}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-primary-100' : 'text-slate-500'}`}>
                            {p.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Ketersediaan Soal & Formula Auto-Scoring */}
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Soal Tersedia di Bank Soal:</span>
                    <strong className="text-slate-800 font-bold">{availableQuestions.length} Soal</strong>
                  </div>

                  {templatePreset !== 'ALL' && (
                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                      <span className="text-slate-500">Soal yang Digunakan:</span>
                      <strong className="text-primary-600 font-bold">
                        {Math.min(availableQuestions.length, Number(templatePreset))} dari {templatePreset} Butir
                      </strong>
                    </div>
                  )}

                  {/* Formula Auto-Score Banner */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-lg text-xs text-emerald-900 flex items-start space-x-2">
                    <Calculator size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block mb-0.5">Sistem Perhitungan Nilai Otomatis:</strong>
                      {templatePreset === 'ALL' ? (
                        <span>
                          Siswa akan dinilai dengan rumus: <code>(Benar ÷ {availableQuestions.length || 'N'}) × 100</code> (Skala Maksimal 100 Poin).
                        </span>
                      ) : (
                        <span>
                          Siswa akan dinilai dengan rumus: <code>(Benar ÷ {templatePreset}) × 100</code>. Nilai akhir otomatis dihitung presisi skala 100 saat ujian selesai.
                        </span>
                      )}
                    </div>
                  </div>

                  {templatePreset !== 'ALL' && availableQuestions.length < Number(templatePreset) && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center space-x-2">
                      <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                      <span>
                        Bank soal baru memiliki {availableQuestions.length} soal (kurang {Number(templatePreset) - availableQuestions.length} soal). Anda dapat upload soal via Excel di menu Bank Soal.
                      </span>
                    </div>
                  )}
                </div>

                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoIncludeAllQuestions}
                    onChange={(e) => setAutoIncludeAllQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    {templatePreset === 'ALL' 
                      ? `Sertakan semua (${availableQuestions.length}) butir soal yang tersedia`
                      : `Sertakan hingga ${templatePreset} butir soal dari bank soal mata pelajaran ini`
                    }
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
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
                  <span>{isLoading ? 'Menyimpan...' : 'Jadwalkan Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Download Nilai Per Kelas (Excel) */}
      {isDownloadModalOpen && selectedExamForDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDownloadModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-md bg-white shadow-2xl relative z-10 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 leading-tight">Download Rekap Nilai</h2>
                  <p className="text-xs text-slate-500">Format Resmi Microsoft Excel (.xlsx)</p>
                </div>
              </div>
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-primary-700">{selectedExamForDownload.subject?.name || 'Mata Pelajaran'}</p>
                <p className="text-sm font-bold text-slate-800">{selectedExamForDownload.title}</p>
                <p className="text-xs text-slate-500">
                  Total Peserta: {selectedExamForDownload.classes?.length || 0} Rombel Kelas Terdaftar
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilih Kelas yang Ingin Diunduh:
                </label>
                <select
                  value={selectedClassForDownload}
                  onChange={(e) => setSelectedClassForDownload(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="ALL">Semua Kelas Peserta Ujian</option>
                  {selectedExamForDownload.classes?.map((cls) => (
                    <option key={cls.ID} value={cls.ID}>
                      {cls.name || `${cls.level} ${cls.department} ${cls.number}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center">
                  <CheckCircle2 size={14} className="mr-1 text-emerald-600" />
                  Format Nilai SMK Negeri 1 Beringin:
                </p>
                <p className="text-emerald-700 leading-relaxed">
                  File Excel (.xlsx) mencakup Kop Resmi, NISN, NIS, Nama Siswa, L/P, Status Ujian, Nilai Akhir, Keterangan Tuntas/Belum Tuntas, serta rumus Rata-rata dan Nilai Tertinggi/Terendah.
                </p>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDownloadExcel(selectedExamForDownload.ID, selectedExamForDownload.title, selectedClassForDownload)}
                disabled={isDownloadingExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download size={14} className={isDownloadingExcel ? 'animate-bounce' : ''} />
                <span>{isDownloadingExcel ? 'Memproses...' : 'Unduh Excel (.xlsx)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {selectedExamForParticipants && (
        <ExamParticipantsModal
          isOpen={isParticipantsModalOpen}
          onClose={() => {
            setIsParticipantsModalOpen(false);
            setTimeout(() => setSelectedExamForParticipants(null), 200); // Wait for transition
          }}
          examId={selectedExamForParticipants.id}
          examTitle={selectedExamForParticipants.title}
        />
      )}
    </div>
  );
};

export default Exams;
