import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users as UsersIcon, Shield, Trash2, AlertCircle, Edit2, Key, GraduationCap, School } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserItem {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

interface StudentItem {
  id: number;
  nisn: string;
  class_id: number;
  user: UserItem;
}

interface ClassItem {
  ID: number;
  name: string;
}

const Users = () => {
  const { token, user: currentUser } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'teachers' | 'students'>('teachers');

  // Teacher State
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // Student State
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isStudentEditMode, setIsStudentEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State for Teacher
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Form State for Student
  const [studentName, setStudentName] = useState('');
  const [nisn, setNisn] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [classId, setClassId] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStudents();
    fetchClasses();
  }, []);

  const openCreateTeacher = () => {
    setIsEditMode(false);
    setName(''); setNip(''); setUsername(''); setPassword('');
    setIsModalOpen(true);
  };

  const openEditTeacher = (u: UserItem) => {
    setIsEditMode(true);
    setEditingUserId(u.id);
    setName(u.name);
    setUsername(u.username);
    setNip(''); // NIP is not fetched by default
    setPassword('');
    setIsModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isEditMode && editingUserId) {
        await axios.put(`http://localhost:8080/api/v1/admin/users/${editingUserId}`, {
          name, nip, username, password
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('http://localhost:8080/api/v1/admin/users', {
          name, nip, username, password
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan akun');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: number, uname: string) => {
    if (currentUser?.id === id) {
      alert("Anda tidak bisa menghapus akun Anda sendiri!");
      return;
    }
    if (!window.confirm(`Yakin ingin menghapus pengguna ${uname}?`)) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert('Gagal menghapus pengguna');
    }
  };

  const openCreateStudent = () => {
    setIsStudentEditMode(false);
    setStudentName(''); setNisn(''); setStudentUsername(''); setStudentPassword(''); setClassId('');
    setIsStudentModalOpen(true);
  };

  const openEditStudent = (s: StudentItem) => {
    setIsStudentEditMode(true);
    setEditingStudentId(s.id);
    setStudentName(s.user.name);
    setStudentUsername(s.user.username);
    setNisn(s.nisn);
    setClassId(s.class_id.toString());
    setStudentPassword('');
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isStudentEditMode && editingStudentId) {
        await axios.put(`http://localhost:8080/api/v1/admin/students/${editingStudentId}`, {
          name: studentName, nisn, username: studentUsername, password: studentPassword, class_id: parseInt(classId)
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('http://localhost:8080/api/v1/admin/students', {
          name: studentName, nisn, username: studentUsername, password: studentPassword, class_id: parseInt(classId)
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      setIsStudentModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan akun siswa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (id: number, uname: string) => {
    if (!window.confirm(`Yakin ingin menghapus siswa ${uname}?`)) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(students.filter(s => s.id !== id));
    } catch (err) {
      alert('Gagal menghapus siswa');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Manajemen Pengguna</h1>
          <p className="text-slate-500 mt-1">Kelola akses akun Guru dan Siswa untuk sistem CBT.</p>
        </div>
        <div className="flex space-x-2">
          {activeTab === 'teachers' ? (
            <button onClick={openCreateTeacher} className="btn-primary flex items-center space-x-2">
              <Plus size={20} /><span>Tambah Guru</span>
            </button>
          ) : (
            <button onClick={openCreateStudent} className="btn-primary flex items-center space-x-2">
              <Plus size={20} /><span>Tambah Siswa</span>
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-max">
        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'teachers' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <UsersIcon size={16} /> <span>Data Guru</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'students' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <GraduationCap size={16} /> <span>Data Siswa</span>
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'teachers' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengguna</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Peran (Role)</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <UsersIcon className="mx-auto text-slate-300 mb-3" size={32} />
                      Belum ada data guru.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-500">Terdaftar: {new Date(u.created_at).toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Shield size={12} className="mr-1" /> {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                        @{u.username}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => openEditTeacher(u)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'students' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Siswa</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">NISN</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelas</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <GraduationCap className="mx-auto text-slate-300 mb-3" size={32} />
                      Belum ada data siswa.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => {
                    const studentClass = classes.find(c => c.ID === s.class_id);
                    return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                            {s.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{s.user.name}</p>
                            <p className="text-xs text-slate-500">@{s.user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                        {s.nisn}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <School size={12} className="mr-1" /> {studentClass ? studentClass.name : 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => openEditStudent(s)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(s.id, s.user.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-md bg-white shadow-2xl relative z-10 rounded-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Akun Guru' : 'Buat Akun Guru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Contoh: Budi Santoso, S.Kom"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">NIP / ID Pegawai</label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder={isEditMode ? "Kosongkan jika tidak diubah" : "Masukkan NIP"}
                  required={!isEditMode}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-slate-50"
                    placeholder="Username login"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder={isEditMode ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                    required={!isEditMode}
                    minLength={isEditMode && !password ? 0 : 6}
                  />
                </div>
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

      {/* Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsStudentModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-md bg-white shadow-2xl relative z-10 rounded-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{isStudentEditMode ? 'Edit Akun Siswa' : 'Buat Akun Siswa'}</h2>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Contoh: Ahmad Fadli"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">NISN</label>
                  <input
                    type="text"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Nomor Induk Siswa"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kelas</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                    required
                  >
                    <option value="" disabled>Pilih Kelas</option>
                    {classes.map(c => (
                      <option key={c.ID} value={c.ID}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username Login</label>
                  <input
                    type="text"
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-slate-50"
                    placeholder="Username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder={isStudentEditMode ? "Kosongkan jika tetap" : "Minimal 6 karakter"}
                    required={!isStudentEditMode}
                    minLength={isStudentEditMode && !studentPassword ? 0 : 6}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setIsStudentModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium">Batal</button>
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

export default Users;
