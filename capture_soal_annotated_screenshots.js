const puppeteer = require('/www/wwwroot/AppUjian/admin/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/www/wwwroot/AppUjian/manual_book_assets';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  console.log('1. Authenticating via API to get real JWT token...');
  const res = await fetch('http://127.0.0.1:8080/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const authData = await res.json();
  if (!authData.token) {
    throw new Error('Failed to get auth token!');
  }
  console.log('JWT Token successfully acquired.');

  console.log('2. Launching Chromium...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,950'
    ],
    defaultViewport: {
      width: 1440,
      height: 950,
      deviceScaleFactor: 2
    }
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------------
    // SET AUTH IN LOCALSTORAGE
    // -------------------------------------------------------------------
    await page.goto('https://ujian.tiksmkn1beringin.my.id/login', { waitUntil: 'networkidle2' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, authData.token, authData.user);

    // -------------------------------------------------------------------
    // SCREENSHOT 1: BANK SOAL OVERVIEW (/dashboard/questions)
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 1: Bank Soal Overview...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard/questions?subject=91&exam_id=5', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Annotate key action buttons
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const btnManual = btns.find(b => b.innerText && b.innerText.includes('Tambah Soal Manual'));
      if (btnManual) {
        btnManual.style.outline = '4px solid #2563eb';
        btnManual.style.outlineOffset = '2px';
        btnManual.style.boxShadow = '0 0 16px rgba(37, 99, 235, 0.8)';
        
        const b = document.createElement('div');
        b.innerText = '1. [KLIK DISINI] Tambah Soal Manual';
        b.style.position = 'absolute';
        b.style.background = '#2563eb';
        b.style.color = '#fff';
        b.style.fontWeight = 'bold';
        b.style.fontSize = '12px';
        b.style.padding = '5px 12px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (btnManual.getBoundingClientRect().top + window.scrollY - 34) + 'px';
        b.style.left = (btnManual.getBoundingClientRect().left + window.scrollX - 20) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      const btnExcel = btns.find(b => b.innerText && b.innerText.includes('Upload Soal Excel'));
      if (btnExcel) {
        btnExcel.style.outline = '4px solid #059669';
        btnExcel.style.outlineOffset = '2px';
        btnExcel.style.boxShadow = '0 0 16px rgba(5, 150, 105, 0.8)';

        const b = document.createElement('div');
        b.innerText = '2. [KLIK DISINI] Upload Soal Excel';
        b.style.position = 'absolute';
        b.style.background = '#059669';
        b.style.color = '#fff';
        b.style.fontWeight = 'bold';
        b.style.fontSize = '12px';
        b.style.padding = '5px 12px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (btnExcel.getBoundingClientRect().top + window.scrollY - 34) + 'px';
        b.style.left = (btnExcel.getBoundingClientRect().left + window.scrollX - 20) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      const btnTemplate = btns.find(b => b.innerText && b.innerText.includes('Unduh Template Excel'));
      if (btnTemplate) {
        btnTemplate.style.outline = '3px dashed #4f46e5';
        btnTemplate.style.outlineOffset = '2px';
        
        const b = document.createElement('div');
        b.innerText = '3. Unduh Format Template Excel';
        b.style.position = 'absolute';
        b.style.background = '#4f46e5';
        b.style.color = '#fff';
        b.style.fontWeight = 'bold';
        b.style.fontSize = '11px';
        b.style.padding = '4px 10px';
        b.style.borderRadius = '6px';
        b.style.border = '1.5px solid #fff';
        b.style.top = (btnTemplate.getBoundingClientRect().bottom + window.scrollY + 6) + 'px';
        b.style.left = (btnTemplate.getBoundingClientRect().left + window.scrollX) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }
    });

    const path1 = path.join(OUTPUT_DIR, 'soal_01_bank_soal.png');
    await page.screenshot({ path: path1 });
    console.log('Saved soal_01_bank_soal.png, size:', fs.statSync(path1).size);

    // -------------------------------------------------------------------
    // SCREENSHOT 2: MODAL TAMBAH SOAL MANUAL (COMPACT & SCROLLED PERFECTLY)
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 2: Modal Tambah Soal Manual...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard/questions?subject=91&exam_id=5', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click "Tambah Soal Manual"
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt && txt.includes('Tambah Soal Manual')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Populate modal with realistic question & options
    await page.evaluate(() => {
      // 1. Fill Question Quill
      const quillEditors = Array.from(document.querySelectorAll('.ql-editor'));
      if (quillEditors.length > 0) {
        quillEditors[0].innerHTML = '<p>Berikut ini yang <strong>BUKAN</strong> merupakan framework front-end modern untuk pengembangan aplikasi web berbasis komponen adalah...</p>';
      }

      // Compact the main editor height slightly so entire modal fits elegantly
      const mainEditorContainer = document.querySelector('.h-56');
      if (mainEditorContainer) {
        mainEditorContainer.className = 'h-40 mb-6';
      }
      const quillInner = document.querySelector('.ql-container.h-44');
      if (quillInner) {
        quillInner.style.height = '100px';
      }

      // 2. Fill Options
      const options = [
        'React.js',
        'Vue.js',
        'Laravel Framework (PHP Back-End)',
        'Angular',
        'Svelte.js'
      ];
      for (let i = 1; i <= 5 && i < quillEditors.length; i++) {
        quillEditors[i].innerHTML = `<p>${options[i - 1]}</p>`;
      }

      // Click Radio C for authentic React state update
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      if (radios.length >= 3) {
        radios[2].click();
      }

      // Inject Annotations
      // Annotation 1: Question Editor
      const mainEditorWrap = document.querySelector('.ql-container');
      if (mainEditorWrap) {
        mainEditorWrap.parentElement.style.outline = '3px solid #2563eb';
        mainEditorWrap.parentElement.style.outlineOffset = '2px';

        const b = document.createElement('div');
        b.innerText = '1. Tulis Pertanyaan Soal (Bisa Sisipkan Gambar & Rumus KaTeX)';
        b.style.position = 'absolute';
        b.style.background = '#2563eb';
        b.style.color = '#fff';
        b.style.fontWeight = 'bold';
        b.style.fontSize = '11px';
        b.style.padding = '4px 10px';
        b.style.borderRadius = '999px';
        b.style.border = '1.5px solid #fff';
        b.style.top = (mainEditorWrap.parentElement.getBoundingClientRect().top + window.scrollY - 14) + 'px';
        b.style.left = (mainEditorWrap.parentElement.getBoundingClientRect().left + window.scrollX + 180) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      // Annotation 2: Options
      if (radios.length >= 3) {
        const optionCBox = radios[2].closest('div');
        if (optionCBox) {
          optionCBox.style.outline = '4px solid #059669';
          optionCBox.style.outlineOffset = '2px';
          optionCBox.style.boxShadow = '0 0 16px rgba(5, 150, 105, 0.6)';

          const b = document.createElement('div');
          b.innerText = '2. Masukkan Opsi A-E & Pilih Radio Kunci Jawaban Benar';
          b.style.position = 'absolute';
          b.style.background = '#059669';
          b.style.color = '#fff';
          b.style.fontWeight = '800';
          b.style.fontSize = '12px';
          b.style.padding = '5px 12px';
          b.style.borderRadius = '999px';
          b.style.border = '2px solid #fff';
          b.style.top = (optionCBox.getBoundingClientRect().top + window.scrollY - 30) + 'px';
          b.style.left = (optionCBox.getBoundingClientRect().left + window.scrollX + 10) + 'px';
          b.style.zIndex = '999999';
          document.body.appendChild(b);
        }
      }

      // Annotation 3: Submit Button
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.innerText.includes('Simpan'));
      if (submitBtn) {
        submitBtn.style.outline = '4px solid #4f46e5';
        submitBtn.style.outlineOffset = '2px';
        submitBtn.style.boxShadow = '0 0 16px rgba(79, 70, 229, 0.8)';

        const b = document.createElement('div');
        b.innerText = '3. [KLIK DISINI] Simpan & Selesai';
        b.style.position = 'absolute';
        b.style.background = '#4f46e5';
        b.style.color = '#fff';
        b.style.fontWeight = '800';
        b.style.fontSize = '12px';
        b.style.padding = '5px 12px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (submitBtn.getBoundingClientRect().top + window.scrollY - 34) + 'px';
        b.style.left = (submitBtn.getBoundingClientRect().left + window.scrollX - 60) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }
    });

    const path2 = path.join(OUTPUT_DIR, 'soal_02_modal_tambah_soal.png');
    await page.screenshot({ path: path2 });
    console.log('Saved soal_02_modal_tambah_soal.png, size:', fs.statSync(path2).size);

    // -------------------------------------------------------------------
    // SCREENSHOT 3: MODAL UPLOAD SOAL EXCEL
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 3: Modal Upload Soal Excel...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard/questions?subject=91&exam_id=5', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click "Upload Soal Excel" button
    const btns2 = await page.$$('button');
    for (const b of btns2) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt && txt.includes('Upload Soal Excel')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Annotate Upload Modal
    await page.evaluate(() => {
      // 1. Dropzone file upload
      const dropzone = document.querySelector('label[class*="cursor-pointer"]');
      if (dropzone) {
        dropzone.style.outline = '4px solid #059669';
        dropzone.style.outlineOffset = '3px';
        dropzone.style.boxShadow = '0 0 18px rgba(5, 150, 105, 0.7)';

        const b = document.createElement('div');
        b.innerText = '1. [KLIK DISINI] Pilih File Excel (.xlsx) dari Komputer';
        b.style.position = 'absolute';
        b.style.background = '#059669';
        b.style.color = '#fff';
        b.style.fontWeight = '800';
        b.style.fontSize = '12px';
        b.style.padding = '6px 14px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (dropzone.getBoundingClientRect().top + window.scrollY - 36) + 'px';
        b.style.left = (dropzone.getBoundingClientRect().left + window.scrollX + 60) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      // 2. Select Mapel & Ujian Tujuan
      const selects = Array.from(document.querySelectorAll('select'));
      if (selects.length > 0) {
        selects[0].style.outline = '3px solid #2563eb';
        selects[0].style.outlineOffset = '2px';

        const b = document.createElement('div');
        b.innerText = '2. Pastikan Mata Pelajaran & Ujian Tujuan Sudah Sesuai';
        b.style.position = 'absolute';
        b.style.background = '#2563eb';
        b.style.color = '#fff';
        b.style.fontWeight = 'bold';
        b.style.fontSize = '11px';
        b.style.padding = '4px 10px';
        b.style.borderRadius = '999px';
        b.style.border = '1.5px solid #fff';
        b.style.top = (selects[0].getBoundingClientRect().top + window.scrollY - 14) + 'px';
        b.style.left = (selects[0].getBoundingClientRect().left + window.scrollX + 180) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      // 3. Submit Button
      const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.innerText.includes('Unggah') || b.innerText.includes('Upload'));
      if (submitBtn) {
        submitBtn.style.outline = '4px solid #4f46e5';
        submitBtn.style.outlineOffset = '2px';

        const b = document.createElement('div');
        b.innerText = '3. [KLIK DISINI] Mulai Unggah Soal';
        b.style.position = 'absolute';
        b.style.background = '#4f46e5';
        b.style.color = '#fff';
        b.style.fontWeight = '800';
        b.style.fontSize = '12px';
        b.style.padding = '5px 12px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (submitBtn.getBoundingClientRect().top + window.scrollY - 34) + 'px';
        b.style.left = (submitBtn.getBoundingClientRect().left + window.scrollX - 70) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }
    });

    const path3 = path.join(OUTPUT_DIR, 'soal_03_modal_upload_excel.png');
    await page.screenshot({ path: path3 });
    console.log('Saved soal_03_modal_upload_excel.png, size:', fs.statSync(path3).size);

    // -------------------------------------------------------------------
    // SCREENSHOT 4: MODAL BUAT JADWAL UJIAN BARU (/dashboard/exams)
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 4: Modal Buat Jadwal Ujian Baru...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard/exams', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Click "Jadwalkan Ujian Baru" button
    const examBtns = await page.$$('button');
    for (const b of examBtns) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt && txt.includes('Jadwalkan Ujian Baru')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Fill sample values in Exam modal & annotate
    await page.evaluate(() => {
      // 1. Input Judul Ujian
      const titleInput = document.querySelector('input[placeholder*="Judul"], input[placeholder*="ujian"]');
      if (titleInput) {
        titleInput.value = 'Asesmen Sumatif Akhir Semester Genap 2026';
        titleInput.style.outline = '3px solid #2563eb';
        titleInput.style.outlineOffset = '2px';

        const b = document.createElement('div');
        b.innerText = '1. Masukkan Judul Ujian & Pilih Mata Pelajaran';
        b.style.position = 'absolute';
        b.style.background = '#2563eb';
        b.style.color = '#fff';
        b.style.fontWeight = 'bold';
        b.style.fontSize = '11px';
        b.style.padding = '4px 10px';
        b.style.borderRadius = '999px';
        b.style.border = '1.5px solid #fff';
        b.style.top = (titleInput.getBoundingClientRect().top + window.scrollY - 14) + 'px';
        b.style.left = (titleInput.getBoundingClientRect().right + window.scrollX - 280) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      // 2. Date & Duration inputs
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = '2026-10-15';
        dateInput.style.outline = '3px solid #059669';
        dateInput.style.outlineOffset = '2px';
      }

      const durInput = document.querySelector('input[type="number"]');
      if (durInput) {
        durInput.value = '90';
        durInput.style.outline = '3px solid #059669';
        durInput.style.outlineOffset = '2px';

        const b = document.createElement('div');
        b.innerText = '2. Atur Tanggal Pelaksanaan & Durasi Pengerjaan (Menit)';
        b.style.position = 'absolute';
        b.style.background = '#059669';
        b.style.color = '#fff';
        b.style.fontWeight = '800';
        b.style.fontSize = '12px';
        b.style.padding = '5px 12px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (durInput.getBoundingClientRect().top + window.scrollY - 34) + 'px';
        b.style.left = (durInput.getBoundingClientRect().left + window.scrollX - 180) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      // 3. Class Checklist
      const classButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && (b.innerText.includes('X PPLG') || b.innerText.includes('Tingkat X')));
      if (classButtons.length > 0) {
        classButtons[0].click();
      }

      // Select first 2 class cards
      const allClassCards = Array.from(document.querySelectorAll('div[class*="cursor-pointer"], label[class*="cursor-pointer"]'));
      if (allClassCards.length >= 2) {
        allClassCards[0].style.outline = '3px solid #4f46e5';
        allClassCards[0].style.background = '#e0e7ff';
        allClassCards[1].style.outline = '3px solid #4f46e5';
        allClassCards[1].style.background = '#e0e7ff';

        const b = document.createElement('div');
        b.innerText = '3. Pilih Rombel / Jurusan SMK Peserta Ujian';
        b.style.position = 'absolute';
        b.style.background = '#4f46e5';
        b.style.color = '#fff';
        b.style.fontWeight = '800';
        b.style.fontSize = '12px';
        b.style.padding = '5px 12px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (allClassCards[0].getBoundingClientRect().top + window.scrollY - 30) + 'px';
        b.style.left = (allClassCards[0].getBoundingClientRect().left + window.scrollX + 20) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }

      // 4. Save Button
      const saveBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.innerText.includes('Simpan') || b.innerText.includes('Jadwalkan'));
      if (saveBtn) {
        saveBtn.style.outline = '4px solid #2563eb';
        saveBtn.style.outlineOffset = '2px';
        saveBtn.style.boxShadow = '0 0 16px rgba(37, 99, 235, 0.8)';

        const b = document.createElement('div');
        b.innerText = '4. [KLIK DISINI] Simpan Jadwal Ujian';
        b.style.position = 'absolute';
        b.style.background = '#2563eb';
        b.style.color = '#fff';
        b.style.fontWeight = '800';
        b.style.fontSize = '12px';
        b.style.padding = '5px 12px';
        b.style.borderRadius = '999px';
        b.style.border = '2px solid #fff';
        b.style.top = (saveBtn.getBoundingClientRect().top + window.scrollY - 34) + 'px';
        b.style.left = (saveBtn.getBoundingClientRect().left + window.scrollX - 70) + 'px';
        b.style.zIndex = '999999';
        document.body.appendChild(b);
      }
    });

    const path4 = path.join(OUTPUT_DIR, 'soal_04_jadwal_dan_buat_ujian.png');
    await page.screenshot({ path: path4 });
    console.log('Saved soal_04_jadwal_dan_buat_ujian.png, size:', fs.statSync(path4).size);

    console.log('ALL 4 SOAL & EXAM SCREENSHOTS CAPTURED PERFECTLY!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
})();
