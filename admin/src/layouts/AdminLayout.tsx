import { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  LogOut, 
  Settings, 
  School,
  ChevronLeft,
  ChevronRight,
  Database,
  BookmarkCheck,
  Menu,
  X,
  Clock,
  User as UserIcon
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  // Collapsible sidebar state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Live Clock & Date state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'TEACHER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="glass-panel p-8 text-center max-w-md w-full shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h1>
          <p className="text-slate-600 mb-6 text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <button onClick={logout} className="btn-primary w-full">Kembali ke Login</button>
        </div>
      </div>
    );
  }

  const menuSections = [
    {
      title: 'MENU UTAMA',
      items: [
        { path: '/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
        { path: '/dashboard/classes', icon: <School size={19} />, label: 'Manajemen Kelas', adminOnly: true },
        { path: '/dashboard/subjects', icon: <BookOpen size={19} />, label: 'Mata Pelajaran' },
        { path: '/dashboard/questions', icon: <Database size={19} />, label: 'Bank Soal' },
        { path: '/dashboard/exams', icon: <Calendar size={19} />, label: 'Jadwal Ujian' },
      ]
    },
    {
      title: 'KONFIGURASI',
      items: [
        { path: '/dashboard/categories', icon: <BookmarkCheck size={19} />, label: 'Kategori Ujian', adminOnly: true },
        { path: '/dashboard/users', icon: <Users size={19} />, label: 'Manajemen Pengguna', adminOnly: true },
        { path: '/dashboard/settings', icon: <Settings size={19} />, label: 'Pengaturan', adminOnly: true },
      ]
    }
  ];

  // Helper to find active route title
  let currentRouteName = 'Dashboard';
  for (const sec of menuSections) {
    const match = sec.items.find(m => m.path === location.pathname);
    if (match) {
      currentRouteName = match.label;
      break;
    }
  }

  // Live time formatting matching theme: 07.18.25 and WEDNESDAY, 23 SEPTEMBER 2026
  const timeFormatted = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/:/g, '.');

  const dateFormatted = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Navigation Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-30 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Buka Menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="Logo SMK Negeri 1 Beringin" className="w-8 h-8 object-contain flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight leading-tight block">
                SMK N 1 Beringin
              </span>
              <span className="text-[10px] font-semibold text-primary-600 block">
                CBT Portal
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile Clock & Avatar */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
            {timeFormatted}
          </span>
          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold flex items-center justify-center text-xs border border-primary-200/50">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out bg-white border-r border-slate-200/80 flex flex-col ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
          <div className={`flex items-center space-x-3 overflow-hidden ${isCollapsed ? 'lg:justify-center w-full' : ''}`}>
            <img src="/logo.png" alt="Logo SMK N 1 Beringin" className="w-8 h-8 object-contain flex-shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <div className="overflow-hidden">
                <span className="text-sm font-bold text-slate-900 tracking-tight leading-tight block truncate">
                  SMK N 1 Beringin
                </span>
                <span className="text-[11px] font-semibold text-primary-600 block truncate">
                  CBT Portal
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav Links Grouped into Sections */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-5">
          {menuSections.map((sec, secIdx) => {
            const visibleItems = sec.items.filter(item => !item.adminOnly || user?.role === 'ADMIN');
            if (visibleItems.length === 0) return null;

            return (
              <div key={secIdx} className="space-y-1">
                {(!isCollapsed || isMobileOpen) ? (
                  <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {sec.title}
                  </p>
                ) : (
                  <div className="w-8 h-px bg-slate-200 mx-auto my-2" />
                )}

                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center rounded-xl transition-all duration-150 group relative ${
                        isCollapsed 
                          ? 'lg:justify-center lg:w-11 lg:h-11 lg:mx-auto px-3 py-2.5' 
                          : 'space-x-3 px-3.5 py-2.5'
                      } ${
                        isActive 
                          ? 'bg-primary-50 text-primary-600 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-500 group-hover:text-slate-800'}`}>
                        {item.icon}
                      </span>
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="text-[13px] tracking-tight truncate">{item.label}</span>
                      )}

                      {/* Tooltip when collapsed */}
                      {isCollapsed && (
                        <span className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer (User Info & Logout matching Reference) */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* Collapse Toggle (Desktop only) */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Perbesar Menu' : 'Perkecil Menu'}
            className={`hidden lg:flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 rounded-xl transition-colors ${
              isCollapsed ? 'w-11 h-8 mx-auto' : 'w-full py-1 px-2.5 text-[11px] font-semibold text-slate-500'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight size={15} />
            ) : (
              <div className="flex items-center justify-between w-full">
                <span>Perkecil Menu</span>
                <ChevronLeft size={15} />
              </div>
            )}
          </button>

          {/* User Card */}
          <div className={`p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 ${
            isCollapsed ? 'flex justify-center p-2' : ''
          }`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="w-9 h-9 rounded-full bg-blue-100/70 text-blue-700 flex items-center justify-center flex-shrink-0">
                <UserIcon size={17} />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="overflow-hidden min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {user?.name || user?.username || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 capitalize">
                    {user?.role === 'ADMIN' ? 'Administrator' : 'Guru / Pengajar'}
                  </p>
                </div>
              )}
            </div>

            {/* Dedicated Log Out Button */}
            {(!isCollapsed || isMobileOpen) ? (
              <button 
                onClick={logout}
                className="w-full mt-2.5 flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50/80 py-1.5 px-3 rounded-lg border border-slate-200/60 transition-colors"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            ) : (
              <button 
                onClick={logout}
                title="Log Out"
                className="w-8 h-8 mt-2 mx-auto flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Desktop Top Header Bar with Live Clock & Date */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-8 items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {currentRouteName}
            </h1>
          </div>

          {/* Clean Realtime Clock & Date matching Reference */}
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-1.5">
              <Clock size={15} className="text-primary-600 flex-shrink-0" />
              <div className="text-sm font-bold text-slate-800 font-mono tracking-tight leading-none">
                {timeFormatted}
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1 leading-none">
              {dateFormatted}
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 min-w-0 w-full">
          <div className="max-w-7xl mx-auto min-w-0 w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
