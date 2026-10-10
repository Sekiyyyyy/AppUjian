const puppeteer = require('/www/wwwroot/AppUjian/admin/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/www/wwwroot/AppUjian/manual_book_assets';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  console.log('Launching Chromium...');
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
      deviceScaleFactor: 2 // High DPI retina for crystal clear PDF!
    }
  });

  const page = await browser.newPage();

  try {
    // 1. Screenshot Login Page
    console.log('Navigating to Login Page...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01_login.png') });
    console.log('Saved 01_login.png');

    // 2. Perform Login as admin
    console.log('Filling login form...');
    await page.type('input[type="text"], input[name="username"]', 'admin');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for Dashboard navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));

    // 2. Screenshot Dashboard
    console.log('Saving Dashboard screenshot...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_dashboard.png') });
    console.log('Saved 02_dashboard.png');

    // 3. Screenshot Bank Soal / Subjects
    console.log('Navigating to Subjects...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/subjects', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_bank_soal.png') });
    console.log('Saved 03_bank_soal.png');

    // 4. Screenshot Manajemen Ujian / Exams
    console.log('Navigating to Exams...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/exams', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_jadwal_ujian.png') });
    console.log('Saved 04_jadwal_ujian.png');

    // 5. Open Monitoring Peserta Modal (Click on the first Monitor / Peserta button)
    console.log('Looking for Monitor button on Exams page...');
    const monitorButtons = await page.$$('button');
    let clicked = false;
    for (const btn of monitorButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Peserta') || text.includes('Pantau') || text.includes('Monitor') || text.includes('Pengawasan'))) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    
    // If not found by text, try finding button with Users icon or title
    if (!clicked) {
      const actionBtns = await page.$$('button[title*="Peserta"], button[title*="Pantau"], td button');
      if (actionBtns.length > 0) {
        await actionBtns[0].click();
        clicked = true;
      }
    }

    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05_monitoring_peserta.png') });
    console.log('Saved 05_monitoring_peserta.png');

    // 6. Screenshot Supervisors page
    console.log('Navigating to Supervisors page...');
    await page.goto('https://ujian.tiksmkn1beringin.my.id/supervisors', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06_pengawas_ruang.png') });
    console.log('Saved 06_pengawas_ruang.png');

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
})();
