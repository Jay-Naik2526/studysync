import 'dotenv/config';
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const SAP_URL  = 'https://sdc-sppap1.svkm.ac.in:50001/irj/portal';
const USERNAME = '70552400047';
const PASSWORD = process.env.SAP_TEST_PASS;
if (!PASSWORD) { console.error('Set SAP_TEST_PASS'); process.exit(1); }

const save = (name, buf) => { writeFileSync(`/tmp/sap-${name}.png`, buf); console.log(`  📷 /tmp/sap-${name}.png`); };

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--ignore-certificate-errors'],
});
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 900 } });

// Intercept strokeText for CAPTCHA
await ctx.addInitScript(() => {
  const origGetCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const c = origGetCtx.call(this, type, ...args);
    if (type === '2d' && c && !c.__p) {
      c.__p = true;
      const os = c.strokeText.bind(c);
      c.strokeText = (t, ...r) => { if (t && t.length >= 4) window.__ct = t; return os(t, ...r); };
    }
    return c;
  };
});

// Catch PDF responses
ctx.on('response', async resp => {
  const ct = resp.headers()['content-type'] || '';
  const cd = resp.headers()['content-disposition'] || '';
  if (ct.includes('pdf') || cd.toLowerCase().includes('pdf')) {
    console.log(`\n🎯 PDF CAUGHT! url=${resp.url().substring(0,80)} type=${ct}`);
    try { writeFileSync('/tmp/sap-result.pdf', await resp.body()); console.log('  ✅ Saved to /tmp/sap-result.pdf'); }
    catch(e) { console.log('  save error:', e.message); }
  }
});

const page = await ctx.newPage();
await page.goto(SAP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);

// Login
const captcha = (await page.evaluate(() => window.__ct || '')).trim();
console.log(`🔡 CAPTCHA: "${captcha}"`);
await page.fill('#logonuidfield', USERNAME);
await page.fill('#logonpassfield', PASSWORD);
if (captcha) await page.fill('#txtInput', captcha);
await Promise.all([
  page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
  page.click('#Button1'),
]);
await page.waitForTimeout(2500);
console.log(`✅ After login, URL: ${page.url()}`);
save('01-logged-in', await page.screenshot());

// Click Attendance Display
for (const f of [page, ...page.frames()]) {
  try { await f.click('text=Attendance Display for Students', { timeout: 3000 }); console.log('Clicked Attendance tab'); break; } catch {}
}
await page.waitForTimeout(2000);
save('02-attendance-tab', await page.screenshot());

// Click Student Attendance
for (const f of [page, ...page.frames()]) {
  try { await f.click('text=Student Attendance', { timeout: 2000 }); console.log('Clicked Student Attendance'); break; } catch {}
}
await page.waitForTimeout(1500);
save('03-student-form', await page.screenshot());

// Inspect all frames and their selects
console.log(`\nAll frames (${page.frames().length}):`);
for (const f of page.frames()) {
  console.log(`  Frame: ${f.url()}`);
  const sels = await f.$$('select').catch(() => []);
  for (let i = 0; i < sels.length; i++) {
    const id = await sels[i].getAttribute('id') || '?';
    const nm = await sels[i].getAttribute('name') || '?';
    const opts = await Promise.all((await sels[i].$$('option')).map(o => o.textContent()));
    console.log(`    select[${i}] id="${id}" name="${nm}": ${opts.map(o=>o.trim()).join(' | ')}`);
  }
  const btns = await f.$$('input[type=submit], button').catch(() => []);
  for (const b of btns) {
    const v = await b.getAttribute('value') || await b.textContent();
    if (v?.trim()) console.log(`    button: "${v.trim()}"`);
  }
  const inps = await f.$$('input[type=text], input:not([type])').catch(() => []);
  for (const inp of inps) {
    const id = await inp.getAttribute('id') || '?';
    const nm = await inp.getAttribute('name') || '?';
    console.log(`    input id="${id}" name="${nm}"`);
  }
}

// Now fill and submit — watch what happens
console.log('\n📝 Attempting to fill and submit form...');
let formFrame = page;
for (const f of [page, ...page.frames()]) {
  const sels = await f.$$('select').catch(() => []);
  if (sels.length) { formFrame = f; break; }
}

const selects = await formFrame.$$('select');
console.log(`Found ${selects.length} selects in formFrame: ${formFrame.url()}`);

if (selects[0]) {
  const opts = await selects[0].$$('option');
  for (const o of opts) {
    const v = (await o.getAttribute('value') || '').trim();
    if (v) { await selects[0].selectOption(v); console.log(`  AY selected: "${(await o.textContent())?.trim()}"`); break; }
  }
  await page.waitForTimeout(800);
}

if (selects[1]) {
  const opts = await selects[1].$$('option');
  for (const o of opts) {
    const t = (await o.textContent() || '').trim();
    console.log(`  Semester option: "${t}"`);
    if (/\bIV\b/i.test(t)) { await selects[1].selectOption({ label: t }); console.log(`  → Selected "${t}"`); break; }
  }
  await page.waitForTimeout(800);
}

// After first 2 selects, check if more selects appeared
const selects2 = await formFrame.$$('select');
console.log(`Selects after AY+Sem: ${selects2.length}`);
if (selects2[2]) {
  const opts = await selects2[2].$$('option');
  for (const o of opts) {
    const t = (await o.textContent() || '').trim();
    console.log(`  Report option: "${t}"`);
    if (/detail/i.test(t)) { await selects2[2].selectOption({ label: t }); console.log(`  → Selected "${t}"`); break; }
  }
  await page.waitForTimeout(800);
}

save('04-dropdowns-filled', await page.screenshot());

// Check for date inputs after selecting Detail Report
const allInputs = await formFrame.$$('input');
for (const inp of allInputs) {
  const id   = await inp.getAttribute('id') || '';
  const type = await inp.getAttribute('type') || 'text';
  const val  = await inp.getAttribute('value') || '';
  console.log(`  input: id="${id}" type="${type}" val="${val}"`);
}

// Fill dates
const now = new Date();
const start = `01.01.${now.getFullYear()}`;
const end   = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;

// Try by index — find inputs that look like dates
const textInps = await formFrame.$$('input[type=text], input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
console.log(`\nText inputs to fill: ${textInps.length}`);
for (let i = 0; i < textInps.length; i++) {
  const id  = await textInps[i].getAttribute('id') || '';
  const val = await textInps[i].getAttribute('value') || '';
  console.log(`  [${i}] id="${id}" val="${val}"`);
}

// For SAP date fields, try using keyboard shortcut or direct fill
// SAP uses dd.mm.yyyy format
if (textInps.length >= 2) {
  await textInps[textInps.length - 2].fill(start).catch(() => {});
  await textInps[textInps.length - 1].fill(end).catch(() => {});
  console.log(`Filled dates: ${start} - ${end}`);
}

save('05-dates-filled', await page.screenshot());

console.log('\n⏳ Clicking SUBMIT...');
const submitted = await formFrame.click('input[value="SUBMIT"], button:has-text("SUBMIT"), input[type=submit]').catch(e => {
  console.log('SUBMIT click error:', e.message);
  return false;
});
console.log('Submit result:', submitted);

await page.waitForTimeout(8000);
save('06-after-submit', await page.screenshot());

console.log(`\nFrames after submit (${page.frames().length}):`);
for (const f of page.frames()) console.log(`  ${f.url().substring(0,100)}`);

await browser.close();
console.log('\nDone.');
