import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  RefreshCw, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  BookOpen, 
  Calendar, 
  School, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorToast } from '../utils/alert';
import StudentExamReviewModal from '../components/StudentExamReviewModal';
import { useDebounce } from '../hooks/useDebounce';

interface QuestionItem {
  ID: number;
  type: string;
  points: number;
}

interface ClassItem {
  ID: number;
  level: string;
  department: string;
  number: string;
  name?: string;
}

interface ExamItem {
  ID?: number;
  id?: number;
  title: string;
  subject_id: number;
  subject?: {
    id: number;
    name: string;
    type?: string;
  };
  classes?: ClassItem[];
  questions?: QuestionItem[];
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  teacher_id?: number;
  teacher?: {
    id: number;
    name: string;
  };
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
  session_id?: number;
  score?: number;
  is_graded?: boolean;
  essay_count?: number;
}

export const Grading: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [selectedClassId, setSelectedClassId] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'GRADED' | 'NOT_FINISHED'>('ALL');
  const [onlyEssayExams, setOnlyEssayExams] = useState(true);

  // Active Review Modal
  const [activeReviewIndex, setActiveReviewIndex] = useState<number | null>(null);

  // Initial Fetch Exams
  const fetchExams = async () => {
    setIsLoadingExams(true);
    try {
      const res = await axios.get('/api/v1/admin/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: ExamItem[] = res.data || [];
      setExams(data);

      // Auto-select exam from URL param or first available exam
      const urlExamId = searchParams.get('examId');
      if (urlExamId) {
        const found = data.find((e) => (e.ID ?? e.id) === Number(urlExamId));
        if (found) {
          setSelectedExamId((found.ID ?? found.id)!);
          return;
        }
      }

      // Default to first exam that has essay questions, or first exam
      const firstWithEssay = data.find((e) => (e.questions || []).some((q) => q.type === 'ESSAY'));
      if (firstWithEssay) {
        setSelectedExamId((firstWithEssay.ID ?? firstWithEssay.id)!);
      } else if (data.length > 0) {
        setSelectedExamId((data[0].ID ?? data[0].id)!);
      }
    } catch (err: any) {
      console.error('Failed to fetch exams:', err);
      showErrorToast('Gagal memuat daftar ujian');
    } finally {
      setIsLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Fetch Participants for selected exam
  const fetchParticipants = async (examId: number) => {
    setIsLoadingParticipants(true);
    try {
      const res = await axios.get(`/api/v1/admin/exams/${examId}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParticipants(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch participants:', err);
      showErrorToast('Gagal memuat peserta ujian');
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchParticipants(selectedExamId);
      // Sync URL
      setSearchParams({ examId: selectedExamId.toString() }, { replace: true });
      setSelectedClassId('ALL');
      setStatusFilter('ALL');
      setSearchTerm('');
      setActiveReviewIndex(null);
    }
  }, [selectedExamId]);

  // Selected Exam Object
  const currentExam = useMemo(() => {
    return exams.find((e) => (e.ID ?? e.id) === selectedExamId) || null;
  }, [exams, selectedExamId]);

  // Count essay questions in current exam
  const essayQuestionsCount = useMemo(() => {
    if (!currentExam || !currentExam.questions) return 0;
    return currentExam.questions.filter((q) => q.type === 'ESSAY').length;
  }, [currentExam]);

  // Filtered Exam List for Selector
  const displayExams = useMemo(() => {
    if (!onlyEssayExams) return exams;
    return exams.filter((e) => (e.questions || []).some((q) => q.type === 'ESSAY'));
  }, [exams, onlyEssayExams]);

  // Extract available classes for current exam
  const availableClasses = useMemo(() => {
    const classMap = new Map<number, ClassItem>();
    participants.forEach((p) => {
      if (p.class && p.class.ID) {
        classMap.set(p.class.ID, p.class as ClassItem);
      }
    });
    return Array.from(classMap.values());
  }, [participants]);

  // Determine participant grading status
  const getParticipantGradingStatus = (p: Participant) => {
    const isFinished = p.session_status === 'FINISHED' || p.session_status === 'SUBMITTED' || p.session_status === 'TIMEOUT';
    if (!isFinished) return 'NOT_FINISHED';
    if (essayQuestionsCount === 0 || p.is_graded) return 'GRADED';
    return 'PENDING';
  };

  // Metrics for current exam
  const metrics = useMemo(() => {
    const total = participants.length;
    let finishedCount = 0;
    let pendingCount = 0;
    let gradedCount = 0;
    let totalScoreSum = 0;

    participants.forEach((p) => {
      const status = getParticipantGradingStatus(p);
      if (status === 'PENDING') pendingCount++;
      if (status === 'GRADED') {
        gradedCount++;
        totalScoreSum += p.score || 0;
      }
      if (status !== 'NOT_FINISHED') finishedCount++;
    });

    const avgScore = gradedCount > 0 ? Math.round((totalScoreSum / gradedCount) * 10) / 10 : 0;
    const progressPercent = finishedCount > 0 ? Math.round((gradedCount / finishedCount) * 100) : 0;

    return {
      total,
      finishedCount,
      pendingCount,
      gradedCount,
      avgScore,
      progressPercent
    };
  }, [participants, essayQuestionsCount]);

  // Filtered Participants List
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // Class filter
      if (selectedClassId !== 'ALL' && p.class_id !== selectedClassId) {
        return false;
      }

      // Status filter
      const status = getParticipantGradingStatus(p);
      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }

      // Search term
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchName = p.name && p.name.toLowerCase().includes(query);
        const matchNis = p.nis && p.nis.toLowerCase().includes(query);
        if (!matchName && !matchNis) return false;
      }

      return true;
    });
  }, [participants, selectedClassId, statusFilter, debouncedSearch, essayQuestionsCount]);

  // Eligible students for the review queue (only those with session and completed)
  const eligibleGradingList = useMemo(() => {
    return filteredParticipants.filter(
      (p) => p.session_id && (p.session_status === 'FINISHED' || p.session_status === 'SUBMITTED' || p.session_status === 'TIMEOUT')
    );
  }, [filteredParticipants]);

  // Current student being reviewed
  const activeStudent = useMemo(() => {
    if (activeReviewIndex === null || activeReviewIndex < 0 || activeReviewIndex >= eligibleGradingList.length) {
      return null;
    }
    return eligibleGradingList[activeReviewIndex];
  }, [activeReviewIndex, eligibleGradingList]);

  // Rapid Navigation Handlers
  const handleNextStudent = () => {
    if (activeReviewIndex !== null && activeReviewIndex < eligibleGradingList.length - 1) {
      setActiveReviewIndex(activeReviewIndex + 1);
    }
  };

  const handlePrevStudent = () => {
    if (activeReviewIndex !== null && activeReviewIndex > 0) {
      setActiveReviewIndex(activeReviewIndex - 1);
    }
  };

  const handleOpenReview = (participant: Participant) => {
    const idx = eligibleGradingList.findIndex((p) => p.id === participant.id);
    if (idx !== -1) {
      setActiveReviewIndex(idx);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Koreksi & Penilaian Jawaban
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Essay Review
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pemeriksaan dan penilaian jawaban essay peserta ujian secara menyeluruh & efisien.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={() => {
              if (selectedExamId) fetchParticipants(selectedExamId);
              fetchExams();
            }}
            disabled={isLoadingExams || isLoadingParticipants}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExams || isLoadingParticipants ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Selector Section: Exam & Mode */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Exam Dropdown Selector */}
          <div className="flex-1 max-w-2xl">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Jadwal Ujian
            </label>
            <div className="relative">
              <select
                value={selectedExamId || ''}
                onChange={(e) => setSelectedExamId(Number(e.target.value))}
                disabled={isLoadingExams}
                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all cursor-pointer appearance-none pr-10"
              >
                {displayExams.length === 0 ? (
                  <option value="">Tidak ada jadwal ujian</option>
                ) : (
                  displayExams.map((exam) => {
                    const essayCount = (exam.questions || []).filter((q) => q.type === 'ESSAY').length;
                    const eId = exam.ID ?? exam.id;
                    return (
                      <option key={eId} value={eId}>
                        {exam.title} &bull; {exam.subject?.name || 'Mata Pelajaran'} {essayCount > 0 ? `(${essayCount} Soal Essay)` : '(Pilihan Ganda)'}
                      </option>
                    );
                  })
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Toggle Only Essay Exmas */}
          <div className="flex items-center space-x-3 self-start lg:self-end pb-1">
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyEssayExams}
                onChange={(e) => setOnlyEssayExams(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded-md border-slate-300 focus:ring-purple-500"
              />
              <span>Tampilkan hanya ujian dengan soal essay</span>
            </label>
          </div>
        </div>

        {/* Selected Exam Information Pill */}
        {currentExam && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center space-x-1 font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{currentExam.subject?.name || 'Mapel'}</span>
            </span>
            <span className="inline-flex items-center space-x-1 font-medium bg-slate-100 px-2.5 py-1 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Durasi: {currentExam.duration} Menit</span>
            </span>
            <span className="inline-flex items-center space-x-1 font-medium bg-slate-100 px-2.5 py-1 rounded-xl">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentExam.questions?.length || 0} Soal Total &bull; <strong className="text-purple-600 ml-0.5">{essayQuestionsCount} Essay</strong></span>
            </span>
            <span className="inline-flex items-center space-x-1 font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
              <Award className="w-3.5 h-3.5" />
              <span>Bobot: 1 Essay = 2x Pilgan</span>
            </span>
            {currentExam.teacher && (
              <span className="inline-flex items-center space-x-1 font-medium bg-slate-100 px-2.5 py-1 rounded-xl">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Pembuat: {currentExam.teacher.name}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metrics & Progress Cards */}
      {selectedExamId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Peserta */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Siswa</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{metrics.finishedCount} sudah selesai ujian</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Menunggu Koreksi (Pending) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Perlu Dikoreksi</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <h3 className="text-2xl font-black text-amber-600">{metrics.pendingCount}</h3>
                {metrics.pendingCount > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                    Antrean
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Jawaban butuh penilaian guru</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Selesai Dinilai */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Selesai Dinilai</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{metrics.gradedCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Nilai akhir siswa siap</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Progress & Rata-rata */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Progress Koreksi</p>
              <span className="text-xs font-bold text-purple-700">{metrics.progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Rata-rata Nilai: <strong className="text-slate-800">{metrics.avgScore}</strong> / 100
            </p>
          </div>

        </div>
      )}

      {/* Filter Bar & Student Queue Table */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
        
        {/* Filter Bar */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau NIS siswa..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
            </div>

            {/* Class Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelas:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="ALL">Semua Kelas ({availableClasses.length})</option>
                {availableClasses.map((cls) => (
                  <option key={cls.ID} value={cls.ID}>
                    {cls.level} {cls.department} {cls.number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Peserta ({participants.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Perlu Dikoreksi ({metrics.pendingCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('GRADED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                statusFilter === 'GRADED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sudah Selesai ({metrics.gradedCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('NOT_FINISHED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'NOT_FINISHED'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Belum / Sedang Ujian ({participants.length - metrics.finishedCount})
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          {isLoadingParticipants ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-500">Memuat data peserta ujian...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak ada data siswa ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL' || selectedClassId !== 'ALL'
                  ? 'Coba sesuaikan kata kunci pencarian atau filter status yang dipilih.'
                  : 'Belum ada peserta yang terdaftar pada ujian ini.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">No</th>
                  <th className="py-3.5 px-5">Siswa</th>
                  <th className="py-3.5 px-5">Kelas</th>
                  <th className="py-3.5 px-5">Status Ujian</th>
                  <th className="py-3.5 px-5">Status Koreksi</th>
                  <th className="py-3.5 px-5 text-center">Nilai Akhir</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredParticipants.map((p, idx) => {
                  const gradingStatus = getParticipantGradingStatus(p);
                  const isEligible = p.session_id && (p.session_status === 'FINISHED' || p.session_status === 'SUBMITTED' || p.session_status === 'TIMEOUT');

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NIS: {p.nis || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {p.class ? (
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {p.class.level} {p.class.department} {p.class.number}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.session_status === 'FINISHED' || p.session_status === 'SUBMITTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.session_status === 'ONGOING'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : p.session_status === 'TIMEOUT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.session_status || 'BELUM MULAI'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {gradingStatus === 'PENDING' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Perlu Dikoreksi</span>
                          </span>
                        ) : gradingStatus === 'GRADED' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Sudah Selesai</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                            <span>Belum Selesai</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {isEligible ? (
                          <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                            {p.score !== undefined ? p.score : 0}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {isEligible ? (
                          <button
                            onClick={() => handleOpenReview(p)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-xs ${
                              gradingStatus === 'PENDING'
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>{gradingStatus === 'PENDING' ? 'Koreksi Jawaban' : 'Review Nilai'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Belum submit
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Review Modal with Rapid Next/Prev Navigation */}
      {selectedExamId && activeStudent && activeStudent.session_id && (
        <StudentExamReviewModal
          isOpen={activeReviewIndex !== null}
          onClose={() => setActiveReviewIndex(null)}
          examId={selectedExamId}
          sessionId={activeStudent.session_id}
          studentName={activeStudent.name}
          studentNis={activeStudent.nis}
          studentClass={
            activeStudent.class
              ? `${activeStudent.class.level} ${activeStudent.class.department} ${activeStudent.class.number}`
              : undefined
          }
          examTitle={currentExam?.title}
          onSaved={() => {
            fetchParticipants(selectedExamId);
          }}
          onNext={handleNextStudent}
          onPrev={handlePrevStudent}
          hasNext={activeReviewIndex !== null && activeReviewIndex < eligibleGradingList.length - 1}
          hasPrev={activeReviewIndex !== null && activeReviewIndex > 0}
          currentIndex={activeReviewIndex ?? 0}
          totalStudents={eligibleGradingList.length}
        />
      )}

    </div>
  );
};

export default Grading;
