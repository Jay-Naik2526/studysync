import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire }      from 'module';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const requireCJS = createRequire(import.meta.url);

const SAP_URL = 'https://sdc-sppap1.svkm.ac.in:50001/irj/portal';

// ── Encryption helpers ────────────────────────────────────────────
function getKey() {
  return scryptSync(process.env.JWT_SECRET || 'studysync_default_key', 'sap_salt_v1', 32);
}

export function encryptCredential(text) {
  const iv      = randomBytes(16);
  const cipher  = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc     = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), encrypted: enc.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
}

export function decryptCredential(data) {
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(data.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(data.encrypted, 'hex')), decipher.final()]).toString('utf8');
}

// ── Subject fuzzy matcher ─────────────────────────────────────────
function matchSubject(pdfName, studySyncSubjects) {
  const norm = s => s.toLowerCase()
    .replace(/[()&]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'through'].includes(w));

  const pdfWords = norm(pdfName);
  let best = null, bestScore = 0;

  for (const sub of studySyncSubjects) {
    const subWords = norm(sub.name);
    let overlap = 0;
    for (const pw of pdfWords) {
      if (subWords.some(sw => sw.startsWith(pw) || pw.startsWith(sw))) overlap++;
    }
    const score = overlap / Math.max(pdfWords.length, subWords.length);
    if (score > bestScore) { bestScore = score; best = sub; }
  }
  return { subject: best, confidence: bestScore };
}

// ── PDF parser ────────────────────────────────────────────────────
export async function parsePDFAttendance(pdfBuffer) {
  const pdfParse  = requireCJS('pdf-parse');
  const { text }  = await pdfParse(pdfBuffer);

  // Pattern: "{num} {CourseName}{T|U|P}2 BTech CS {Div|Batch} XX {date} {time} {time} {P|A}"
  const RE = /^\s*\d+\s+([\w\s&]+?)\s*[TUP]\d\s+BTech\s+CS\s+(?:Div|Batch)\s+\S+\s+\w+\s+\d+,\s+\d{4}\s+[\d:]+\s+[AP]M\s+[\d:]+\s+[AP]M\s+([PA])\s*$/;
  const map = {};

  for (const line of text.split('\n')) {
    const m = line.match(RE);
    if (!m) continue;
    const name   = m[1].trim();
    const status = m[2];
    if (!map[name]) map[name] = { conducted: 0, absent: 0 };
    map[name].conducted++;
    if (status === 'A') map[name].absent++;
  }
  return map; // { "Theoretical Comp Sci": { conducted: 44, absent: 6 }, ... }
}

// ── CAPTCHA solver ────────────────────────────────────────────────
async function solveCaptcha(page) {
  const keys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean);

  // Screenshot just the CAPTCHA image element
  const imgEl = await page.$('#logon_captcha_img, img[id*="captcha"], img[src*="captcha"]')
              || await page.$('img[src*="CAPTCHA"], img[src*="Captcha"]');

  let screenshot;
  if (imgEl) {
    screenshot = await imgEl.screenshot({ type: 'png' });
  } else {
    // Fallback: screenshot a region where CAPTCHA usually appears
    screenshot = await page.screenshot({ type: 'png', clip: { x: 730, y: 350, width: 180, height: 50 } });
  }

  const b64 = screenshot.toString('base64');

  for (const key of keys) {
    try {
      const ai    = new GoogleGenerativeAI(key);
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const res   = await model.generateContent([
        { text: 'Read the CAPTCHA text in this image exactly. Return ONLY the characters you see — no spaces, no explanation, no punctuation outside of what is shown. Case-sensitive.' },
        { inlineData: { mimeType: 'image/png', data: b64 } },
      ]);
      const captchaText = res.response.text().trim().replace(/\s/g, '');
      console.log(`  🔡 CAPTCHA read as: "${captchaText}"`);
      return captchaText;
    } catch (e) {
      console.error('  Gemini key failed:', e.message);
    }
  }
  throw new Error('All Gemini keys failed to solve CAPTCHA');
}

// ── helper: find a locator in page + all frames ────────────────────
async function anyFrame(page, selectorFn) {
  for (const ctx of [page, ...page.frames()]) {
    try {
      const el = await ctx.$(selectorFn);
      if (el) return { frame: ctx, el };
    } catch {}
  }
  return null;
}

// ── MAIN scraper ──────────────────────────────────────────────────
export async function scrapeSAPAttendance(username, password, studySyncSubjects) {
  const execPath = process.env.CHROMIUM_PATH || undefined;

  const browser = await chromium.launch({
    headless: true,
    executablePath: execPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    // Ignore SSL errors (some campus portals have self-signed certs)
    await page.context().setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // ── 1. Login ────────────────────────────────────────────────
    console.log('🔗 Opening SAP portal…');
    await page.goto(SAP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    let loginOk = false;
    for (let attempt = 1; attempt <= 3 && !loginOk; attempt++) {
      console.log(`🔐 Login attempt ${attempt}/3`);

      const captcha = await solveCaptcha(page);

      // Fill credentials — SAP NetWeaver standard IDs
      await page.fill('#logonuidfield,  [name="sap-user"],  input[type="text"]:first-of-type',  username).catch(() => {});
      await page.fill('#logonpassfield, [name="sap-password"], input[type="password"]', password).catch(() => {});

      const captchaInput = await page.$('#logoncaptchafield, [name*="captcha"], [id*="captcha"]');
      if (captchaInput) await captchaInput.fill(captcha);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
        page.click('#logonbtn, input[value="Log On"], button:has-text("Log On")').catch(() => {}),
      ]);
      await page.waitForTimeout(2000);

      const html = await page.content();
      if (html.includes('Welcome') || html.includes('Log off') || !html.includes('Captcha')) {
        loginOk = true;
        console.log('✅ Login successful');
      } else {
        console.log('  ❌ Wrong captcha or error, retrying…');
        // Click captcha refresh
        await page.click('#logon_captcha_refresh, img[src*="refresh"], [title*="efresh"]').catch(() => {});
        await page.waitForTimeout(800);
      }
    }
    if (!loginOk) throw new Error('SAP login failed after 3 attempts. Check credentials.');

    // ── 2. Navigate to Attendance tab ───────────────────────────
    console.log('📍 Navigating to Attendance Display…');
    await page.waitForTimeout(2000);

    // Try clicking the tab (might be in main page or iframe)
    for (const ctx of [page, ...page.frames()]) {
      try {
        await ctx.click('text=Attendance Display for Students', { timeout: 3000 });
        console.log('  Clicked Attendance tab');
        break;
      } catch {}
    }
    await page.waitForTimeout(2000);

    // Student Attendance sub-tab
    for (const ctx of [page, ...page.frames()]) {
      try {
        await ctx.click('text=Student Attendance', { timeout: 2000 });
        break;
      } catch {}
    }
    await page.waitForTimeout(1500);

    // ── 3. Find the form frame ──────────────────────────────────
    let formCtx = page;
    for (const ctx of [page, ...page.frames()]) {
      try {
        const sel = await ctx.$('select');
        if (sel) { formCtx = ctx; break; }
      } catch {}
    }
    console.log('📝 Filling attendance report form…');

    // Academic Year — pick first non-empty option
    const yearSel = await formCtx.$('select').catch(() => null);
    if (yearSel) {
      const opts = await yearSel.$$('option');
      for (const opt of opts) {
        const v = await opt.getAttribute('value');
        if (v && v.trim()) { await yearSel.selectOption(v); break; }
      }
    }
    await page.waitForTimeout(600);

    // Semester — pick the option containing "IV" or "4"
    const allSelects = await formCtx.$$('select');
    if (allSelects[1]) {
      const opts = await allSelects[1].$$('option');
      for (const opt of opts) {
        const t = (await opt.textContent()) || '';
        if (/IV|Semester\s*4/i.test(t)) { await allSelects[1].selectOption({ label: t.trim() }); break; }
      }
    }
    await page.waitForTimeout(600);

    // Detail Report (third dropdown)
    if (allSelects[2]) {
      const opts = await allSelects[2].$$('option');
      for (const opt of opts) {
        const t = (await opt.textContent()) || '';
        if (/detail/i.test(t)) { await allSelects[2].selectOption({ label: t.trim() }); break; }
      }
    }
    await page.waitForTimeout(600);

    // Date range: semester start → today
    const now    = new Date();
    const yyyy   = now.getFullYear();
    const mm     = String(now.getMonth() + 1).padStart(2, '0');
    const dd     = String(now.getDate()).padStart(2, '0');
    const start  = `01.01.${yyyy}`;
    const end    = `${dd}.${mm}.${yyyy}`;

    const inputs = await formCtx.$$('input[type="text"], input:not([type])');
    for (const inp of inputs) {
      const placeholder = (await inp.getAttribute('placeholder') || '').toLowerCase();
      const id          = (await inp.getAttribute('id') || '').toLowerCase();
      if (placeholder.includes('start') || id.includes('start') || placeholder.includes('from')) {
        await inp.fill(start);
      } else if (placeholder.includes('end') || id.includes('end') || placeholder.includes('to')) {
        await inp.fill(end);
      }
    }

    // ── 4. Submit and capture the PDF ──────────────────────────
    console.log('⏳ Submitting form, waiting for PDF…');

    let pdfBuffer = null;
    const pdfResponsePromise = page.waitForResponse(
      r => {
        const ct = r.headers()['content-type'] || '';
        const cd = r.headers()['content-disposition'] || '';
        return ct.includes('pdf') || cd.includes('.pdf');
      },
      { timeout: 40000 }
    ).then(r => r.body()).catch(() => null);

    await formCtx.click('input[value="SUBMIT"], button:has-text("SUBMIT"), input[type="submit"]').catch(() => {});

    pdfBuffer = await pdfResponsePromise;

    // Fallback: check if a new page opened with the PDF
    if (!pdfBuffer) {
      await page.waitForTimeout(4000);
      const allPages = page.context().pages();
      for (const p of allPages) {
        if (p !== page) {
          const url = p.url();
          if (url.includes('pdf') || url.includes('PDF')) {
            const res = await p.goto(url);
            pdfBuffer = await res.body().catch(() => null);
          }
        }
      }
    }

    if (!pdfBuffer || pdfBuffer.length < 100) {
      throw new Error('PDF not received from SAP portal. The form submission may have failed.');
    }

    console.log(`📄 PDF received (${Math.round(pdfBuffer.length / 1024)} KB), parsing…`);

    // ── 5. Parse PDF ────────────────────────────────────────────
    const courseMap = await parsePDFAttendance(pdfBuffer);
    console.log('📊 Courses found:', Object.keys(courseMap).join(', '));

    // ── 6. Match to StudySync subjects ──────────────────────────
    const results = [];
    for (const [pdfName, data] of Object.entries(courseMap)) {
      const { subject, confidence } = matchSubject(pdfName, studySyncSubjects);
      results.push({
        pdfName,
        subjectId:   subject?._id   || null,
        subjectName: subject?.name  || null,
        confidence:  Math.round(confidence * 100),
        conducted:   data.conducted,
        absent:      data.absent,
        present:     data.conducted - data.absent,
        autoMatched: confidence >= 0.6,
      });
    }

    return { success: true, results, syncedAt: new Date() };

  } finally {
    await browser.close();
  }
}
