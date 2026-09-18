import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users as UsersIcon, Search, ChevronLeft, ChevronRight, Shield, Trash2, AlertCircle, Edit2, Key, GraduationCap, School, Eye, Award, Copy, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast, showWarningToast } from '../utils/alert';

interface UserItem {
  id: number;
  username: string;
  name: string;
  role: string;
  nip?: string;
  nuptk?: string;
  jabatan?: string;
  token_password?: string;
  created_at: string;
}

interface StudentItem {
  id: number;
  nisn: string;
  nis?: string;
  jenis_kelamin?: string;
  agama?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
  no_telp?: string;
  nama_orang_tua?: string;
  class_id: number;
  token_password?: string;
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

  // Pagination & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('ALL');
  const [filterTeacherJabatan, setFilterTeacherJabatan] = useState('ALL');
  const [sortOption, setSortOption] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, filterClassId, sortOption, filterTeacherJabatan]);

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      u.name.toLowerCase().includes(q) || 
      u.username.toLowerCase().includes(q) ||
      (u.nip && u.nip.toLowerCase().includes(q)) ||
      (u.nuptk && u.nuptk.toLowerCase().includes(q)) ||
      (u.jabatan && u.jabatan.toLowerCase().includes(q));

    const matchesJabatan = filterTeacherJabatan === 'ALL' || (u.jabatan || 'Guru') === filterTeacherJabatan;

    return matchesSearch && matchesJabatan;
  });
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const filteredStudents = students.filter(s => {
    const studentClass = classes.find(c => c.ID === s.class_id);
    const className = studentClass ? studentClass.name.toLowerCase() : '';
    const q = searchQuery.toLowerCase();
    
    // Class Filter
    if (filterClassId !== 'ALL' && s.class_id.toString() !== filterClassId) {
      return false;
    }
    
    // Search query
    return s.user.name.toLowerCase().includes(q) || 
           s.nisn.toLowerCase().includes(q) || 
           s.user.username.toLowerCase().includes(q) ||
           className.includes(q);
  }).sort((a, b) => {
    if (sortOption === 'name_asc') return a.user.name.localeCompare(b.user.name);
    if (sortOption === 'name_desc') return b.user.name.localeCompare(a.user.name);
    if (sortOption === 'nisn_asc') return a.nisn.localeCompare(b.nisn);
    if (sortOption === 'nisn_desc') return b.nisn.localeCompare(a.nisn);
    if (sortOption === 'class_asc') return a.class_id - b.class_id;
    if (sortOption === 'class_desc') return b.class_id - a.class_id;
    return 0;
  });
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalStudentPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State for Teacher
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [nuptk, setNuptk] = useState('');
  const [jabatan, setJabatan] = useState('Guru');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Form State for Student
  const [studentName, setStudentName] = useState('');
  const [nisn, setNisn] = useState('');
  const [classId, setClassId] = useState('');
  const [nis, setNis] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [agama, setAgama] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [namaOrangTua, setNamaOrangTua] = useState('');
  
  // Profile View Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);

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

  const generateRandom7Digits = () => {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  };

  const generateTeacherUsername = (nameStr: string) => {
    const clean = nameStr.split(',')[0].replace(/\b(dr|dra|drs|ir|h|hj|spd|mpd|msi|kom)\.?\b/gi, '').trim();
    const parts = clean.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
  };

  const openCreateTeacher = () => {
    setIsEditMode(false);
    setName(''); setNip(''); setNuptk(''); setJabatan('Guru'); setUsername(''); setPassword(generateRandom7Digits());
    setError('');
    setIsModalOpen(true);
  };

  const openEditTeacher = (u: UserItem) => {
    setIsEditMode(true);
    setEditingUserId(u.id);
    setName(u.name);
    setUsername(u.username);
    setNip(u.nip || '');
    setNuptk(u.nuptk || '');
    setJabatan(u.jabatan || 'Guru');
    setPassword(u.token_password || generateRandom7Digits());
    setError('');
    setIsModalOpen(true);
  };

  const handleGenerateTeacherPasswords = async () => {
    if (!(await confirmAction('Generate Password Guru', 'Apakah Anda yakin ingin mengacak ulang password semua guru menjadi 7 digit angka baru? Akun login guru akan terupdate.'))) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/api/v1/admin/users/generate-tokens', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccessToast(res.data?.message || 'Berhasil membuat password 7 digit baru untuk semua guru');
      fetchUsers();
    } catch (err: any) {
      showErrorToast(err.response?.data?.error || 'Gagal generate password guru');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isEditMode && editingUserId) {
        await axios.put(`http://localhost:8080/api/v1/admin/users/${editingUserId}`, {
          name, nip, nuptk, jabatan, username, password
        }, { headers: { Authorization: `Bearer ${token}` } });
        showSuccessToast('Data guru berhasil diperbarui');
      } else {
        await axios.post('http://localhost:8080/api/v1/admin/users', {
          name, nip, nuptk, jabatan, username, password
        }, { headers: { Authorization: `Bearer ${token}` } });
        showSuccessToast('Data guru berhasil ditambahkan');
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
    if (currentUser?.username === uname) {
      showErrorToast("Anda tidak bisa menghapus akun Anda sendiri!");
      return;
    }
    
    if (!(await confirmAction(`Hapus Pengguna`, `Yakin ingin menghapus pengguna ${uname}?`))) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
      showSuccessToast('Pengguna dihapus');
    } catch {
      showErrorToast('Gagal menghapus pengguna');
    }
  };

  const openCreateStudent = () => {
    setIsStudentEditMode(false);
    setStudentName(''); setNisn(''); setClassId('');
    setNis(''); setJenisKelamin(''); setAgama(''); setTempatLahir(''); setTanggalLahir('');
    setAlamat(''); setNoTelp(''); setNamaOrangTua('');
    setIsStudentModalOpen(true);
  };

  const openEditStudent = (s: StudentItem) => {
    setIsStudentEditMode(true);
    setEditingStudentId(s.id);
    setStudentName(s.user.name);
    setNisn(s.nisn);
    setClassId(s.class_id.toString());
    
    // Biodata
    setNis(s.nis || '');
    setJenisKelamin(s.jenis_kelamin || '');
    setAgama(s.agama || '');
    setTempatLahir(s.tempat_lahir || '');
    setTanggalLahir(s.tanggal_lahir || '');
    setAlamat(s.alamat || '');
    setNoTelp(s.no_telp || '');
    setNamaOrangTua(s.nama_orang_tua || '');

    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        name: studentName, 
        nisn, 
        username: "", 
        password: "", 
        class_id: parseInt(classId),
        nis,
        jenis_kelamin: jenisKelamin,
        agama,
        tempat_lahir: tempatLahir,
        tanggal_lahir: tanggalLahir,
        alamat,
        no_telp: noTelp,
        nama_orang_tua: namaOrangTua
      };

      if (isStudentEditMode && editingStudentId) {
        await axios.put(`http://localhost:8080/api/v1/admin/students/${editingStudentId}`, 
          payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        const genNum = () => Math.floor(1000000 + Math.random() * 9000000).toString();
        payload.username = genNum();
        payload.password = genNum();
        await axios.post('http://localhost:8080/api/v1/admin/students', 
          payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      setIsStudentModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan data siswa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (id: number, uname: string) => {
    if (!(await confirmAction(`Hapus Siswa`, `Yakin ingin menghapus siswa ${uname}?`))) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(students.filter(s => s.id !== id));
      showSuccessToast('Siswa dihapus');
    } catch {
      showErrorToast('Gagal menghapus siswa');
    }
  };

  const handleGenerateTokens = async () => {
    if (!(await confirmAction("PERHATIAN!", "Semua password dan username siswa akan direset menjadi token acak baru secara permanen. Anda akan langsung mengunduh file berisi daftar token baru.\n\nApakah Anda yakin ingin melanjutkan?"))) return;

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:8080/api/v1/admin/students/generate-tokens', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const tokens = response.data;
      if (!tokens || tokens.length === 0) {
        showWarningToast("Tidak ada data siswa untuk di-generate.");
        setIsLoading(false);
        return;
      }

      fetchStudents();
      showSuccessToast("Token berhasil di-generate! Silakan gunakan tombol 'Unduh Token' jika ingin mencetaknya.");
    } catch {
      showErrorToast("Gagal melakukan generate token.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTokens = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/v1/admin/students/export-tokens', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const tokens = response.data;
      if (!tokens || tokens.length === 0) {
        showWarningToast("Tidak ada data siswa.");
        return;
      }

      const headers = ["Nama Siswa", "NISN", "Kelas", "Username (Token)", "Password"];
      const csvRows = [];
      csvRows.push(headers.join(","));

      for (const t of tokens) {
        const row = [
          `"${t.name}"`, 
          `"${t.nisn}"`, 
          `"${t.class_name}"`, 
          `"${t.username}"`, 
          `"${t.password}"`
        ];
        csvRows.push(row.join(","));
      }

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Token_Ujian_Aktif_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccessToast("Token berhasil diunduh!");
    } catch {
      showErrorToast("Gagal mengunduh token.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Manajemen Pengguna</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Kelola akses akun Guru dan Siswa untuk sistem CBT.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeTab === 'teachers' ? (
            <>
              <button 
                onClick={handleGenerateTeacherPasswords} 
                className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors w-full sm:w-auto"
                title="Generate ulang password 7 digit acak untuk seluruh guru"
              >
                <Key size={16} /><span>Generate Password Guru</span>
              </button>
              <button onClick={openCreateTeacher} className="btn-primary flex items-center justify-center space-x-2 text-xs sm:text-sm py-2 px-3.5 w-full sm:w-auto shadow-xs">
                <Plus size={18} /><span>Tambah Guru</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={handleExportTokens} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors w-full sm:w-auto">
                <Key size={16} /><span>Unduh Token</span>
              </button>
              <button onClick={handleGenerateTokens} className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors w-full sm:w-auto">
                <Key size={16} /><span>Generate Token</span>
              </button>
              <button onClick={openCreateStudent} className="btn-primary flex items-center justify-center space-x-1.5 text-xs sm:text-sm py-2 px-3.5 w-full sm:w-auto shadow-xs">
                <Plus size={16} /><span>Tambah Siswa</span>
              </button>
            </>
          )}
        </div>
      </header>

            {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
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
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          {activeTab === 'teachers' && (
            <select
              value={filterTeacherJabatan}
              onChange={(e) => setFilterTeacherJabatan(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">Semua Jabatan</option>
              <option value="Kepala Sekolah">Kepala Sekolah</option>
              <option value="Guru">Guru</option>
            </select>
          )}

          {activeTab === 'students' && (
            <>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.ID} value={c.ID.toString()}>{c.name}</option>
                ))}
              </select>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
              >
                <option value="name_asc">Nama (A-Z)</option>
                <option value="name_desc">Nama (Z-A)</option>
                <option value="nisn_asc">NISN (Terkecil-Terbesar)</option>
                <option value="nisn_desc">NISN (Terbesar-Terkecil)</option>
                <option value="class_asc">Kelas (A-Z)</option>
                <option value="class_desc">Kelas (Z-A)</option>
              </select>
            </>
          )}
          
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={activeTab === 'teachers' ? "Cari nama, NIP, NUPTK, atau username..." : "Cari nama, NISN, atau username..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-x-auto">
          {activeTab === 'teachers' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200">
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-14 text-center">No</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Guru</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">NIP</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">NUPTK</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jabatan</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      <UsersIcon className="mx-auto text-slate-300 mb-3" size={32} />
                      Belum ada data guru yang cocok.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u, idx) => {
                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isKepalaSekolah = u.jabatan === 'Kepala Sekolah';
                    const teacherPassword = u.token_password || 'guru123';

                    return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* No */}
                      <td className="py-4 px-4 text-xs text-slate-400 font-mono text-center font-medium">
                        {rowNum}
                      </td>

                      {/* Nama Guru */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                            isKepalaSekolah ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-primary-100 text-primary-700'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm group-hover:text-primary-700 transition-colors">{u.name}</p>
                            <p className="text-[11px] text-slate-400">Terdaftar: {new Date(u.created_at).toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="py-4 px-6 text-xs font-mono text-slate-700">
                        {u.nip && u.nip.trim() !== '' && u.nip !== '-' ? (
                          <span className="bg-slate-100/90 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {u.nip}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* NUPTK */}
                      <td className="py-4 px-6 text-xs font-mono text-slate-700">
                        {u.nuptk && u.nuptk.trim() !== '' && u.nuptk !== '-' ? (
                          <span className="bg-slate-100/90 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {u.nuptk}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Jabatan */}
                      <td className="py-4 px-6">
                        {isKepalaSekolah ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Award size={12} className="mr-1 text-amber-600" /> Kepala Sekolah
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Shield size={12} className="mr-1 text-emerald-600" /> {u.jabatan || 'Guru'}
                          </span>
                        )}
                      </td>

                      {/* Username */}
                      <td className="py-4 px-6 text-xs font-mono text-primary-700 font-bold">
                        @{u.username}
                      </td>

                      {/* Password */}
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center space-x-1.5 bg-amber-50/90 border border-amber-200/90 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-2xs">
                          <span>{teacherPassword}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(teacherPassword);
                              showSuccessToast(`Password @${u.username} disalin!`);
                            }}
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
                            title="Salin Password Akun"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-6 text-right space-x-1">
                        <button 
                          onClick={() => openEditTeacher(u)} 
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors inline-flex"
                          title="Edit Guru"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                          title="Hapus Guru"
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

          {activeTab === 'teachers' && filteredUsers.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between mt-auto">
              <span className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> dari <span className="font-semibold text-slate-700">{filteredUsers.length}</span> data
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalUserPages, p + 1))}
                  disabled={currentPage === totalUserPages}
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Siswa</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">NISN</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelas</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kredensial (Token)</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <GraduationCap className="mx-auto text-slate-300 mb-3" size={32} />
                      Belum ada data siswa.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => {
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
                      <td className="py-4 px-6">
                        <div className="bg-slate-50 p-2 rounded border border-slate-200 text-xs font-mono">
                          <div><span className="text-slate-500">U:</span> <span className="font-bold text-primary-700">{s.user.username}</span></div>
                          <div className="mt-1"><span className="text-slate-500">P:</span> <span className="font-bold text-amber-600">{(s as any).token_password || '***'}</span></div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => { setSelectedStudent(s); setIsProfileModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Profil Lengkap">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openEditStudent(s)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit Siswa">
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

          {activeTab === 'students' && filteredStudents.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between mt-auto">
              <span className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> dari <span className="font-semibold text-slate-700">{filteredStudents.length}</span> data
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalStudentPages, p + 1))}
                  disabled={currentPage === totalStudentPages}
                  className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap Guru</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setName(newName);
                    if (!isEditMode && (!username || username === generateTeacherUsername(name))) {
                      setUsername(generateTeacherUsername(newName));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Contoh: Asron Batubara, S.Pd., M.Si"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jabatan</label>
                <select
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                >
                  <option value="Guru">Guru</option>
                  <option value="Kepala Sekolah">Kepala Sekolah</option>
                  <option value="Wakil Kepala Sekolah">Wakil Kepala Sekolah</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    NIP <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Contoh: 1973-1216-2005-0210-03"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    NUPTK <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={nuptk}
                    onChange={(e) => setNuptk(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Contoh: 6548-7516-5320-0013"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Username <span className="text-xs text-slate-400 font-normal">(nama)</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-slate-50 font-mono"
                    placeholder="Contoh: sumarno"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Password (7 Digit)
                    </label>
                    <button
                      type="button"
                      onClick={() => setPassword(generateRandom7Digits())}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center space-x-1"
                      title="Acak password 7 digit baru"
                    >
                      <RefreshCw size={12} />
                      <span>Acak Baru</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 7))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-mono tracking-wider font-bold text-amber-800 bg-amber-50/50"
                    placeholder={isEditMode ? "Kosongkan jika tidak diubah" : "7 digit angka"}
                    maxLength={7}
                    required={!isEditMode}
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Password berupa 7 digit angka acak (sama seperti siswa)
                  </span>
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
          <div className="glass-panel w-full max-w-3xl bg-white shadow-2xl relative z-10 rounded-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/80 rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-slate-800">{isStudentEditMode ? 'Edit Biodata Siswa' : 'Tambah Biodata Siswa'}</h2>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleSaveStudent} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Section 1: Data Utama */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Data Utama</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap Siswa *</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Contoh: Ahmad Fadli"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">NISN *</label>
                    <input
                      type="text"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Nomor Induk Siswa Nasional"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kelas *</label>
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
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">NIS Lokal (Opsional)</label>
                    <input
                      type="text"
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Nomor Induk Siswa Lokal"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Biodata Tambahan */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Biodata Tambahan (Opsional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Kelamin</label>
                    <select
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                    >
                      <option value="">Pilih...</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Agama</label>
                    <select
                      value={agama}
                      onChange={(e) => setAgama(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                    >
                      <option value="">Pilih...</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tempat Lahir</label>
                    <input
                      type="text"
                      value={tempatLahir}
                      onChange={(e) => setTempatLahir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Contoh: Jakarta"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Orang Tua</label>
                    <input
                      type="text"
                      value={namaOrangTua}
                      onChange={(e) => setNamaOrangTua(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">No Telp / WhatsApp</label>
                    <input
                      type="tel"
                      value={noTelp}
                      onChange={(e) => setNoTelp(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Contoh: 08123456789"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat Lengkap</label>
                    <textarea
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="Alamat domisili"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-100 flex items-start space-x-3 mt-4">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">Info Kredensial Akses Ujian</p>
                  <p className="mt-0.5">Username dan Password siswa tidak perlu diisi manual. Silakan gunakan tombol <strong>"Generate & Unduh Token"</strong> pada halaman utama untuk membuat dan mereset token ujian bagi semua siswa sekaligus.</p>
                </div>
              </div>

              </div> {/* End of scrollable body */}

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 shrink-0 rounded-b-2xl">
                <button type="button" onClick={() => setIsStudentModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium bg-white hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? 'Menyimpan...' : 'Simpan Biodata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)}></div>
          <div className="glass-panel w-full max-w-4xl bg-white shadow-2xl relative z-10 rounded-2xl flex max-h-[90vh] overflow-hidden">
            {/* Left Sidebar (Avatar & Basic) */}
            <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center">
              <div className="w-32 h-32 bg-white rounded-full border-4 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden mb-6">
                <span className="text-4xl font-bold text-slate-300">
                  {selectedStudent.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center uppercase tracking-wide">
                {selectedStudent.user.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1">Siswa</p>
              
              <div className="w-full mt-8 border-t border-slate-200 pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700">Kelas</span>
                  <span className="text-primary-700 font-bold bg-primary-50 px-3 py-1 rounded-full">
                    {classes.find(c => c.ID === selectedStudent.class_id)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700">Terdaftar</span>
                  <span className="text-slate-600">{new Date(selectedStudent.user.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Right Content (Full Biodata Data Card) */}
            <div className="w-2/3 p-8 overflow-y-auto bg-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 border-b-2 border-primary-500 pb-1 inline-block">Data Lengkap</h3>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Username Ujian</td>
                      <td className="px-6 py-4 font-mono font-bold text-primary-700">{selectedStudent.user.username}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Status Akun</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">Aktif</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">NIS / NISN</td>
                      <td className="px-6 py-4">{selectedStudent.nis || '-'} / {selectedStudent.nisn}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Nama Lengkap</td>
                      <td className="px-6 py-4 uppercase font-bold">{selectedStudent.user.name}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Jenis Kelamin</td>
                      <td className="px-6 py-4">{selectedStudent.jenis_kelamin || '-'}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Agama</td>
                      <td className="px-6 py-4">{selectedStudent.agama || '-'}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Tempat, Tanggal Lahir</td>
                      <td className="px-6 py-4">
                        {selectedStudent.tempat_lahir || '-'}, {selectedStudent.tanggal_lahir ? new Date(selectedStudent.tanggal_lahir).toLocaleDateString('id-ID') : '-'}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Alamat Lengkap</td>
                      <td className="px-6 py-4">{selectedStudent.alamat || '-'}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">No. Telp</td>
                      <td className="px-6 py-4">{selectedStudent.no_telp || '-'}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="w-1/3 px-6 py-4 font-semibold text-slate-700 bg-slate-50 border-r border-slate-100">Nama Orang Tua</td>
                      <td className="px-6 py-4">{selectedStudent.nama_orang_tua || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    openEditStudent(selectedStudent);
                  }} 
                  className="btn-primary flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white border-0"
                >
                  <Edit2 size={16} />
                  <span>Edit Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
