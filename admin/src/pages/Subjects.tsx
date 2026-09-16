import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, BookOpen, AlertCircle, Edit2, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';

interface Subject {
  ID: number;
  name: string;
  type: string;
  class: string;
  teacher_id: number;
  CreatedAt: string;
}

const Subjects = () => {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();

  // Form State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [type, setType] = useState('AKADEMIK');

  const fetchSubjects = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateSubject = () => {
    setIsEditMode(false);
    setName('');
    setClassName('');
    setType('AKADEMIK');
    setIsModalOpen(true);
  };

  const openEditSubject = (sub: Subject) => {
    setIsEditMode(true);
    setEditingSubjectId(sub.ID);
    setName(sub.name);
    setClassName(sub.class);
    setType(sub.type || 'AKADEMIK');
    setIsModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isEditMode && editingSubjectId) {
        await axios.put(`http://localhost:8080/api/v1/admin/subjects/${editingSubjectId}`, {
          name,
          type,
          class: className
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:8080/api/v1/admin/subjects', {
          name,
          type,
          class: className
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setIsModalOpen(false);
      fetchSubjects();
      setName('');
      setClassName('');
      setType('AKADEMIK');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan mata pelajaran');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (!(await confirmAction(`Hapus Mata Pelajaran`, `Yakin ingin menghapus mata pelajaran ${name}?`))) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/subjects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(subjects.filter(s => s.ID !== id));
      showSuccessToast('Mata pelajaran dihapus');
    } catch (err) {
      showErrorToast('Gagal menghapus mata pelajaran');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Mata Pelajaran</h1>
          <p className="text-slate-500 mt-1">
            Kelola kategori mata pelajaran Akademik dan Kejuruan.
          </p>
        </div>
        <button 
          onClick={openCreateSubject}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Mapel</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.length === 0 ? (
          <div className="col-span-full glass-panel p-12 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="text-slate-400" size={24} />
             </div>
             <p className="font-medium text-slate-700">Belum ada mata pelajaran</p>
             <p className="text-sm mt-1 text-slate-500">Silakan klik "Tambah Mapel" untuk membuat kategori pertama.</p>
          </div>
        ) : (
          subjects.map((sub) => {
            const canEdit = currentUser?.role === 'ADMIN' || sub.teacher_id === currentUser?.id;
            return (
            <div key={sub.ID} className="glass-panel p-6 group hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sub.type === 'JURUSAN' ? 'bg-orange-50 text-orange-600' : 'bg-primary-50 text-primary-600'}`}>
                  <BookOpen size={24} />
                </div>
                {canEdit && (
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditSubject(sub)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 size={16} /></button>
                    <button 
                      onClick={() => handleDeleteSubject(sub.ID, sub.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{sub.name}</h3>
              <div className="flex items-center text-sm text-slate-500 space-x-4 mt-4">
                <span className="flex items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sub.type === 'JURUSAN' ? 'bg-orange-100 text-orange-700' : 'bg-primary-100 text-primary-700'}`}>
                    {sub.type || 'AKADEMIK'}
                  </span>
                </span>
                <span className="flex items-center"><Users size={16} className="mr-1.5" /> Kelas Umum: {sub.class || 'Umum'}</span>
              </div>
            </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-md bg-white shadow-2xl relative z-10 rounded-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Mata Pelajaran' : 'Mata Pelajaran Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            <form onSubmit={handleSaveSubject} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipe Mata Pelajaran</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                >
                  <option value="AKADEMIK">Akademik (Umum)</option>
                  <option value="JURUSAN">Kejuruan (Produktif SMK)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Contoh: Matematika Peminatan"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tingkat Kelas</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Contoh: XII IPA"
                  required
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium">Batal</button>
                <button type="submit" disabled={isLoading} className="btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;
