import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Calendar, 
  Clock, 
  BookOpen, 
  School, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  subject_id: number;
  subject?: SubjectItem;
  start_time: string;
  end_time: string;
  duration: number;
  total_points: number;
  status: string;
  classes?: ClassItem[];
  questions?: QuestionItem[];
  CreatedAt: string;
}

const Exams = () => {
  const { token } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(90);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [classFilterLevel, setClassFilterLevel] = useState('ALL');
  const [autoIncludeAllQuestions, setAutoIncludeAllQuestions] = useState(true);
  const [selectedQuestionIds] = useState<number[]>([]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [examsRes, subjectsRes, classesRes, questionsRes] = await Promise.all([
        axios.get('http://localhost:8080/api/v1/admin/exams', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8080/api/v1/admin/subjects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8080/api/v1/admin/classes', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8080/api/v1/admin/questions', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setExams(examsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setClasses(classesRes.data || []);
      setQuestions(questionsRes.data || []);

      if (subjectsRes.data?.length > 0 && subjectId === '') {
        setSubjectId(subjectsRes.data[0].ID);
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

  // Select all classes matching current filter
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

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!subjectId) {
      setError('Silakan pilih mata pelajaran');
      setIsLoading(false);
      return;
    }

    if (selectedClassIds.length === 0) {
      setError('Silakan pilih minimal satu kelas/rombel yang akan mengikuti ujian');
      setIsLoading(false);
      return;
    }

    try {
      const questionIdsToSend = autoIncludeAllQuestions 
        ? availableQuestions.map(q => q.ID)
        : selectedQuestionIds;

      await axios.post('http://localhost:8080/api/v1/admin/exams', {
        title,
        subject_id: Number(subjectId),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration: Number(duration),
        status: 'SCHEDULED',
        class_ids: selectedClassIds,
        question_ids: questionIdsToSend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsModalOpen(false);
      fetchData();
      setTitle('');
      setSelectedClassIds([]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal membuat jadwal ujian');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExam = async (id: number, examTitle: string) => {
    if (!window.confirm(`Yakin ingin menghapus jadwal ujian "${examTitle}"?`)) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/exams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(exams.filter(e => e.ID !== id));
    } catch (err) {
      alert('Gagal menghapus jadwal ujian');
    }
  };

  const filteredExams = exams.filter(e => 
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Jadwal Ujian SMK</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100">
              CBT Manager
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Atur pelaksanaan ujian, alokasi waktu, serta distribusi soal ke kelas, jurusan, dan rombel SMK.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Jadwalkan Ujian Baru</span>
        </button>
      </header>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari judul ujian atau mata pelajaran..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="text-sm font-medium text-slate-500">
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
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isJurusan 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {exam.subject?.name || 'Mata Pelajaran'} ({isJurusan ? 'Kejuruan' : 'Akademik'})
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-md">
                        {exam.status}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteExam(exam.ID, exam.title)}
                      className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Hapus Jadwal"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-800 mb-2 leading-snug">
                    {exam.title}
                  </h3>

                  {/* Timing Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
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
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {exam.classes && exam.classes.length > 0 ? (
                        exam.classes.map(c => (
                          <span 
                            key={c.ID} 
                            className="bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold px-2 py-0.5 rounded-lg"
                          >
                            {c.name || `${c.level} ${c.department} ${c.number}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada kelas dipilih</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: Question count & Points */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center">
                    <BookOpen size={14} className="mr-1 text-slate-400" />
                    <strong>{exam.questions?.length || 0}</strong> Soal Ujian
                  </span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Total: {exam.total_points || 100} Poin
                  </span>
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

              {/* Pilih Mata Pelajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Pilih Mata Pelajaran
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white font-medium"
                  required
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map(s => (
                    <option key={s.ID} value={s.ID}>
                      {s.name} ({s.type === 'JURUSAN' ? 'Mapel Kejuruan SMK' : 'Mapel Umum/Akademik'})
                    </option>
                  ))}
                </select>
                {subjectId && (
                  <p className="text-xs text-primary-600 mt-1 font-medium">
                    ✓ Ditemukan {availableQuestions.length} soal di bank soal mata pelajaran ini.
                  </p>
                )}
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
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        classFilterLevel === lvl
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
                            className={`cursor-pointer p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all select-none ${
                              isSelected
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

              {/* OPSI SOAL */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                  <BookOpen size={16} className="mr-1.5 text-primary-600" />
                  Konfigurasi Soal Ujian
                </h4>

                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoIncludeAllQuestions}
                    onChange={(e) => setAutoIncludeAllQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    Otomatis sertakan semua ({availableQuestions.length}) soal dari mata pelajaran ini
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
    </div>
  );
};

export default Exams;
