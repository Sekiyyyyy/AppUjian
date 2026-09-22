import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  UserCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';

interface Student {
  id: number;
  nisn: string;
  user: {
    name: string;
    username: string;
  };
}

const ClassDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [className, setClassName] = useState('Memuat Kelas...');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Editing State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', nisn: '', username: '' });
  
  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const classRes = await axios.get('/api/v1/admin/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const cls = classRes.data.find((c: any) => c.ID === Number(id));
      if (cls) {
        setClassName(`${cls.level} ${cls.department} ${cls.number}`.trim());
      } else {
        setClassName('Kelas Tidak Ditemukan');
      }

      const stdRes = await axios.get(`/api/v1/admin/students?class_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(stdRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showErrorToast("Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDelete = async (studentId: number, name: string) => {
    if (!(await confirmAction("Hapus Siswa", `Yakin ingin menghapus ${name} permanen?`))) return;
    try {
      await axios.delete(`/api/v1/admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast("Siswa berhasil dihapus");
      fetchData();
    } catch (err) {
      showErrorToast("Gagal menghapus siswa");
    }
  };

  const startEdit = (s: Student) => {
    setEditingId(s.id);
    setEditForm({ name: s.user?.name || '', nisn: s.nisn || '', username: s.user?.username || '' });
  };

  const saveEdit = async (studentId: number) => {
    try {
      await axios.put(`/api/v1/admin/students/${studentId}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast("Data siswa diperbarui");
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal memperbarui data");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showErrorToast("Hanya file CSV yang diizinkan (Nama, NISN, Username, Password)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("class_id", id as string);

    try {
      setIsLoading(true);
      await axios.post('/api/v1/admin/students/import', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      showSuccessToast("Berhasil mengimpor data siswa!");
      fetchData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || "Gagal mengimpor file CSV");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/dashboard/classes')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Detail Kelas</h1>
            <p className="text-slate-500 mt-1">Kelas: {className}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2 bg-white"
          >
            <Upload size={18} />
            <span>Import CSV Siswa</span>
          </button>
          <button 
            onClick={fetchData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">No</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">NISN</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4 rounded-tr-2xl text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Memuat data siswa...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada siswa di kelas ini.<br/>
                    Gunakan fitur <b>Import CSV</b> untuk menambahkan siswa secara massal.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6 text-sm text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-4 px-6">
                      {editingId === s.id ? (
                        <input 
                          type="text" 
                          value={editForm.name} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="px-2 py-1.5 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                        />
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                            <UserCircle size={18} />
                          </div>
                          <span className="font-semibold text-slate-800">{s.user?.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {editingId === s.id ? (
                        <input 
                          type="text" 
                          value={editForm.nisn} 
                          onChange={e => setEditForm({...editForm, nisn: e.target.value})}
                          className="px-2 py-1.5 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-32"
                        />
                      ) : (
                        s.nisn
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {editingId === s.id ? (
                        <input 
                          type="text" 
                          value={editForm.username} 
                          onChange={e => setEditForm({...editForm, username: e.target.value})}
                          className="px-2 py-1.5 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-32"
                        />
                      ) : (
                        s.user?.username
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {editingId === s.id ? (
                        <div className="flex justify-end space-x-1">
                          <button 
                            onClick={() => saveEdit(s.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Simpan"
                          >
                            <Save size={18} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Batal"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEdit(s)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(s.id, s.user?.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClassDetails;
