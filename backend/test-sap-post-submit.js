// Debug what happens AFTER submit — takes screenshots, checks downloads, etc.
// run: SAP_TEST_PASS='Sai@9375' node test-sap-post-submit.js
import 'dotenv/config';
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SAP_URL  = 'https://sdc-sppap1.svkm.ac.in:50001/irj/portal';
const USERNAME = '70552400047';
const PASSWORD = process.env.SAP_TEST_PASS;
if (!PASSWORD) { console.error('Set SAP_TEST_PASS'); process.exit(1); }

const save = (name, buf) => {
  const p = `/tmp/ps-${name}.png`;
  writeFileSync(p, buf);
  console.log(`📷 ${p}`);
};

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--ignore-certificate-errors'],
});
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,  // CRITICAL: allow downloads
});

// CAPTCHA intercept
await ctx.addInitScript(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...a) {
    const c = orig.call(this, type, ...a);
    if (type === '2d' && c && !c.__p) {
      c.__p = true;
      const os = c.strokeText.bind(c);
      c.strokeText = (t, ...r) => { if (t && t.length >= 4) window.__ct = t; return os(t, ...r); };
    }
    return c;
  };
});

// Track ALL responses
const allResponses = [];
ctx.on('response', async resp => {
  const ct = resp.headers()['content-type'] || '';
  const cd = resp.headers()['content-disposition'] || '';
  const url = resp.url();
  const status = resp.status();
  if (ct.includes('pdf') || cd.toLowerCase().includes('pdf') || cd.toLowerCase().includes('attachment') || url.includes('pdf')) {
    console.log(`\n🎯 POSSIBLE PDF RESPONSE:`);
    console.log(`   URL: ${url.substring(0,100)}`);
    console.log(`   Status: ${status}`);
    console.log(`   Content-Type: ${ct}`);
    console.log(`   Content-Disposition: ${cd}`);
    try {
      const b = await resp.body();
      console.log(`   Body size: ${b.length} bytes`);
      console.log(`   First 4 bytes: "${b.slice(0,4).toString()}"`);
      if (b.slice(0,4).toString() === '%PDF') {
        writeFileSync('/tmp/ps-result.pdf', b);
        console.log('   ✅ SAVED to /tmp/ps-result.pdf');
      }
    } catch(e) { console.log(`   Body err: ${e.message}`); }
  }
});

const page = await ctx.newPage();

// Track downloads
page.on('download', async download => {
  console.log(`\n📥 DOWNLOAD triggered!`);
  console.log(`   suggestedFilename: ${download.suggestedFilename()}`);
  console.log(`   url: ${download.url().substring(0,100)}`);
  const path = await download.path();
  console.log(`   saved to: ${path}`);
  if (path) {
    const buf = readFileSync(path);
    writeFileSync('/tmp/ps-download.pdf', buf);
    console.log(`   ✅ Copied to /tmp/ps-download.pdf`);
  }
});

// Track new pages (popups)
ctx.on('page', newPage => {
  console.log(`\n🪟 NEW PAGE/POPUP opened: ${newPage.url()}`);
  newPage.on('load', async () => {
    const url = newPage.url();
    console.log(`   Popup loaded: ${url.substring(0,100)}`);
    const content = await newPage.content().catch(() => '');
    if (url.includes('pdf') || content.includes('PDF')) {
      console.log('   → Contains PDF reference!');
    }
  });
  newPage.on('download', async dl => {
    console.log(`   Popup download: ${dl.suggestedFilename()}`);
    const p = await dl.path();
    if (p) {
      const buf = readFileSync(p);
      writeFileSync('/tmp/ps-popup-download.pdf', buf);
      console.log(`   ✅ Saved to /tmp/ps-popup-download.pdf`);
    }
  });
});

await page.goto(SAP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

// Login
const cap = (await page.evaluate(() => window.__ct || '')).trim();
console.log(`🔡 CAPTCHA: "${cap}"`);
await page.fill('#logonuidfield', USERNAME);
await page.fill('#logonpassfield', PASSWORD);
if (cap) await page.fill('#txtInput', cap);
await Promise.all([
  page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
  page.click('#Button1'),
]);
await page.waitForTimeout(3000);
console.log('✅ Logged in');

// Navigate
for (const f of [page, ...page.frames()]) {
  try { await f.click('text=Attendance Display for Students', { timeout: 4000 }); console.log('✓ Attendance tab'); break; } catch {}
}
await page.waitForTimeout(2500);
for (const f of [page, ...page.frames()]) {
  try { await f.click('text=Student Attendance', { timeout: 3000 }); console.log('✓ Student Attendance'); break; } catch {}
}
await page.waitForTimeout(5000);

// Find WD frame
let wdFrame = null;
for (const f of page.frames()) {
  if (f.url().includes('ZSVKM_STUDENT_ATTENDANCE2') && !f.url().includes('USR_ABORT')) {
    wdFrame = f; break;
  }
}
if (!wdFrame) { console.error('No WD frame!'); await browser.close(); process.exit(1); }
console.log('✓ WD frame found');

// Fill AY
await wdFrame.locator('#WD2B').click({ force: true });
await wdFrame.waitForTimeout(600);
await wdFrame.locator('#WD2E').click({ force: true });
await wdFrame.waitForTimeout(1500);

// Semester IV
const semOpts = wdFrame.locator('#WD34 [role="option"]');
const semCnt = await semOpts.count();
console.log(`Semester options: ${semCnt}`);
for (let i = 0; i < semCnt; i++) {
  const t = (await semOpts.nth(i).textContent() || '').trim();
  if (/\bIV\b|4/i.test(t)) {
    await wdFrame.locator('#WD33').click({ force: true });
    await wdFrame.waitForTimeout(400);
    await semOpts.nth(i).click({ force: true });
    await wdFrame.waitForTimeout(800);
    console.log(`✓ Semester: "${t}"`);
    break;
  }
}

// Detail Report
await wdFrame.locator('#WD39').click({ force: true });
await wdFrame.waitForTimeout(600);
await wdFrame.locator('#WD3C').click({ force: true });
await wdFrame.waitForTimeout(800);
console.log('✓ Detail Report selected');

// Dates
const now = new Date();
const yyyy = now.getFullYear();
const startDate = `01.01.${yyyy}`;
const endDate = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${yyyy}`;

// Find the actual date inputs inside #WD45 and #WD4A
const startInp = wdFrame.locator('#WD45 input').first();
const endInp   = wdFrame.locator('#WD4A input').first();

if (await startInp.count() > 0) {
  await startInp.click({ force: true });
  await startInp.press('Control+a');
  await startInp.type(startDate, { delay: 30 });
  await startInp.press('Tab');
  console.log(`✓ Start date: ${startDate}`);
} else {
  // Try by iterating all visible inputs in WD frame
  const vis = await wdFrame.$$('input[type="text"]:not([readonly])');
  console.log(`Visible non-readonly inputs: ${vis.length}`);
  for (const inp of vis) {
    const id = await inp.getAttribute('id') || '';
    console.log(`  Input #${id}`);
  }
}

if (await endInp.count() > 0) {
  await endInp.click({ force: true });
  await endInp.press('Control+a');
  await endInp.type(endDate, { delay: 30 });
  await endInp.press('Tab');
  console.log(`✓ End date: ${endDate}`);
}

await wdFrame.waitForTimeout(500);
save('01-before-submit', await page.screenshot());

// Check exact state of inputs before submit
console.log('\n📋 Form state before SUBMIT:');
const allInps = await wdFrame.$$('input[type="text"]');
for (const inp of allInps) {
  const id  = await inp.getAttribute('id') || '?';
  const val = await inp.inputValue().catch(() => '?');
  const ro  = await inp.getAttribute('readonly') || '';
  console.log(`  #${id} val="${val}" readonly="${ro}"`);
}

// SUBMIT
console.log('\n⏳ Clicking SUBMIT…');

// Use page.waitForEvent('download') to catch downloads
const downloadPromise = page.waitForEvent('download', { timeout: 60000 }).catch(() => null);

await wdFrame.locator('#WD51').click({ force: true, timeout: 5000 }).catch(async (e) => {
  console.log(`#WD51 click err: ${e.message.split('\n')[0]} — trying alternatives`);
  for (const sel of ['div.lsButton:has-text("SUBMIT")', '[role="button"]:has-text("SUBMIT")', '#WD4C span']) {
    try { await wdFrame.locator(sel).first().click({ force: true, timeout: 3000 }); console.log(`  ✓ via "${sel}"`); break; } catch {}
  }
});
console.log('Submit triggered. Waiting…');

save('02-after-submit-click', await page.screenshot());

// Also watch for the wdFrame itself changing
let finalURL = '';
wdFrame.on('load', () => {
  finalURL = wdFrame.url();
  console.log(`\n🔄 WD Frame reloaded: ${finalURL.substring(0,100)}`);
});

// Wait for download or 30s
const dl = await downloadPromise;
if (dl) {
  console.log(`\n📥 Download caught! file: ${dl.suggestedFilename()}`);
  const p = await dl.path();
  if (p) {
    const buf = readFileSync(p);
    writeFileSync('/tmp/ps-result.pdf', buf);
    console.log(`✅ Saved: /tmp/ps-result.pdf (${Math.round(buf.length/1024)} KB)`);
  }
} else {
  console.log('\nNo download event received. Waiting extra 20s for network...');
  await page.waitForTimeout(20000);
}

save('03-final', await page.screenshot());

console.log(`\nAll frames after submit:`);
for (const f of page.frames()) {
  const url = f.url();
  console.log(`  ${url.substring(0,100)}`);
}

console.log('\nAll open pages/tabs:');
for (const p of ctx.pages()) {
  console.log(`  ${p.url().substring(0,100)}`);
}

await browser.close();
console.log('\nDone. Check /tmp/ps-*.png and /tmp/ps-result.pdf');
