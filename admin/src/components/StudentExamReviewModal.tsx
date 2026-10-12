import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  X, CheckCircle2, XCircle, AlertCircle, Award, 
  Check, Save, Sparkles, RefreshCw, FileText, 
  HelpCircle, User, BookOpen, Layers, Filter,
  ChevronLeft, ChevronRight, ArrowRight, PenTool,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorToast } from '../utils/alert';

interface StudentExamReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: number;
  sessionId: number;
  studentName?: string;
  studentNis?: string;
  studentClass?: string;
  examTitle?: string;
  onSaved?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  currentIndex?: number;
  totalStudents?: number;
}

interface AnswerReviewItem {
  question_id: number;
  type: string; // 'MULTIPLE_CHOICE' | 'ESSAY'
  content: string;
  options?: any;
  correct_answer: string;
  max_points: number;
  student_answer: string;
  score: number;
  is_graded: boolean;
  is_correct: boolean;
}

interface ReviewResponse {
  session: {
    id: number;
    score: number;
    status: string;
    start_time: string;
    end_time: string;
  };
  student: {
    id: number;
    name: string;
    nis: string;
    class?: {
      level: string;
      department: string;
      number: string;
    };
  };
  exam: {
    id: number;
    title: string;
    total_points: number;
  };
  answers: AnswerReviewItem[];
  point_per_mc?: number;
  point_per_essay?: number;
  mc_count?: number;
  essay_count?: number;
  total_mc_score: number;
  total_essay_score: number;
  max_total_points: number;
}

export const StudentExamReviewModal: React.FC<StudentExamReviewModalProps> = ({
  isOpen,
  onClose,
  examId,
  sessionId,
  studentName,
  studentNis,
  studentClass,
  examTitle,
  onSaved,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  currentIndex,
  totalStudents
}) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);
  const [grades, setGrades] = useState<Record<number, number>>({});
  const [evaluations, setEvaluations] = useState<Record<number, 'WRONG' | 'HALF' | 'CORRECT'>>({});
  const [filterType, setFilterType] = useState<'ALL' | 'ESSAY' | 'MC'>('ALL');

  // Fetch student review data
  const fetchReviewData = async () => {
    if (!examId || !sessionId) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/v1/admin/exams/${examId}/sessions/${sessionId}/review`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: ReviewResponse = res.data;
      setReviewData(data);

      // Initialize grades and evaluations state from server scores
      const initialGrades: Record<number, number> = {};
      const initialEvals: Record<number, 'WRONG' | 'HALF' | 'CORRECT'> = {};

      data.answers?.forEach((ans) => {
        initialGrades[ans.question_id] = ans.score ?? 0;
        if (ans.type === 'ESSAY' && ans.is_graded) {
          if (ans.max_points > 0 && ans.score >= ans.max_points * 0.8) {
            initialEvals[ans.question_id] = 'CORRECT';
          } else if (ans.max_points > 0 && ans.score >= ans.max_points * 0.3) {
            initialEvals[ans.question_id] = 'HALF';
          } else {
            initialEvals[ans.question_id] = 'WRONG';
          }
        }
      });
      setGrades(initialGrades);
      setEvaluations(initialEvals);
    } catch (err: any) {
      console.error('Failed to fetch session review:', err);
      showErrorToast(err.response?.data?.error || 'Gagal memuat jawaban siswa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && examId && sessionId) {
      fetchReviewData();
      setFilterType('ALL');
    } else {
      setReviewData(null);
      setGrades({});
      setEvaluations({});
    }
  }, [isOpen, examId, sessionId]);

  // Set essay evaluation choice (Salah, Setengah, Benar)
  const handleSetGrade = (qId: number, maxScore: number, choice: 'WRONG' | 'HALF' | 'CORRECT') => {
    let score = 0;
    if (choice === 'HALF') {
      score = Math.round(maxScore * 0.5 * 100) / 100;
    } else if (choice === 'CORRECT') {
      score = Math.round(maxScore * 100) / 100;
    }

    setEvaluations((prev) => ({ ...prev, [qId]: choice }));
    setGrades((prev) => ({ ...prev, [qId]: score }));
  };

  // Calculate live total score (scale 0-100)
  const scoreCalculations = useMemo(() => {
    if (!reviewData || !reviewData.answers) {
      return { totalEarned: 0, maxPoints: 100, finalScore: 0, essayEarned: 0, essayMax: 0, mcEarned: 0, mcMax: 0 };
    }

    let earned = 0;
    let essayEarned = 0;
    let essayMax = 0;
    let mcEarned = 0;
    let mcMax = 0;

    reviewData.answers.forEach((q) => {
      const qScore = grades[q.question_id] ?? q.score ?? 0;
      earned += qScore;

      if (q.type === 'ESSAY') {
        essayEarned += qScore;
        essayMax += q.max_points;
      } else {
        mcEarned += qScore;
        mcMax += q.max_points;
      }
    });

    const finalScore = Math.min(100, Math.round(earned * 100) / 100);

    return {
      totalEarned: Math.round(earned * 100) / 100,
      maxPoints: 100,
      finalScore,
      essayEarned: Math.round(essayEarned * 100) / 100,
      essayMax: Math.round(essayMax * 100) / 100,
      mcEarned: Math.round(mcEarned * 100) / 100,
      mcMax: Math.round(mcMax * 100) / 100
    };
  }, [reviewData, grades]);

  // Save teacher grades to backend
  const handleSaveGrades = async (andGoNext = false) => {
    if (!examId || !sessionId) return;
    setIsSaving(true);
    try {
      const payload = {
        grades: Object.entries(grades).map(([qId, score]) => ({
          question_id: Number(qId),
          score: Number(score)
        })),
        final_score: scoreCalculations.finalScore
      };

      const res = await axios.post(
        `/api/v1/admin/exams/${examId}/sessions/${sessionId}/grade`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccessToast(res.data?.message || 'Penilaian jawaban berhasil disimpan');
      if (onSaved) {
        onSaved();
      }
      if (andGoNext && onNext) {
        onNext();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to grade exam session:', err);
      showErrorToast(err.response?.data?.error || 'Gagal menyimpan penilaian');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filtered answers list
  const filteredAnswers = (reviewData?.answers || []).filter((item) => {
    if (filterType === 'ESSAY') return item.type === 'ESSAY';
    if (filterType === 'MC') return item.type === 'MULTIPLE_CHOICE';
    return true;
  });

  const essayQuestionsCount = (reviewData?.answers || []).filter((q) => q.type === 'ESSAY').length;
  const mcQuestionsCount = (reviewData?.answers || []).filter((q) => q.type === 'MULTIPLE_CHOICE').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Koreksi & Review Jawaban Siswa
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Guru Review
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {studentName || reviewData?.student?.name || 'Siswa'} &bull; NIS: {studentNis || reviewData?.student?.nis || '-'}
                {(studentClass || reviewData?.student?.class) && ` • Kelas: ${studentClass || `${reviewData?.student?.class?.level} ${reviewData?.student?.class?.department} ${reviewData?.student?.class?.number}`}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {totalStudents !== undefined && currentIndex !== undefined && (
              <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 mr-1">
                <span>{currentIndex + 1} / {totalStudents}</span>
                <div className="flex items-center space-x-0.5 ml-1 border-l border-slate-300 pl-1.5">
                  <button
                    type="button"
                    onClick={onPrev}
                    disabled={!hasPrev}
                    className="p-1 hover:bg-white rounded-md text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Siswa Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={!hasNext}
                    className="p-1 hover:bg-white rounded-md text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Siswa Berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={fetchReviewData}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh Data Jawaban"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Score Summary Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50/40 px-6 py-3.5 border-b border-purple-100/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                Total Skor Akhir Siswa
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-2xl font-black text-purple-900 font-mono">
                  {scoreCalculations.finalScore}
                </span>
                <span className="text-xs font-semibold text-purple-600">
                  / 100 Poin
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-purple-200/60 hidden sm:block" />

            <div className="hidden sm:flex items-center space-x-2 text-xs">
              <div className="bg-white/90 px-3 py-1 rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px]">Nilai Essay:</span>
                <span className="font-bold text-purple-800">
                  {scoreCalculations.essayEarned} / {scoreCalculations.essayMax} pts
                </span>
              </div>
              <div className="bg-white/90 px-3 py-1 rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px]">Nilai PG:</span>
                <span className="font-bold text-blue-800">
                  {scoreCalculations.mcEarned} / {scoreCalculations.mcMax} pts
                </span>
              </div>
              {reviewData && reviewData.point_per_essay && reviewData.point_per_mc && (
                <div className="bg-purple-100/60 text-purple-800 px-2.5 py-1 rounded-xl font-medium text-[11px] border border-purple-200">
                  Bobot: 1 Essay ({reviewData.point_per_essay} pts) = 2x Pilgan ({reviewData.point_per_mc} pts)
                </div>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-white/90 p-1 rounded-xl border border-purple-200/80 shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({(reviewData?.answers || []).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ESSAY')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                filterType === 'ESSAY'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-purple-700 hover:text-purple-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Soal Essay ({essayQuestionsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('MC')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                filterType === 'MC'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-blue-700 hover:text-blue-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Pilihan Ganda ({mcQuestionsCount})</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-500">Memuat jawaban dan soal ujian...</p>
            </div>
          ) : filteredAnswers.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada butir soal dalam kategori ini</p>
              <p className="text-xs text-slate-400 mt-1">Coba ganti filter tipe soal di atas.</p>
            </div>
          ) : (
            filteredAnswers.map((item, index) => {
              const currentScore = grades[item.question_id] ?? item.score ?? 0;
              const isEssay = item.type === 'ESSAY';

              return (
                <div 
                  key={item.question_id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                    isEssay 
                      ? 'border-purple-200 ring-1 ring-purple-100' 
                      : 'border-slate-200'
                  }`}
                >
                  {/* Question Header Card */}
                  <div className={`px-5 py-3 border-b flex items-center justify-between ${
                    isEssay ? 'bg-purple-50/40 border-purple-100' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        #{index + 1}
                      </span>
                      {isEssay ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          <PenTool className="w-3 h-3 text-purple-700" />
                          <span>Soal Essay / Uraian</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckSquare className="w-3 h-3 text-blue-600" />
                          <span>Pilihan Ganda</span>
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        &bull; Bobot: {item.max_points} Poin
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-500">Nilai:</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                        currentScore > 0 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {currentScore} / {item.max_points}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Isi Pertanyaan */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Pertanyaan Soal:
                      </span>
                      <div 
                        className="text-slate-900 text-sm leading-relaxed ql-editor !p-0"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </div>

                    {/* ESSAY QUESTION REVIEW SECTION */}
                    {isEssay ? (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        {/* 1. Jawaban Siswa */}
                        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                              <User className="w-3.5 h-3.5 text-purple-600" />
                              <span>Jawaban Siswa:</span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {item.student_answer ? `${item.student_answer.length} karakter` : 'Kosong'}
                            </span>
                          </div>
                          
                          {item.student_answer ? (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium">
                              {item.student_answer}
                            </div>
                          ) : (
                            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                              <span>Siswa tidak mengisi jawaban untuk butir essay ini (jawaban kosong).</span>
                            </div>
                          )}
                        </div>

                        {/* 2. Pedoman / Rubrik Kunci Jawaban Guru */}
                        {item.correct_answer && (
                          <div className="bg-purple-50/40 rounded-2xl p-4 border border-purple-200/80">
                            <div className="flex items-center space-x-1.5 mb-2">
                              <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                                Pedoman Penilaian / Rubrik Jawaban (Referensi Guru):
                              </span>
                            </div>
                            <div 
                              className="text-purple-950 text-xs leading-relaxed ql-editor !p-0"
                              dangerouslySetInnerHTML={{ __html: item.correct_answer }}
                            />
                          </div>
                        )}

                        {/* 3. Panel Penilaian Guru: Opsi Salah, Setengah, Benar Penuh */}
                        {(() => {
                          const ptsWrong = 0;
                          const ptsHalf = Math.round(item.max_points * 0.5 * 100) / 100;
                          const ptsFull = Math.round(item.max_points * 100) / 100;
                          const currentEval = evaluations[item.question_id];

                          return (
                            <div className="bg-gradient-to-r from-purple-50/60 to-indigo-50/40 rounded-2xl p-4 border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider block">
                                  Beri Nilai Koreksi Guru:
                                </span>
                                <span className="text-[11px] text-purple-700">
                                  {currentEval ? (
                                    <span>
                                      Terpilih:{' '}
                                      <strong className={
                                        currentEval === 'CORRECT' ? 'text-emerald-700' :
                                        currentEval === 'HALF' ? 'text-amber-700' : 'text-rose-700'
                                      }>
                                        {currentEval === 'CORRECT' ? `Benar Penuh (+${ptsFull} pts)` :
                                         currentEval === 'HALF' ? `Setengah (+${ptsHalf} pts)` : 'Salah (0 pts)'}
                                      </strong>
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 font-medium">
                                      Pilih salah satu evaluasi jawaban di bawah
                                    </span>
                                  )}
                                </span>
                              </div>

                              {/* Hanya 3 Opsi: Salah, Setengah, Benar Penuh (Tanpa input box di bawahnya) */}
                              <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                                <button
                                  type="button"
                                  onClick={() => handleSetGrade(item.question_id, item.max_points, 'WRONG')}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                    currentEval === 'WRONG'
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                                  }`}
                                >
                                  <XCircle className="w-4 h-4 shrink-0" />
                                  <span>Salah ({ptsWrong})</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetGrade(item.question_id, item.max_points, 'HALF')}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                    currentEval === 'HALF'
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-200'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                  }`}
                                >
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span>Setengah ({ptsHalf})</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetGrade(item.question_id, item.max_points, 'CORRECT')}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                    currentEval === 'CORRECT'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                  }`}
                                >
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  <span>Benar ({ptsFull})</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* MULTIPLE CHOICE QUESTION REVIEW SECTION */
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="font-semibold text-slate-500">Kunci Jawaban:</span>
                            <span className="px-2.5 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                              Opsi {item.correct_answer}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="font-semibold text-slate-500">Jawaban Siswa:</span>
                            <span className={`px-2.5 py-0.5 rounded-md font-bold font-mono ${
                              item.is_correct
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {item.student_answer ? `Opsi ${item.student_answer}` : 'Tidak Menjawab'}
                            </span>
                          </div>

                          <div>
                            {item.is_correct ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Benar (+{item.max_points} Poin)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Salah (0 Poin)</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Total Nilai: <strong className="text-purple-900 font-mono text-sm">{scoreCalculations.finalScore}</strong> / 100
            <span className="ml-1 text-slate-400">
              (Otomatis tersimpan ke nilai akhir siswa)
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handleSaveGrades(false)}
              disabled={isSaving || isLoading}
              className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan</span>
                </>
              )}
            </button>
            {hasNext && (
              <button
                type="button"
                onClick={() => handleSaveGrades(true)}
                disabled={isSaving || isLoading}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>Simpan & Lanjut</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentExamReviewModal;
