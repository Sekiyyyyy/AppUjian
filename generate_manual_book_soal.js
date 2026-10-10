const fs = require('fs');
const path = require('path');
const puppeteer = require('/www/wwwroot/AppUjian/admin/node_modules/puppeteer-core');

function getBase64(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).replace('.', '') || 'png';
    return `data:image/${ext};base64,${data.toString('base64')}`;
  } catch (e) {
    console.error('Error reading ' + filePath, e);
    return '';
  }
}

const logoBase64 = getBase64('/www/wwwroot/AppUjian/admin/public/logo.png');
const logoSumutBase64 = getBase64('/www/wwwroot/AppUjian/admin/public/logo-sumut.png');

// 4 Annotated screenshots specifically captured for Bank Soal & Scheduling
const imgBankSoal = getBase64('/www/wwwroot/AppUjian/manual_book_assets/soal_01_bank_soal.png');
const imgModalTambah = getBase64('/www/wwwroot/AppUjian/manual_book_assets/soal_02_modal_tambah_soal.png');
const imgModalUpload = getBase64('/www/wwwroot/AppUjian/manual_book_assets/soal_03_modal_upload_excel.png');
const imgModalJadwal = getBase64('/www/wwwroot/AppUjian/manual_book_assets/soal_04_jadwal_dan_buat_ujian.png');

// Reusable clean SVG helper
const svg = {
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  upload: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  database: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`
};

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Panduan Pembuatan Soal CBT - SMKN 1 Beringin</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
      @bottom-left {
        content: "Buku Panduan Pembuatan Soal & Jadwal CBT • SMK Negeri 1 Beringin";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.45;
      font-size: 9.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-break {
      page-break-before: always;
    }

    /* ========================================================
       COVER PAGE: MODERN, MINIMAL TEXT, SLEEK & EXECUTIVE
    ======================================================== */
    .cover-container {
      height: 100%;
      min-height: 260mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 25px 15px 10px 15px;
      position: relative;
      background: radial-gradient(circle at 50% 20%, #f8fafc 0%, #ffffff 100%);
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
    }
    .cover-header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cover-header-logo {
      height: 48px;
      width: 48px;
      object-fit: contain;
    }
    .cover-header-text h3 {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .cover-header-text p {
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
    }
    .cover-header-sumut {
      height: 32px;
      object-fit: contain;
    }

    .cover-center {
      text-align: center;
      margin: auto 0;
      padding: 20px 0;
    }
    .cover-main-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0f172a;
      color: #ffffff;
      padding: 5px 16px;
      border-radius: 999px;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 22px;
    }
    .cover-hero-title {
      font-size: 30pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      letter-spacing: -1px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .cover-hero-title span {
      color: #2563eb;
    }
    .cover-hero-subtitle {
      font-size: 11.5pt;
      font-weight: 600;
      color: #475569;
      margin-bottom: 45px;
      letter-spacing: 0.2px;
    }

    /* 3 Sleek Cards on Cover */
    .cover-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      max-width: 90%;
      margin: 0 auto;
    }
    .cover-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 14px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
    }
    .cover-card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      margin: 0 auto 10px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-bg-blue { background: #eff6ff; color: #2563eb; }
    .icon-bg-emerald { background: #ecfdf5; color: #059669; }
    .icon-bg-indigo { background: #eef2ff; color: #4f46e5; }
    .cover-card h4 {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .cover-card p {
      font-size: 8pt;
      color: #64748b;
      line-height: 1.3;
    }

    /* Sleek Cover Footer */
    .cover-footer {
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      padding: 14px 20px;
      border-radius: 12px;
      margin-top: 20px;
    }
    .cover-footer-text p {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 3px;
    }
    .cover-footer-text p strong {
      color: #0f172a;
    }

    /* ========================================================
       INNER PAGES STYLING
    ======================================================== */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      margin-bottom: 14px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .page-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .page-header-left img {
      height: 20px;
    }
    .page-header-left span {
      font-size: 8pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .page-header-right {
      font-size: 7.5pt;
      font-weight: 700;
      color: #2563eb;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid #bfdbfe;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .section-num {
      width: 26px;
      height: 26px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10pt;
      font-weight: 800;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    h2.section-heading {
      font-size: 12.5pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    p.section-desc {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 10px;
      line-height: 1.45;
    }

    /* Window Mockup */
    .window-mockup {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      margin: 10px 0 12px 0;
    }
    .window-header {
      background: #f1f5f9;
      padding: 5px 10px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      gap: 8px;
    }
    .window-dots {
      display: flex;
      gap: 4px;
    }
    .window-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .window-address {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 7pt;
      font-family: monospace;
      color: #475569;
      padding: 2px 8px;
      flex-grow: 1;
      max-width: 380px;
    }
    .window-body img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Steps List */
    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 8px 0 10px 0;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 10px;
    }
    .step-badge {
      width: 20px;
      height: 20px;
      background: #2563eb;
      color: #ffffff;
      font-weight: 800;
      font-size: 7.5pt;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text strong {
      color: #0f172a;
      font-size: 8.5pt;
      display: block;
      margin-bottom: 1px;
    }
    .step-text p {
      font-size: 8pt;
      color: #475569;
      line-height: 1.3;
    }

    /* Alerts */
    .alert-box {
      border-radius: 6px;
      padding: 8px 12px;
      margin: 8px 0 10px 0;
      font-size: 8pt;
      line-height: 1.4;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .alert-box.info {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      color: #1e40af;
    }
    .alert-box.success {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }
    .alert-box.warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .alert-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Tables */
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 10px 0;
      font-size: 8pt;
    }
    .custom-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .custom-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .custom-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge-col {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      font-family: monospace;
    }
    .badge-key { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-req { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  </style>
</head>
<body>

  <!-- ==================== HALAMAN 1: COVER PAGE ==================== -->
  <div class="cover-container">
    
    <!-- Header -->
    <div class="cover-header">
      <div class="cover-header-brand">
        <img src="${logoBase64}" alt="Logo SMK" class="cover-header-logo">
        <div class="cover-header-text">
          <h3>SMK Negeri 1 Beringin</h3>
          <p>Dinas Pendidikan Provinsi Sumatera Utara</p>
        </div>
      </div>
      <img src="${logoSumutBase64}" alt="Logo Sumut" class="cover-header-sumut">
    </div>

    <!-- Center Content -->
    <div class="cover-center">
      <div class="cover-main-badge">
        ${svg.fileText} Panduan Guru Mata Pelajaran • Versi 2026/2027
      </div>

      <h1 class="cover-hero-title">
        Buku Panduan <span>Pembuatan Soal</span> & Penjadwalan CBT
      </h1>

      <p class="cover-hero-subtitle">
        Pedoman Praktis Guru Mata Pelajaran dalam Menyusun Bank Soal & Mengatur Jadwal CBT SMK Negeri 1 Beringin
      </p>

      <!-- 3 Executive Cards -->
      <div class="cover-cards-grid">
        <div class="cover-card">
          <div class="cover-card-icon icon-bg-blue">
            ${svg.database}
          </div>
          <h4>Input Soal Manual</h4>
          <p>Editor interaktif lengkap dengan rumus KaTeX matematika dan upload gambar terkompresi otomatis.</p>
        </div>

        <div class="cover-card">
          <div class="cover-card-icon icon-bg-emerald">
            ${svg.upload}
          </div>
          <h4>Import Cepat Excel</h4>
          <p>Unggah massal 20 hingga 50 butir soal pilihan ganda sekaligus menggunakan format template standar.</p>
        </div>

        <div class="cover-card">
          <div class="cover-card-icon icon-bg-indigo">
            ${svg.calendar}
          </div>
          <h4>Penjadwalan Kelas</h4>
          <p>Pengaturan tanggal pelaksanaan ujian, alokasi durasi waktu pengerjaan, dan seleksi rombel jurusan SMK.</p>
        </div>
      </div>
    </div>

    <!-- Footer: Sesuai Instruksi User -->
    <div class="cover-footer">
      <div class="cover-footer-text">
        <p><strong>Diterbitkan oleh:</strong> Tim TIK SMKN 1 Beringin</p>
        <p><strong>Alamat Portal:</strong> https://ujian.tiksmkn1beringin.my.id</p>
        <p><strong>Untuk:</strong> Bapak/Ibu Guru Mata Pelajaran SMK Negeri 1 Beringin</p>
      </div>
    </div>

  </div>

  <!-- ==================== HALAMAN 2: BAB 1 AKSES & NAVIGASI BANK SOAL ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 1 • AKSES PORTAL & NAVIGASI BANK SOAL</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">1</div>
    <h2 class="section-heading">Navigasi Halaman Bank Soal</h2>
  </div>
  <p class="section-desc">
    Guru dapat mengelola butir soal ujian melalui menu <strong>Bank Soal</strong> di bilah navigasi kiri. Sebelum menambahkan soal, pastikan Anda telah memilih Mata Pelajaran dan Paket Ujian pada filter bagian atas.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/dashboard/questions</div>
    </div>
    <div class="window-body">
      <img src="${imgBankSoal}" alt="Tampilan Bank Soal">
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge" style="background:#2563eb;">1</div>
      <div class="step-text">
        <strong>Tombol Biru: Tambah Soal Manual</strong>
        <p>Gunakan tombol ini untuk mengetik soal satu per satu langsung di browser, menyisipkan gambar grafik/rangkaian, atau mengetik simbol rumus matematika.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#059669;">2</div>
      <div class="step-text">
        <strong>Tombol Hijau: Upload Soal Excel</strong>
        <p>Gunakan tombol ini untuk mengunggah puluhan soal pilihan ganda secara cepat dalam hitungan detik menggunakan file format Microsoft Excel (<code>.xlsx</code>).</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#4f46e5;">3</div>
      <div class="step-text">
        <strong>Unduh Format Template Excel</strong>
        <p>Klik tombol unduh template terlebih dahulu untuk mendapatkan struktur kolom Excel resmi yang telah disesuaikan dengan sistem CBT sekolah.</p>
      </div>
    </div>
  </div>

  <div class="alert-box info">
    <div class="alert-icon">${svg.globe}</div>
    <div>
      <strong>Tips Guru:</strong> Pastikan Anda telah memilih <em>Mata Pelajaran</em> dan <em>Paket Ujian</em> yang sesuai pada dropdown filter sebelum melakukan penambahan soal agar soal masuk ke paket yang tepat.
    </div>
  </div>

  <!-- ==================== HALAMAN 3: BAB 2 INPUT SOAL MANUAL ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 2 • INPUT SOAL MANUAL, RUMUS & GAMBAR</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">2</div>
    <h2 class="section-heading">Menulis Butir Soal & Menetapkan Kunci</h2>
  </div>
  <p class="section-desc">
    Editor soal CBT dilengkapi dengan fitur <strong>Rich Text</strong>, pemformatan teks tebal/miring, daftar butir (list), persamaan matematika KaTeX (formula), serta penyisipan gambar ilustrasi soal.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/dashboard/questions • Tambah Soal</div>
    </div>
    <div class="window-body">
      <img src="${imgModalTambah}" alt="Modal Tambah Soal Manual">
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge" style="background:#2563eb;">1</div>
      <div class="step-text">
        <strong>Tulis Pertanyaan Soal di Editor Utama</strong>
        <p>Ketik narasi pertanyaan pada editor atas. Untuk menyisipkan gambar skema/soal klik ikon gambar (otomatis dikompresi ringan), atau klik ikon <code>fx</code> untuk rumus matematika.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#059669;">2</div>
      <div class="step-text">
        <strong>Isi Pilihan Jawaban A sampai E & Klik Radio Kunci Benar (Hijau)</strong>
        <p>Ketik pilihan jawaban pada kotak A, B, C, D, dan E. <strong>Wajib klik bulatan (radio button)</strong> pada huruf jawaban yang benar hingga terarsir hijau seperti pada contoh gambar.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#4f46e5;">3</div>
      <div class="step-text">
        <strong>Atur Bobot Poin & Klik Tombol Simpan</strong>
        <p>Tentukan bobot poin soal (default 1 hingga 2.5 poin per butir). Terakhir, klik tombol <strong>"Simpan Soal"</strong> di sudut kanan bawah modal.</p>
      </div>
    </div>
  </div>

  <div class="alert-box success">
    <div class="alert-icon">${svg.check}</div>
    <div>
      <strong>Otomasi Sistem:</strong> Gambar yang dimasukkan ke dalam soal akan otomatis dioptimasi dan dikompresi ke format WebP ringan oleh sistem agar tidak membebani kuota dan RAM HP siswa.
    </div>
  </div>

  <!-- ==================== HALAMAN 4: BAB 3 IMPORT SOAL VIA EXCEL ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 3 • IMPORT CEPAT SOAL VIA EXCEL (.XLSX)</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">3</div>
    <h2 class="section-heading">Unggah Massal Puluhan Soal Sekaligus</h2>
  </div>
  <p class="section-desc">
    Metode paling efektif untuk guru adalah mengetik seluruh soal dan pilihan jawaban di Microsoft Excel, lalu mengunggah berkas tersebut langsung ke portal CBT SMKN 1 Beringin.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/dashboard/questions • Upload Excel</div>
    </div>
    <div class="window-body">
      <img src="${imgModalUpload}" alt="Modal Upload Soal Excel">
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge" style="background:#059669;">1</div>
      <div class="step-text">
        <strong>Pilih Berkas Excel (.xlsx) dari Komputer / Laptop</strong>
        <p>Klik kotak area unggah atau seret (drag & drop) berkas Excel Anda ke area berwarna hijau tersebut.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#2563eb;">2</div>
      <div class="step-text">
        <strong>Konfirmasi Mata Pelajaran & Ujian Sasaran</strong>
        <p>Periksa dropdown mata pelajaran dan judul ujian, pastikan berkas dimasukkan ke paket yang tepat.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#4f46e5;">3</div>
      <div class="step-text">
        <strong>Klik Tombol "Mulai Unggah Soal"</strong>
        <p>Sistem akan memverifikasi format dan langsung memasukkan seluruh butir soal ke dalam Bank Soal secara instan.</p>
      </div>
    </div>
  </div>

  <table class="custom-table" style="margin-top: 10px;">
    <thead>
      <tr>
        <th style="width: 15%;">Kolom Excel</th>
        <th style="width: 25%;">Nama Kolom</th>
        <th style="width: 60%;">Aturan Pengisian</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge-col badge-req">Kolom A</span></td>
        <td><strong>No</strong></td>
        <td>Nomor urut butir soal (1, 2, 3, dst).</td>
      </tr>
      <tr>
        <td><span class="badge-col badge-req">Kolom B</span></td>
        <td><strong>Pertanyaan Soal</strong></td>
        <td>Teks butir soal pilihan ganda.</td>
      </tr>
      <tr>
        <td><span class="badge-col badge-req">Kolom C - G</span></td>
        <td><strong>Opsi A, B, C, D, E</strong></td>
        <td>Masing-masing kolom diisi dengan pilihan jawaban siswa.</td>
      </tr>
      <tr>
        <td><span class="badge-col badge-key">Kolom H</span></td>
        <td><strong>Kunci Jawaban</strong></td>
        <td>Tulis 1 huruf kapital sesuai jawaban benar: <code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>, atau <code>E</code>.</td>
      </tr>
      <tr>
        <td><span class="badge-col badge-key">Kolom I</span></td>
        <td><strong>Poin Soal</strong></td>
        <td>Bobot nilai per soal (contoh: <code>2.5</code> jika ada 40 soal agar pas 100 poin).</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== HALAMAN 5: BAB 4 MENJADWALKAN SESI UJIAN ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 4 • MEMBUAT & MENJADWALKAN SESI UJIAN</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">4</div>
    <h2 class="section-heading">Menghubungkan Soal dengan Kelas Peserta</h2>
  </div>
  <p class="section-desc">
    Setelah butir soal siap di Bank Soal, guru perlu membuat sesi jadwal ujian pada menu <strong>Jadwal Ujian</strong> agar siswa di kelas/jurusan yang bersangkutan dapat mengakses ujian saat jam pelaksanaan.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/dashboard/exams • Jadwal Ujian</div>
    </div>
    <div class="window-body">
      <img src="${imgModalJadwal}" alt="Modal Buat Jadwal Ujian">
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge" style="background:#2563eb;">1</div>
      <div class="step-text">
        <strong>Isi Judul Ujian & Pilih Mata Pelajaran</strong>
        <p>Beri judul yang jelas (contoh: <em>Asesmen Sumatif Akhir Semester Genap</em>) dan pilih mata pelajaran terkait.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#059669;">2</div>
      <div class="step-text">
        <strong>Atur Tanggal Pelaksanaan & Durasi Pengerjaan (Menit)</strong>
        <p>Pilih tanggal pelaksanaan ujian kalender dan masukkan durasi waktu ujian (contoh: <strong>90</strong> untuk 90 menit).</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#4f46e5;">3</div>
      <div class="step-text">
        <strong>Pilih Rombel / Jurusan Peserta Ujian (Checklist Kelas)</strong>
        <p>Klik tombol rombel kelas yang akan mengikuti ujian (contoh: X TJKT 1, XI PPLG, XII TBSM). Ujian hanya akan muncul di akun siswa rombel tersebut.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#2563eb;">4</div>
      <div class="step-text">
        <strong>Klik Tombol "Simpan Jadwal Ujian"</strong>
        <p>Jadwal akan otomatis tersimpan dan aktif pada tanggal ujian yang telah ditentukan.</p>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 6: BAB 5 SOP & REKAP NILAI ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 5 • SOP PENYUSUNAN SOAL & REKAP NILAI</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">5</div>
    <h2 class="section-heading">Standar Operasional Prosedur Guru Mapel</h2>
  </div>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 30%;">Ketentuan</th>
        <th style="width: 70%;">Standar Teknis CBT SMKN 1 Beringin</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Jumlah Butir Soal</strong></td>
        <td>
          Disarankan <strong>40 butir</strong> (durasi 90 menit) atau <strong>50 butir</strong> (durasi 120 menit) dengan 5 pilihan jawaban (A, B, C, D, E).
        </td>
      </tr>
      <tr>
        <td><strong>Kalkulasi Bobot Nilai</strong></td>
        <td>
          Pastikan akumulasi total poin seluruh butir soal berjumlah <strong>100</strong>. Jika 40 butir, masing-masing bernilai <code>2.5</code> poin. Jika 50 butir, bernilai <code>2.0</code> poin.
        </td>
      </tr>
      <tr>
        <td><strong>Penyisipan Gambar</strong></td>
        <td>
          Gunakan gambar berorientasi horizontal (landscape) dengan resolusi yang jelas. Hindari gambar tulisan panjang yang sulit dibaca di layar HP 5-6 inci.
        </td>
      </tr>
      <tr>
        <td><strong>Batas Akhir Upload</strong></td>
        <td>
          Seluruh bank soal dan jadwal wajib diinput paling lambat <strong>H-2 sebelum Gladi Bersih</strong> atau pelaksanaan ujian dimulai agar dapat diverifikasi tim kurikulum.
        </td>
      </tr>
      <tr>
        <td><strong>Mengunduh Rekap Nilai</strong></td>
        <td>
          Setelah ujian selesai, guru dapat membuka menu <em>Hasil Ujian</em> lalu mengklik <strong>"Export Rekap Nilai Excel"</strong> untuk memperoleh nilai lengkap beserta analisis butir soal.
        </td>
      </tr>
    </tbody>
  </table>

  <div class="section-title-wrap" style="margin-top: 18px;">
    <div class="section-num" style="background: #059669;">✓</div>
    <h2 class="section-heading">Checklist Kesiapan Sebelum Hari Ujian</h2>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Verifikasi Kunci Jawaban</strong>
        <p>Pastikan setiap butir soal telah memiliki 1 radio button kunci jawaban yang aktif (berwarna hijau).</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Periksa Rombel / Kelas Terdaftar</strong>
        <p>Pastikan tidak ada rombel jurusan yang tertinggal pada checklist sesi jadwal ujian.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Koordinasi dengan Pengawas Ruang</strong>
        <p>Beritahukan guru pengawas ruangan mengenai token atau mata pelajaran yang akan diujikan pada sesi tersebut.</p>
      </div>
    </div>
  </div>

  <div class="alert-box info" style="margin-top: 15px;">
    <div class="alert-icon">${svg.phone}</div>
    <div>
      <strong>Pusat Bantuan & Konsultasi Bank Soal:</strong> Apabila Bapak/Ibu Guru memerlukan asistensi terkait konversi format Excel, rumus formula matematika, atau kendala penjadwalan, silakan menghubungi <strong>Tim TIK SMKN 1 Beringin</strong> di Ruang Laboratorium Komputer.
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = '/www/wwwroot/AppUjian/manual_book_assets/buku_panduan_soal.html';
fs.writeFileSync(htmlFilePath, htmlContent);
console.log('Saved HTML to ' + htmlFilePath);

(async () => {
  console.log('Generating PDF via Chromium Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const distDir = '/www/wwwroot/AppUjian/admin/dist/downloads';
  const publicDir = '/www/wwwroot/AppUjian/admin/public/downloads';
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const pdfPath = path.join(distDir, 'Buku_Panduan_Pembuatan_Soal_CBT_SMKN1Beringin.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      top: '10mm',
      right: '12mm',
      bottom: '12mm',
      left: '12mm'
    }
  });

  const publicPdfPath = path.join(publicDir, 'Buku_Panduan_Pembuatan_Soal_CBT_SMKN1Beringin.pdf');
  fs.copyFileSync(pdfPath, publicPdfPath);

  console.log('SUCCESS! PDF generated at: ' + pdfPath);
  console.log('Copied to public path: ' + publicPdfPath);
  console.log('File size: ' + fs.statSync(pdfPath).size + ' bytes');

  await browser.close();
})();
