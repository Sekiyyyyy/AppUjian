import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, BookOpen, Plus, Calendar, Clock, 
  AlertCircle, Edit2, Trash2, Search, X, 
  Layers, Shield, FileText, Lock, Sparkles,
  ChevronRight, CheckCircle2, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast, showWarningToast } from '../utils/alert';

interface ClassItem {
  ID: number;
  level: string;
  department: string;
  number: string;
  name: string;
}

interface QuestionItem {
  id: number;
  content: string;
  points: number;
}

interface TeacherUser {
  id: number;
  name: string;
  username: string;
}

interface ExamItem {
  ID: number;
  title: string;
  start_time: string;
  end_time: string;
  duration: number;
  total_points: number;
  status: string;
  is_makeup_open: boolean;
  tahun?: string;
  semester?: string;
  teacher_id?: number;
  teacher?: TeacherUser;
  classes?: ClassItem[];
  questions?: QuestionItem[];
  category?: { ID: number; name: string };
}

interface SubjectCategory {
  ID: number;
  name: string;
  code?: string;
  type: string;
  class?: string;
  questions?: any[];
  exams?: ExamItem[];
}

interface ExamCategoryItem {
  ID: number;
  name: string;
}

const SubjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user: currentUser } = useAuth();

  const [subject, setSubject] = useState<SubjectCategory | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [examCategories, setExamCategories] = useState<ExamCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTahun, setNewTahun] = useState('2026/2027');
  const [newSemester, setNewSemester] = useState('Ganjil');
  const [newCategoryId, setNewCategoryId] = useState<number | ''>('');
  const [newSelectedClasses, setNewSelectedClasses] = useState<number[]>([]);
  const [classFilterLevel, setClassFilterLevel] = useState('ALL');

  // Edit Form State
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTahun, setEditTahun] = useState('2026/2027');
  const [editSemester, setEditSemester] = useState('Ganjil');
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [editDuration, setEditDuration] = useState(60);
  const [editSelectedClasses, setEditSelectedClasses] = useState<number[]>([]);

  // Fetch subject and exams data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subjectRes, examsRes, classesRes, examCatRes] = await Promise.allSettled([
        axios.get('http://localhost:8080/api/v1/admin/subjects/categories', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:8080/api/v1/admin/exams?subject_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8080/api/v1/admin/classes', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8080/api/v1/admin/categories', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (subjectRes.status === 'fulfilled') {
        const found = (subjectRes.value.data || []).find((s: SubjectCategory) => s.ID === Number(id));
        setSubject(found || null);
      }
      if (examsRes.status === 'fulfilled') {
        setExams(examsRes.value.data || []);
      }
      if (classesRes.status === 'fulfilled') {
        setClassesList(classesRes.value.data || []);
      }
      if (examCatRes.status === 'fulfilled') {
        const cats = examCatRes.value.data || [];
        setExamCategories(cats);
        if (cats.length > 0 && newCategoryId === '') {
          setNewCategoryId(cats[0].ID);
        }
      }
    } catch (err) {
      console.error(err);
      showErrorToast('Gagal memuat data mata pelajaran');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(ex => {
      const q = searchQuery.toLowerCase();
      const matchesTitle = ex.title.toLowerCase().includes(q);
      const matchesTeacher = ex.teacher?.name?.toLowerCase().includes(q) || false;
      const matchesClasses = ex.classes?.some(c => c.name.toLowerCase().includes(q)) || false;
      return matchesTitle || matchesTeacher || matchesClasses;
    });
  }, [exams, searchQuery]);

  // Check if current user can edit/delete this exam
  const canModifyExam = (exam: ExamItem) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    return exam.teacher_id === currentUser.id;
  };

  // Open Create Exam Modal
  const handleOpenCreateModal = () => {
    setNewTitle('');
    setNewTahun('2026/2027');
    setNewSemester('Ganjil');
    setNewSelectedClasses([]);
    setClassFilterLevel('ALL');
    setFormError('');
    if (examCategories.length > 0 && newCategoryId === '') {
      setNewCategoryId(examCategories[0].ID);
    }
    setIsCreateModalOpen(true);
  };

  // Open Edit Exam Modal
  const handleOpenEditModal = (exam: ExamItem) => {
    if (!canModifyExam(exam)) {
      showWarningToast('Anda tidak memiliki izin mengedit ujian yang dibuat guru lain.');
      return;
    }
    setEditingExamId(exam.ID);
    setEditTitle(exam.title);
    setEditTahun(exam.tahun || '2026/2027');
    setEditSemester(exam.semester || 'Ganjil');
    setEditCategoryId(exam.category?.ID || (examCategories[0]?.ID ?? ''));
    setEditDuration(exam.duration || 60);
    setEditSelectedClasses(exam.classes?.map(c => c.ID) || []);
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Submit Create Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Judul ujian wajib diisi');
      return;
    }
    if (newSelectedClasses.length === 0) {
      setFormError('Pilih minimal satu kelas peserta');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = {
        title: newTitle.trim(),
        subject_id: Number(id),
        category_id: newCategoryId ? Number(newCategoryId) : null,
        tahun: newTahun,
        semester: newSemester,
        duration: 60,
        status: 'SCHEDULED',
        class_ids: newSelectedClasses
      };

      const res = await axios.post('http://localhost:8080/api/v1/admin/exams', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast('Ujian baru berhasil dibuat!');
      setIsCreateModalOpen(false);
      await fetchData();

      // Offer immediate redirect to question management
      const createdId = res.data?.ID;
      if (createdId) {
        navigate(`/dashboard/questions?subject=${id}&exam_id=${createdId}`);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Gagal membuat ujian baru');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Exam
  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamId) return;
    if (!editTitle.trim()) {
      setFormError('Judul ujian wajib diisi');
      return;
    }
    if (editSelectedClasses.length === 0) {
      setFormError('Pilih minimal satu kelas peserta');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const payload = {
        title: editTitle.trim(),
        subject_id: Number(id),
        category_id: editCategoryId ? Number(editCategoryId) : null,
        tahun: editTahun,
        semester: editSemester,
        duration: Number(editDuration) || 60,
        class_ids: editSelectedClasses
      };

      await axios.put(`http://localhost:8080/api/v1/admin/exams/${editingExamId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast('Ujian berhasil diperbarui');
      setIsEditModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Gagal memperbarui ujian');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Exam
  const handleDeleteExam = async (exam: ExamItem) => {
    if (!canModifyExam(exam)) {
      showWarningToast('Hanya guru pembuat ujian yang berhak menghapus ujian ini.');
      return;
    }

    if (!(await confirmAction('Hapus Ujian', `Yakin ingin menghapus ujian "${exam.title}"? Semua soal dan sesi terkait akan dihapus.`))) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/exams/${exam.ID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast('Ujian berhasil dihapus');
      await fetchData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Gagal menghapus ujian');
    }
  };

  // Class toggle helpers
  const toggleSelectClass = (clsId: number, currentList: number[], setList: (arr: number[]) => void) => {
    if (currentList.includes(clsId)) {
      setList(currentList.filter(i => i !== clsId));
    } else {
      setList([...currentList, clsId]);
    }
  };

  const selectAllClasses = (level: string, setList: (arr: number[]) => void) => {
    const target = classesList.filter(c => level === 'ALL' || c.level === level);
    const targetIds = target.map(c => c.ID);
    setList(Array.from(new Set([...targetIds])));
  };

  const deselectAllClasses = (setList: (arr: number[]) => void) => {
    setList([]);
  };

  const isJurusan = subject?.type === 'JURUSAN';

  return (
    <div className="space-y-5">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard/subjects')}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-2xs"
            title="Kembali ke Daftar Mata Pelajaran"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-0.5">
              <Link to="/dashboard/subjects" className="hover:text-primary-600 transition-colors">
                Mata Pelajaran
              </Link>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="font-semibold text-slate-700">{subject?.name || 'Detail Mapel'}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{subject?.name || 'Mata Pelajaran'}</span>
              {subject?.code && (
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {subject.code}
                </span>
              )}
            </h1>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-primary flex items-center justify-center space-x-2 shrink-0 self-start sm:self-auto shadow-xs"
        >
          <Plus size={18} />
          <span>+ Buat Ujian Baru</span>
        </button>
      </div>

      {/* Subject Info Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isJurusan ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
            }`}>
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isJurusan 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-primary-50 text-primary-700 border-primary-200'
                }`}>
                  <Layers size={11} className="mr-1" />
                  {isJurusan ? 'Kejuruan SMK' : 'Akademik Umum'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {exams.length} Ujian Terdaftar
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Daftar pelaksanaan ujian untuk mata pelajaran ini. Anda dapat menambahkan soal atau mengelola ujian yang Anda buat.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-stretch md:self-auto justify-end">
            <Link
              to={`/dashboard/questions?subject=${id}`}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <FileText size={14} />
              <span>Buka Bank Soal Mapel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Step Indicator Bar */}
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
            <div className="flex items-center space-x-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Buat Ujian</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500">3</span>
              <span>Masukkan Soal</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500">4</span>
              <span>Atur Jadwal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari judul ujian atau guru pembuat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Ditemukan <span className="text-slate-800 font-bold">{filteredExams.length}</span> ujian
        </div>
      </div>

      {/* Main Exams Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium">Memuat daftar ujian...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Calendar size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Belum Ada Ujian Terdaftar</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-5">
              {searchQuery 
                ? 'Tidak ada ujian yang cocok dengan kata kunci pencarian.' 
                : 'Mata pelajaran ini belum memiliki jadwal ujian. Buat ujian baru untuk mulai memasukkan soal dan menentukan kelas peserta.'}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="btn-primary inline-flex items-center space-x-2 text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs"
            >
              <Plus size={16} />
              <span>Buat Ujian Baru Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Judul Ujian</th>
                  <th className="py-3.5 px-4">Pembuat Ujian</th>
                  <th className="py-3.5 px-4">Kelas Peserta</th>
                  <th className="py-3.5 px-4 text-center">Soal</th>
                  <th className="py-3.5 px-4">Waktu / Durasi</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExams.map((exam, idx) => {
                  const isCreator = exam.teacher_id === currentUser?.id;
                  const canEdit = canModifyExam(exam);
                  const questionsCount = exam.questions?.length || 0;

                  return (
                    <tr key={exam.ID} className="hover:bg-slate-50/80 transition-colors group">
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Judul Ujian */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                              {exam.title}
                            </span>
                            {exam.category?.name && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                                {exam.category.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                            <span>Tahun: {exam.tahun || '2026/2027'}</span>
                            <span>•</span>
                            <span>Semester: {exam.semester || 'Ganjil'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Pembuat Ujian */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {exam.teacher?.name ? exam.teacher.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block leading-tight">
                              {exam.teacher?.name || 'Admin / Panitia'}
                            </span>
                            {isCreator ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600">
                                <UserCheck size={11} className="mr-0.5" /> Ujian Anda
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                @{exam.teacher?.username || 'admin'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kelas Peserta */}
                      <td className="py-3.5 px-4">
                        {exam.classes && exam.classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {exam.classes.slice(0, 3).map(c => (
                              <span 
                                key={c.ID}
                                className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {c.name}
                              </span>
                            ))}
                            {exam.classes.length > 3 && (
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                +{exam.classes.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Semua kelas</span>
                        )}
                      </td>

                      {/* Total Soal */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          questionsCount > 0 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {questionsCount} butir
                        </span>
                      </td>

                      {/* Waktu & Durasi */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-600 flex items-center space-x-1 font-medium">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>{exam.duration || 60} Menit</span>
                        </div>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          exam.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {exam.status || 'SCHEDULED'}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Tombol Kelola Soal: Terbuka untuk semua guru */}
                          <Link
                            to={`/dashboard/questions?subject=${id}&exam_id=${exam.ID}`}
                            className="px-2.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-2xs transition-all"
                            title="Kelola butir soal untuk ujian ini"
                          >
                            <FileText size={13} />
                            <span>Soal</span>
                          </Link>

                          {/* Tombol Edit & Hapus: Hanya jika admin atau pembuat ujian */}
                          {canEdit ? (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(exam)}
                                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Edit Ujian"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteExam(exam)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Ujian"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <div 
                              className="px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-not-allowed"
                              title={`Ujian dibuat oleh ${exam.teacher?.name || 'guru lain'}. Anda tidak dapat mengedit atau menghapus.`}
                            >
                              <Lock size={12} />
                              <span>Hanya Baca</span>
                            </div>
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

      {/* Modal: Buat Ujian Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Buat Ujian Baru</h3>
                  <p className="text-xs text-slate-400">Mapel: {subject?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-5 overflow-y-auto space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center space-x-2 border border-red-200">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Judul Ujian *
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Contoh: Penilaian Harian ${subject?.name || ''}`}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenis / Kategori
                  </label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {examCategories.map(cat => (
                      <option key={cat.ID} value={cat.ID}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={newTahun}
                    onChange={(e) => setNewTahun(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Semester
                  </label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Kelas Peserta *
                  </label>
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={() => selectAllClasses(classFilterLevel, setNewSelectedClasses)}
                      className="text-primary-600 hover:underline font-semibold"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => deselectAllClasses(setNewSelectedClasses)}
                      className="text-slate-500 hover:underline"
                    >
                      Batal Pilih
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/50">
                  {classesList.map(c => {
                    const isSelected = newSelectedClasses.includes(c.ID);
                    return (
                      <button
                        key={c.ID}
                        type="button"
                        onClick={() => toggleSelectClass(c.ID, newSelectedClasses, setNewSelectedClasses)}
                        className={`p-2 rounded-lg text-xs font-semibold text-left border transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-primary-50 border-primary-300 text-primary-800' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isSelected && <CheckCircle2 size={14} className="text-primary-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-1.5"
                >
                  <Plus size={16} />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Masukkan Soal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Ujian */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Jadwal Ujian</h3>
                  <p className="text-xs text-slate-400">Mapel: {subject?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateExam} className="p-5 overflow-y-auto space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center space-x-2 border border-red-200">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Judul Ujian *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenis Ujian
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {examCategories.map(cat => (
                      <option key={cat.ID} value={cat.ID}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={editTahun}
                    onChange={(e) => setEditTahun(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Kelas Peserta *
                  </label>
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={() => selectAllClasses('ALL', setEditSelectedClasses)}
                      className="text-primary-600 hover:underline font-semibold"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => deselectAllClasses(setEditSelectedClasses)}
                      className="text-slate-500 hover:underline"
                    >
                      Batal Pilih
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/50">
                  {classesList.map(c => {
                    const isSelected = editSelectedClasses.includes(c.ID);
                    return (
                      <button
                        key={c.ID}
                        type="button"
                        onClick={() => toggleSelectClass(c.ID, editSelectedClasses, setEditSelectedClasses)}
                        className={`p-2 rounded-lg text-xs font-semibold text-left border transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-primary-50 border-primary-300 text-primary-800' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isSelected && <CheckCircle2 size={14} className="text-primary-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center space-x-1.5"
                >
                  <Edit2 size={16} />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetails;
