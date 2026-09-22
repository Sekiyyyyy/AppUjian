import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/v1/auth/login', {
        username,
        password,
        device_id: 'web-admin-portal'
      });

      const { token, user } = response.data;
      
      if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
        setError('Akses ditolak. Portal ini khusus untuk Admin dan Guru.');
        setIsLoading(false);
        return;
      }

      login(user, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Koneksi ke server gagal. Pastikan backend berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center mb-4 transform hover:scale-105 transition-transform">
            <img 
              src="/logo.png" 
              alt="Logo SMK Negeri 1 Beringin" 
              width="96" 
              height="96" 
              loading="eager" 
              decoding="async" 
              className="w-24 h-24 object-contain drop-shadow-md" 
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">SMK Negeri 1 Beringin</h1>
          <p className="text-slate-600 mt-1 text-sm font-medium">Portal Manajemen Ujian Sekolah</p>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center space-x-2 mb-6 text-sm">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5" aria-label="Form Login Portal Ujian">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                <User className="text-slate-400" size={18} />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white/50 backdrop-blur-sm transition-all"
                placeholder="Masukkan username"
                required
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                <Lock className="text-slate-400" size={18} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white/50 backdrop-blur-sm transition-all"
                placeholder="Masukkan password"
                required
                aria-required="true"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              aria-label={isLoading ? "Sedang memproses masuk..." : "Masuk ke Portal Ujian"}
              className="btn-primary w-full flex justify-center items-center h-11 transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Memproses...</span>
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
