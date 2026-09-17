import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import { GlobalAlert } from './components/GlobalAlert';
import { Loader2 } from 'lucide-react';

// Lazy-loaded pages for high-performance code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Questions = lazy(() => import('./pages/Questions'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Classes = lazy(() => import('./pages/Classes'));
const Exams = lazy(() => import('./pages/Exams'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));
const Categories = lazy(() => import('./pages/Categories'));
const ClassDetails = lazy(() => import('./pages/ClassDetails'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px] w-full">
    <div className="flex flex-col items-center space-y-3">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <span className="text-sm font-medium text-gray-500">Memuat halaman...</span>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <GlobalAlert />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="classes" element={<Classes />} />
              <Route path="classes/:id" element={<ClassDetails />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="questions" element={<Questions />} />
              <Route path="exams" element={<Exams />} />
              <Route path="categories" element={<Categories />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
