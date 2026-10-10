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
      '--window-size=1440,900'
    ],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2
    }
  });

  const page = await browser.newPage();

  // Helper to inject DOM badges (NO broken emojis, clean styling)
  const injectBadge = async (elementSelector, labelText, color = '#2563eb', position = 'right') => {
    return page.evaluate((sel, text, col, pos) => {
      let el = null;
      if (typeof sel === 'string') {
        el = document.querySelector(sel);
      }
      if (!el) return false;

      el.style.outline = '3px solid ' + col;
      el.style.outlineOffset = '3px';
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 0 16px ' + col + '99';

      const rect = el.getBoundingClientRect();
      const badge = document.createElement('div');
      badge.className = 'custom-dom-marker';
      badge.innerText = text;
      badge.style.position = 'absolute';
      badge.style.background = col;
      badge.style.color = '#ffffff';
      badge.style.fontWeight = '800';
      badge.style.fontSize = '12px';
      badge.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      badge.style.padding = '5px 12px';
      badge.style.borderRadius = '999px';
      badge.style.boxShadow = '0 4px 14px rgba(0,0,0,0.35)';
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
        badge.style.top = (rect.top + scrollY - 34) + 'px';
        badge.style.left = (rect.left + scrollX + rect.width / 2 - 40) + 'px';
      } else {
        badge.style.top = (rect.bottom + scrollY + 8) + 'px';
        badge.style.left = (rect.left + scrollX + 10) + 'px';
      }

      document.body.appendChild(badge);
      return true;
    }, elementSelector, labelText, color, position);
  };

  try {
    // -------------------------------------------------------------------
    // SCREENSHOT 1: LOGIN PAGE
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 1: Login Page...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Fill sample values for visual clarity
    await page.type('#username', 'x.pplg1');
    await page.type('#password', 'pengawas123');

    await injectBadge('#username', '1. Username Ruang (Contoh: x.pplg1)', '#2563eb', 'right');
    await injectBadge('#password', '2. Password: pengawas123', '#2563eb', 'right');
    await injectBadge('button[type="submit"]', '3. Klik Masuk ke Sistem', '#059669', 'right');

    const pathLogin = path.join(OUTPUT_DIR, '01_login_annotated.png');
    await page.screenshot({ path: pathLogin });
    console.log('Saved 01_login_annotated.png, size:', fs.statSync(pathLogin).size);

    // -------------------------------------------------------------------
    // SET AUTH TOKEN IN LOCALSTORAGE FOR ALL NESTED DASHBOARD ROUTES
    // -------------------------------------------------------------------
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('user', JSON.stringify(usr));
    }, authData.token, authData.user);

    // -------------------------------------------------------------------
    // SCREENSHOT 2: REAL DASHBOARD PAGE
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 2: Real Dashboard...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Highlight the "Jadwal Pengawas" sidebar link (without emoji)
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside a, nav a'));
      const target = links.find(a => a.innerText && a.innerText.includes('Pengawas'));
      if (target) {
        target.style.outline = '3px solid #2563eb';
        target.style.outlineOffset = '2px';
        target.style.background = '#dbeafe';
        target.style.borderRadius = '8px';

        const badge = document.createElement('div');
        badge.innerText = '[KLIK DISINI] Menu Jadwal Pengawas Ruang';
        badge.style.position = 'absolute';
        badge.style.background = '#2563eb';
        badge.style.color = '#fff';
        badge.style.fontWeight = 'bold';
        badge.style.fontSize = '12px';
        badge.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        badge.style.padding = '5px 12px';
        badge.style.borderRadius = '999px';
        badge.style.border = '2px solid #fff';
        badge.style.left = '210px';
        badge.style.top = (target.getBoundingClientRect().top + window.scrollY - 2) + 'px';
        badge.style.zIndex = '999999';
        badge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        document.body.appendChild(badge);
      }
    });

    const pathDashboard = path.join(OUTPUT_DIR, '02_dashboard_annotated.png');
    await page.screenshot({ path: pathDashboard });
    console.log('Saved 02_dashboard_annotated.png, size:', fs.statSync(pathDashboard).size);

    // -------------------------------------------------------------------
    // SCREENSHOT 3: PENGAWAS RUANG PAGE (/dashboard/supervisors)
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 3: Real Supervisors Page (/dashboard/supervisors)...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard/supervisors', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    // Annotate the first 'Pantau Siswa' button on room card (clean text, no broken emoji)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pantauBtn = btns.find(b => b.innerText && b.innerText.includes('Pantau Siswa'));
      if (pantauBtn) {
        pantauBtn.style.outline = '4px solid #4f46e5';
        pantauBtn.style.outlineOffset = '3px';
        pantauBtn.style.boxShadow = '0 0 20px rgba(79, 70, 229, 0.7)';

        const badge = document.createElement('div');
        badge.innerText = '[KLIK DISINI] Buka Monitoring Ruang & Kunci Siswa';
        badge.style.position = 'absolute';
        badge.style.background = '#4f46e5';
        badge.style.color = '#fff';
        badge.style.fontWeight = '800';
        badge.style.fontSize = '12px';
        badge.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        badge.style.padding = '6px 14px';
        badge.style.borderRadius = '999px';
        badge.style.border = '2px solid #ffffff';
        badge.style.boxShadow = '0 4px 15px rgba(0,0,0,0.35)';
        badge.style.top = (pantauBtn.getBoundingClientRect().top + window.scrollY - 36) + 'px';
        badge.style.left = (pantauBtn.getBoundingClientRect().left + window.scrollX - 20) + 'px';
        badge.style.zIndex = '999999';
        document.body.appendChild(badge);
      }
    });

    const pathSupervisors = path.join(OUTPUT_DIR, '03_pengawas_ruang_annotated.png');
    await page.screenshot({ path: pathSupervisors });
    console.log('Saved 03_pengawas_ruang_annotated.png, size:', fs.statSync(pathSupervisors).size);

    // -------------------------------------------------------------------
    // SCREENSHOT 4: MODAL PANTAU SISWA & BUKA KUNCI
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 4: Modal Pantau Siswa with Locked Student & Real Unlock Button...');
    // Refresh to clear injected badge on supervisors page
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard/supervisors', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click 'Pantau Siswa' button to open modal
    const allButtons = await page.$$('button');
    let opened = false;
    for (const b of allButtons) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt && txt.includes('Pantau Siswa')) {
        await b.click();
        opened = true;
        break;
      }
    }
    console.log('Clicked Pantau Siswa button:', opened);
    await new Promise(r => setTimeout(r, 2500));

    // Annotate inside modal: Customize row 1 to display real Locked status & Buka Kunci button
    await page.evaluate(() => {
      // Update Terkunci tab badge count
      const tabBtns = Array.from(document.querySelectorAll('button'));
      const terkunciTab = tabBtns.find(b => b.innerText && b.innerText.includes('Terkunci'));
      if (terkunciTab) {
        terkunciTab.innerHTML = `<svg class="w-3.5 h-3.5 text-rose-500 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span style="color:#e11d48;font-weight:700;">Terkunci (1)</span>`;
      }

      const rows = Array.from(document.querySelectorAll('tbody tr'));
      if (rows.length > 0) {
        const row1 = rows[0];

        // 1. Name & NIS
        const nameCol = row1.children[1];
        if (nameCol) {
          nameCol.innerHTML = `
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-xs shrink-0">M</div>
              <div>
                <div class="font-bold text-slate-800 text-sm">MUHAMMAD RIZKY PRATAMA</div>
                <div class="text-xs text-slate-400 font-mono">NIS: 22019482</div>
              </div>
            </div>
          `;
        }

        // 2. Status column (Red "Terkunci" pill)
        const statusCol = row1.children[3] || row1.children[2];
        if (statusCol) {
          statusCol.innerHTML = `
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border bg-rose-50 text-rose-700 border-rose-200 shrink-0">
              <svg class="w-3.5 h-3.5 mr-1 text-rose-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Terkunci (Keluar Aplikasi)</span>
            </span>
          `;
          statusCol.style.outline = '3px solid #dc2626';
          statusCol.style.outlineOffset = '2px';
          statusCol.style.borderRadius = '8px';
          statusCol.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.4)';

          const statusBadge = document.createElement('div');
          statusBadge.innerText = '1. Status: Terkunci (Siswa Keluar Aplikasi)';
          statusBadge.style.position = 'absolute';
          statusBadge.style.background = '#dc2626';
          statusBadge.style.color = '#fff';
          statusBadge.style.fontWeight = 'bold';
          statusBadge.style.fontSize = '11px';
          statusBadge.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          statusBadge.style.padding = '4px 10px';
          statusBadge.style.borderRadius = '6px';
          statusBadge.style.border = '1.5px solid #fff';
          statusBadge.style.top = (statusCol.getBoundingClientRect().bottom + window.scrollY + 6) + 'px';
          statusBadge.style.left = (statusCol.getBoundingClientRect().left + window.scrollX - 20) + 'px';
          statusBadge.style.zIndex = '999999';
          statusBadge.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
          document.body.appendChild(statusBadge);
        }

        // 3. Score column: '-'
        const scoreCol = row1.children[4];
        if (scoreCol) {
          scoreCol.innerHTML = '<span class="text-slate-400 font-bold">-</span>';
        }

        // 4. Action column: Real green Buka Kunci button
        const actionCol = row1.children[5] || row1.children[row1.children.length - 1];
        if (actionCol) {
          actionCol.innerHTML = `
            <div class="flex items-center justify-end space-x-1.5">
              <button id="btn-demo-buka-kunci" class="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all" style="outline: 4px solid #059669; outline-offset: 3px; box-shadow: 0 0 20px rgba(5, 150, 105, 0.85); transform: scale(1.08);">
                <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                <span>Buka Kunci</span>
              </button>
            </div>
          `;

          const unlockBtn = document.getElementById('btn-demo-buka-kunci');
          const badge = document.createElement('div');
          badge.innerText = '2. [KLIK DISINI] Tombol Buka Kunci Siswa';
          badge.style.position = 'absolute';
          badge.style.background = '#059669';
          badge.style.color = '#fff';
          badge.style.fontWeight = '800';
          badge.style.fontSize = '12px';
          badge.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          badge.style.padding = '6px 14px';
          badge.style.borderRadius = '999px';
          badge.style.border = '2px solid #ffffff';
          badge.style.boxShadow = '0 4px 15px rgba(0,0,0,0.35)';
          badge.style.top = (unlockBtn.getBoundingClientRect().top + window.scrollY - 36) + 'px';
          badge.style.left = (unlockBtn.getBoundingClientRect().right + window.scrollX - 290) + 'px';
          badge.style.zIndex = '999999';
          document.body.appendChild(badge);
        }
      }
    });

    const pathModal = path.join(OUTPUT_DIR, '04_modal_buka_kunci_annotated.png');
    await page.screenshot({ path: pathModal });
    console.log('Saved 04_modal_buka_kunci_annotated.png, size:', fs.statSync(pathModal).size);

    // -------------------------------------------------------------------
    // SCREENSHOT 5: JADWAL UJIAN PAGE (/dashboard/exams)
    // -------------------------------------------------------------------
    console.log('Capturing Screenshot 5: Real Exams Page (/dashboard/exams)...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/dashboard/exams', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const pathExams = path.join(OUTPUT_DIR, '05_jadwal_ujian_annotated.png');
    await page.screenshot({ path: pathExams });
    console.log('Saved 05_jadwal_ujian_annotated.png, size:', fs.statSync(pathExams).size);

    console.log('SUCCESS: ALL 5 DISTINCT SCREENSHOTS CAPTURED WITH AUTHENTICATION & EXACT DOM MARKERS!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
})();
