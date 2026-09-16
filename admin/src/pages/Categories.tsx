import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, FolderTree, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';

interface Category {
  ID: number;
  name: string;
}

const Categories = () => {
  const { token, user: currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setName('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setIsEditMode(true);
    setEditingId(cat.ID);
    setName(cat.name);
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
      } else {
        await axios.post('http://localhost:8080/api/v1/admin/categories', {
          name,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setIsModalOpen(false);
      fetchCategories();
      setName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan kategori');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!(await confirmAction(`Hapus Kategori`, `Yakin ingin menghapus kategori ${name}?`))) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(categories.filter(c => c.ID !== id));
      showSuccessToast('Kategori dihapus');
    } catch (err) {
      showErrorToast('Gagal menghapus kategori');
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
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Kategori Ujian</h1>
          <p className="text-slate-500 mt-1">Kelola kategori semester (contoh: Mid Sem 1, UTS, UAS, dll).</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center space-x-2">
          <Plus size={20} /><span>Tambah Kategori</span>
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories.length === 0 ? (
           <div className="col-span-full glass-panel p-12 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <FolderTree className="text-slate-400" size={24} />
             </div>
             <p className="font-medium text-slate-700">Belum ada kategori semester</p>
             <p className="text-sm mt-1 text-slate-500">Buat kategori pertama agar guru bisa menugaskan ujian.</p>
           </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.ID} className="glass-panel p-5 group hover:shadow-lg transition-all flex items-center justify-between border-l-4 border-l-primary-500">
              <div className="flex items-center space-x-3">
                <FolderTree className="text-slate-400" size={20} />
                <h3 className="font-bold text-slate-800">{cat.name}</h3>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(cat)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(cat.ID, cat.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-md bg-white shadow-2xl relative z-10 rounded-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Kategori' : 'Kategori Baru'}</h2>
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
                  placeholder="Contoh: Mid Semester 1"
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
