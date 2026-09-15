import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users as UsersIcon, Shield, Trash2, AlertCircle, Edit2, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserItem {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

const Users = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State for Teacher
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:8080/api/v1/admin/users', {
        name,
        nip,
        username,
        password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsModalOpen(false);
      fetchUsers();
      setName(''); setNip(''); setUsername(''); setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal membuat akun');
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Manajemen Pengguna</h1>
          <p className="text-slate-500 mt-1">Kelola akses akun Guru untuk sistem CBT.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Tambah Akun Guru</span>
        </button>
      </header>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
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
                    Belum ada data pengguna (selain Admin)
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
                      <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
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
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-md bg-white shadow-2xl relative z-10 rounded-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">Buat Akun Guru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
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
                  placeholder="Masukkan NIP"
                  required
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
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 flex items-start mt-2 border border-amber-100">
                <Key size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>Akun ini akan langsung memiliki akses Guru (Teacher) untuk membuat Soal dan mengelola Ujian.</p>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium">Batal</button>
                <button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? 'Menyimpan...' : 'Buat Akun'}
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
