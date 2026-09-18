import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Plus, BookOpen, AlertCircle, Edit2, Trash2, Search, 
  ChevronLeft, ChevronRight, Layers, School, 
  Calendar, Clock, Check, Filter, 
  Sparkles, X, ArrowRight, ExternalLink, CheckCircle2, ChevronDown
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';

interface ClassItem {
  ID: number;
  level: string;
  department: string;
  number: string;
  name: string;
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
  classes?: ClassItem[];
  questions?: any[];
}

interface SubjectCategory {
  ID: number;
  name: string;
  code?: string;
  type: string;
  class?: string;
  questions?: any[];
  exams?: ExamItem[];
  CreatedAt: string;
}

interface ExamCategoryItem {
  ID: number;
  name: string;
}

const Subjects: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [categories, setCategories] = useState<SubjectCategory[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [examCategories, setExamCategories] = useState<ExamCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Clean table view allows more items per page

  // Modals State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State: Master Category (Admin only)
  const [isEditCategory, setIsEditCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'AKADEMIK' | 'JURUSAN'>('AKADEMIK');
  const [catClass, setCatClass] = useState('Semua Kelas');

  // Form State: Buat Ujian Baru dari Mapel Ini
  const [targetSubject, setTargetSubject] = useState<SubjectCategory | null>(null);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamTahun, setNewExamTahun] = useState('2026/2027');
  const [newExamSemester, setNewExamSemester] = useState('Ganjil');
  const [newExamCategoryId, setNewExamCategoryId] = useState<number | ''>('');
  const [newExamSelectedClasses, setNewExamSelectedClasses] = useState<number[]>([]);
  const [classFilterLevel, setClassFilterLevel] = useState('ALL');

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, classRes, examCatRes] = await Promise.allSettled([
        axios.get('http://localhost:8080/api/v1/admin/subjects/categories', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8080/api/v1/admin/classes', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8080/api/v1/admin/categories', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (catRes.status === 'fulfilled') {
        setCategories(catRes.value.data || []);
      }
      if (classRes.status === 'fulfilled') {
        setClassesList(classRes.value.data || []);
      }
      if (examCatRes.status === 'fulfilled') {
        const catList = examCatRes.value.data || [];
        setExamCategories(catList);
        if (catList.length > 0) {
          setNewExamCategoryId(catList[0].ID);
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
  }, []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        cat.name.toLowerCase().includes(q) ||
        (cat.code && cat.code.toLowerCase().includes(q)) ||
        (cat.exams && cat.exams.some(ex => 
          ex.title.toLowerCase().includes(q) ||
          (ex.classes && ex.classes.some(c => c.name.toLowerCase().includes(q)))
        ));
      const matchesType = filterType === 'ALL' || (cat.type || 'AKADEMIK') === filterType;
      return matchesSearch && matchesType;
    });
  }, [categories, searchQuery, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));
  const paginatedCategories = useMemo(() => {
    return filteredCategories.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredCategories, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCategories = categories.length;
    const totalExams = categories.reduce((acc, cat) => acc + (cat.exams?.length || 0), 0);
    const totalQuestions = categories.reduce((acc, cat) => acc + (cat.questions?.length || 0), 0);
    const kejuruanCount = categories.filter(c => c.type === 'JURUSAN').length;
    const akademikCount = totalCategories - kejuruanCount;
    return { totalCategories, totalExams, totalQuestions, kejuruanCount, akademikCount };
  }, [categories]);

  // Open Create Exam Modal for a specific subject
  const handleOpenCreateExamModal = (cat: SubjectCategory) => {
    setTargetSubject(cat);
    setNewExamTitle('');
    setNewExamTahun('2026/2027');
    setNewExamSemester('Ganjil');
    setNewExamSelectedClasses([]);
    setClassFilterLevel('ALL');
    setFormError('');
    if (examCategories.length > 0 && newExamCategoryId === '') {
      setNewExamCategoryId(examCategories[0].ID);
    }
    setIsCreateExamModalOpen(true);
  };

  // Submit Create Exam
  const handleSaveExam = async (goToQuestions = true) => {
    if (!targetSubject) return;
    if (!newExamTitle.trim()) {
      setFormError('Judul ujian wajib diisi');
      return;
    }
    if (newExamSelectedClasses.length === 0) {
      setFormError('Pilih minimal satu kelas sasaran ujian');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        title: newExamTitle.trim(),
        subject_id: targetSubject.ID,
        category_id: newExamCategoryId ? Number(newExamCategoryId) : undefined,
        tahun: newExamTahun,
        semester: newExamSemester,
        class_ids: newExamSelectedClasses,
        status: 'DRAFT',
        duration: 90
      };

      const res = await axios.post('http://localhost:8080/api/v1/admin/exams', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast('Ujian baru berhasil dibuat!');
      setIsCreateExamModalOpen(false);
      await fetchData();

      const createdExam = res.data;
      if (goToQuestions && createdExam?.ID) {
        // Alur otomatis: langsung bawa guru ke halaman input soal untuk ujian ini!
        navigate(`/dashboard/questions?subject=${targetSubject.ID}&exam_id=${createdExam.ID}`);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Gagal membuat ujian baru');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle class selection in exam modal
  const handleToggleExamClass = (classId: number) => {
    if (newExamSelectedClasses.includes(classId)) {
      setNewExamSelectedClasses(newExamSelectedClasses.filter(id => id !== classId));
    } else {
      setNewExamSelectedClasses([...newExamSelectedClasses, classId]);
    }
  };

  const handleSelectAllFilteredClasses = () => {
    const matching = classesList.filter(c => classFilterLevel === 'ALL' || c.level === classFilterLevel);
    const matchingIds = matching.map(c => c.ID);
    const allSelected = matchingIds.every(id => newExamSelectedClasses.includes(id));

    if (allSelected) {
      setNewExamSelectedClasses(newExamSelectedClasses.filter(id => !matchingIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...newExamSelectedClasses, ...matchingIds]));
      setNewExamSelectedClasses(merged);
    }
  };

  // Open Create Master Category Modal (Admin)
  const handleOpenCreateCategory = () => {
    setIsEditCategory(false);
    setEditingCategoryId(null);
    setCatName('');
    setCatType('AKADEMIK');
    setCatClass('Semua Kelas');
    setFormError('');
    setIsCategoryModalOpen(true);
  };

  // Open Edit Master Category Modal (Admin)
  const handleOpenEditCategory = (cat: SubjectCategory) => {
    setIsEditCategory(true);
    setEditingCategoryId(cat.ID);
    setCatName(cat.name);
    setCatType((cat.type as 'AKADEMIK' | 'JURUSAN') || 'AKADEMIK');
    setCatClass(cat.class || 'Semua Kelas');
    setFormError('');
    setIsCategoryModalOpen(true);
  };

  // Save Master Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      if (isEditCategory && editingCategoryId) {
        await axios.put(`http://localhost:8080/api/v1/admin/subjects/${editingCategoryId}`, {
          name: catName,
          type: catType,
          class: catClass
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Mata pelajaran berhasil diperbarui');
      } else {
        await axios.post('http://localhost:8080/api/v1/admin/subjects', {
          name: catName,
          type: catType,
          class: catClass
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Mata pelajaran berhasil ditambahkan');
      }

      setIsCategoryModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Gagal menyimpan mata pelajaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Master Category
  const handleDeleteCategory = async (cat: SubjectCategory) => {
    if (cat.exams && cat.exams.length > 0) {
      showErrorToast('Mata pelajaran ini tidak dapat dihapus karena masih memiliki jadwal ujian aktif.');
      return;
    }

    if (!(await confirmAction('Hapus Mata Pelajaran', `Yakin ingin menghapus mata pelajaran "${cat.name}"?`))) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/subjects/${cat.ID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast('Mata pelajaran berhasil dihapus');
      await fetchData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Gagal menghapus mata pelajaran');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Mata Pelajaran (Kategori)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Pilih mata pelajaran untuk membuat ujian baru, mengelola soal ujian, atau menjadwalkan pelaksanaan.
          </p>
        </div>

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={handleOpenCreateCategory}
            className="btn-primary flex items-center justify-center space-x-2 shrink-0 self-start sm:self-auto"
          >
            <Plus size={18} />
            <span>Tambah Mapel Master</span>
          </button>
        )}
      </div>

      {/* Workflow Step Guide Bar */}
      <div className="bg-gradient-to-r from-primary-50 via-white to-emerald-50 border border-primary-200/70 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-primary-800 uppercase tracking-wider">
            <Sparkles size={16} className="text-primary-600" />
            <span>Alur Praktis Ujian:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
            <div className="flex items-center space-x-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Pilih Mapel</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500">2</span>
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

      {/* Clean Minimalist Stat Strip (No bulky cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Mapel</span>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-xl font-bold text-slate-800">{stats.totalCategories}</span>
            <span className="text-xs text-slate-400">kategori</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Kejuruan SMK</span>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-xl font-bold text-amber-600">{stats.kejuruanCount}</span>
            <span className="text-xs text-slate-400">mapel produktif</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider block">Akademik Umum</span>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-xl font-bold text-primary-600">{stats.akademikCount}</span>
            <span className="text-xs text-slate-400">mapel umum</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Total Ujian Dibuat</span>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-xl font-bold text-emerald-600">{stats.totalExams}</span>
            <span className="text-xs text-slate-400">pelaksanaan</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama mata pelajaran..."
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

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
            Tipe:
          </span>
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'AKADEMIK', label: 'Akademik Umum' },
            { key: 'JURUSAN', label: 'Kejuruan SMK' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === tab.key 
                  ? 'bg-primary-600 text-white shadow-2xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium">Memuat data mata pelajaran...</p>
          </div>
        ) : paginatedCategories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Mata Pelajaran Tidak Ditemukan</h3>
            <p className="text-sm text-slate-400 mt-1">
              {searchQuery ? 'Tidak ada mata pelajaran yang cocok dengan kata kunci pencarian.' : 'Belum ada mata pelajaran terdaftar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4 w-40">Kelompok / Tipe</th>
                  <th className="py-3 px-4">Ujian Terdaftar</th>
                  <th className="py-3 px-4 w-44 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedCategories.map((cat, idx) => {
                  const isJurusan = cat.type === 'JURUSAN';
                  const examsCount = cat.exams?.length || 0;
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr key={cat.ID} className="hover:bg-slate-50/80 transition-colors group">
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        {rowNumber}
                      </td>

                      {/* Nama Mata Pelajaran */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/dashboard/subjects/${cat.ID}`}
                          className="flex items-center space-x-3 group/link"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isJurusan ? 'bg-amber-100/80 text-amber-700' : 'bg-primary-100/80 text-primary-700'
                          }`}>
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover/link:text-primary-600 transition-colors block leading-tight">
                              {cat.name}
                            </span>
                            {cat.code && (
                              <span className="text-[11px] font-mono text-slate-400">
                                Kode: {cat.code}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Kelompok */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isJurusan 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-primary-50 text-primary-700 border-primary-200'
                        }`}>
                          <Layers size={11} className="mr-1" />
                          {isJurusan ? 'Kejuruan SMK' : 'Akademik Umum'}
                        </span>
                      </td>

                      {/* Ujian Terdaftar */}
                      <td className="py-3.5 px-4">
                        {examsCount === 0 ? (
                          <Link 
                            to={`/dashboard/subjects/${cat.ID}`}
                            className="text-xs text-slate-400 hover:text-primary-600 italic transition-colors"
                          >
                            Belum ada ujian dibuat (Klik untuk buka)
                          </Link>
                        ) : (
                          <Link 
                            to={`/dashboard/subjects/${cat.ID}`}
                            className="flex items-center space-x-2 group/ex"
                          >
                            <span className="font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0 group-hover/ex:bg-emerald-200 transition-colors">
                              {examsCount} Ujian
                            </span>
                            <div className="text-xs text-slate-600 truncate max-w-xs group-hover/ex:text-primary-600 transition-colors">
                              {cat.exams?.[0]?.title}
                              {examsCount > 1 && (
                                <span className="ml-1 text-primary-600 font-semibold">
                                  +{examsCount - 1} lainnya
                                </span>
                              )}
                            </div>
                          </Link>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Tombol Lihat Ujian */}
                          <Link
                            to={`/dashboard/subjects/${cat.ID}`}
                            className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all shadow-2xs"
                            title="Lihat Daftar Ujian Mapel Ini"
                          >
                            <Calendar size={13} className="text-primary-600" />
                            <span>Lihat Ujian</span>
                            <ChevronRight size={13} className="text-primary-500" />
                          </Link>

                          {/* Action Edit / Hapus jika ADMIN */}
                          {currentUser?.role === 'ADMIN' && (
                            <div className="flex items-center pl-1 border-l border-slate-200 space-x-1">
                              <button
                                onClick={() => handleOpenEditCategory(cat)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Mapel"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Mapel"
                              >
                                <Trash2 size={13} />
                              </button>
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

        {/* Table Pagination */}
        {!isLoading && filteredCategories.length > 0 && (
          <div className="py-3 px-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-700">{paginatedCategories.length}</span> dari <span className="font-bold text-slate-700">{filteredCategories.length}</span> mata pelajaran
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: BUAT UJIAN BARU (LANGKAH 2 DALAM ALUR)            */}
      {/* ========================================================= */}
      {isCreateExamModalOpen && targetSubject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center">
                  <Plus size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Buat Ujian Baru</h3>
                  <p className="text-xs text-slate-500">
                    Mata Pelajaran: <span className="font-bold text-primary-700">{targetSubject.name}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateExamModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-4 flex items-center space-x-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Judul Ujian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Judul Ujian <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ulangan Harian 1, PTS Ganjil, PAS Genap..."
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Kategori Ujian, Tahun Ajaran & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={newExamCategoryId}
                    onChange={(e) => setNewExamCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {examCategories.map((c) => (
                      <option key={c.ID} value={c.ID}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={newExamTahun}
                    onChange={(e) => setNewExamTahun(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Semester
                  </label>
                  <select
                    value={newExamSemester}
                    onChange={(e) => setNewExamSemester(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              {/* Kelas Sasaran Ujian */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Kelas Peserta <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-slate-400">Filter Tingkat:</span>
                    {['ALL', 'X', 'XI', 'XII'].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setClassFilterLevel(lvl)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          classFilterLevel === lvl ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredClasses}
                      className="ml-2 text-primary-600 font-bold hover:underline"
                    >
                      Pilih Semua
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classesList
                    .filter(c => classFilterLevel === 'ALL' || c.level === classFilterLevel)
                    .map(cls => {
                      const isSelected = newExamSelectedClasses.includes(cls.ID);
                      return (
                        <button
                          key={cls.ID}
                          type="button"
                          onClick={() => handleToggleExamClass(cls.ID)}
                          className={`p-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                            isSelected 
                              ? 'bg-primary-50 text-primary-800 border-primary-300 shadow-2xs font-bold' 
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80'
                          }`}
                        >
                          <span className="truncate">{cls.name}</span>
                          {isSelected && <Check size={14} className="text-primary-600 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Terpilih: <span className="font-bold text-primary-700">{newExamSelectedClasses.length} kelas</span>. Siswa di kelas ini yang akan dapat mengakses ujian.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateExamModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Batal
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveExam(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  Simpan Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveExam(true)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-primary-500/20 disabled:opacity-50"
                >
                  <span>Simpan & Masukkan Soal</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TAMBAH/EDIT MATA PELAJARAN MASTER (ADMIN)          */}
      {/* ========================================================= */}

      {/* ========================================================= */}
      {/* MODAL 3: TAMBAH/EDIT MATA PELAJARAN MASTER (ADMIN)          */}
      {/* ========================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {isEditCategory ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
                  </h3>
                  <p className="text-xs text-slate-500">Mata pelajaran induk/kategori</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-4 flex items-center space-x-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Mata Pelajaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Administrasi Sistem Jaringan, Bahasa Indonesia..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kelompok / Tipe
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatType('AKADEMIK')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      catType === 'AKADEMIK'
                        ? 'bg-primary-50 text-primary-800 border-primary-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Akademik Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('JURUSAN')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      catType === 'JURUSAN'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Kejuruan SMK
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-2.5 px-5 text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;
