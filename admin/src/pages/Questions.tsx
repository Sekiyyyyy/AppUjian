import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Plus, BookOpen, AlertCircle, Edit2, Trash2, 
  Download, Upload, FileSpreadsheet, ChevronDown, FileUp, 
  CheckCircle2, Calendar, Clock, Sparkles, ArrowRight,
  School, Check, X, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface Subject {
  ID: number;
  name: string;
  type?: string;
  class?: string;
}

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
  subject_id: number;
  subject?: Subject;
  start_time: string;
  end_time: string;
  duration: number;
  total_points: number;
  status: string;
  tahun?: string;
  semester?: string;
  classes?: ClassItem[];
  questions?: Question[];
}

interface Question {
  ID: number;
  subject_id: number;
  type: string;
  content: string;
  correct_answer?: string;
  points: number;
  CreatedAt: string;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_DIM = 800;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const getCommonModules = (quillRef: React.MutableRefObject<ReactQuill | null>) => ({
  toolbar: {
    container: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image', 'video', 'formula'],
      ['clean']
    ],
    handlers: {
      image: function() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files ? input.files[0] : null;
          if (file && quillRef.current) {
            try {
              const base64Str = await compressImage(file);
              const quill = quillRef.current.getEditor();
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', base64Str);
              quill.setSelection(range.index + 1, 0);
            } catch (e) {
              console.error("Image compression failed", e);
            }
          }
        };
      }
    }
  }
});

const getMiniModules = (quillRef: React.MutableRefObject<ReactQuill | null>) => ({
  toolbar: {
    container: [
      ['bold', 'italic', 'underline'],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      ['image', 'formula'],
      ['clean']
    ],
    handlers: {
      image: function() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
          const file = input.files ? input.files[0] : null;
          if (file && quillRef.current) {
            try {
              const base64Str = await compressImage(file);
              const quill = quillRef.current.getEditor();
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', base64Str);
              quill.setSelection(range.index + 1, 0);
            } catch (e) {
              console.error("Image compression failed", e);
            }
          }
        };
      }
    }
  }
});

const Questions: React.FC = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Subjects & Exams state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(() => {
    const fromQuery = searchParams.get('subject');
    return fromQuery ? Number(fromQuery) : null;
  });

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(() => {
    const fromQuery = searchParams.get('exam_id');
    return fromQuery ? Number(fromQuery) : null;
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Manual Question Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [formError, setFormError] = useState('');

  // Quill refs
  const mainQuillRef = useRef<ReactQuill>(null);
  const optAQuillRef = useRef<ReactQuill>(null);
  const optBQuillRef = useRef<ReactQuill>(null);
  const optCQuillRef = useRef<ReactQuill>(null);
  const optDQuillRef = useRef<ReactQuill>(null);
  const optEQuillRef = useRef<ReactQuill>(null);

  const mainModules = useMemo(() => getCommonModules(mainQuillRef), []);
  const optAModules = useMemo(() => getMiniModules(optAQuillRef), []);
  const optBModules = useMemo(() => getMiniModules(optBQuillRef), []);
  const optCModules = useMemo(() => getMiniModules(optCQuillRef), []);
  const optDModules = useMemo(() => getMiniModules(optDQuillRef), []);
  const optEModules = useMemo(() => getMiniModules(optEQuillRef), []);

  const getModulesForOption = (opt: string) => {
    switch (opt) {
      case 'A': return optAModules;
      case 'B': return optBModules;
      case 'C': return optCModules;
      case 'D': return optDModules;
      case 'E': return optEModules;
      default: return optAModules;
    }
  };

  const getRefForOption = (opt: string) => {
    if (opt === 'A') return optAQuillRef;
    if (opt === 'B') return optBQuillRef;
    if (opt === 'C') return optCQuillRef;
    if (opt === 'D') return optDQuillRef;
    return optEQuillRef;
  };

  // Form State for Manual Question
  const [content, setContent] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [optionE, setOptionE] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');

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

  // Excel Template & Upload States
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState<number | ''>('');
  const [uploadExamId, setUploadExamId] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  // Quick Create Exam Modal State
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamTahun, setNewExamTahun] = useState('2026/2027');
  const [newExamSemester, setNewExamSemester] = useState('Ganjil');
  const [newExamSelectedClasses, setNewExamSelectedClasses] = useState<number[]>([]);
  const [classFilterLevel, setClassFilterLevel] = useState('ALL');
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [createExamError, setCreateExamError] = useState('');

  // 1. Fetch Subjects & Classes on Mount
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [subRes, classRes] = await Promise.allSettled([
          axios.get('/api/v1/admin/subjects', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('/api/v1/admin/classes', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (subRes.status === 'fulfilled') {
          const subData: Subject[] = subRes.value.data || [];
          setSubjects(subData);

          // If no subject is chosen yet, choose the first or from url query
          const fromQuery = searchParams.get('subject');
          if (fromQuery) {
            setSelectedSubjectId(Number(fromQuery));
          } else if (subData.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(subData[0].ID);
          }
        }

        if (classRes.status === 'fulfilled') {
          setClassesList(classRes.value.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch subjects or classes', err);
      }
    };

    fetchInitial();
  }, [token]);

  // 2. Fetch Exams whenever selectedSubjectId changes
  const fetchExamsForSubject = async (subId: number) => {
    setIsLoadingExams(true);
    try {
      const res = await axios.get(`/api/v1/admin/exams?subject_id=${subId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const examList: ExamItem[] = res.data || [];
      setExams(examList);

      const queryExamId = searchParams.get('exam_id') ? Number(searchParams.get('exam_id')) : null;
      if (queryExamId && examList.some(e => e.ID === queryExamId)) {
        setSelectedExamId(queryExamId);
      } else if (examList.length > 0) {
        // Keep current selectedExamId if still valid, else select the first
        setSelectedExamId(prev => (prev && examList.some(e => e.ID === prev)) ? prev : examList[0].ID);
      } else {
        setSelectedExamId(null);
      }
    } catch (err) {
      console.error('Failed to fetch exams for subject', err);
    } finally {
      setIsLoadingExams(false);
    }
  };

  useEffect(() => {
    if (selectedSubjectId) {
      fetchExamsForSubject(selectedSubjectId);
    } else {
      setExams([]);
      setSelectedExamId(null);
    }
  }, [selectedSubjectId]);

  // 3. Fetch Questions whenever selectedExamId or selectedSubjectId changes
  const fetchQuestions = async () => {
    if (!selectedSubjectId) return;

    setIsLoadingQuestions(true);
    try {
      let url = `/api/v1/admin/questions?subject_id=${selectedSubjectId}`;
      if (selectedExamId) {
        url = `/api/v1/admin/questions?exam_id=${selectedExamId}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch questions', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedSubjectId, selectedExamId]);

  // Selected entities
  const selectedSubject = useMemo(() => {
    return subjects.find(s => s.ID === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  const selectedExam = useMemo(() => {
    return exams.find(e => e.ID === selectedExamId) || null;
  }, [exams, selectedExamId]);

  // Handle Create Question (Manual)
  const handleCreateQuestion = async (e?: React.FormEvent, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!selectedSubjectId) {
      setFormError('Pilih mata pelajaran terlebih dahulu');
      return;
    }
    if (!selectedExamId) {
      setFormError('Pilih atau buat ujian terlebih dahulu sebelum membuat soal');
      return;
    }
    if (!content.trim()) {
      setFormError('Pertanyaan utama tidak boleh kosong');
      return;
    }

    setIsSavingQuestion(true);
    setFormError('');

    const optionsJSON = { A: optionA, B: optionB, C: optionC, D: optionD, E: optionE };

    try {
      await axios.post('/api/v1/admin/questions', {
        subject_id: selectedSubjectId,
        exam_id: selectedExamId,
        type: 'MULTIPLE_CHOICE',
        content,
        options: optionsJSON,
        correct_answer: correctAnswer,
        points: 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast('Soal berhasil ditambahkan ke ujian ini');
      await fetchQuestions();
      if (selectedSubjectId) {
        fetchExamsForSubject(selectedSubjectId);
      }

      // Reset form
      setContent('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setOptionE('');
      setCorrectAnswer('A');

      if (!keepOpen) {
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Gagal menyimpan soal');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Handle Delete Question
  const handleDeleteQuestion = async (id: number) => {
    if (!(await confirmAction('Hapus Soal', 'Yakin ingin menghapus soal ini dari ujian?'))) return;

    try {
      await axios.delete(`/api/v1/admin/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(prev => prev.filter(q => q.ID !== id));
      showSuccessToast('Soal berhasil dihapus');
      if (selectedSubjectId) {
        fetchExamsForSubject(selectedSubjectId);
      }
    } catch {
      showErrorToast('Gagal menghapus soal');
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = async (count: number) => {
    setIsDownloading(count);
    try {
      const response = await axios.get(`/api/v1/admin/questions/template?count=${count}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Template_Soal_${count}_Butir.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccessToast(`Template ${count} butir soal berhasil diunduh`);
      setIsTemplateDropdownOpen(false);
    } catch {
      showErrorToast('Gagal mengunduh template Excel');
    } finally {
      setIsDownloading(null);
    }
  };

  // Open Upload Excel Modal
  const handleOpenUploadModal = () => {
    setUploadSubjectId(selectedSubjectId || (subjects.length > 0 ? subjects[0].ID : ''));
    setUploadExamId(selectedExamId || (exams.length > 0 ? exams[0].ID : ''));
    setSelectedFile(null);
    setUploadError('');
    setIsUploadModalOpen(true);
  };

  // Upload Excel
  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadSubjectId) {
      setUploadError('Pilih mata pelajaran tujuan terlebih dahulu');
      return;
    }
    if (!uploadExamId) {
      setUploadError('Pilih ujian tujuan terlebih dahulu sebelum upload soal');
      return;
    }
    if (!selectedFile) {
      setUploadError('Pilih file Excel (.xlsx) yang ingin diunggah');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('subject_id', String(uploadSubjectId));
      formData.append('exam_id', String(uploadExamId));
      formData.append('file', selectedFile);

      const res = await axios.post('/api/v1/admin/questions/import-excel', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      showSuccessToast(res.data?.message || 'Soal berhasil diimpor ke ujian!');
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setSelectedSubjectId(Number(uploadSubjectId));
      setSelectedExamId(Number(uploadExamId));
      await fetchQuestions();
      fetchExamsForSubject(Number(uploadSubjectId));
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Gagal mengimpor file Excel');
    } finally {
      setIsUploading(false);
    }
  };

  // Quick Create Exam
  const handleOpenCreateExam = () => {
    setNewExamTitle('');
    setNewExamTahun('2026/2027');
    setNewExamSemester('Ganjil');
    setNewExamSelectedClasses([]);
    setCreateExamError('');
    setIsCreateExamModalOpen(true);
  };

  const handleToggleExamClass = (classId: number) => {
    if (newExamSelectedClasses.includes(classId)) {
      setNewExamSelectedClasses(newExamSelectedClasses.filter(id => id !== classId));
    } else {
      setNewExamSelectedClasses([...newExamSelectedClasses, classId]);
    }
  };

  const handleSelectAllClasses = () => {
    const matching = classesList.filter(c => classFilterLevel === 'ALL' || c.level === classFilterLevel);
    const matchingIds = matching.map(c => c.ID);
    const allSelected = matchingIds.every(id => newExamSelectedClasses.includes(id));

    if (allSelected) {
      setNewExamSelectedClasses(newExamSelectedClasses.filter(id => !matchingIds.includes(id)));
    } else {
      setNewExamSelectedClasses(Array.from(new Set([...newExamSelectedClasses, ...matchingIds])));
    }
  };

  const handleSaveNewExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      setCreateExamError('Mata pelajaran belum dipilih');
      return;
    }
    if (!newExamTitle.trim()) {
      setCreateExamError('Judul ujian wajib diisi');
      return;
    }
    if (newExamSelectedClasses.length === 0) {
      setCreateExamError('Pilih minimal satu kelas peserta ujian');
      return;
    }

    setIsCreatingExam(true);
    setCreateExamError('');

    try {
      const res = await axios.post('/api/v1/admin/exams', {
        title: newExamTitle.trim(),
        subject_id: selectedSubjectId,
        tahun: newExamTahun,
        semester: newExamSemester,
        class_ids: newExamSelectedClasses,
        status: 'DRAFT',
        duration: 90
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast('Ujian baru berhasil dibuat! Silakan masukkan butir soal.');
      setIsCreateExamModalOpen(false);
      
      // Refresh exams and select this new one
      const createdExam = res.data;
      await fetchExamsForSubject(selectedSubjectId);
      if (createdExam?.ID) {
        setSelectedExamId(createdExam.ID);
        setSearchParams({ subject: String(selectedSubjectId), exam_id: String(createdExam.ID) });
      }
    } catch (err: any) {
      setCreateExamError(err.response?.data?.error || 'Gagal membuat ujian');
    } finally {
      setIsCreatingExam(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Bank Soal & Pengisian Soal Ujian
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Pilih mata pelajaran, tentukan ujian tujuan, lalu isi soal secara manual atau upload Excel.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
          {/* Dropdown Download Template Excel */}
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-2xs transition-all whitespace-nowrap"
            >
              <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
              <span>Unduh Template Excel</span>
              <ChevronDown size={15} className={`text-slate-400 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTemplateDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setIsTemplateDropdownOpen(false)}
                />
                <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-full sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Pilih Format Template</p>
                  </div>
                  
                  {[
                    { count: 35, desc: 'Bobot ~2.86 poin/soal' },
                    { count: 40, desc: 'Bobot 2.50 poin/soal (Standar)' },
                    { count: 45, desc: 'Bobot ~2.22 poin/soal' }
                  ].map(t => (
                    <button
                      key={t.count}
                      type="button"
                      onClick={() => handleDownloadTemplate(t.count)}
                      disabled={isDownloading !== null}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 group-hover:text-emerald-700">Template {t.count} Soal</p>
                        <p className="text-[11px] text-slate-400">{t.desc}</p>
                      </div>
                      <Download size={14} className="text-emerald-600 opacity-75 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Tombol Upload Excel */}
          <button
            type="button"
            onClick={handleOpenUploadModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-xs transition-all whitespace-nowrap"
          >
            <Upload size={16} className="shrink-0" />
            <span>Upload Soal Excel</span>
          </button>
        </div>
      </header>

      {/* Step Indicator Bar */}
      <div className="bg-gradient-to-r from-primary-50 via-white to-emerald-50 border border-primary-200/70 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 font-bold text-primary-900 uppercase tracking-wider">
            <Sparkles size={16} className="text-primary-600" />
            <span>Alur Pembuatan Ujian:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-semibold">
            <Link 
              to="/dashboard/subjects"
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:border-primary-300 text-slate-700 px-3 py-1.5 rounded-xl transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">✓</span>
              <span>Pilih Mapel</span>
            </Link>
            <Link
              to={selectedSubjectId ? `/dashboard/subjects/${selectedSubjectId}` : "/dashboard/subjects"}
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:border-primary-300 text-slate-700 px-3 py-1.5 rounded-xl transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">✓</span>
              <span>Buat Ujian</span>
            </Link>
            <div className="flex items-center space-x-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">3</span>
              <span>Masukkan Soal</span>
            </div>
            {selectedExamId ? (
              <Link 
                to={`/dashboard/exams?exam=${selectedExamId}&action=schedule`}
                className="flex items-center space-x-1.5 bg-white border border-primary-300 hover:bg-primary-50 text-primary-700 px-3 py-1.5 rounded-xl transition-all font-bold"
              >
                <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[11px] font-bold">4</span>
                <span>Atur Jadwal →</span>
              </Link>
            ) : (
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 text-slate-400 px-3 py-1.5 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold">4</span>
                <span>Atur Jadwal</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selector: Mata Pelajaran & Ujian Sasaran */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Pilih Mapel */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Kategori Mata Pelajaran:
            </label>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => {
                const subId = Number(e.target.value);
                setSelectedSubjectId(subId);
                setSearchParams({ subject: String(subId) });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>-- Pilih Mata Pelajaran --</option>
              {subjects.map(s => (
                <option key={s.ID} value={s.ID}>
                  {s.name} ({s.type === 'JURUSAN' ? 'Kejuruan SMK' : 'Akademik Umum'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pilih Ujian */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Ujian Tujuan (Wajib Dibuat Terlebih Dahulu):
              </label>
              {selectedSubjectId && exams.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenCreateExam}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Buat Ujian Baru</span>
                </button>
              )}
            </div>

            {isLoadingExams ? (
              <div className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                Memuat daftar ujian...
              </div>
            ) : exams.length === 0 ? (
              <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200 rounded-xl px-3.5 py-2">
                <span className="text-xs text-amber-800 font-medium">
                  Belum ada ujian untuk mapel ini.
                </span>
                <button
                  type="button"
                  onClick={handleOpenCreateExam}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Buat Ujian Sekarang</span>
                </button>
              </div>
            ) : (
              <select
                value={selectedExamId || ''}
                onChange={(e) => {
                  const examId = Number(e.target.value);
                  setSelectedExamId(examId);
                  setSearchParams({ subject: String(selectedSubjectId), exam_id: String(examId) });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {exams.map(ex => {
                  const classNames = ex.classes && ex.classes.length > 0
                    ? ex.classes.map(c => c.name).join(', ')
                    : 'Semua Kelas';
                  return (
                    <option key={ex.ID} value={ex.ID}>
                      {ex.title} ({ex.tahun || '2026/2027'} • {ex.semester || 'Ganjil'} • {classNames})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Active Exam Banner */}
      {selectedExam ? (
        <div className="bg-white rounded-2xl border border-primary-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedExam.status === 'SCHEDULED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {selectedExam.status === 'SCHEDULED' ? 'Terjadwal' : 'Draft / Belum Dijadwalkan'}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {selectedSubject?.name}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedExam.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                <span>Tahun: <strong>{selectedExam.tahun || '2026/2027'}</strong></span>
                <span>Semester: <strong>{selectedExam.semester || 'Ganjil'}</strong></span>
                <span>Peserta: <strong>{selectedExam.classes?.length || 0} Kelas Terdaftar</strong></span>
                <span>Soal: <strong className="text-primary-700 font-bold">{questions.length} Butir</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
              >
                <Plus size={16} />
                <span>Tambah Soal Manual</span>
              </button>

              <Link
                to={`/dashboard/exams?exam=${selectedExam.ID}&action=schedule`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
              >
                <Clock size={16} />
                <span>Atur Jadwal Ujian Ini →</span>
              </Link>
            </div>
          </div>
        </div>
      ) : selectedSubjectId && exams.length === 0 ? (
        /* Empty State: No Exam Yet */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
            <Calendar size={28} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">
              Belum Ada Ujian untuk Mata Pelajaran Ini
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Sesuai alur, Anda wajib membuat Ujian Baru terlebih dahulu (tentukan judul ujian, tahun ajaran, dan kelas peserta) sebelum memasukkan butir soal.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateExam}
            className="btn-primary inline-flex items-center space-x-1.5 text-xs font-bold px-5 py-2.5"
          >
            <Plus size={16} />
            <span>Buat Ujian Baru Sekarang</span>
          </button>
        </div>
      ) : null}

      {/* Questions Data Table */}
      {selectedExam && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Soal Ujian:
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                {questions.length} Butir Soal
              </span>
            </div>

            <span className="text-xs text-slate-400">
              Skor akhir ujian otomatis diskalakan ke 100 poin
            </span>
          </div>

          {isLoadingQuestions ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-medium">Memuat butir soal...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto text-slate-400">
                <BookOpen size={22} />
              </div>
              <p className="text-sm font-bold text-slate-700">Belum ada butir soal pada ujian ini</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Silakan klik "Tambah Soal Manual" atau gunakan "Upload Soal Excel" di atas untuk memasukkan butir soal ujian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-32">Tipe</th>
                    <th className="py-3 px-4">Potongan Pertanyaan</th>
                    <th className="py-3 px-4 w-24 text-center">Kunci</th>
                    <th className="py-3 px-4 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {questions.map((q, idx) => {
                    // Strip HTML tags for clean preview
                    const cleanText = q.content.replace(/<[^>]*>?/gm, '').trim();
                    return (
                      <tr key={q.ID} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            Pilihan Ganda
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                            {cleanText || '(Soal berbasis gambar/multimedia)'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-xs">
                            {q.correct_answer || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => handleDeleteQuestion(q.ID)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Soal"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MANUAL QUESTION INPUT (WITH QUILL)                 */}
      {/* ========================================================= */}
      {isModalOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl shadow-2xl relative z-10 max-h-[92vh] overflow-y-auto rounded-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Tambah Soal ke: {selectedExam.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedSubject?.name} &bull; Soal ke-{questions.length + 1}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => handleCreateQuestion(e, false)} className="p-6 space-y-4 bg-slate-50/40">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-xs border border-red-100">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Pertanyaan Utama */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pertanyaan Utama:
                </label>
                <div className="h-56 mb-12">
                   <ReactQuill 
                      ref={mainQuillRef}
                      theme="snow" 
                      value={content} 
                      onChange={setContent}
                      modules={mainModules}
                      className="h-44"
                      placeholder="Ketik soal, rumus, sisipkan gambar, atau teks di sini..."
                   />
                </div>
              </div>

              {/* Opsi Jawaban (A - E) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilihan Jawaban (A - E) & Kunci Jawaban
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Klik radio button untuk memilih kunci jawaban benar
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    <div 
                      key={opt} 
                      className={`border rounded-xl p-3 transition-all ${
                        opt === 'E' ? 'md:col-span-2' : ''
                      } ${
                        correctAnswer === opt 
                          ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-300' 
                          : 'border-slate-200 bg-slate-50/40'
                      }`}
                    >
                      <label className="flex items-center space-x-2 pb-2 cursor-pointer select-none border-b border-slate-200/60 mb-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          value={opt}
                          checked={correctAnswer === opt}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className={`text-xs font-bold ${correctAnswer === opt ? 'text-primary-700' : 'text-slate-600'}`}>
                          Opsi {opt} {correctAnswer === opt && '✓ (Kunci Benar)'}
                        </span>
                      </label>
                      <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                        <ReactQuill 
                          ref={getRefForOption(opt)}
                          theme="snow" 
                          value={getOptionValue(opt)} 
                          onChange={(val) => setOptionValue(opt, val)}
                          modules={getModulesForOption(opt)}
                          className="h-20 pb-10"
                          placeholder={`Ketik opsi ${opt}...`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex flex-col sm:flex-row justify-end items-center gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingQuestion}
                  onClick={(e) => handleCreateQuestion(e, true)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Simpan & Tambah Lagi
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="w-full sm:w-auto btn-primary px-5 py-2 text-xs font-bold shadow-xs"
                >
                  {isSavingQuestion ? 'Menyimpan...' : 'Simpan & Selesai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: UPLOAD SOAL EXCEL                                  */}
      {/* ========================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl shadow-2xl relative z-10 rounded-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Upload Soal via Excel (.xlsx)</h2>
                  <p className="text-xs text-slate-500">Impor butir soal langsung ke ujian yang dipilih</p>
                </div>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadExcel} className="p-6 overflow-y-auto space-y-4 flex-1">
              {uploadError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center space-x-2 text-xs border border-red-100">
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Mapel Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mata Pelajaran Tujuan:
                </label>
                <select
                  value={uploadSubjectId}
                  onChange={(e) => {
                    const sId = Number(e.target.value);
                    setUploadSubjectId(sId);
                    fetchExamsForSubject(sId);
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  required
                >
                  <option value="" disabled>-- Pilih Mata Pelajaran --</option>
                  {subjects.map(s => (
                    <option key={s.ID} value={s.ID}>
                      {s.name} ({s.type === 'JURUSAN' ? 'Kejuruan SMK' : 'Akademik Umum'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ujian Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ujian Tujuan:
                </label>
                <select
                  value={uploadExamId}
                  onChange={(e) => setUploadExamId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  required
                >
                  <option value="" disabled>-- Pilih Ujian Tujuan --</option>
                  {exams.map(ex => (
                    <option key={ex.ID} value={ex.ID}>
                      {ex.title} ({ex.tahun || '2026/2027'} • {ex.semester || 'Ganjil'})
                    </option>
                  ))}
                </select>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  File Excel (.xlsx):
                </label>
                {selectedFile ? (
                  <div className="border border-emerald-300 bg-emerald-50/50 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 truncate">
                      <FileSpreadsheet size={20} className="text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-red-600 font-bold hover:underline shrink-0 ml-2"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          setUploadError('');
                        }
                      }}
                    />
                    <FileUp size={24} className="text-emerald-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Pilih file Excel dari komputer</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Format .xlsx sesuai template 35/40/45 butir</p>
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile || !uploadExamId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Upload size={14} />
                  <span>{isUploading ? 'Mengunggah...' : 'Upload & Impor Soal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CEPAT BUAT UJIAN BARU                              */}
      {/* ========================================================= */}
      {isCreateExamModalOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Buat Ujian Baru</h3>
                <p className="text-xs text-slate-500">
                  Mata Pelajaran: <span className="font-bold text-primary-700">{selectedSubject.name}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsCreateExamModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {createExamError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-4 flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>{createExamError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Judul Ujian <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ulangan Harian 1, PTS Ganjil, PAS Genap..."
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={newExamTahun}
                    onChange={(e) => setNewExamTahun(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Semester
                  </label>
                  <select
                    value={newExamSemester}
                    onChange={(e) => setNewExamSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Kelas Peserta Ujian <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-1 text-xs">
                    {['ALL', 'X', 'XI', 'XII'].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setClassFilterLevel(lvl)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          classFilterLevel === lvl ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="text-primary-600 font-bold hover:underline ml-1"
                    >
                      Semua
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {classesList
                    .filter(c => classFilterLevel === 'ALL' || c.level === classFilterLevel)
                    .map(cls => {
                      const isSelected = newExamSelectedClasses.includes(cls.ID);
                      return (
                        <button
                          key={cls.ID}
                          type="button"
                          onClick={() => handleToggleExamClass(cls.ID)}
                          className={`p-1.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                            isSelected 
                              ? 'bg-primary-50 text-primary-800 border-primary-300 font-bold' 
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{cls.name}</span>
                          {isSelected && <Check size={13} className="text-primary-600 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Terpilih: <strong className="text-primary-700">{newExamSelectedClasses.length} kelas</strong>
                </p>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateExamModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExam}
                  className="btn-primary px-5 py-2 text-xs font-bold shadow-xs flex items-center space-x-1"
                >
                  <span>{isCreatingExam ? 'Menyimpan...' : 'Simpan & Buka Input Soal'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;
