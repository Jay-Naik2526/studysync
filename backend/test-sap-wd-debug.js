// Focused debug on the WebDynpro attendance form frame
// run: SAP_TEST_PASS='Sai@9375' node test-sap-wd-debug.js
import 'dotenv/config';
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const SAP_URL  = 'https://sdc-sppap1.svkm.ac.in:50001/irj/portal';
const USERNAME = '70552400047';
const PASSWORD = process.env.SAP_TEST_PASS;
if (!PASSWORD) { console.error('Set SAP_TEST_PASS'); process.exit(1); }

const save = (name, buf) => {
  writeFileSync(`/tmp/wd-${name}.png`, buf);
  console.log(`📷 /tmp/wd-${name}.png`);
};

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--ignore-certificate-errors'],
});
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });

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

// PDF catch
let pdfBuf = null;
ctx.on('response', async resp => {
  if (pdfBuf) return;
  const ct = resp.headers()['content-type'] || '';
  const cd = resp.headers()['content-disposition'] || '';
  if (ct.includes('pdf') || cd.toLowerCase().includes('attachment')) {
    try {
      const b = await resp.body();
      if (b && b.slice(0,4).toString() === '%PDF') {
        pdfBuf = b;
        console.log(`\n🎯 PDF CAUGHT! ${Math.round(b.length/1024)}KB from: ${resp.url().substring(0,80)}`);
        writeFileSync('/tmp/wd-result.pdf', b);
        console.log('💾 Saved: /tmp/wd-result.pdf');
      }
    } catch(e) { console.log('PDF body err:', e.message); }
  }
});

const page = await ctx.newPage();
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
save('01-login', await page.screenshot());

// Attendance tab
for (const f of [page, ...page.frames()]) {
  try { await f.click('text=Attendance Display for Students', { timeout: 4000 }); console.log('✓ Clicked Attendance tab'); break; } catch {}
}
await page.waitForTimeout(2500);

// Student Attendance sub-tab
for (const f of [page, ...page.frames()]) {
  try { await f.click('text=Student Attendance', { timeout: 3000 }); console.log('✓ Clicked Student Attendance'); break; } catch {}
}
await page.waitForTimeout(4000);
save('02-attendance-nav', await page.screenshot());

// ── Find the WebDynpro frame ─────────────────────────────────────
let wdFrame = null;
for (const f of page.frames()) {
  if (f.url().includes('ZSVKM_STUDENT_ATTENDANCE2') && !f.url().includes('USR_ABORT')) {
    wdFrame = f;
    console.log(`\n✓ WD Frame: ${f.url().substring(0,100)}`);
    break;
  }
}

if (!wdFrame) {
  console.error('❌ Could not find WD frame! All frames:');
  page.frames().forEach(f => console.log('  ', f.url().substring(0,100)));
  await browser.close();
  process.exit(1);
}

// ── Inspect WD frame content ─────────────────────────────────────
console.log('\n📋 All elements in WD frame:');

// All selects
const selects = await wdFrame.$$('select');
console.log(`\nSelects: ${selects.length}`);
for (let i = 0; i < selects.length; i++) {
  const id = await selects[i].getAttribute('id') || '?';
  const opts = await Promise.all((await selects[i].$$('option')).map(o => o.textContent()));
  console.log(`  select[${i}] id="${id}": ${opts.map(o => o.trim()).filter(Boolean).join(' | ')}`);
}

// All inputs
const inputs = await wdFrame.$$('input');
console.log(`\nInputs: ${inputs.length}`);
for (const inp of inputs) {
  const id   = await inp.getAttribute('id') || '?';
  const type = await inp.getAttribute('type') || 'text';
  const val  = await inp.getAttribute('value') || await inp.inputValue().catch(() => '');
  const ph   = await inp.getAttribute('placeholder') || '';
  if (type !== 'hidden') console.log(`  input id="${id}" type="${type}" val="${val}" ph="${ph}"`);
}

// All buttons
const btns = await wdFrame.$$('input[type=submit], button, [role=button], input[type=button]');
console.log(`\nButtons: ${btns.length}`);
for (const b of btns) {
  const id  = await b.getAttribute('id') || '?';
  const val = await b.getAttribute('value') || await b.textContent().catch(() => '') || '';
  console.log(`  btn id="${id}" text="${val.trim().substring(0,40)}"`);
}

// WD* elements specifically
const wdEls = await wdFrame.$$('[id^="WD"]');
console.log(`\nWD* elements: ${wdEls.length}`);
for (const el of wdEls) {
  const id   = await el.getAttribute('id') || '?';
  const tag  = await el.evaluate(e => e.tagName.toLowerCase());
  const role = await el.getAttribute('role') || '';
  const typ  = await el.getAttribute('type') || '';
  const cls  = (await el.getAttribute('class') || '').substring(0, 40);
  const txt  = (await el.textContent().catch(() => '') || '').trim().substring(0, 50);
  console.log(`  [${id}] <${tag}> role="${role}" type="${typ}" class="${cls}" text="${txt}"`);
}

// ── Now fill dropdowns ───────────────────────────────────────────
console.log('\n📝 Filling Academic Year…');

// Try native selects first
if (selects.length >= 1) {
  const ayOpts = await selects[0].$$('option');
  for (const o of ayOpts) {
    const v = (await o.getAttribute('value') || '').trim();
    if (v) {
      await selects[0].selectOption(v);
      const t = await o.textContent();
      console.log(`  ✓ AY: "${t?.trim()}"`);
      await wdFrame.waitForTimeout(1000);
      break;
    }
  }

  const sels2 = await wdFrame.$$('select');
  console.log(`After AY: ${sels2.length} selects`);

  if (sels2.length >= 2) {
    // Semester
    const semOpts = await sels2[1].$$('option');
    for (const o of semOpts) {
      const t = ((await o.textContent()) || '').trim();
      console.log(`  Sem option: "${t}"`);
      if (/\bIV\b|Semester\s*4/i.test(t)) {
        await sels2[1].selectOption({ label: t });
        console.log(`  ✓ Sem: "${t}"`);
        await wdFrame.waitForTimeout(1000);
        break;
      }
    }
  }

  const sels3 = await wdFrame.$$('select');
  console.log(`After Sem: ${sels3.length} selects`);

  if (sels3.length >= 3) {
    // Detail Report
    const rOpts = await sels3[2].$$('option');
    for (const o of rOpts) {
      const t = ((await o.textContent()) || '').trim();
      console.log(`  Report option: "${t}"`);
      if (/detail/i.test(t)) {
        await sels3[2].selectOption({ label: t });
        console.log(`  ✓ Report type: "${t}"`);
        await wdFrame.waitForTimeout(1000);
        break;
      }
    }
  }
} else {
  // WD click-based interaction
  console.log('No native selects — trying WD click interaction');
  
  // WD2B is the AY input from earlier debug
  const ayEl = wdFrame.locator('#WD2B').first();
  if (await ayEl.count() > 0) {
    console.log('Clicking #WD2B for AY...');
    await ayEl.click();
    await wdFrame.waitForTimeout(1000);
    save('03-ay-clicked', await page.screenshot());
    
    // Look for dropdown popup
    const popupOpts = wdFrame.locator('td.urLSTextStd, td.urListItemText, li.sapUiLi, [role="option"]');
    const popCount = await popupOpts.count();
    console.log(`  Popup options visible: ${popCount}`);
    for (let i = 0; i < popCount; i++) {
      const t = (await popupOpts.nth(i).textContent() || '').trim();
      console.log(`    opt[${i}]: "${t}"`);
    }
    if (popCount > 0) {
      await popupOpts.first().click();
      console.log('  ✓ Clicked first AY option');
      await wdFrame.waitForTimeout(1000);
    }
  }
}

save('04-after-selects', await page.screenshot());

// ── Date inputs ──────────────────────────────────────────────────
const now = new Date();
const yyyy = now.getFullYear();
const startDate = `01.01.${yyyy}`;
const endDate = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${yyyy}`;

console.log(`\n📅 Filling dates: ${startDate} → ${endDate}`);

// WD33 = start, WD39 = end (from earlier debug)
for (const [id, val] of [['WD33', startDate], ['WD39', endDate]]) {
  const el = wdFrame.locator(`#${id}`);
  if (await el.count() > 0) {
    await el.fill(val);
    await el.press('Tab');
    console.log(`  ✓ #${id} = "${val}"`);
    await wdFrame.waitForTimeout(400);
  } else {
    console.log(`  ⚠ #${id} not found`);
  }
}

// Also try filling visible text inputs
const txtInputs = await wdFrame.$$('input[type="text"]');
console.log(`Visible text inputs: ${txtInputs.length}`);
for (const inp of txtInputs) {
  const id  = await inp.getAttribute('id') || '?';
  const val = await inp.inputValue().catch(() => '');
  console.log(`  ${id}: current val="${val}"`);
}

save('05-after-dates', await page.screenshot());

// ── SUBMIT ───────────────────────────────────────────────────────
console.log('\n⏳ Looking for SUBMIT button...');

// Search all frames for submit
for (const f of [wdFrame, page, ...page.frames()]) {
  const submitBtns = await f.$$('input[value="SUBMIT" i], input[type="submit"], button:has-text("Submit")').catch(() => []);
  for (const btn of submitBtns) {
    const val = (await btn.getAttribute('value') || await btn.textContent() || '').trim();
    const id  = await btn.getAttribute('id') || '?';
    console.log(`  Found btn: id="${id}" val="${val}" in ${f.url().substring(0,60)}`);
  }
}

// Click it
let clicked = false;
for (const f of [wdFrame, page, ...page.frames()]) {
  try {
    await f.click('input[value="SUBMIT" i], input[type="submit"]', { timeout: 3000 });
    console.log('  ✓ Clicked SUBMIT');
    clicked = true;
    break;
  } catch {}
}

if (!clicked) {
  console.log('  Could not click submit — trying Enter on a date field');
  const dateEl = wdFrame.locator('#WD33, #WD39').first();
  if (await dateEl.count() > 0) {
    await dateEl.press('Return');
    clicked = true;
    console.log('  ✓ Pressed Return on date field');
  }
}

console.log('\n⏳ Waiting 30s for PDF...');
await page.waitForTimeout(30000);
save('06-after-submit', await page.screenshot());

if (pdfBuf) {
  console.log('\n✅ SUCCESS — PDF received!');
} else {
  console.log('\n❌ No PDF received. Frames after submit:');
  page.frames().forEach(f => console.log('  ', f.url().substring(0,100)));
}

await browser.close();
console.log('\nDone.');
