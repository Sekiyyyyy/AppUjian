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
          axios.get('http://localhost:8080/api/v1/admin/classes', { headers }),
          axios.get('http://localhost:8080/api/v1/admin/subjects', { headers }),
          axios.get('http://localhost:8080/api/v1/admin/questions', { headers }),
          axios.get('http://localhost:8080/api/v1/admin/exams', { headers }),
          axios.get('http://localhost:8080/api/v1/admin/users', { headers }),
          axios.get('http://localhost:8080/api/v1/admin/students', { headers }),
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
      icon: <School size={26} className="text-primary-600" />, 
      bg: 'bg-primary-50',
      link: '/dashboard/classes'
    },
    { 
      label: 'Mata Pelajaran', 
      value: stats.subjectsCount, 
      icon: <BookOpen size={26} className="text-amber-600" />, 
      bg: 'bg-amber-50',
      link: '/dashboard/subjects'
    },
    { 
      label: 'Bank Soal', 
      value: stats.questionsCount, 
      icon: <Database size={26} className="text-emerald-600" />, 
      bg: 'bg-emerald-50',
      link: '/dashboard/questions'
    },
    { 
      label: 'Jadwal Ujian CBT', 
      value: stats.examsCount, 
      icon: <Calendar size={26} className="text-indigo-600" />, 
      bg: 'bg-indigo-50',
      link: '/dashboard/exams'
    },
    { 
      label: 'Guru / Pengajar', 
      value: stats.teachersCount, 
      icon: <Users size={26} className="text-violet-600" />, 
      bg: 'bg-violet-50',
      link: '/dashboard/users'
    },
    { 
      label: 'Siswa Terdaftar', 
      value: stats.studentsCount, 
      icon: <GraduationCap size={26} className="text-rose-600" />, 
      bg: 'bg-rose-50',
      link: '/dashboard/users'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-800 text-white rounded-3xl shadow-xl flex items-center justify-between">
        <div className="relative z-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-white/20 text-white backdrop-blur-sm mb-2">
            <Sparkles size={14} className="mr-1.5 text-amber-300" /> CBT Khusus SMK N 1 Beringin
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {user?.username} 👋
          </h1>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((stat, idx) => (
          <Link
            key={idx}
            to={stat.link}
            className="glass-panel p-3.5 sm:p-4 flex flex-col justify-between group hover:shadow-md hover:border-primary-200 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-105 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <ArrowRight size={15} className="text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{stat.value}</p>
              <p className="text-slate-500 text-[11px] font-bold uppercase leading-tight line-clamp-2 mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams Table */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Jadwal Ujian Terdaftar</h2>
              <p className="text-xs text-slate-500">Daftar sesi ujian CBT dan alokasi rombel peserta</p>
            </div>
            <Link to="/dashboard/exams" className="text-xs font-bold text-primary-600 hover:underline flex items-center">
              <span>Lihat Semua</span>
              <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>

          {recentExams.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Calendar className="mx-auto text-slate-400 mb-2" size={28} />
              <p className="text-sm font-semibold text-slate-600">Belum ada jadwal ujian yang dibuat</p>
              <Link to="/dashboard/exams" className="btn-primary mt-3 inline-flex items-center space-x-1.5 text-xs py-2 px-3">
                <Plus size={14} />
                <span>Buat Jadwal Pertama</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Judul Ujian</th>
                    <th className="pb-3">Mata Pelajaran</th>
                    <th className="pb-3">Kelas / Rombel</th>
                    <th className="pb-3">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExams.map((exam) => (
                    <tr key={exam.ID} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 text-sm font-bold text-slate-800">
                        {exam.title}
                      </td>
                      <td className="py-3.5 text-xs text-slate-600 font-medium">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          exam.subject?.type === 'JURUSAN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {exam.subject?.name || 'Mapel'}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-slate-600 align-top">
                        <ClassBadgesList classes={exam.classes} maxVisible={2} containerClassName="max-w-[200px]" emptyText="Semua" />
                      </td>
                      <td className="py-3.5 text-xs font-bold text-slate-700">
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
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <School size={20} className="mr-2 text-primary-600" />
            Alur Kerja SMK
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Petunjuk praktis bagi Admin dan Guru dalam mengelola ujian di SMK N 1 Beringin:
          </p>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Admin Menyiapkan Data Kelas</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Tentukan Tingkat (X, XI, XII), Jurusan (PPLG, TKJ, dll), dan Rombel (1, 2, 3).</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Guru Menginputkan Mapel & Soal</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pilih tipe mapel (Akademik/Kejuruan) lalu ketik soal dengan gambar, teks Arab, & rumus KaTeX.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Jadwalkan Ujian ke Kelas Terkait</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pilih mapel ujian, tentukan durasi, lalu centang rombel/jurusan mana saja yang wajib ikut.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
