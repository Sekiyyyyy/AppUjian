import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Printer, 
  Download, 
  Search, 
  CheckSquare, 
  Square, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Settings2, 
  FileText, 
  User, 
  Eye, 
  SlidersHorizontal,
  ZoomIn, 
  ZoomOut, 
  PanelLeftClose, 
  PanelLeftOpen 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorToast, showWarningToast } from '../utils/alert';
import { useDebounce } from '../hooks/useDebounce';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface TokenStudentItem {
  id: number;
  nisn: string;
  nis?: string;
  jenis_kelamin?: string;
  agama?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  class_id: number;
  token_password?: string;
  ruangan?: string;
  sesi?: string;
  server_name?: string;
  user: {
    id: number;
    username: string;
    name: string;
    role?: string;
  };
}

export interface TokenClassItem {
  ID: number;
  name: string;
  level?: string;
  department?: string;
  number?: string;
  ruangan?: string;
  sesi?: string;
  server_name?: string;
}

export interface TokenTeacherItem {
  id: number;
  name: string;
  nip?: string;
  jabatan?: string;
}

// 8 Cards Per Page (2 Columns x 4 Rows) - Compact & Balanced Card Ratio (96mm x 64mm)
const CARDS_PER_PAGE = 8;
const A4_WIDTH_PX = 794;   // 210mm in px at 96 DPI
const A4_HEIGHT_PX = 1123;  // 297mm in px at 96 DPI

const ExamCards: React.FC = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Data states
  const [students, setStudents] = useState<TokenStudentItem[]>([]);
  const [classes, setClasses] = useState<TokenClassItem[]>([]);
  const [teachers, setTeachers] = useState<TokenTeacherItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Responsive View Controls
  const [activeTab, setActiveTab] = useState<'selector' | 'preview'>('preview');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number | 'auto'>('auto');
  const [computedScale, setComputedScale] = useState<number>(0.8);

  // Filters & selection
  const urlClassId = searchParams.get('class_id');
  const urlStudentId = searchParams.get('student_id');

  const [selectedClassId, setSelectedClassId] = useState<number | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  // Selected student IDs (for multi-selection)
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Preview page navigation
  const [previewPage, setPreviewPage] = useState(1);

  // Config Drawer & Card Customization
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [examTitle, setExamTitle] = useState('ASESMEN SUMATIF TENGAH SEMESTER GANJIL');
  const [academicYear, setAcademicYear] = useState('TAHUN PELAJARAN 2026/2027');
  const [schoolName, setSchoolName] = useState('SMK NEGERI 1 BERINGIN');
  const [cityName, setCityName] = useState('Deli Serdang');
  const [cardDate, setCardDate] = useState(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });
  const [principalTitle, setPrincipalTitle] = useState('Kepala Sekolah');
  const [principalName, setPrincipalName] = useState('Asrori Batubara, S.Pd., M.Si');
  const [principalNip, setPrincipalNip] = useState('197312162005021003');

  // Preview container refs for auto-scaling
  const previewOuterContainerRef = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [classRes, studentRes, teacherRes] = await Promise.all([
        axios.get('/api/v1/admin/classes', { headers }),
        axios.get('/api/v1/admin/students', { headers }),
        axios.get('/api/v1/admin/teachers', { headers }).catch(() => ({ data: [] }))
      ]);

      const classData = classRes.data || [];
      const studentData = studentRes.data || [];
      const teacherData = teacherRes.data || [];

      setClasses(classData);
      setStudents(studentData);
      setTeachers(teacherData);

      const kepala = teacherData.find((t: any) => 
        t.jabatan?.toLowerCase().includes('kepala sekolah') || 
        t.jabatan?.toLowerCase().includes('kepsek')
      );
      if (kepala) {
        setPrincipalName(kepala.name || 'Asrori Batubara, S.Pd., M.Si');
        if (kepala.nip) setPrincipalNip(kepala.nip);
      }

      // Handle URL params
      if (urlClassId) {
        const cId = Number(urlClassId);
        setSelectedClassId(cId);
        if (urlStudentId) {
          setSelectedStudentIds([Number(urlStudentId)]);
        } else {
          const classStudents = studentData.filter((s: any) => s.class_id === cId);
          setSelectedStudentIds(classStudents.map((s: any) => s.id));
        }
      } else if (urlStudentId) {
        const sId = Number(urlStudentId);
        const s = studentData.find((item: any) => item.id === sId);
        if (s) {
          setSelectedClassId(s.class_id);
          setSelectedStudentIds([sId]);
        }
      } else {
        setSelectedStudentIds(studentData.map((s: any) => s.id));
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      showErrorToast('Gagal memuat data siswa dan kelas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map of classes for quick lookup
  const classMap = useMemo(() => {
    const map = new Map<number, TokenClassItem>();
    classes.forEach(c => map.set(c.ID, c));
    return map;
  }, [classes]);

  // Group students per class sorted by student name for local sequence numbers
  const classStudentLists = useMemo(() => {
    const map = new Map<number, TokenStudentItem[]>();
    students.forEach(s => {
      const list = map.get(s.class_id) || [];
      list.push(s);
      map.set(s.class_id, list);
    });
    map.forEach(list => {
      list.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));
    });
    return map;
  }, [students]);

  // Helper: Local sequence number in class (No. Urut Lokal e.g. 01, 02, ..., 36)
  const getLocalRollNumber = (student: TokenStudentItem) => {
    const list = classStudentLists.get(student.class_id) || [];
    const idx = list.findIndex(s => s.id === student.id);
    if (idx >= 0) {
      return String(idx + 1).padStart(2, '0');
    }
    return '01';
  };

  // Helper: Class Name
  const getClassName = (classId: number) => {
    const cls = classMap.get(classId);
    if (!cls) return '-';
    return cls.name || `${cls.level || ''} ${cls.department || ''} ${cls.number || ''}`.trim();
  };

  // Helper: Room & Session string
  const getStudentRoomSession = (student: TokenStudentItem) => {
    const cls = classMap.get(student.class_id);
    const room = student.ruangan || cls?.ruangan || 'RUANG CBT';
    const session = student.sesi || cls?.sesi || 'SESI 1';
    return `${room.toUpperCase()} / ${session.toUpperCase()}`;
  };

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const classMatch = selectedClassId === 'ALL' || student.class_id === selectedClassId;
      const q = debouncedSearchTerm.toLowerCase().trim();
      const name = (student.user?.name || '').toLowerCase();
      const nisn = (student.nisn || '').toLowerCase();
      const username = (student.user?.username || '').toLowerCase();
      const searchMatch = !q || name.includes(q) || nisn.includes(q) || username.includes(q);
      return classMatch && searchMatch;
    });
  }, [students, selectedClassId, debouncedSearchTerm]);

  // Target students to render into cards (ordered by class then name)
  const targetStudents = useMemo(() => {
    const selectedSet = new Set(selectedStudentIds);
    const chosen = students.filter(s => selectedSet.has(s.id));

    chosen.sort((a, b) => {
      if (a.class_id !== b.class_id) return a.class_id - b.class_id;
      return (a.user?.name || '').localeCompare(b.user?.name || '');
    });

    return chosen;
  }, [students, selectedStudentIds]);

  // Group target students into A4 sheets of 8 cards each
  const sheets = useMemo(() => {
    const result: TokenStudentItem[][] = [];
    for (let i = 0; i < targetStudents.length; i += CARDS_PER_PAGE) {
      result.push(targetStudents.slice(i, i + CARDS_PER_PAGE));
    }
    return result;
  }, [targetStudents]);

  const totalSheets = Math.max(1, sheets.length);

  // Clamp preview page
  useEffect(() => {
    if (previewPage > totalSheets) {
      setPreviewPage(totalSheets);
    }
  }, [totalSheets, previewPage]);

  // Auto-Scale Observer for responsive A4 preview
  const updateAutoFitScale = useCallback(() => {
    if (!previewOuterContainerRef.current) return;
    const availableWidth = previewOuterContainerRef.current.clientWidth - 28;
    if (availableWidth > 0) {
      const fitScale = Math.min(1.0, Math.max(0.35, availableWidth / A4_WIDTH_PX));
      if (zoomLevel === 'auto') {
        setComputedScale(fitScale);
      } else {
        setComputedScale(zoomLevel);
      }
    }
  }, [zoomLevel]);

  useEffect(() => {
    updateAutoFitScale();
    const handleResize = () => updateAutoFitScale();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      updateAutoFitScale();
    });
    if (previewOuterContainerRef.current) {
      observer.observe(previewOuterContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [updateAutoFitScale, isLeftPanelCollapsed]);

  // Selection handlers
  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));

    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const newSet = new Set([...selectedStudentIds, ...filteredIds]);
      setSelectedStudentIds(Array.from(newSet));
    }
  };

  const handleToggleSelectStudent = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectFirstN = (n: number) => {
    const firstN = filteredStudents.slice(0, n).map(s => s.id);
    setSelectedStudentIds(firstN);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Generate single card HTML string (Fixed 96mm x 64mm)
  const renderCardHTML = (student: TokenStudentItem) => {
    const clsName = getClassName(student.class_id);
    const rollNo = getLocalRollNumber(student);
    const username = student.user?.username || '-';
    const password = student.token_password || '******';
    const roomSession = getStudentRoomSession(student);

    return `
      <div class="exam-card">
        <!-- Header -->
        <div class="card-header">
          <img src="/logo.png" alt="Logo" class="school-logo" onerror="this.style.display='none'" />
          <div class="header-titles">
            <h1 class="title-main">KARTU PESERTA</h1>
            <h2 class="title-sub">${examTitle}</h2>
            <h3 class="title-school">${schoolName}</h3>
            <h4 class="title-year">${academicYear}</h4>
          </div>
        </div>

        <div class="header-divider"></div>

        <!-- Body -->
        <div class="card-body">
          <div class="student-info">
            <table class="info-table">
              <tr>
                <td class="lbl">No. Ujian</td>
                <td class="sep">:</td>
                <td class="val font-roll"><strong>${rollNo}</strong></td>
              </tr>
              <tr>
                <td class="lbl">NISN</td>
                <td class="sep">:</td>
                <td class="val"><strong>${student.nisn || '-'}</strong></td>
              </tr>
              <tr>
                <td class="lbl">Nama</td>
                <td class="sep">:</td>
                <td class="val font-name"><strong>${(student.user?.name || '-').toUpperCase()}</strong></td>
              </tr>
              <tr>
                <td class="lbl">Kelas</td>
                <td class="sep">:</td>
                <td class="val"><strong>${clsName}</strong></td>
              </tr>
              <tr>
                <td class="lbl">Asal Sekolah</td>
                <td class="sep">:</td>
                <td class="val">${schoolName}</td>
              </tr>
              <tr>
                <td class="lbl">Ruang / Server</td>
                <td class="sep">:</td>
                <td class="val"><strong>${roomSession}</strong></td>
              </tr>
            </table>
          </div>

          <div class="credentials-plain">
            <div class="cred-item">
              <div class="cred-label">USERNAME :</div>
              <div class="cred-value">${username}</div>
            </div>
            <div class="cred-item" style="margin-top: 1.5mm;">
              <div class="cred-label">PASSWORD :</div>
              <div class="cred-value">${password}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <div class="notes-section">
            <div class="notes-title">Catatan :</div>
            <div class="notes-text">1. Wajib dibawa saat ujian.</div>
            <div class="notes-text">2. Jaga kerahasiaan Akun.</div>
            <div class="notes-badge">CBT SMKN 1 BERINGIN</div>
          </div>

          <div class="signature-section">
            <div class="sig-date">${cityName}, ${cardDate}</div>
            <div class="sig-role">${principalTitle}</div>
            <div class="sig-space"></div>
            <div class="sig-name"><u>${principalName}</u></div>
            <div class="sig-nip">NIP. ${principalNip}</div>
          </div>
        </div>
      </div>
    `;
  };

  // Build full styles for printable A4 pages (8 Cards per sheet: 2 cols x 4 rows)
  const getPrintStyles = () => `
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
    }
    .a4-print-sheet {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      padding: 7mm 6mm;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(2, 96mm);
      grid-auto-rows: 64mm;
      gap: 3mm 4mm;
      align-content: start;
      justify-content: center;
      page-break-after: always;
      break-after: page;
      box-sizing: border-box;
      background: #ffffff;
      overflow: hidden;
    }
    .a4-print-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .exam-card {
      width: 96mm;
      height: 64mm;
      min-width: 96mm;
      max-width: 96mm;
      min-height: 64mm;
      max-height: 64mm;
      border: 1px solid #1e293b;
      border-radius: 4px;
      padding: 1.8mm 2.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 2mm;
      padding-bottom: 0.8mm;
    }
    .school-logo {
      width: 10mm;
      height: 10mm;
      object-fit: contain;
      flex-shrink: 0;
    }
    .header-titles {
      flex: 1;
      text-align: center;
    }
    .title-main {
      font-size: 8pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.3px;
      margin: 0;
      line-height: 1.1;
    }
    .title-sub {
      font-size: 6pt;
      font-weight: 800;
      color: #1e293b;
      margin: 0.5px 0 0 0;
      line-height: 1.1;
    }
    .title-school {
      font-size: 6.8pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0.5px 0 0 0;
      line-height: 1.1;
    }
    .title-year {
      font-size: 5.8pt;
      font-weight: 600;
      color: #475569;
      margin: 0.5px 0 0 0;
      line-height: 1.1;
    }
    .header-divider {
      border-top: 1.2px solid #0f172a;
      border-bottom: 0.5px solid #0f172a;
      height: 2px;
      margin-bottom: 1.2mm;
    }
    .card-body {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      flex: 1;
      min-height: 27mm;
      max-height: 28mm;
    }
    .student-info {
      flex: 1;
      min-width: 0;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 5.8pt;
      line-height: 1.25;
    }
    .info-table td {
      padding: 0.4px 0;
      vertical-align: top;
    }
    .info-table .lbl {
      width: 17mm;
      color: #334155;
      white-space: nowrap;
    }
    .info-table .sep {
      width: 2mm;
      text-align: center;
      color: #334155;
    }
    .info-table .val {
      color: #0f172a;
    }
    .font-roll {
      font-size: 7pt;
      color: #0f172a;
    }
    .font-name {
      font-size: 6.2pt;
      letter-spacing: -0.1px;
    }
    .credentials-plain {
      width: 25mm;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-self: flex-start;
      margin-top: 0.5mm;
      padding-left: 2mm;
    }
    .cred-item {
      display: flex;
      flex-direction: column;
    }
    .cred-label {
      font-size: 5.5pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.3px;
      line-height: 1.1;
    }
    .cred-value {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .card-footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 1mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1.5mm;
    }
    .notes-section {
      flex: 1;
      font-size: 4.8pt;
      color: #475569;
      line-height: 1.2;
    }
    .notes-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.2px;
    }
    .notes-text {
      margin-bottom: 0.2px;
    }
    .notes-badge {
      font-weight: 800;
      font-size: 5pt;
      color: #0f172a;
      margin-top: 0.6mm;
      letter-spacing: 0.2px;
    }
    .signature-section {
      text-align: center;
      font-size: 5pt;
      color: #0f172a;
      width: 36mm;
      flex-shrink: 0;
      line-height: 1.1;
    }
    .sig-date {
      color: #334155;
    }
    .sig-role {
      font-weight: 600;
      margin-top: 0.3px;
    }
    .sig-space {
      height: 4.5mm;
    }
    .sig-name {
      font-weight: 700;
      font-size: 5.3pt;
    }
    .sig-nip {
      font-size: 4.7pt;
      color: #475569;
      margin-top: 0.2px;
    }
  `;

  // Action 1: Unduh Langsung sebagai File Dokumen PDF
  const handleDownloadPDF = async () => {
    if (targetStudents.length === 0) {
      showWarningToast('Pilih minimal satu siswa untuk diunduh sebagai PDF');
      return;
    }

    setIsExportingPDF(true);

    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '-99999px';
      tempDiv.style.left = '-99999px';
      tempDiv.style.width = '210mm';
      tempDiv.style.background = '#ffffff';

      let pagesHTML = `<style>${getPrintStyles()}</style>`;
      sheets.forEach((sheetCards) => {
        pagesHTML += '<div class="a4-print-sheet">';
        sheetCards.forEach((student) => {
          pagesHTML += renderCardHTML(student);
        });
        pagesHTML += '</div>';
      });

      tempDiv.innerHTML = pagesHTML;
      document.body.appendChild(tempDiv);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const sheetElements = tempDiv.querySelectorAll<HTMLElement>('.a4-print-sheet');

      for (let i = 0; i < sheetElements.length; i++) {
        const sheetEl = sheetElements[i];
        if (i > 0) pdf.addPage('a4', 'p');

        const canvas = await html2canvas(sheetEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      document.body.removeChild(tempDiv);

      let fileName = 'Kartu_Peserta_CBT';
      if (selectedClassId !== 'ALL') {
        const cls = classMap.get(selectedClassId);
        if (cls) {
          fileName += `_${cls.name.replace(/\s+/g, '_')}`;
        }
      } else if (targetStudents.length === 1) {
        fileName += `_${targetStudents[0].user?.name.replace(/\s+/g, '_')}`;
      } else {
        fileName += `_${targetStudents.length}_Siswa`;
      }

      pdf.save(`${fileName}.pdf`);
      showSuccessToast(`File PDF berhasil diunduh (${targetStudents.length} kartu, ${totalSheets} lembar)`);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showErrorToast('Gagal membuat dokumen PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Action 2: Cetak Kartu (Print to EPSON / Printer Dialog)
  const handlePrint = () => {
    if (targetStudents.length === 0) {
      showWarningToast('Pilih minimal satu siswa untuk dicetak');
      return;
    }

    setIsPrinting(true);

    try {
      let pagesHTML = '';
      sheets.forEach((sheetCards) => {
        pagesHTML += '<div class="a4-print-sheet">';
        sheetCards.forEach((student) => {
          pagesHTML += renderCardHTML(student);
        });
        pagesHTML += '</div>';
      });

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        showErrorToast('Gagal menginisialisasi dialog cetak');
        setIsPrinting(false);
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Kartu_Peserta_Ujian_CBT</title>
          <style>${getPrintStyles()}</style>
        </head>
        <body>
          ${pagesHTML}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          setIsPrinting(false);
        }, 1000);
      }, 500);
    } catch (err: any) {
      console.error('Error printing:', err);
      showErrorToast('Gagal memproses pencetakan');
      setIsPrinting(false);
    }
  };

  // Current sheet cards for preview
  const currentSheetCards = sheets[previewPage - 1] || [];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
              Kartu Peserta Ujian
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <FileText size={12} />
              Format Proporsional (8 Kartu / Lembar A4)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih rombongan belajar atau centang siswa tertentu, lalu unduh dokumen PDF atau cetak langsung ke printer fisik.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsConfigOpen(prev => !prev)}
            className={`flex items-center space-x-1.5 text-xs py-2 px-3 rounded-xl border transition-colors ${
              isConfigOpen 
                ? 'bg-slate-800 text-white border-slate-800' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs'
            }`}
            title="Kustomisasi Kop, Tanggal & Tanda Tangan"
          >
            <Settings2 size={14} />
            <span>Format Kartu</span>
          </button>

          {/* Tombol 1: Unduh PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF || targetStudents.length === 0}
            className="flex items-center space-x-1.5 text-xs py-2 px-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50"
            title="Unduh langsung sebagai file dokumen PDF"
          >
            <Download size={14} className={isExportingPDF ? 'animate-bounce' : ''} />
            <span>{isExportingPDF ? 'Menyiapkan PDF...' : 'Unduh PDF'}</span>
          </button>

          {/* Tombol 2: Cetak Kartu */}
          <button
            onClick={handlePrint}
            disabled={isPrinting || targetStudents.length === 0}
            className="btn-primary flex items-center space-x-1.5 text-xs py-2 px-3.5 shadow-xs disabled:opacity-50"
            title="Kirim ke mesin cetak (Printer)"
          >
            <Printer size={14} className={isPrinting ? 'animate-spin' : ''} />
            <span>{isPrinting ? 'Memproses...' : 'Cetak Kartu'}</span>
          </button>
        </div>
      </header>

      {/* Configuration Accordion Drawer */}
      {isConfigOpen && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs sm:text-sm">
              <SlidersHorizontal size={15} className="text-indigo-600" />
              <span>Pengaturan Kop & Tanda Tangan Kartu</span>
            </div>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Judul Ujian</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Sekolah</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kota & Tanggal</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Kota"
                  className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
                />
                <input
                  type="text"
                  value={cardDate}
                  onChange={(e) => setCardDate(e.target.value)}
                  placeholder="Tanggal"
                  className="w-2/3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Kepala Sekolah</label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={principalNip}
                onChange={(e) => setPrincipalNip(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Responsive View Switcher for Mobile & Tablet */}
      <div className="flex lg:hidden items-center justify-between bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('selector')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 ${
            activeTab === 'selector' 
              ? 'bg-white text-indigo-600 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User size={13} />
          <span>Pilih Siswa ({selectedStudentIds.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 ${
            activeTab === 'preview' 
              ? 'bg-white text-indigo-600 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye size={13} />
          <span>Pratinjau ({totalSheets} Lembar)</span>
        </button>
      </div>

      {/* Main Responsive Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* Left Column: Filter & Student Selector */}
        <div 
          className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3.5 transition-all duration-300 ${
            activeTab === 'preview' ? 'hidden lg:block' : 'block'
          } ${isLeftPanelCollapsed ? 'lg:hidden' : 'lg:block'}`}
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <User size={16} className="text-indigo-600" />
              <h2 className="font-extrabold text-slate-800 text-xs sm:text-sm">Pilih Peserta Ujian</h2>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {selectedStudentIds.length} Dipilih
            </span>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Rombongan Belajar (Kelas)
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setSelectedClassId(val);
                if (val === 'ALL') {
                  setSelectedStudentIds(students.map(s => s.id));
                } else {
                  const classStudents = students.filter(s => s.class_id === val);
                  setSelectedStudentIds(classStudents.map(s => s.id));
                }
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              {classes.map(c => {
                const count = students.filter(s => s.class_id === c.ID).length;
                return (
                  <option key={c.ID} value={c.ID}>
                    {c.name} ({count} Siswa)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik nama atau NISN siswa..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Select Actions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              onClick={handleToggleSelectAllFiltered}
              className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? 'Batal Semua' : 'Pilih Semua'}
            </button>
            <button
              onClick={() => handleSelectFirstN(8)}
              className="px-2 py-0.5 text-[10px] font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              1 Lembar (8)
            </button>
            <button
              onClick={handleClearSelection}
              className="px-2 py-0.5 text-[10px] font-medium rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors ml-auto"
            >
              Kosongkan
            </button>
          </div>

          {/* Student Checkbox List */}
          <div className="border border-slate-200 rounded-xl max-h-[380px] xl:max-h-[460px] overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
            {filteredStudents.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400">
                Tidak ada siswa yang sesuai pencarian.
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selectedStudentIds.includes(s.id);
                const rollNo = getLocalRollNumber(s);
                const clsName = getClassName(s.class_id);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleToggleSelectStudent(s.id)}
                    className={`p-2 flex items-center space-x-2.5 cursor-pointer transition-colors text-xs select-none ${
                      isSelected ? 'bg-indigo-50/80 hover:bg-indigo-100/60' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <button
                      type="button"
                      className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare size={15} className="text-indigo-600" />
                      ) : (
                        <Square size={15} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 truncate text-[11px]">
                          {s.user?.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200/70 px-1 rounded shrink-0">
                          #{rollNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>NISN: {s.nisn || '-'}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{clsName}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live A4 Preview & Controls */}
        <div className={`flex-1 min-w-0 w-full space-y-3 ${activeTab === 'selector' ? 'hidden lg:block' : 'block'}`}>
          {/* Preview Navigation & Scale Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsLeftPanelCollapsed(prev => !prev)}
                className="hidden lg:flex p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title={isLeftPanelCollapsed ? 'Buka panel pemilihan siswa' : 'Tutup panel untuk memperluas pratinjau'}
              >
                {isLeftPanelCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>

              <div className="flex items-center space-x-2">
                <Eye size={16} className="text-indigo-600" />
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  Pratinjau Lembar A4
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  ({targetStudents.length} kartu, {totalSheets} lembar kertas)
                </span>
              </div>
            </div>

            {/* Right: Zoom controls & Pagination */}
            <div className="flex items-center space-x-2">
              {/* Zoom Buttons */}
              <div className="hidden sm:flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => {
                    setZoomLevel('auto');
                    updateAutoFitScale();
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    zoomLevel === 'auto' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Pas ke lebar layar (Auto Fit)"
                >
                  Auto
                </button>
                <button
                  onClick={() => {
                    const next = Math.max(0.4, Number(computedScale) - 0.1);
                    setZoomLevel(next);
                    setComputedScale(next);
                  }}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded"
                  title="Perkecil"
                >
                  <ZoomOut size={12} />
                </button>
                <span className="px-1 text-[10px] font-semibold text-slate-700 min-w-[32px] text-center">
                  {Math.round(computedScale * 100)}%
                </span>
                <button
                  onClick={() => {
                    const next = Math.min(1.2, Number(computedScale) + 0.1);
                    setZoomLevel(next);
                    setComputedScale(next);
                  }}
                  className="p-1 text-slate-600 hover:text-slate-900 rounded"
                  title="Perbesar"
                >
                  <ZoomIn size={12} />
                </button>
              </div>

              {/* Pagination Controls */}
              {totalSheets > 1 && (
                <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                  <button
                    onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                    disabled={previewPage <= 1}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap px-1">
                    {previewPage} / {totalSheets}
                  </span>
                  <button
                    onClick={() => setPreviewPage(prev => Math.min(totalSheets, prev + 1))}
                    disabled={previewPage >= totalSheets}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Responsive Scaled A4 Sheet Container */}
          <div 
            ref={previewOuterContainerRef}
            className="w-full bg-slate-200/90 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-start border border-slate-300/70 shadow-inner overflow-hidden min-h-[520px]"
          >
            {targetStudents.length === 0 ? (
              <div className="w-full max-w-md bg-white rounded-xl shadow-lg flex flex-col items-center justify-center p-8 text-center my-12">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <User size={24} className="text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-700 text-base">Belum Ada Siswa Dipilih</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Pilih minimal 1 siswa pada panel di sebelah kiri untuk melihat kartu peserta ujian yang siap diunduh atau dicetak.
                </p>
              </div>
            ) : (
              /* Auto-fitted Paper Wrapper: bounds exactly match the scaled A4 sheet so no clipping occurs */
              <div
                style={{
                  width: `${Math.round(A4_WIDTH_PX * computedScale)}px`,
                  height: `${Math.round(A4_HEIGHT_PX * computedScale)}px`,
                  transition: 'width 0.15s ease-out, height 0.15s ease-out',
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                {/* Real-size A4 Canvas Scaled with Hardware Acceleration */}
                <div 
                  ref={printContainerRef}
                  className="bg-white rounded-lg shadow-2xl p-[7mm_6mm] box-border grid grid-cols-2 gap-x-[4mm] gap-y-[3mm] content-start justify-center select-none"
                  style={{
                    width: `${A4_WIDTH_PX}px`,
                    height: `${A4_HEIGHT_PX}px`,
                    transform: `scale(${computedScale})`,
                    transformOrigin: 'top left',
                    gridAutoRows: '64mm'
                  }}
                >
                  {/* 8 Compact Fixed Slots */}
                  {currentSheetCards.map((student) => {
                    const rollNo = getLocalRollNumber(student);
                    const clsName = getClassName(student.class_id);
                    const roomSession = getStudentRoomSession(student);
                    const username = student.user?.username || '-';
                    const password = student.token_password || '******';

                    return (
                      <div
                        key={student.id}
                        className="w-[96mm] h-[64mm] min-w-[96mm] max-w-[96mm] min-height-[64mm] max-h-[64mm] border border-slate-800 rounded p-[1.8mm_2.5mm] flex flex-col justify-between bg-white box-border"
                      >
                        {/* Kop Header */}
                        <div>
                          <div className="flex items-center gap-[2mm] pb-[0.8mm]">
                            <img 
                              src="/logo.png" 
                              alt="Logo" 
                              className="w-[10mm] h-[10mm] object-contain shrink-0" 
                              onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div className="flex-1 text-center">
                              <h1 className="text-[8pt] font-extrabold text-slate-900 leading-tight tracking-tight m-0">
                                KARTU PESERTA
                              </h1>
                              <h2 className="text-[6pt] font-bold text-slate-800 leading-tight mt-[0.5px] m-0">
                                {examTitle}
                              </h2>
                              <h3 className="text-[6.8pt] font-extrabold text-slate-900 leading-tight mt-[0.5px] m-0">
                                {schoolName}
                              </h3>
                              <h4 className="text-[5.8pt] font-semibold text-slate-600 leading-tight mt-[0.5px] m-0">
                                {academicYear}
                              </h4>
                            </div>
                          </div>

                          {/* Double Line Divider */}
                          <div className="border-t-[1.2px] border-b-[0.5px] border-slate-900 h-[2px] mb-[1.2mm]"></div>
                        </div>

                        {/* Body: Info & Box */}
                        <div className="flex justify-between gap-[2mm] flex-1 max-h-[28mm]">
                          <div className="flex-1 min-w-0">
                            <table className="w-full border-collapse text-[5.8pt] leading-[1.25]">
                              <tbody>
                                <tr>
                                  <td className="w-[17mm] text-slate-600 py-[0.4px] whitespace-nowrap">No. Ujian</td>
                                  <td className="w-[2mm] text-center text-slate-600">:</td>
                                  <td className="text-slate-900 font-extrabold text-[7pt]">{rollNo}</td>
                                </tr>
                                <tr>
                                  <td className="text-slate-600 py-[0.4px] whitespace-nowrap">NISN</td>
                                  <td className="text-center text-slate-600">:</td>
                                  <td className="text-slate-900 font-bold">{student.nisn || '-'}</td>
                                </tr>
                                <tr>
                                  <td className="text-slate-600 py-[0.4px] whitespace-nowrap">Nama</td>
                                  <td className="text-center text-slate-600">:</td>
                                  <td className="text-slate-900 font-extrabold text-[6.2pt] uppercase truncate max-w-[42mm]">
                                    {student.user?.name || '-'}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="text-slate-600 py-[0.4px] whitespace-nowrap">Kelas</td>
                                  <td className="text-center text-slate-600">:</td>
                                  <td className="text-slate-900 font-bold">{clsName}</td>
                                </tr>
                                <tr>
                                  <td className="text-slate-600 py-[0.4px] whitespace-nowrap">Asal Sekolah</td>
                                  <td className="text-center text-slate-600">:</td>
                                  <td className="text-slate-800">{schoolName}</td>
                                </tr>
                                <tr>
                                  <td className="text-slate-600 py-[0.4px] whitespace-nowrap">Ruang / Server</td>
                                  <td className="text-center text-slate-600">:</td>
                                  <td className="text-slate-900 font-bold">{roomSession}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Credentials Plain (Polos tanpa border) */}
                          <div className="w-[25mm] shrink-0 flex flex-col self-start pl-[2mm] mt-[0.5mm]">
                            <div className="flex flex-col">
                              <span className="text-[5.5pt] font-bold text-slate-900 tracking-wider leading-tight">
                                USERNAME :
                              </span>
                              <span className="text-[8.5pt] font-extrabold text-slate-900 tracking-wider leading-tight">
                                {username}
                              </span>
                            </div>
                            <div className="flex flex-col mt-[1.5mm]">
                              <span className="text-[5.5pt] font-bold text-slate-900 tracking-wider leading-tight">
                                PASSWORD :
                              </span>
                              <span className="text-[8.5pt] font-extrabold text-slate-900 tracking-wider leading-tight">
                                {password}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Catatan & Tanda Tangan */}
                        <div className="border-t border-dashed border-slate-300 pt-[1mm] flex justify-between items-end gap-[1.5mm]">
                          <div className="flex-1 text-[4.8pt] text-slate-600 leading-tight">
                            <div className="font-bold text-slate-800 mb-[0.2px]">Catatan :</div>
                            <div>1. Wajib dibawa saat ujian.</div>
                            <div>2. Jaga kerahasiaan Akun.</div>
                            <div className="font-extrabold text-[5pt] text-slate-900 mt-[0.6mm] tracking-wide">
                              CBT SMKN 1 BERINGIN
                            </div>
                          </div>

                          <div className="text-center text-[5pt] text-slate-900 w-[36mm] shrink-0 leading-tight">
                            <div className="text-slate-600">{cityName}, {cardDate}</div>
                            <div className="font-semibold">{principalTitle}</div>
                            <div className="h-[4.5mm]"></div>
                            <div className="font-bold text-[5.3pt] underline">{principalName}</div>
                            <div className="text-[4.7pt] text-slate-600">NIP. {principalNip}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty visual slots if less than 8 cards on page */}
                  {Array.from({ length: CARDS_PER_PAGE - currentSheetCards.length }).map((_, emptyIdx) => (
                    <div
                      key={`empty-${emptyIdx}`}
                      className="w-[96mm] h-[64mm] min-w-[96mm] max-w-[96mm] min-height-[64mm] max-h-[64mm] border border-dashed border-slate-200 rounded p-3 flex flex-col items-center justify-center text-slate-300 text-[10px]"
                    >
                      <span>Slot Kosong #{currentSheetCards.length + emptyIdx + 1}</span>
                      <span className="text-[8px] text-slate-300">(Ukuran tetap 96mm × 64mm)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamCards;
