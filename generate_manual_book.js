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
const imgLogin = getBase64('/www/wwwroot/AppUjian/manual_book_assets/01_login.png');
const imgDashboard = getBase64('/www/wwwroot/AppUjian/manual_book_assets/02_dashboard.png');
const imgBankSoal = getBase64('/www/wwwroot/AppUjian/manual_book_assets/03_bank_soal.png');
const imgJadwal = getBase64('/www/wwwroot/AppUjian/manual_book_assets/04_jadwal_ujian.png');
const imgModalBukaKunci = getBase64('/www/wwwroot/AppUjian/manual_book_assets/05_modal_buka_kunci_detail.png');
const imgPengawasRuang = getBase64('/www/wwwroot/AppUjian/manual_book_assets/06_pengawas_ruang.png');

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Panduan Pengawas CBT - SMKN 1 Beringin</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 14mm 15mm 14mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 9pt;
        color: #64748b;
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
      line-height: 1.5;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-break {
      page-break-before: always;
    }

    /* Header & Footer on Inner Pages */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 16px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .page-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .page-header-left img {
      height: 22px;
    }
    .page-header-left span {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.3px;
    }
    .page-header-right {
      font-size: 8pt;
      font-weight: 600;
      color: #059669;
      background: #ecfdf5;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid #a7f3d0;
    }

    /* COVER PAGE */
    .cover-container {
      height: 100%;
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px 10px;
      position: relative;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
    }
    .cover-school-meta {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .cover-logo {
      width: 65px;
      height: 65px;
      object-fit: contain;
    }
    .cover-school-text h2 {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cover-school-text p {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 500;
    }
    .cover-sumut-logo {
      height: 38px;
      object-fit: contain;
    }

    .cover-hero {
      margin-top: 50px;
      margin-bottom: 40px;
      text-align: center;
    }
    .badge-gladi {
      display: inline-block;
      background: linear-gradient(135deg, #059669, #047857);
      color: #ffffff;
      font-size: 9.5pt;
      font-weight: 700;
      padding: 6px 18px;
      border-radius: 999px;
      margin-bottom: 20px;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .cover-title span {
      color: #059669;
    }
    .cover-subtitle {
      font-size: 12pt;
      color: #475569;
      font-weight: 500;
      max-width: 80%;
      margin: 0 auto 30px auto;
      line-height: 1.5;
    }

    .cover-features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 0 auto;
      max-width: 95%;
    }
    .cover-feature-box {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      text-align: left;
    }
    .cover-feature-box .num {
      width: 26px;
      height: 26px;
      background: #059669;
      color: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 9pt;
      margin-bottom: 8px;
    }
    .cover-feature-box h4 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .cover-feature-box p {
      font-size: 8pt;
      color: #64748b;
      line-height: 1.35;
    }

    .cover-footer {
      border-top: 1.5px solid #e2e8f0;
      padding-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      background: #f8fafc;
      padding: 14px 18px;
      border-radius: 12px;
    }
    .cover-footer-info p {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 2px;
    }
    .cover-footer-info strong {
      color: #0f172a;
    }
    .cover-version-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 8.5pt;
      font-weight: 700;
    }

    /* SECTION STYLES */
    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .section-num {
      width: 32px;
      height: 32px;
      background: #0f172a;
      color: #ffffff;
      font-size: 12pt;
      font-weight: 800;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    h2.section-heading {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    p.section-desc {
      font-size: 9.5pt;
      color: #475569;
      margin-bottom: 14px;
      line-height: 1.5;
    }

    /* WINDOW MOCKUP FOR SCREENSHOTS */
    .window-mockup {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
      margin: 14px 0 16px 0;
      position: relative;
    }
    .window-header {
      background: #f1f5f9;
      padding: 6px 12px;
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
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .window-address {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 7.5pt;
      font-family: monospace;
      color: #475569;
      padding: 2px 10px;
      flex-grow: 1;
      max-width: 320px;
    }
    .window-body {
      position: relative;
      background: #0f172a;
    }
    .window-img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* ANNOTATION CALLOUTS & ARROWS */
    .callout-overlay {
      position: absolute;
      z-index: 10;
      pointer-events: none;
    }
    .badge-pin {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: #ef4444;
      color: #ffffff;
      font-weight: 800;
      font-size: 8.5pt;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    .pulse-ring {
      border: 2.5px solid #ef4444;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.15);
      position: absolute;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
    }

    /* STEP LIST */
    .steps-list {
      list-style: none;
      margin: 10px 0 14px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 12px;
    }
    .step-badge {
      width: 22px;
      height: 22px;
      background: #059669;
      color: #ffffff;
      font-weight: 800;
      font-size: 8.5pt;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text {
      flex: 1;
    }
    .step-text strong {
      color: #0f172a;
      font-size: 9.5pt;
      display: block;
      margin-bottom: 2px;
    }
    .step-text p {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
    }

    /* BOXES: NOTICE, TIP, WARNING */
    .alert-box {
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0 14px 0;
      font-size: 8.5pt;
      line-height: 1.45;
      display: flex;
      gap: 10px;
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
      font-size: 13pt;
      line-height: 1;
      margin-top: 1px;
    }

    /* TABLES */
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 8.5pt;
    }
    .custom-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 7px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .custom-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .custom-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge-status {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-ongoing { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-locked { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-finished { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-unstarted { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    /* HIGHLIGHT POINTER */
    .pointer-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #ef4444;
      color: white;
      font-weight: 700;
      font-size: 7.5pt;
      padding: 2px 8px;
      border-radius: 4px;
      margin: 0 2px;
    }
  </style>
</head>
<body>

  <!-- ==================== HALAMAN 1: COVER RESMI ==================== -->
  <div class="cover-container">
    <div class="cover-top">
      <div class="cover-school-meta">
        <img src="${logoBase64}" alt="Logo SMK" class="cover-logo">
        <div class="cover-school-text">
          <h2>SMK Negeri 1 Beringin</h2>
          <p>Dinas Pendidikan Provinsi Sumatera Utara • Kab. Deli Serdang</p>
        </div>
      </div>
      <img src="${logoSumutBase64}" alt="Logo Sumut" class="cover-sumut-logo">
    </div>

    <div class="cover-hero">
      <div class="badge-gladi">Gladi Bersih & Ujian Semester 2026</div>
      <h1 class="cover-title">BUKU PANDUAN RESMI<br><span>PENGAWAS & GURU</span></h1>
      <p class="cover-subtitle">
        Petunjuk Praktis Pengoperasian Portal Ujian CBT: Login Ruang, Manajemen Ujian, Monitoring Peserta Real-Time, dan Prosedur Buka Kunci Siswa.
      </p>

      <div class="cover-features-grid">
        <div class="cover-feature-box">
          <div class="num">1</div>
          <h4>Akses & Login</h4>
          <p>Panduan akses web dan penggunaan akun pengawas ruang (x.pplg1 - xii.tkj2).</p>
        </div>
        <div class="cover-feature-box">
          <div class="num">2</div>
          <h4>Monitoring Real-Time</h4>
          <p>Pantau status siswa yang sedang mengerjakan, selesai, atau melanggar aturan.</p>
        </div>
        <div class="cover-feature-box">
          <div class="num">3</div>
          <h4>Buka Kunci Siswa</h4>
          <p>Langkah instan membuka sesi siswa yang terkunci tanpa kehilangan jawaban.</p>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <div class="cover-footer-info">
        <p><strong>Diterbitkan oleh:</strong> Tim Kurikulum & Tim IT CBT SMKN 1 Beringin</p>
        <p><strong>Alamat Portal:</strong> https://ujian.tiksmkn1beringin.my.id</p>
        <p><strong>Sasaran:</strong> Bapak/Ibu Guru Pengawas Ruang & Proktor Sekolah</p>
      </div>
      <div class="cover-version-badge">
        CBT Engine v1.1.7 (Stable)
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
    Setiap Bapak/Ibu Guru yang bertugas sebagai pengawas ruangan wajib menggunakan akun pengawas yang telah disiapkan khusus untuk ruangannya masing-masing. Portal dapat diakses menggunakan laptop, komputer lab, maupun tablet.
  </p>

  <div class="alert-box info">
    <div class="alert-icon">🌐</div>
    <div>
      <strong>Alamat Portal Resmi:</strong> Buka Google Chrome di laptop/komputer, ketik alamat: 
      <strong style="color: #047857;">https://ujian.tiksmkn1beringin.my.id</strong> (atau langsung menuju <strong>/login</strong>).
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
      <img src="${imgLogin}" alt="Tampilan Halaman Login" class="window-img">
      <!-- Highlight box on form -->
      <div class="pulse-ring" style="top: 38%; left: 35%; width: 30%; height: 50%;"></div>
      <div class="callout-overlay" style="top: 36%; left: 63%;">
        <span class="badge-pin">1</span>
      </div>
      <div class="callout-overlay" style="top: 55%; left: 63%;">
        <span class="badge-pin">2</span>
      </div>
      <div class="callout-overlay" style="top: 75%; left: 63%;">
        <span class="badge-pin">3</span>
      </div>
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Masukkan Username Ruang Pengawas</strong>
        <p>Gunakan username sesuai kelas/ruangan yang diawasi dengan format huruf kecil. Contoh: <code>x.pplg1</code>, <code>x.pplg2</code>, <code>xi.tkj1</code>, <code>xii.rpl1</code>, dst.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Masukkan Password Standar</strong>
        <p>Password default seluruh akun pengawas ruang adalah: <strong style="color:#059669;">pengawas123</strong>.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Klik Tombol "Masuk ke Sistem"</strong>
        <p>Sistem akan memvalidasi akun dan otomatis mengarahkan Bapak/Ibu ke Dashboard Pengawas Ruang.</p>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 3: BAB 2 DASHBOARD & MENU ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 2 • NAVIGASI DASHBOARD & MENU UTAMA</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">2</div>
    <h2 class="section-heading">Mengenal Dashboard dan Menu Navigasi</h2>
  </div>
  <p class="section-desc">
    Setelah berhasil login, Bapak/Ibu akan melihat tampilan Dashboard Utama yang menyajikan ringkasan statistik ujian hari ini, jumlah peserta aktif, serta pintasan cepat ke menu pengawasan.
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
      <img src="${imgDashboard}" alt="Tampilan Dashboard" class="window-img">
      <!-- Highlight box on Sidebar -->
      <div class="pulse-ring" style="top: 10%; left: 0%; width: 17%; height: 85%;"></div>
      <div class="callout-overlay" style="top: 15%; left: 18%;">
        <span class="badge-pin">A</span>
      </div>
      <!-- Highlight box on Stat Cards -->
      <div class="pulse-ring" style="top: 15%; left: 20%; width: 78%; height: 25%;"></div>
      <div class="callout-overlay" style="top: 18%; left: 95%;">
        <span class="badge-pin">B</span>
      </div>
    </div>
  </div>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 25%;">Menu di Sidebar (A)</th>
        <th style="width: 35%;">Fungsi Utama</th>
        <th style="width: 40%;">Kapan Digunakan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Dashboard</strong></td>
        <td>Melihat ringkasan total ujian, mata pelajaran, dan siswa aktif.</td>
        <td>Saat pertama kali masuk portal.</td>
      </tr>
      <tr>
        <td><strong>Pengawas Ruang</strong></td>
        <td>Membuka kartu pengawasan ruang kelas untuk memantau pengerjaan siswa.</td>
        <td><strong>Wajib dibuka saat jam ujian berlangsung!</strong></td>
      </tr>
      <tr>
        <td><strong>Jadwal Ujian</strong></td>
        <td>Melihat daftar ujian aktif, jadwal sesi, durasi, dan token.</td>
        <td>Sebelum ujian dimulai untuk mengecek token.</td>
      </tr>
      <tr>
        <td><strong>Bank Soal / Mapel</strong></td>
        <td>Melihat butir soal ujian dan kunci jawaban (khusus Guru Mapel/Admin).</td>
        <td>Saat verifikasi kesiapan naskah soal.</td>
      </tr>
      <tr>
        <td><strong>Siswa & Kelas</strong></td>
        <td>Daftar siswa peserta ujian dan penetapan ruang sesi.</td>
        <td>Pengecekan data absensi peserta.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== HALAMAN 4: BAB 3 PENJADWALAN & TOKEN ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 3 • JADWAL UJIAN, DURASI & TOKEN</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">3</div>
    <h2 class="section-heading">Memeriksa Jadwal Ujian dan Token Masuk</h2>
  </div>
  <p class="section-desc">
    Menu <strong>Jadwal Ujian</strong> berisi daftar seluruh mata pelajaran yang diujikan. Pengawas dapat melihat batas waktu pengerjaan serta status apakah ujian siap dimulai atau sudah selesai.
  </p>

  <div class="window-mockup">
    <div class="window-header">
      <div class="window-dots">
        <div class="window-dot dot-red"></div>
        <div class="window-dot dot-yellow"></div>
        <div class="window-dot dot-green"></div>
      </div>
      <div class="window-address">https://ujian.tiksmkn1beringin.my.id/exams</div>
    </div>
    <div class="window-body">
      <img src="${imgJadwal}" alt="Daftar Jadwal Ujian" class="window-img">
      <!-- Highlight box on Table Action buttons -->
      <div class="pulse-ring" style="top: 32%; left: 82%; width: 15%; height: 60%;"></div>
      <div class="callout-overlay" style="top: 35%; left: 93%;">
        <span class="badge-pin">★</span>
      </div>
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Pemeriksaan Token Masuk Siswa</strong>
        <p>Aplikasi CBT di HP siswa akan otomatis mendeteksi ujian yang sedang aktif sesuai jadwal. Jika diminta token konfirmasi, pengawas dapat membacakan token resmi yang tertera pada kartu jadwal.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Durasi Pengerjaan & Waktu Berjalan</strong>
        <p>Setiap soal ujian memiliki durasi standar (misal: 60 - 90 menit). Waktu di HP siswa akan menghitung mundur otomatis secara independen sejak siswa menekan tombol <em>"Mulai Ujian"</em>.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Ikon Tombol Aksi di Kolom Kanan (★)</strong>
        <p>
          • <strong>Ikon Orang / Users:</strong> Membuka daftar peserta langsung.<br>
          • <strong>Ikon Excel / Spreadsheet:</strong> Mengunduh rekap nilai siswa satu kelas setelah ujian berakhir.
        </p>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 5: BAB 4 PENGAWASAN REAL-TIME ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 4 • PENGAWASAN RUANGAN REAL-TIME</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">4</div>
    <h2 class="section-heading">Monitoring Ruang Ujian Secara Langsung</h2>
  </div>
  <p class="section-desc">
    Menu <strong>Pengawas Ruang</strong> adalah pusat kendali utama Bapak/Ibu selama berada di dalam ruangan. Di sini Bapak/Ibu dapat mengawasi pergerakan seluruh siswa secara <em>real-time</em> tanpa perlu berkeliling terus-menerus.
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
      <img src="${imgPengawasRuang}" alt="Kartu Pengawas Ruang" class="window-img">
      <!-- Highlight box on "Pantau Siswa" button -->
      <div class="pulse-ring" style="top: 48%; left: 35%; width: 28%; height: 18%;"></div>
      <div class="callout-overlay" style="top: 45%; left: 60%;">
        <span class="badge-pin">KLIK</span>
      </div>
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Pilih Kartu Ruangan Kelas yang Diawasi</strong>
        <p>Di layar akan muncul kartu sesuai kelas yang ditugaskan (misal: <em>Ruang X PPLG 1 - Simulasi Ujian</em>).</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Klik Tombol "Pantau Siswa" (Lihat Tanda Panah)</strong>
        <p>Tombol berwarna putih dengan ikon mata biru bertuliskan <strong>"Pantau Siswa"</strong> akan membuka jendela detail seluruh siswa di kelas tersebut.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Arti Status pada Kartu Pengawasan:</strong>
        <p>
          <span class="badge-status badge-ongoing">SEDANG UJIAN</span> Siswa sedang aktif menjawab soal di HP.<br>
          <span class="badge-status badge-locked">TERKUNCI</span> Siswa melanggar aturan dan sesinya diblokir.<br>
          <span class="badge-status badge-finished">SELESAI</span> Siswa telah mengirimkan lembar jawaban.<br>
          <span class="badge-status badge-unstarted">BELUM MASUK</span> Siswa belum menekan tombol mulai.
        </p>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 6: BAB 5 MEMBUKA KUNCI SISWA (PENTING) ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 5 • PANDUAN BUKA KUNCI SISWA (UNLOCK)</span>
    </div>
    <div class="page-header-right">PENTING & WAJIB DIKETAHUI</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num" style="background: #dc2626;">5</div>
    <h2 class="section-heading" style="color: #dc2626;">Cara Membuka Kunci Siswa yang Terkunci</h2>
  </div>
  <p class="section-desc">
    Jika siswa mencoba membuka aplikasi lain (WhatsApp, Chrome, Kalkulator), membagi layar (Split Screen), atau keluar dari aplikasi saat ujian, <strong>sistem akan otomatis mengunci ujian siswa</strong> dan memunculkan notifikasi merah di HP-nya. Siswa tidak dapat melanjutkan sampai pengawas membukanya.
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
      <img src="${imgModalBukaKunci}" alt="Modal Pantau Siswa dan Buka Kunci" class="window-img">
      <!-- Highlight box on Table Row Action Buttons -->
      <div class="pulse-ring" style="top: 40%; left: 78%; width: 18%; height: 50%;"></div>
      <div class="callout-overlay" style="top: 38%; left: 93%;">
        <span class="badge-pin">🔓</span>
      </div>
    </div>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge" style="background:#dc2626;">1</div>
      <div class="step-text">
        <strong>Identifikasi Siswa yang Terkunci</strong>
        <p>Pada tabel modal Pantau Siswa, siswa yang terkunci akan memiliki label merah mencolok bertuliskan <span class="badge-status badge-locked">TERKUNCI</span> beserta catatan alasan pelanggaran.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#dc2626;">2</div>
      <div class="step-text">
        <strong>Tanyakan Alasan & Berikan Peringatan Lisan</strong>
        <p>Pastikan siswa telah menutup semua aplikasi lain dan kembali memusatkan perhatian pada layar HP-nya.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#059669;">3</div>
      <div class="step-text">
        <strong>Klik Ikon Gembok Terbuka "Buka Kunci" (Lihat Tanda 🔓)</strong>
        <p>Di kolom paling kanan (Aksi), klik tombol ikon <strong>Gembok Terbuka (Unlock)</strong> berwarna hijau/kuning pada baris nama siswa tersebut.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge" style="background:#059669;">4</div>
      <div class="step-text">
        <strong>Konfirmasi & Ujian Siswa Langsung Terbuka</strong>
        <p>Akan muncul konfirmasi cepat. Begitu diklik OK, <strong>layar HP siswa otomatis terbuka kembali saat itu juga</strong>. Siswa dapat langsung lanjut mengerjakan soal tanpa kehilangan jawaban yang sudah diisi!</p>
      </div>
    </div>
  </div>

  <div class="alert-box danger">
    <div class="alert-icon">⚠️</div>
    <div>
      <strong>Jawaban Siswa Tetap Aman:</strong> Seluruh jawaban yang telah dipilih siswa tersimpan aman di server secara otomatis. Saat kunci dibuka, siswa akan melanjutkan tepat di nomor soal terakhir yang dikerjakan.
    </div>
  </div>

  <!-- ==================== HALAMAN 7: BAB 6 TROUBLESHOOTING & SOP ==================== -->
  <div class="page-break"></div>
  <div class="page-header">
    <div class="page-header-left">
      <img src="${logoBase64}" alt="Logo">
      <span>BAB 6 • TROUBLESHOOTING & SOP RUANG UJIAN</span>
    </div>
    <div class="page-header-right">Portal CBT SMKN 1 Beringin</div>
  </div>

  <div class="section-title-wrap">
    <div class="section-num">6</div>
    <h2 class="section-heading">Tanya Jawab & Penanganan Masalah Lapangan</h2>
  </div>
  <p class="section-desc">
    Panduan cepat bagi Bapak/Ibu pengawas untuk menangani kendala teknis yang umum dihadapi siswa selama pelaksanaan ujian di ruangan:
  </p>

  <table class="custom-table">
    <thead>
      <tr>
        <th style="width: 35%;">Kendala yang Terjadi</th>
        <th style="width: 65%;">Solusi Cepat Pengawas Ruang</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>HP Siswa Mati / Kehabisan Baterai</strong></td>
        <td>
          Siswa dipersilakan mengisi daya (charger) atau berganti ke HP cadangan/komputer lab. Jawaban siswa <strong>tidak akan hilang</strong>. Setelah HP nyala, siswa cukup login kembali dan melanjutkan soal.
        </td>
      </tr>
      <tr>
        <td><strong>Siswa Tidak Sengaja Memencet Tombol Power</strong></td>
        <td>
          Di versi terbaru (v1.1.7), memencet tombol power atau layar mati <strong>TIDAK AKAN MENGUNCI UJIAN</strong>. Siswa cukup menyalakan kembali layar HP dan ujian langsung lanjut otomatis.
        </td>
      </tr>
      <tr>
        <td><strong>Siswa Ganti HP / Pindah ke Laptop</strong></td>
        <td>
          Jika sistem mendeteksi <em>"Akun sedang aktif di perangkat lain"</em>, pengawas cukup mengklik tombol <strong>Buka Kunci / Reset Sesi</strong> pada nama siswa tersebut di dashboard pengawas.
        </td>
      </tr>
      <tr>
        <td><strong>Aplikasi Meminta Update Versi Wajib</strong></td>
        <td>
          Pastikan siswa menginstal APK resmi terbaru <strong>v1.1.7</strong> dari link: <br>
          <code>https://ujian.tiksmkn1beringin.my.id/download</code>
        </td>
      </tr>
      <tr>
        <td><strong>Waktu Ujian Habis Otomatis</strong></td>
        <td>
          Ketika penghitung mundur di HP habis, jawaban otomatis tersubmit ke server dan status siswa di layar pengawas akan berubah menjadi <span class="badge-status badge-finished">SELESAI</span>.
        </td>
      </tr>
    </tbody>
  </table>

  <div class="section-title-wrap" style="margin-top: 25px;">
    <div class="section-num" style="background: #059669;">✓</div>
    <h2 class="section-heading">SOP Pengawas Setelah Ujian Berakhir</h2>
  </div>

  <div class="steps-list">
    <div class="step-item">
      <div class="step-badge">1</div>
      <div class="step-text">
        <strong>Pastikan Seluruh Siswa Berstatus "SELESAI"</strong>
        <p>Cek tabel modal Pantau Siswa, pastikan tidak ada lagi siswa yang berstatus <span class="badge-status badge-ongoing">SEDANG UJIAN</span> atau <span class="badge-status badge-locked">TERKUNCI</span>.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">2</div>
      <div class="step-text">
        <strong>Klik Tombol "Selesaikan Sesi Pengawasan"</strong>
        <p>Pada kartu pengawas ruangan, klik tombol abu-abu di bagian bawah bertuliskan <strong>"Selesaikan Sesi Pengawasan"</strong> untuk menutup sesi ujian secara resmi.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-badge">3</div>
      <div class="step-text">
        <strong>Logout Akun Pengawas</strong>
        <p>Klik tombol Logout di pojok kanan atas setelah seluruh administrasi ruangan selesai.</p>
      </div>
    </div>
  </div>

  <div class="alert-box info" style="margin-top: 20px;">
    <div class="alert-icon">📞</div>
    <div>
      <strong>Layanan Bantuan & Proktor Sekolah:</strong><br>
      Jika menemui kendala jaringan parah atau kerusakan server yang tidak dapat diselesaikan secara mandiri, segera hubungi <strong>Tim IT / Proktor Utama CBT SMKN 1 Beringin</strong> di Ruang Server.
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = '/www/wwwroot/AppUjian/manual_book_assets/buku_panduan.html';
fs.writeFileSync(htmlFilePath, htmlContent);
console.log('Saved HTML to ' + htmlFilePath);

(async () => {
  console.log('Generating PDF via Chromium...');
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
      top: '12mm',
      right: '14mm',
      bottom: '15mm',
      left: '14mm'
    }
  });

  // Also copy to public/downloads
  const publicPdfPath = '/www/wwwroot/AppUjian/admin/public/downloads/Buku_Panduan_Pengawas_CBT_SMKN1Beringin.pdf';
  fs.copyFileSync(pdfPath, publicPdfPath);

  console.log('PDF successfully generated at: ' + pdfPath);
  console.log('PDF successfully copied to: ' + publicPdfPath);
  await browser.close();
})();
