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
  X
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
        <div className="glass-panel p-8 text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h1>
          <p className="text-slate-600 mb-6 text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <button onClick={logout} className="btn-primary w-full">Kembali ke Login</button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/dashboard/classes', icon: <School size={20} />, label: 'Data Kelas (SMK)', adminOnly: true },
    { path: '/dashboard/subjects', icon: <BookOpen size={20} />, label: 'Mata Pelajaran' },
    { path: '/dashboard/questions', icon: <Database size={20} />, label: 'Bank Soal' },
    { path: '/dashboard/categories', icon: <BookmarkCheck size={20} />, label: 'Kategori Ujian', adminOnly: true },
    { path: '/dashboard/exams', icon: <Calendar size={20} />, label: 'Jadwal Ujian' },
    { path: '/dashboard/users', icon: <Users size={20} />, label: 'Manajemen Pengguna', adminOnly: true },
    { path: '/dashboard/settings', icon: <Settings size={20} />, label: 'Pengaturan', adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Top Navigation Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-30 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Buka Menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-xs" />
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight block">
                SMK N 1 Beringin
              </span>
              <span className="text-[10px] font-semibold text-primary-600 block">
                CBT Application
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs shadow-2xs">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar (Drawer on mobile, sticky/fixed on desktop) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-72 p-3.5' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-20 lg:p-2.5' : 'lg:w-64 lg:p-4'
        }`}
      >
        <div className={`glass-panel h-full w-full flex flex-col relative overflow-hidden bg-white/95 shadow-xl lg:shadow-md ${
          isCollapsed ? 'lg:p-1.5 p-3' : 'p-3.5'
        }`}>
          {/* Header & Logo */}
          <div className="flex items-center justify-between px-1 mb-5 mt-1">
            <div className={`flex items-center space-x-3 overflow-hidden transition-all ${isCollapsed ? 'lg:justify-center w-full' : ''}`}>
              <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-sm" />
              {(!isCollapsed || isMobileOpen) && (
                <div className="overflow-hidden">
                  <span className="text-base font-extrabold text-slate-800 tracking-tight leading-tight block truncate">
                    SMK N 1
                  </span>
                  <span className="text-xs font-semibold text-primary-600 block truncate">
                    Beringin CBT
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

          {/* Toggle Button on Sidebar (Desktop only) */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Perbesar Menu' : 'Perkecil Menu'}
            className={`hidden lg:flex mb-3 items-center justify-center bg-slate-100/80 hover:bg-primary-50 hover:text-primary-600 text-slate-500 rounded-xl transition-colors ${
              isCollapsed ? 'w-11 h-11 mx-auto' : 'w-full py-2 px-2'
            }`}
          >
            {isCollapsed ? <ChevronRight size={18} /> : (
              <div className="flex items-center justify-between w-full px-2 text-xs font-bold">
                <span>Perkecil Menu</span>
                <ChevronLeft size={18} />
              </div>
            )}
          </button>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar py-1">
            {menuItems.map((item) => {
              if (item.adminOnly && user?.role !== 'ADMIN') return null;
              
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center rounded-xl transition-all duration-200 group relative ${
                    isCollapsed 
                      ? 'lg:justify-center lg:w-11 lg:h-11 lg:mx-auto px-3.5 py-3 space-x-3' 
                      : 'space-x-3 px-3.5 py-2.5'
                  } ${
                    isActive 
                      ? 'bg-primary-600 text-white font-semibold shadow-md shadow-primary-500/20' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}

                  {/* Floating tooltip when collapsed (desktop) */}
                  {isCollapsed && (
                    <span className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="mt-auto border-t border-slate-200/80 pt-3">
            <div className={`flex items-center mb-3 ${isCollapsed ? 'lg:justify-center px-1' : 'space-x-3 px-1'}`}>
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.username}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{user?.role}</p>
                </div>
              )}
            </div>

            <button 
              onClick={logout}
              title={isCollapsed ? 'Keluar' : undefined}
              className={`flex items-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors ${
                isCollapsed ? 'lg:justify-center lg:w-11 lg:h-11 lg:mx-auto px-3 py-2.5 space-x-2.5' : 'space-x-2.5 w-full px-3 py-2'
              }`}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="text-sm font-bold">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`flex-1 min-w-0 w-full transition-all duration-300 ease-in-out pt-20 lg:pt-6 p-4 sm:p-6 lg:p-7 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto min-w-0 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
