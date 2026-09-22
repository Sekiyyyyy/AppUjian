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
  Sparkles,
  ExternalLink
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

  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
    { path: '/dashboard/classes', icon: <School size={19} />, label: 'Data Kelas (SMK)', adminOnly: true },
    { path: '/dashboard/subjects', icon: <BookOpen size={19} />, label: 'Mata Pelajaran' },
    { path: '/dashboard/questions', icon: <Database size={19} />, label: 'Bank Soal' },
    { path: '/dashboard/categories', icon: <BookmarkCheck size={19} />, label: 'Kategori Ujian', adminOnly: true },
    { path: '/dashboard/exams', icon: <Calendar size={19} />, label: 'Jadwal Ujian' },
    { path: '/dashboard/users', icon: <Users size={19} />, label: 'Manajemen Pengguna', adminOnly: true },
    { path: '/dashboard/settings', icon: <Settings size={19} />, label: 'Pengaturan', adminOnly: true },
  ];

  const currentRouteName = menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Navigation Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-30 px-4 flex items-center justify-between">
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
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
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
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
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

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            if (item.adminOnly && user?.role !== 'ADMIN') return null;
            
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
                    ? 'bg-primary-600 text-white font-semibold shadow-xs shadow-primary-600/30' 
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                }`}
              >
                <span className="flex-shrink-0 transition-transform group-hover:scale-105">{item.icon}</span>
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

        {/* Sidebar Footer (Collapse Toggle & Profile) */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* Toggle Button on Sidebar (Desktop only) */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Perbesar Menu' : 'Perkecil Menu'}
            className={`hidden lg:flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition-colors ${
              isCollapsed ? 'w-11 h-9 mx-auto' : 'w-full py-1.5 px-2.5 text-xs font-semibold'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <div className="flex items-center justify-between w-full">
                <span>Kecilkan Menu</span>
                <ChevronLeft size={16} />
              </div>
            )}
          </button>

          {/* User Profile Card */}
          <div className={`flex items-center p-2 rounded-xl bg-slate-50 border border-slate-100 ${
            isCollapsed ? 'lg:justify-center p-1.5' : 'justify-between space-x-2.5'
          }`}>
            <div className={`flex items-center space-x-2.5 overflow-hidden ${isCollapsed ? 'lg:justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.username}</p>
                  <span className="inline-block text-[10px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.2 rounded mt-0.5">
                    {user?.role}
                  </span>
                </div>
              )}
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <button 
                onClick={logout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                aria-label="Logout"
              >
                <LogOut size={16} />
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
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-8 items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {currentRouteName}
            </h1>
            <span className="text-slate-300">/</span>
            <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>CBT Aktif • Semester Ganjil</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/dashboard/exams"
              className="btn-primary text-xs py-1.5 px-3.5 space-x-1.5 shadow-xs"
            >
              <span>+ Jadwalkan Ujian</span>
            </Link>
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

