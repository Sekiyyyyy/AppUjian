import { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileQuestion, 
  Calendar, 
  LogOut, 
  Settings, 
  School,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  // Collapsible sidebar state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="glass-panel p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h1>
          <p className="text-slate-600 mb-6">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <button onClick={logout} className="btn-primary">Kembali ke Login</button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/dashboard/classes', icon: <School size={20} />, label: 'Data Kelas (SMK)', adminOnly: true },
    { path: '/dashboard/subjects', icon: <BookOpen size={20} />, label: 'Mata Pelajaran' },
    { path: '/dashboard/questions', icon: <Database size={20} />, label: 'Bank Soal' },
    { path: '/dashboard/exams', icon: <Calendar size={20} />, label: 'Jadwal Ujian' },
    { path: '/dashboard/users', icon: <Users size={20} />, label: 'Manajemen Pengguna', adminOnly: true },
    { path: '/dashboard/settings', icon: <Settings size={20} />, label: 'Pengaturan', adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={`fixed h-full z-20 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20 p-2.5' : 'w-64 p-4'
        }`}
      >
        <div className={`glass-panel h-full w-full flex flex-col relative overflow-hidden ${
          isCollapsed ? 'p-1.5' : 'p-3'
        }`}>
          {/* Header & Logo */}
          <div className="flex items-center justify-between px-1 mb-6 mt-1">
            <div className={`flex items-center space-x-3 overflow-hidden transition-all ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-sm" />
              {!isCollapsed && (
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
          </div>

          {/* Toggle Button on Sidebar */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Perbesar Menu' : 'Perkecil Menu'}
            className={`mb-4 flex items-center justify-center bg-slate-100/80 hover:bg-primary-50 hover:text-primary-600 text-slate-500 rounded-xl transition-colors ${
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
          <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => {
              if (item.adminOnly && user?.role !== 'ADMIN') return null;
              
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-xl transition-all duration-200 group relative ${
                    isCollapsed 
                      ? 'justify-center w-11 h-11 mx-auto' 
                      : 'space-x-3 px-3.5 py-3'
                  } ${
                    isActive 
                      ? 'bg-primary-600 text-white font-semibold shadow-md shadow-primary-500/20' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}

                  {/* Floating tooltip when collapsed */}
                  {isCollapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="mt-auto border-t border-slate-200/80 pt-3">
            <div className={`flex items-center mb-3 ${isCollapsed ? 'justify-center' : 'space-x-3 px-1'}`}>
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              {!isCollapsed && (
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
                isCollapsed ? 'justify-center w-11 h-11 mx-auto' : 'space-x-2.5 w-full px-3 py-2.5'
              }`}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-bold">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`flex-1 transition-all duration-300 ease-in-out p-8 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
