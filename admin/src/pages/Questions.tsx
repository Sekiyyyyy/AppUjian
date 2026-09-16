import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, List, AlertCircle, Edit2, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Subject {
  ID: number;
  name: string;
  class: string;
}

interface Question {
  ID: number;
  subject_id: number;
  type: string;
  content: string;
  points: number;
  CreatedAt: string;
}
const modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'direction': 'rtl' }], // Supports Arabic Right-to-Left
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'image', 'video', 'formula'], // Added formula for KaTeX
    ['clean']
  ]
};

const miniModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    ['image', 'formula'], // Allow image and math formulas for options
    ['clean']
  ]
};

const Questions = () => {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [content, setContent] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [optionE, setOptionE] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [points, setPoints] = useState(10);

  const getOptionValue = (opt: string) => {
    if (opt === 'A') return optionA;
    if (opt === 'B') return optionB;
    if (opt === 'C') return optionC;
    if (opt === 'D') return optionD;
    if (opt === 'E') return optionE;
    return '';
  };

  const setOptionValue = (opt: string, val: string) => {
    if (opt === 'A') setOptionA(val);
    else if (opt === 'B') setOptionB(val);
    else if (opt === 'C') setOptionC(val);
    else if (opt === 'D') setOptionD(val);
    else if (opt === 'E') setOptionE(val);
  };


  const fetchSubjects = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/v1/admin/questions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchQuestions();
  }, []);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      setError("Pilih mata pelajaran terlebih dahulu");
      return;
    }
    
    setIsLoading(true);
    setError('');

    const optionsJSON = { A: optionA, B: optionB, C: optionC, D: optionD, E: optionE };

    try {
      await axios.post('http://localhost:8080/api/v1/admin/questions', {
        subject_id: selectedSubjectId,
        type: 'MULTIPLE_CHOICE',
        content,
        options: optionsJSON,
        correct_answer: correctAnswer,
        points: Number(points)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsModalOpen(false);
      fetchQuestions();
      
      // Reset form
      setContent(''); setOptionA(''); setOptionB(''); setOptionC(''); setOptionD(''); setOptionE('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal menyimpan soal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!(await confirmAction(`Hapus Soal`, `Yakin ingin menghapus soal ini?`))) return;

    try {
      await axios.delete(`http://localhost:8080/api/v1/admin/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(questions.filter(q => q.ID !== id));
      showSuccessToast('Soal dihapus');
    } catch (err) {
      showErrorToast('Gagal menghapus soal');
    }
  };

  // Filter questions for the selected subject
  const filteredQuestions = selectedSubjectId 
    ? questions.filter(q => q.subject_id === selectedSubjectId)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Bank Soal</h1>
          <p className="text-slate-500 mt-1">Pilih mata pelajaran untuk mengelola soal.</p>
        </div>
      </header>

      {/* Subject Selector */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Mata Pelajaran (Kategori Folder)</label>
          <div className="relative">
            <select
              className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-xl appearance-none bg-white/50 backdrop-blur-sm"
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            >
              <option value="" disabled>-- Klik untuk memilih Mata Pelajaran --</option>
              {subjects.map(s => (
                <option key={s.ID} value={s.ID}>{s.name} ({s.class})</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={!selectedSubjectId}
          className={`px-4 py-3 rounded-xl font-medium flex items-center space-x-2 transition-all ${selectedSubjectId ? 'btn-primary' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          <Plus size={20} />
          <span>Tambah Soal</span>
        </button>
      </div>

      {/* Table */}
      {selectedSubjectId ? (
        <div className="glass-panel overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipe</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Potongan Soal</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Poin</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                          <BookOpen className="text-slate-400" size={24} />
                        </div>
                        <p className="font-medium text-slate-700">Folder ini kosong</p>
                        <p className="text-sm mt-1">Belum ada soal untuk mata pelajaran ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q) => (
                    <tr key={q.ID} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Pilihan Ganda
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 max-w-xs truncate">
                        {/* Strip HTML tags for preview */}
                        {q.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}...
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-800 text-center">{q.points}</td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(q.ID)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <AlertCircle size={48} className="mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-600">Pilih mata pelajaran di atas</p>
          <p className="text-sm">Untuk mulai membuat atau melihat soal ujian.</p>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="glass-panel w-full max-w-4xl bg-white shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <BookOpen className="mr-2 text-primary-600" size={24}/>
                Buat Soal Baru (Rich Text)
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleCreateQuestion} className="p-6 space-y-6 bg-slate-50/30">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-sm border border-red-100">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pertanyaan Utama</label>
                <div className="h-64 mb-12">
                   <ReactQuill 
                      theme="snow" 
                      value={content} 
                      onChange={setContent}
                      modules={modules}
                      className="h-48"
                      placeholder="Ketik pertanyaan, sisipkan gambar, atau gunakan teks Arab di sini..."
                   />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Kiri: Opsi Jawaban */}
                <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Pilihan Jawaban Singkat</h3>
                  
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <div key={opt} className="flex flex-col space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          value={opt}
                          checked={correctAnswer === opt}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className={`text-sm font-bold ${correctAnswer === opt ? 'text-primary-600' : 'text-slate-500'}`}>
                          Opsi {opt} {correctAnswer === opt && '(Kunci Jawaban)'}
                        </span>
                      </div>
                      <div className="bg-white">
                        <ReactQuill 
                          theme="snow" 
                          value={getOptionValue(opt)} 
                          onChange={(val) => setOptionValue(opt, val)}
                          modules={miniModules}
                          className="h-24 pb-12"
                          placeholder={`Ketik atau sisipkan gambar untuk opsi ${opt}...`}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs flex items-start">
                    <AlertCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
                    Pilih bulatan radio button untuk menentukan kunci jawaban yang benar.
                  </div>
                </div>

                {/* Kanan: Setting */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                   <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Pengaturan Soal</h3>
                   <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Bobot Nilai (Poin)</label>
                      <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        min="1"
                        required
                      />
                   </div>
                   
                   <div className="mt-auto pt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors w-1/2"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-1/2"
                      >
                        {isLoading ? 'Menyimpan...' : 'Simpan Soal'}
                      </button>
                   </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;
