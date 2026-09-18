import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  BookmarkCheck, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  BookOpen, 
  School, 
  ChevronRight, 
  Search, 
  ExternalLink,
  Layers,
  CheckCircle2,
  FileQuestion
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';
import ClassBadgesList from '../components/ClassBadgesList';

interface Category {
  ID: number;
  name: string;
}

interface SubjectItem {
  ID: number;
  name: string;
  type: string;
}

interface ClassItem {
  ID: number;
  name: string;
}

interface QuestionItem {
  ID: number;
}

interface ExamItem {
  ID: number;
  title: string;
  category_id?: number;
  category?: Category;
  subject_id: number;
  subject?: SubjectItem;
  classes?: ClassItem[];
  questions?: QuestionItem[];
  start_time: string;
  end_time: string;
  duration: number;
  total_points: number;
  status: string;
  tahun?: string;
  semester?: string;
}

const Categories = () => {
  const navigate = useNavigate();
  const { token, user: currentUser } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');

  // Exam List Modal State
  const [isExamListModalOpen, setIsExamListModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const fetchData = async () => {
    try {
      const [catRes, examRes] = await Promise.all([
        axios.get('http://localhost:8080/api/v1/admin/categories', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:8080/api/v1/admin/exams', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCategories(catRes.data || []);
      setExams(examRes.data || []);
    } catch (err) {
      console.error('Error fetching categories/exams:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setName('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingId(cat.ID);
    setName(cat.name);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isEditMode && editingId) {
        await axios.put(`http://localhost:8080/api/v1/admin/categories/${editingId}`, {
          name,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Kategori berhasil diperbarui');
      } else {
        await axios.post('http://localhost:8080/api/v1/admin/categories', {
          name,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast('Kategori baru berhasil ditambahkan');
      }
      
      setIsModalOpen(false);
      fetchData();
      setName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan kategori');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await confirmAction(`Hapus Kategori`, `Yakin ingin menghapus kategori "${catName}"?`))) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(categories.filter(c => c.ID !== id));
      showSuccessToast('Kategori berhasil dihapus');
    } catch (err) {
      showErrorToast('Gagal menghapus kategori');
    }
  };

  const openCategoryExams = (cat: Category) => {
    setSelectedCategory(cat);
    setIsExamListModalOpen(true);
  };

  // Filter categories by search
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get exams for selected category
  const selectedCategoryExams = selectedCategory 
    ? exams.filter(e => e.category_id === selectedCategory.ID || e.category?.ID === selectedCategory.ID)
    : [];

  // Helper for status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Sedang Aktif</span>;
      case 'SCHEDULED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Terjadwal</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Selesai</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Draft</span>;
    }
  };

  // Only Admin can manage categories
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Akses Ditolak</h2>
        <p className="text-slate-500 mt-2">Hanya Admin yang dapat mengelola kategori semester.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Kategori Ujian</h1>
          <p className="text-slate-500 mt-1">
            Kelola periode semester ujian (Mid Sem 1, UTS, UAS, PAS, dll). Klik kategori untuk melihat daftar ujian.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center space-x-2 self-start sm:self-auto">
          <Plus size={20} />
          <span>Tambah Kategori</span>
        </button>
      </header>

      {/* Search & Info Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari kategori semester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
          />
        </div>

        <div className="text-xs sm:text-sm text-slate-500 font-medium self-end sm:self-auto">
          Total: <span className="font-bold text-slate-800">{filteredCategories.length}</span> kategori semester
        </div>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full glass-panel p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 text-slate-400">
              <BookmarkCheck size={28} />
            </div>
            <p className="font-semibold text-slate-700">Belum ada kategori semester</p>
            <p className="text-sm mt-1 text-slate-500">
              {searchQuery ? 'Tidak ada kategori yang cocok dengan pencarian.' : 'Klik "Tambah Kategori" untuk membuat periode semester pertama.'}
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const catExams = exams.filter(e => e.category_id === cat.ID || e.category?.ID === cat.ID);
            const examCount = catExams.length;

            return (
              <div 
                key={cat.ID} 
                onClick={() => openCategoryExams(cat)}
                className="glass-panel p-5 group hover:shadow-xl hover:border-primary-300 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden border-t-4 border-t-primary-500"
              >
                {/* Top Section */}
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <BookmarkCheck size={22} />
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => openEditModal(cat, e)} 
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit Kategori"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(cat.ID, cat.name, e)} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-primary-700 transition-colors">
                    {cat.name}
                  </h3>

                  <div className="mt-3">
                    {examCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Calendar size={12} className="mr-1.5 text-emerald-600" />
                        {examCount} Ujian Terjadwal
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        Belum ada ujian
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Section / Interactive Prompt */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-primary-600 group-hover:text-primary-700">
                  <span>Lihat Jadwal Ujian</span>
                  <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Detail Ujian per Kategori */}
      {isExamListModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsExamListModalOpen(false)}
          ></div>
          <div className="glass-panel w-full max-w-4xl bg-white shadow-2xl relative z-10 rounded-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/90 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                  <BookmarkCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Daftar Ujian: {selectedCategory.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daftar ujian yang terdaftar pada semester / periode ini.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsExamListModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Ujian</p>
                    <p className="text-lg font-extrabold text-slate-800">{selectedCategoryExams.length}</p>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileQuestion size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Butir Soal</p>
                    <p className="text-lg font-extrabold text-slate-800">
                      {selectedCategoryExams.reduce((acc, curr) => acc + (curr.questions?.length || 0), 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <School size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Ujian Aktif</p>
                    <p className="text-lg font-extrabold text-slate-800">
                      {selectedCategoryExams.filter(e => e.status === 'ACTIVE').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Table or Empty State */}
              {selectedCategoryExams.length === 0 ? (
                <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl p-8">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Calendar size={28} />
                  </div>
                  <h3 className="font-bold text-slate-700 text-base">Belum Ada Ujian Terdaftar</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Tidak ada jadwal ujian yang ditautkan ke kategori <span className="font-semibold text-slate-700">"{selectedCategory.name}"</span> saat ini.
                  </p>
                  <div className="mt-5">
                    <button
                      onClick={() => {
                        setIsExamListModalOpen(false);
                        navigate('/dashboard/exams');
                      }}
                      className="btn-primary inline-flex items-center space-x-2 text-sm"
                    >
                      <Plus size={16} />
                      <span>Buat Jadwal Ujian Baru</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4 w-12 text-center">No</th>
                          <th className="py-3 px-4">Judul & Mata Pelajaran</th>
                          <th className="py-3 px-4">Waktu Ujian</th>
                          <th className="py-3 px-4">Kelas Peserta</th>
                          <th className="py-3 px-4 text-center">Soal</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {selectedCategoryExams.map((exam, idx) => {
                          const startDate = new Date(exam.start_time);
                          const endDate = new Date(exam.end_time);

                          return (
                            <tr key={exam.ID} className="hover:bg-slate-50/60 transition-colors">
                              {/* No */}
                              <td className="py-3.5 px-4 text-xs font-mono text-center text-slate-400 font-medium">
                                {idx + 1}
                              </td>

                              {/* Judul & Mapel */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                                    <BookOpen size={16} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">{exam.title}</p>
                                    <p className="text-xs text-slate-500">
                                      {exam.subject?.name || 'Mata Pelajaran Umum'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Waktu Ujian */}
                              <td className="py-3.5 px-4">
                                <div className="text-xs space-y-0.5">
                                  <p className="font-semibold text-slate-700 flex items-center">
                                    <Calendar size={12} className="mr-1 text-slate-400" />
                                    {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                  <p className="text-slate-500 flex items-center">
                                    <Clock size={12} className="mr-1 text-slate-400" />
                                    {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({exam.duration} mnt)
                                  </p>
                                </div>
                              </td>

                              {/* Kelas */}
                              <td className="py-3.5 px-4 align-top">
                                <ClassBadgesList classes={exam.classes} maxVisible={3} containerClassName="max-w-[220px]" />
                              </td>

                              {/* Soal */}
                              <td className="py-3.5 px-4 text-center font-bold text-xs text-slate-700">
                                {exam.questions?.length || 0}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                {getStatusBadge(exam.status)}
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

            {/* Footer Modal */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {selectedCategoryExams.length} ujian terdaftar pada {selectedCategory.name}
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExamListModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-white transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExamListModalOpen(false);
                    navigate('/dashboard/exams');
                  }}
                  className="btn-primary flex items-center space-x-1.5 text-sm"
                >
                  <span>Buka di Jadwal Ujian</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Kategori */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-md bg-white shadow-2xl relative z-10 rounded-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 rounded-t-2xl">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <BookmarkCheck size={18} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Kategori' : 'Kategori Baru'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Kategori / Semester</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Contoh: Mid Semester 1, UTS Ganjil, UAS Genap"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium">Batal</button>
                <button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
