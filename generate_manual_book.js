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

// Use the newly created DOM-annotated screenshots
const imgLogin = getBase64('/www/wwwroot/AppUjian/manual_book_assets/01_login_annotated.png');
const imgDashboard = getBase64('/www/wwwroot/AppUjian/manual_book_assets/02_dashboard_annotated.png');
const imgPengawasRuang = getBase64('/www/wwwroot/AppUjian/manual_book_assets/03_pengawas_ruang_annotated.png');
const imgModalBukaKunci = getBase64('/www/wwwroot/AppUjian/manual_book_assets/04_modal_buka_kunci_annotated.png');
const imgJadwal = getBase64('/www/wwwroot/AppUjian/manual_book_assets/04_jadwal_ujian.png');

// Reusable clean SVG helper
const svg = {
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  unlock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Panduan Pengawas CBT - SMKN 1 Beringin</title>
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
        content: "Buku Panduan Pengawas CBT • SMK Negeri 1 Beringin";
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
      font-size: 32pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      letter-spacing: -1px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .cover-hero-title span {
      color: #059669;
    }
    .cover-hero-subtitle {
      font-size: 12pt;
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
    .icon-bg-indigo { background: #eef2ff; color: #4f46e5; }
    .icon-bg-red { background: #fef2f2; color: #dc2626; }
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
      color: #059669;
      background: #ecfdf5;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid #a7f3d0;
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
      max-width: 320px;
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
      background: #059669;
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
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }
    .alert-box.warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .alert-box.danger {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
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
    .badge-status {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-ongoing { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-locked { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-finished { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-unstarted { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>

  <!-- ==================== HALAMAN 1: COVER KEREN & MINIM TEKS ==================== -->
  <div class="cover-container">
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

    <div class="cover-center">
      <div class="cover-main-badge">Buku Panduan Operasional 2026</div>
      <h1 class="cover-hero-title">Panduan Pengawas<br><span>Ujian CBT</span></h1>
      <p class="cover-hero-subtitle">Petunjuk Lengkap Login Ruang, Monitoring Peserta & Prosedur Buka Kunci Siswa</p>

      <div class="cover-cards-grid">
        <div class="cover-card">
          <div class="cover-card-icon icon-bg-blue">
            ${svg.lock}
          </div>
          <h4>1. Akses Ruang</h4>
          <p>Login akun ruang ujian (x.pplg1 - xii.tkj2)</p>
        </div>
        <div class="cover-card">
          <div class="cover-card-icon icon-bg-indigo">
            ${svg.eye}
          </div>
          <h4>2. Pantau Siswa</h4>
          <p>Monitoring pengerjaan siswa secara langsung</p>
        </div>
        <div class="cover-card">
          <div class="cover-card-icon icon-bg-red">
            ${svg.unlock}
          </div>
          <h4>3. Buka Kunci</h4>
          <p>Pemulihan sesi siswa terkunci tanpa hilang jawaban</p>
        </div>
      </div>
    </div>

    <!-- Sesuai permintaan user: Di kanan kosong, di kiri diterbitkan oleh Tim TIK SMKN 1 Beringin, sasaran diganti untuk -->
    <div class="cover-footer">
      <div class="cover-footer-text">
        <p><strong>Diterbitkan oleh:</strong> Tim TIK SMKN 1 Beringin</p>
        <p><strong>Alamat Portal:</strong> https://ujian.tiksmkn1beringin.my.id</p>
        <p><strong>Untuk:</strong> Bapak/Ibu Guru Pengawas Ruang & Proktor Sekolah</p>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 2: BAB 1 AKSES & LOGIN ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 1 • AKSES PORTAL & LOGIN PENGAWAS</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">1</div>
    <h2 class="section-heading">Akses Portal dan Login Pengawas</h2>
  </div>
  <p class="section-desc">
    Pengawas mengakses portal menggunakan Google Chrome di laptop atau komputer lab. Setiap ruangan telah disiapkan akun khusus untuk memantau siswa di kelas tersebut.
  </p>

  <div class="alert-box info">
    <div class="alert-icon">${svg.globe}</div>
    <div>
      <strong>Alamat Web Portal:</strong> Buka <strong>https://ujian.tiksmkn1beringin.my.id</strong> (atau langsung ke halaman login <strong>/login</strong>).
    </div>
  </div>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/login</div>
    </div>
    <div class="window-body">
      <img src="${imgLogin}" alt="Tampilan Login Pengawas">
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Masukkan Username Ruang Pengawas</strong>
        <p>Gunakan nama kelas/ruangan dalam huruf kecil. Contoh: <code>x.pplg1</code>, <code>x.pplg2</code>, <code>xi.tkj1</code>, <code>xii.rpl1</code>, dst.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Masukkan Password Standar Pengawas</strong>
        <p>Password default seluruh akun pengawas ruang adalah: <strong style="color:#059669;">pengawas123</strong>.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Klik Tombol "Masuk ke Sistem"</strong>
        <p>Sistem akan memvalidasi dan langsung membuka Dashboard Pengawas Ruang.</p>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 3: BAB 2 DASHBOARD ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 2 • NAVIGASI MENU & PUSAT KENDALI</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">2</div>
    <h2 class="section-heading">Navigasi Menu Utama</h2>
  </div>
  <p class="section-desc">
    Setelah login, bilah menu di sebelah kiri (Sidebar) memuat seluruh menu kerja pengawas dan guru.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/dashboard</div>
    </div>
    <div class="window-body">
      <img src="${imgDashboard}" alt="Tampilan Dashboard">
    </div>
  </div>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 25%;">Menu di Sidebar</th>
        <th style="width: 40%;">Fungsi</th>
        <th style="width: 35%;">Penggunaan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Pengawas Ruang</strong></td>
        <td>Membuka kartu pengawasan kelas untuk memantau pengerjaan siswa.</td>
        <td><strong>Wajib dibuka selama ujian berlangsung!</strong></td>
      </tr>
      <tr>
        <td><strong>Jadwal Ujian</strong></td>
        <td>Melihat jadwal sesi, durasi pengerjaan, dan Token Ujian.</td>
        <td>Digunakan sebelum ujian dimulai.</td>
      </tr>
      <tr>
        <td><strong>Bank Soal</strong></td>
        <td>Memeriksa butir soal dan kunci jawaban ujian (Guru Mapel/Admin).</td>
        <td>Verifikasi kesiapan materi soal.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== HALAMAN 4: BAB 3 PENGAWAS RUANG ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 3 • MONITORING RUANG UJIAN</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">3</div>
    <h2 class="section-heading">Membuka Monitoring Ruangan (Pantau Siswa)</h2>
  </div>
  <p class="section-desc">
    Menu <strong>Pengawas Ruang</strong> adalah halaman utama Bapak/Ibu guru. Klik tombol <strong>"Pantau Siswa"</strong> pada kartu ruangan untuk membuka daftar nama peserta secara realtime.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/supervisors</div>
    </div>
    <div class="window-body">
      <img src="${imgPengawasRuang}" alt="Pengawas Ruang">
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Pilih Kartu Ruangan</strong>
        <p>Pastikan kartu ruangan sesuai dengan ruang kelas yang sedang diawasi (misal: <em>Ruang X PPLG 1</em>).</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Klik Tombol "Pantau Siswa" (Lihat Tanda Biru)</strong>
        <p>Tombol ini akan membuka jendela pop-up tabel seluruh siswa di kelas tersebut secara lengkap.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Arti Status Siswa:</strong>
        <p>
          <span class="badge-status badge-ongoing">SEDANG UJIAN</span> Siswa sedang aktif menjawab soal di HP.<br>
          <span class="badge-status badge-locked">TERKUNCI</span> Siswa melanggar aturan dan sesinya terblokir.<br>
          <span class="badge-status badge-finished">SELESAI</span> Siswa telah mengirimkan lembar jawaban.<br>
          <span class="badge-status badge-unstarted">BELUM MASUK</span> Siswa belum memulai ujian.
        </p>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 5: BAB 4 BUKA KUNCI SISWA (PENTING) ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 4 • PANDUAN MEMBUKA KUNCI SISWA</span>
    </div>
    <div class="page-header-right" style="color: #dc2626; background: #fef2f2; border-color: #fecaca;">PENTING & WAJIB DIKETAHUI</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num" style="background: #dc2626;">4</div>
    <h2 class="section-heading" style="color: #dc2626;">Cara Membuka Kunci Siswa (Unlock)</h2>
  </div>
  <p class="section-desc">
    Jika siswa keluar ke aplikasi lain (WhatsApp, Google Chrome), membagi layar (Split Screen), atau melepas sematan aplikasi, ujian akan otomatis <strong>TERKUNCI</strong>. Pengawas dapat membukanya kembali dengan 1 klik.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/supervisors • Modal Pantau Siswa</div>
    </div>
    <div class="window-body">
      <img src="${imgModalBukaKunci}" alt="Modal Buka Kunci Siswa">
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge" style="background:#dc2626;">1</div>
      <div class="step-text">
        <strong>Lihat Siswa Berstatus "TERKUNCI"</strong>
        <p>Nama siswa yang melanggar aturan akan otomatis ditandai dengan badge merah <span class="badge-status badge-locked">TERKUNCI</span>.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#dc2626;">2</div>
      <div class="step-text">
        <strong>Klik Ikon Gembok Terbuka "Buka Kunci" (Lihat Tanda Merah)</strong>
        <p>Di kolom paling kanan baris siswa tersebut, klik tombol ikon gembok terbuka (<strong>Unlock</strong>).</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#059669;">3</div>
      <div class="step-text">
        <strong>Ujian Langsung Terbuka Kembali Seketika</strong>
        <p>Layar HP siswa langsung terbuka otomatis tanpa perlu login ulang. <strong>Jawaban siswa yang sudah diisi tetap tersimpan aman di server!</strong></p>
      </div>
    </div>
  </div>

  <div class="alert-box danger">
    <div class="alert-icon">${svg.alert}</div>
    <div>
      <strong>Peringatan Pengawas:</strong> Berikan teguran lisan sebelum membuka kunci agar siswa tidak mengulangi tindakan membuka aplikasi lain saat ujian.
    </div>
  </div>

  <!-- ==================== HALAMAN 6: BAB 5 TROUBLESHOOTING & SOP ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 5 • TROUBLESHOOTING & SOP RUANG UJIAN</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">5</div>
    <h2 class="section-heading">Penanganan Kendala Teknis di Ruangan</h2>
  </div>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 35%;">Kendala Siswa</th>
        <th style="width: 65%;">Solusi Cepat Pengawas</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>HP Siswa Mati / Habis Baterai</strong></td>
        <td>
          Siswa mengisi daya baterai atau berganti ke HP lain/laptop lab. Jawaban <strong>tidak akan hilang</strong>. Siswa cukup login kembali.
        </td>
      </tr>
      <tr>
        <td><strong>Tombol Power Kepencet / Layar Mati</strong></td>
        <td>
          Pada versi v1.1.7 terbaru, memencet tombol power <strong>TIDAK MENGUNCI UJIAN</strong>. Cukup nyalakan layar HP dan ujian langsung lanjut.
        </td>
      </tr>
      <tr>
        <td><strong>Siswa Berganti Perangkat (Ganti HP)</strong></td>
        <td>
          Jika muncul keterangan <em>"Akun aktif di perangkat lain"</em>, pengawas cukup klik tombol <strong>Buka Kunci / Reset Sesi</strong> pada nama siswa tersebut.
        </td>
      </tr>
      <tr>
        <td><strong>Aplikasi Siswa Minta Update</strong></td>
        <td>
          Pastikan siswa menginstal file APK terbaru <strong>v1.1.7</strong> dari: <br>
          <code>https://ujian.tiksmkn1beringin.my.id/download</code>
        </td>
      </tr>
      <tr>
        <td><strong>Waktu Ujian Habis</strong></td>
        <td>
          Jawaban otomatis terkirim dan status siswa di layar pengawas berubah menjadi <span class="badge-status badge-finished">SELESAI</span>.
        </td>
      </tr>
    </tbody>
  </table>

  <div class="section-title-wrap" style="margin-top: 18px;">
    <div class="section-num" style="background: #059669;">✓</div>
    <h2 class="section-heading">SOP Setelah Ujian Selesai</h2>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Pastikan Semua Siswa Berstatus "SELESAI"</strong>
        <p>Cek tabel Pantau Siswa, pastikan seluruh siswa telah mengirimkan jawaban.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Selesaikan Sesi Pengawasan</strong>
        <p>Pada kartu ruangan, klik tombol <strong>"Selesaikan Sesi Pengawasan"</strong> untuk mengunci akhir ujian kelas.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Logout Akun Pengawas</strong>
        <p>Klik tombol Logout di pojok kanan atas setelah selesai bertugas.</p>
      </div>
    </div>
  </div>

  <div class="alert-box info" style="margin-top: 15px;">
    <div class="alert-icon">${svg.phone}</div>
    <div>
      <strong>Layanan Bantuan Proktor:</strong> Jika terjadi kendala jaringan server yang tidak dapat diselesaikan mandiri, segera hubungi <strong>Tim IT / Proktor CBT SMKN 1 Beringin</strong> di Ruang Server.
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = '/www/wwwroot/AppUjian/manual_book_assets/buku_panduan.html';
fs.writeFileSync(htmlFilePath, htmlContent);
console.log('Saved updated HTML to ' + htmlFilePath);

(async () => {
  console.log('Generating updated PDF via Chromium...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfPath = '/www/wwwroot/AppUjian/admin/dist/downloads/Buku_Panduan_Pengawas_CBT_SMKN1Beringin.pdf';
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

  const publicPdfPath = '/www/wwwroot/AppUjian/admin/public/downloads/Buku_Panduan_Pengawas_CBT_SMKN1Beringin.pdf';
  fs.copyFileSync(pdfPath, publicPdfPath);

  console.log('Updated PDF generated at: ' + pdfPath);
  console.log('Updated PDF copied to: ' + publicPdfPath);
  await browser.close();
})();
