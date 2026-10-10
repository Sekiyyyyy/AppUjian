const puppeteer = require('/www/wwwroot/AppUjian/admin/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/www/wwwroot/AppUjian/manual_book_assets';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  console.log('Launching Chromium for perfect annotated screenshots...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900'
    ],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2
    }
  });

  const page = await browser.newPage();

  // Helper function to inject badges and boxes
  const injectAnnotation = async (selectorOrFn, badgeText, color = '#ef4444', position = 'right') => {
    await page.evaluate((sel, text, col, pos) => {
      let el = null;
      if (typeof sel === 'string') {
        el = document.querySelector(sel);
      } else {
        el = sel;
      }
      if (!el) return;

      const rect = el.getBoundingClientRect();
      el.style.outline = '3px solid ' + col;
      el.style.outlineOffset = '3px';
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 0 15px ' + col + '88';

      const badge = document.createElement('div');
      badge.className = 'custom-dom-badge';
      badge.innerText = text;
      badge.style.position = 'absolute';
      badge.style.background = col;
      badge.style.color = '#ffffff';
      badge.style.fontWeight = '800';
      badge.style.fontSize = '12px';
      badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      badge.style.padding = '4px 10px';
      badge.style.borderRadius = '999px';
      badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      badge.style.zIndex = '999999';
      badge.style.pointerEvents = 'none';
      badge.style.whiteSpace = 'nowrap';
      badge.style.border = '2px solid #ffffff';

      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      if (pos === 'right') {
        badge.style.top = (rect.top + scrollY + rect.height / 2 - 14) + 'px';
        badge.style.left = (rect.right + scrollX + 12) + 'px';
      } else if (pos === 'left') {
        badge.style.top = (rect.top + scrollY + rect.height / 2 - 14) + 'px';
        badge.style.right = (window.innerWidth - (rect.left + scrollX) + 12) + 'px';
      } else if (pos === 'top') {
        badge.style.top = (rect.top + scrollY - 32) + 'px';
        badge.style.left = (rect.left + scrollX + rect.width / 2 - 40) + 'px';
      } else {
        badge.style.top = (rect.bottom + scrollY + 8) + 'px';
        badge.style.left = (rect.left + scrollX + 10) + 'px';
      }

      document.body.appendChild(badge);
    }, selectorOrFn, badgeText, color, position);
  };

  try {
    // -------------------------------------------------------------
    // 1. LOGIN SCREENSHOT
    // -------------------------------------------------------------
    console.log('1. Capturing Login Page with DOM Annotations...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Fill sample values so teachers see exactly what it looks like!
    await page.evaluate(() => {
      const u = document.querySelector('#username');
      const p = document.querySelector('#password');
      if (u) u.value = 'x.pplg1';
      if (p) p.value = 'pengawas123';
    });

    await injectAnnotation('#username', '1. Masukkan Username Ruang (Contoh: x.pplg1)', '#2563eb', 'right');
    await injectAnnotation('#password', '2. Masukkan Password: pengawas123', '#2563eb', 'right');
    await injectAnnotation('button[type="submit"]', '3. Klik Tombol Masuk', '#059669', 'right');

    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login_annotated.png') });
    console.log('Saved 01_login_annotated.png');

    // Perform real login
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // -------------------------------------------------------------
    // 2. DASHBOARD SCREENSHOT
    // -------------------------------------------------------------
    console.log('2. Capturing Dashboard with DOM Annotations...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Highlight Pengawas Ruang menu in Sidebar
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside a, nav a'));
      const target = links.find(a => a.innerText && a.innerText.includes('Pengawas'));
      if (target) {
        target.style.outline = '3px solid #2563eb';
        target.style.outlineOffset = '2px';
        target.style.background = '#dbeafe';
        target.style.borderRadius = '8px';

        const badge = document.createElement('div');
        badge.innerText = '★ Menu Pengawas Ruang';
        badge.style.position = 'absolute';
        badge.style.background = '#2563eb';
        badge.style.color = '#fff';
        badge.style.fontWeight = 'bold';
        badge.style.fontSize = '12px';
        badge.style.padding = '4px 10px';
        badge.style.borderRadius = '999px';
        badge.style.left = '220px';
        badge.style.top = (target.getBoundingClientRect().top + window.scrollY) + 'px';
        badge.style.zIndex = '999999';
        document.body.appendChild(badge);
      }
    });

    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_dashboard_annotated.png') });
    console.log('Saved 02_dashboard_annotated.png');

    // -------------------------------------------------------------
    // 3. PENGAWAS RUANG SCREENSHOT
    // -------------------------------------------------------------
    console.log('3. Capturing Supervisors Page with DOM Annotations...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/supervisors', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Annotate the first 'Pantau Siswa' button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pantauBtn = btns.find(b => b.innerText && b.innerText.includes('Pantau Siswa'));
      if (pantauBtn) {
        pantauBtn.style.outline = '4px solid #4f46e5';
        pantauBtn.style.outlineOffset = '3px';
        pantauBtn.style.boxShadow = '0 0 20px rgba(79, 70, 229, 0.6)';

        const badge = document.createElement('div');
        badge.innerText = '👉 KLIK DISINI: Buka Monitoring Ruang & Kunci Siswa';
        badge.style.position = 'absolute';
        badge.style.background = '#4f46e5';
        badge.style.color = '#fff';
        badge.style.fontWeight = '800';
        badge.style.fontSize = '12px';
        badge.style.padding = '6px 14px';
        badge.style.borderRadius = '999px';
        badge.style.border = '2px solid #ffffff';
        badge.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        badge.style.top = (pantauBtn.getBoundingClientRect().top + window.scrollY - 38) + 'px';
        badge.style.left = (pantauBtn.getBoundingClientRect().left + window.scrollX) + 'px';
        badge.style.zIndex = '999999';
        document.body.appendChild(badge);
      }
    });

    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_pengawas_ruang_annotated.png') });
    console.log('Saved 03_pengawas_ruang_annotated.png');

    // -------------------------------------------------------------
    // 4. MODAL PANTAU SISWA & BUKA KUNCI
    // -------------------------------------------------------------
    console.log('4. Capturing Modal Pantau Siswa & Buka Kunci...');
    // Refresh to clear injected DOM on previous page
    await page.goto('https://ujian.tiksmkn1beringin.my.id/supervisors', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click 'Pantau Siswa'
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt && txt.includes('Pantau Siswa')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2500));

    // Annotate inside modal: Unlock button & Status badge
    await page.evaluate(() => {
      // Find table rows
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      if (rows.length > 0) {
        // Target first student row
        const firstRow = rows[0];
        
        // Find action buttons in that row
        const rowBtns = Array.from(firstRow.querySelectorAll('button'));
        if (rowBtns.length > 0) {
          const actionBtn = rowBtns[0]; // Unlock or action button
          actionBtn.style.outline = '4px solid #ef4444';
          actionBtn.style.outlineOffset = '2px';
          actionBtn.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.8)';
          actionBtn.style.transform = 'scale(1.15)';

          const badge = document.createElement('div');
          badge.innerText = '🔓 TOMBOL BUKA KUNCI SISWA (Klik Disini)';
          badge.style.position = 'absolute';
          badge.style.background = '#ef4444';
          badge.style.color = '#fff';
          badge.style.fontWeight = '800';
          badge.style.fontSize = '12px';
          badge.style.padding = '5px 12px';
          badge.style.borderRadius = '999px';
          badge.style.border = '2px solid #ffffff';
          badge.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
          badge.style.top = (actionBtn.getBoundingClientRect().top + window.scrollY - 36) + 'px';
          badge.style.left = (actionBtn.getBoundingClientRect().right + window.scrollX - 250) + 'px';
          badge.style.zIndex = '999999';
          document.body.appendChild(badge);
        }

        // Highlight Status column
        const statusCell = firstRow.children[3] || firstRow.children[2];
        if (statusCell) {
          statusCell.style.outline = '2px dashed #059669';
          statusCell.style.background = '#ecfdf5';
          
          const statusBadge = document.createElement('div');
          statusBadge.innerText = '📊 Status Ujian Siswa';
          statusBadge.style.position = 'absolute';
          statusBadge.style.background = '#059669';
          statusBadge.style.color = '#fff';
          statusBadge.style.fontWeight = 'bold';
          statusBadge.style.fontSize = '11px';
          statusBadge.style.padding = '3px 8px';
          statusBadge.style.borderRadius = '6px';
          statusBadge.style.top = (statusCell.getBoundingClientRect().bottom + window.scrollY + 4) + 'px';
          statusBadge.style.left = (statusCell.getBoundingClientRect().left + window.scrollX) + 'px';
          statusBadge.style.zIndex = '999999';
          document.body.appendChild(statusBadge);
        }
      }
    });

    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_modal_buka_kunci_annotated.png') });
    console.log('Saved 04_modal_buka_kunci_annotated.png');

    console.log('All perfectly annotated screenshots captured successfully!');
  } catch (err) {
    console.error('Error in capture:', err);
  } finally {
    await browser.close();
  }
})();
