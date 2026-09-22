

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  School, 
  BookOpen, 
  Database, 
  Calendar, 
  Plus, 
  ArrowRight,
  Sparkles,
  Users,
  GraduationCap
} from 'lucide-react';
import ClassBadgesList from '../components/ClassBadgesList';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    classesCount: 0,
    subjectsCount: 0,
    questionsCount: 0,
    examsCount: 0,
    teachersCount: 0,
    studentsCount: 0,
  });
  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [classesRes, subjectsRes, questionsRes, examsRes, usersRes, studentsRes] = await Promise.allSettled([
          axios.get('/api/v1/admin/classes', { headers }),
          axios.get('/api/v1/admin/subjects', { headers }),
          axios.get('/api/v1/admin/questions', { headers }),
          axios.get('/api/v1/admin/exams', { headers }),
          axios.get('/api/v1/admin/users', { headers }),
          axios.get('/api/v1/admin/students', { headers }),
        ]);

        const classes = classesRes.status === 'fulfilled' ? classesRes.value.data || [] : [];
        const subjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data || [] : [];
        const questions = questionsRes.status === 'fulfilled' ? questionsRes.value.data || [] : [];
        const exams = examsRes.status === 'fulfilled' ? examsRes.value.data || [] : [];
        const users = usersRes.status === 'fulfilled' ? usersRes.value.data || [] : [];
        const students = studentsRes.status === 'fulfilled' ? studentsRes.value.data || [] : [];

        setStats({
          classesCount: classes.length,
          subjectsCount: subjects.length,
          questionsCount: questions.length,
          examsCount: exams.length,
          teachersCount: users.length,
          studentsCount: students.length,
        });

        setRecentExams(exams.slice(0, 5));
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      }
    };

    fetchDashboardData();
  }, [token]);

  const statCards = [
    { 
      label: 'Rombel SMK (Kelas)', 
      value: stats.classesCount, 
      sub: 'Tingkat X, XI, & XII',
      icon: <School size={20} />, 
      textColor: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/dashboard/classes'
    },
    { 
      label: 'Mata Pelajaran', 
      value: stats.subjectsCount, 
      sub: 'Umum & Kejuruan',
      icon: <BookOpen size={20} />, 
      textColor: 'text-amber-600',
      bg: 'bg-amber-50',
      link: '/dashboard/subjects'
    },
    { 
      label: 'Bank Soal', 
      value: stats.questionsCount, 
      sub: 'Soal Terkatalog',
      icon: <Database size={20} />, 
      textColor: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: '/dashboard/questions'
    },
    { 
      label: 'Jadwal Ujian CBT', 
      value: stats.examsCount, 
      sub: 'Sesi Ujian Aktif',
      icon: <Calendar size={20} />, 
      textColor: 'text-indigo-600',
      bg: 'bg-indigo-50',
      link: '/dashboard/exams'
    },
    { 
      label: 'Guru / Pengajar', 
      value: stats.teachersCount, 
      sub: 'Pengajar Aktif',
      icon: <Users size={20} />, 
      textColor: 'text-violet-600',
      bg: 'bg-violet-50',
      link: '/dashboard/users'
    },
    { 
      label: 'Siswa Terdaftar', 
      value: stats.studentsCount, 
      sub: 'Peserta Ujian',
      icon: <GraduationCap size={20} />, 
      textColor: 'text-rose-600',
      bg: 'bg-rose-50',
      link: '/dashboard/users'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Modern Compact Welcome Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-xs shadow-primary-600/30 flex-shrink-0">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Selamat Datang kembali, {user?.username}
              </h1>
              <span className="inline-block text-base">👋</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Portal Manajemen & Evaluasi Ujian Berbasis Komputer SMK Negeri 1 Beringin
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Server Siap</span>
          </div>
          <Link
            to="/dashboard/questions"
            className="btn-secondary text-xs py-1.5 px-3 space-x-1.5"
          >
            <Database size={14} />
            <span>Bank Soal</span>
          </Link>
          <Link
            to="/dashboard/exams"
            className="btn-primary text-xs py-1.5 px-3 space-x-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Buat Ujian</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((stat, idx) => (
          <Link
            key={idx}
            to={stat.link}
            className="glass-panel p-4 flex flex-col justify-between group hover:border-primary-300 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg} ${stat.textColor} transition-transform group-hover:scale-105`}>
                {stat.icon}
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
              <p className="text-slate-600 text-xs font-bold mt-0.5 truncate">{stat.label}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams Table Card */}
        <div className="lg:col-span-2 glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Jadwal Ujian Terdaftar</h2>
              <p className="text-xs text-slate-500 mt-0.5">Daftar sesi ujian CBT dan alokasi rombel peserta</p>
            </div>
            <Link 
              to="/dashboard/exams" 
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center space-x-1 group"
            >
              <span>Lihat Semua</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {recentExams.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <Calendar className="mx-auto text-slate-400 mb-2" size={26} />
              <p className="text-sm font-semibold text-slate-600">Belum ada jadwal ujian yang dibuat</p>
              <Link to="/dashboard/exams" className="btn-primary mt-3 inline-flex items-center space-x-1.5 text-xs py-1.5 px-3">
                <Plus size={14} />
                <span>Buat Jadwal Pertama</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5 font-semibold">Judul Ujian</th>
                    <th className="pb-2.5 font-semibold">Mata Pelajaran</th>
                    <th className="pb-2.5 font-semibold">Kelas / Rombel</th>
                    <th className="pb-2.5 font-semibold">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExams.map((exam) => (
                    <tr key={exam.ID} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 text-sm font-semibold text-slate-800">
                        {exam.title}
                      </td>
                      <td className="py-3 text-xs text-slate-600">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                          exam.subject?.type === 'JURUSAN' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        }`}>
                          {exam.subject?.name || 'Mapel'}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-600 align-middle">
                        <ClassBadgesList classes={exam.classes} maxVisible={2} containerClassName="max-w-[220px]" emptyText="Semua" />
                      </td>
                      <td className="py-3 text-xs font-bold text-slate-700">
                        {exam.duration} mnt
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alur Kerja SMK Info Card */}
        <div className="glass-panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
              <School size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Alur Kerja Ujian SMK</h2>
              <p className="text-[11px] text-slate-500">Panduan standar pelaksanaan CBT</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-start space-x-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs">
                1
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Siapkan Rombel & Kelas</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Tentukan Tingkat (X, XI, XII), Jurusan (PPLG, TKJ, dll), dan Rombel (1, 2, 3).
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs">
                2
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Input Mapel & Bank Soal</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Guru mengisi materi soal lengkap dengan gambar, teks Arab, & formula KaTeX.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs">
                3
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Jadwalkan & Rilis Ujian</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Pilih mapel ujian, tentukan durasi waktu, lalu hubungkan ke rombel peserta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
