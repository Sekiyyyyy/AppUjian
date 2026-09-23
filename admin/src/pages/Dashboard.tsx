import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, 
  School, 
  BookOpen, 
  Calendar, 
  Plus, 
  ArrowRight,
  Clock,
  Search
} from 'lucide-react';
import ClassBadgesList from '../components/ClassBadgesList';

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
  duration: number;
  start_time?: string;
  end_time?: string;
  status?: string;
  is_makeup_open?: boolean;
  proktor?: string;
  pengawas?: string;
  subject?: {
    id: number;
    name: string;
    type?: string;
  };
  category?: {
    id: number;
    name: string;
  };
  classes?: Array<{ ID: number; name: string; level?: string; department?: string; number?: string }>;
  CreatedAt?: string;
}

const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    classesCount: 0,
    subjectsCount: 0,
    questionsCount: 0,
    examsCount: 0,
    studentsCount: 0,
  });

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        const [classesRes, subjectsRes, questionsRes, examsRes, studentsRes] = await Promise.allSettled([
          axios.get('/api/v1/admin/classes', { headers }),
          axios.get('/api/v1/admin/subjects', { headers }),
          axios.get('/api/v1/admin/questions', { headers }),
          axios.get('/api/v1/admin/exams', { headers }),
          axios.get('/api/v1/admin/students', { headers }),
        ]);

        const classesData: ClassItem[] = classesRes.status === 'fulfilled' ? classesRes.value.data || [] : [];
        const subjectsData = subjectsRes.status === 'fulfilled' ? subjectsRes.value.data || [] : [];
        const questionsData = questionsRes.status === 'fulfilled' ? questionsRes.value.data || [] : [];
        const examsData: ExamItem[] = examsRes.status === 'fulfilled' ? examsRes.value.data || [] : [];
        const studentsData = studentsRes.status === 'fulfilled' ? studentsRes.value.data || [] : [];

        setExams(examsData);

        setStats({
          classesCount: classesData.length,
          subjectsCount: subjectsData.length,
          questionsCount: questionsData.length,
          examsCount: examsData.length,
          studentsCount: studentsData.length,
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  // Live real-time status helper
  const getExamLiveStatus = (exam: ExamItem): 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' => {
    const now = Date.now();
    const start = exam.start_time ? new Date(exam.start_time).getTime() : 0;
    const end = exam.end_time ? new Date(exam.end_time).getTime() : 0;

    if (exam.status === 'ACTIVE' || (start > 0 && end > 0 && now >= start && now <= end)) {
      return 'ACTIVE';
    }
    if (exam.status === 'COMPLETED' || (end > 0 && now > end)) {
      return 'COMPLETED';
    }
    return 'SCHEDULED';
  };

  // Exam counts by status
  const { activeExams, scheduledExams, completedExams } = useMemo(() => {
    const active: ExamItem[] = [];
    const scheduled: ExamItem[] = [];
    const completed: ExamItem[] = [];

    exams.forEach((exam) => {
      const status = getExamLiveStatus(exam);
      if (status === 'ACTIVE') {
        active.push(exam);
      } else if (status === 'COMPLETED') {
        completed.push(exam);
      } else {
        scheduled.push(exam);
      }
    });

    return {
      activeExams: active,
      scheduledExams: scheduled,
      completedExams: completed,
    };
  }, [exams]);

  // Filtered and searched exams
  const filteredExams = useMemo(() => {
    let list = exams;
    if (activeFilter === 'ACTIVE') list = activeExams;
    if (activeFilter === 'SCHEDULED') list = scheduledExams;
    if (activeFilter === 'COMPLETED') list = completedExams;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((exam) => {
      const titleMatch = exam.title?.toLowerCase().includes(q);
      const subjectMatch = exam.subject?.name?.toLowerCase().includes(q);
      const classMatch = exam.classes?.some((c) => c.name?.toLowerCase().includes(q));
      return titleMatch || subjectMatch || classMatch;
    });
  }, [activeFilter, exams, activeExams, scheduledExams, completedExams, searchQuery]);

  // 4 Simple, Clean Stat Cards (No 3rd line, No truncation, Beautiful spacing)
  const statCards = [
    { 
      label: 'TOTAL SISWA', 
      value: stats.studentsCount.toLocaleString('id-ID'), 
      icon: <Users size={22} className="text-blue-600" />, 
      circleBg: 'bg-blue-50',
      link: '/dashboard/users'
    },
    { 
      label: 'TOTAL KELAS', 
      value: stats.classesCount, 
      icon: <School size={22} className="text-emerald-600" />, 
      circleBg: 'bg-emerald-50',
      link: '/dashboard/classes'
    },
    { 
      label: 'MATA PELAJARAN', 
      value: stats.subjectsCount, 
      icon: <BookOpen size={22} className="text-amber-600" />, 
      circleBg: 'bg-amber-50',
      link: '/dashboard/subjects'
    },
    { 
      label: 'JADWAL UJIAN', 
      value: stats.examsCount, 
      icon: <Calendar size={22} className="text-indigo-600" />, 
      circleBg: 'bg-indigo-50',
      link: '/dashboard/exams'
    },
  ];

  // Format schedule date nicely
  const formatScheduleDate = (startStr?: string, endStr?: string) => {
    if (!startStr) return '-';
    try {
      const start = new Date(startStr);
      const dateText = start.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const timeStart = start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      if (!endStr) return `${dateText}, ${timeStart} WIB`;
      const end = new Date(endStr);
      const timeEnd = end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      return `${dateText}, ${timeStart} - ${timeEnd} WIB`;
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Clean, Uncluttered Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Link
            key={idx}
            to={stat.link}
            className="glass-panel p-5 flex items-center space-x-4 group hover:border-primary-300 hover:shadow-xs transition-all duration-200"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${stat.circleBg} transition-transform group-hover:scale-105`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase truncate">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
                {stat.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Full-Width Section: Jadwal Ujian CBT */}
      <div className="glass-panel p-5 sm:p-6 space-y-5">
        {/* Header with Title, Search, Filters, and New Exam Button */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Jadwal Ujian CBT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar seluruh sesi ujian aktif, terjadwal, dan alokasi rombel peserta
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari ujian / mapel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-44 sm:w-52 transition-all"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({exams.length})
              </button>
              <button
                onClick={() => setActiveFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktif ({activeExams.length})
              </button>
              <button
                onClick={() => setActiveFilter('SCHEDULED')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'SCHEDULED'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Terjadwal ({scheduledExams.length})
              </button>
              <button
                onClick={() => setActiveFilter('COMPLETED')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'COMPLETED'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({completedExams.length})
              </button>
            </div>

            {/* Create Exam Button */}
            <Link
              to="/dashboard/exams"
              className="btn-primary text-xs py-1.5 px-3.5 space-x-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Buat Ujian</span>
            </Link>
          </div>
        </div>

        {/* Clean, Spacious Exam Table */}
        {filteredExams.length === 0 ? (
          <div className="py-16 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Calendar className="mx-auto text-slate-400 mb-2" size={28} />
            <p className="text-sm font-semibold text-slate-700">
              Tidak ada sesi ujian yang cocok
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Belum ada sesi ujian yang dibuat untuk kategori ini.'}
            </p>
            {!searchQuery && (
              <Link
                to="/dashboard/exams"
                className="btn-primary text-xs py-1.5 px-3.5 mt-4 inline-flex items-center space-x-1.5 shadow-xs"
              >
                <Plus size={14} />
                <span>Buat Jadwal Pertama</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4 font-semibold">Judul Ujian</th>
                  <th className="pb-3 px-4 font-semibold">Mata Pelajaran</th>
                  <th className="pb-3 px-4 font-semibold">Kelas / Rombel</th>
                  <th className="pb-3 px-4 font-semibold">Jadwal & Waktu</th>
                  <th className="pb-3 px-4 font-semibold">Status</th>
                  <th className="pb-3 pl-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((exam) => {
                  const liveStatus = getExamLiveStatus(exam);
                  const isOngoing = liveStatus === 'ACTIVE';
                  const isPast = liveStatus === 'COMPLETED';

                  return (
                    <tr key={exam.ID} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Judul Ujian */}
                      <td className="py-4 pr-4">
                        <p className="text-sm font-bold text-slate-800 leading-snug">
                          {exam.title}
                        </p>
                        {exam.category?.name && (
                          <span className="inline-block text-[11px] font-medium text-slate-400 mt-0.5">
                            {exam.category.name}
                          </span>
                        )}
                      </td>

                      {/* Mata Pelajaran */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          exam.subject?.type === 'JURUSAN'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                            : 'bg-blue-50 text-blue-800 border border-blue-200/60'
                        }`}>
                          {exam.subject?.name || 'Mata Pelajaran'}
                        </span>
                      </td>

                      {/* Kelas / Rombel */}
                      <td className="py-4 px-4 align-middle">
                        <ClassBadgesList 
                          classes={exam.classes} 
                          maxVisible={2} 
                          containerClassName="max-w-xs" 
                          emptyText="Semua Kelas" 
                        />
                      </td>

                      {/* Jadwal & Waktu */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-xs font-medium text-slate-700">
                          {formatScheduleDate(exam.start_time, exam.end_time)}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5 flex items-center space-x-1">
                          <Clock size={11} className="text-slate-400" />
                          <span>{exam.duration} Menit</span>
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {isOngoing && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                              <span>Berlangsung</span>
                            </span>
                          )}
                          {!isOngoing && !isPast && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                              Terjadwal
                            </span>
                          )}
                          {isPast && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                              Selesai
                            </span>
                          )}

                          {exam.is_makeup_open && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                              Susulan
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <Link
                          to="/dashboard/exams"
                          className="inline-flex items-center space-x-1 text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors"
                        >
                          <span>Kelola</span>
                          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
