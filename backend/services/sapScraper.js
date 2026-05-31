import { chromium } from 'playwright';
import { createRequire }      from 'module';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const requireCJS = createRequire(import.meta.url);
const SAP_URL    = 'https://sdc-sppap1.svkm.ac.in:50001/irj/portal';

// ── Encryption ────────────────────────────────────────────────────
function getKey() {
  return scryptSync(process.env.JWT_SECRET || 'studysync_key', 'sap_salt_v1', 32);
}
export function encryptCredential(text) {
  const iv     = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), encrypted: enc.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
}
export function decryptCredential(data) {
  const dec = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(data.iv, 'hex'));
  dec.setAuthTag(Buffer.from(data.authTag, 'hex'));
  return Buffer.concat([dec.update(Buffer.from(data.encrypted, 'hex')), dec.final()]).toString('utf8');
}

// ── Subject fuzzy matcher ─────────────────────────────────────────
function matchSubject(pdfName, subjects) {
  // Normalize string by cleaning symbols and converting to lower case
  const clean = s => s.toLowerCase().replace(/[()&]/g, ' ').replace(/[^a-z0-9\s]/g, '');

  // Map known short-form abbreviations to their full representations to enable exact acronym generation
  const dictionary = {
    des: 'design',
    app: 'applied',
    ana: 'analysis',
    int: 'integrative',
    thin: 'thinking',
    comp: 'computer',
    sci: 'science',
    mgt: 'management',
    sys: 'systems',
    pro: 'programming',
    throug: 'through'
  };

  // Extract a list of words, replacing abbreviations and removing minor filler words
  const getWords = s => clean(s)
    .split(/\s+/)
    .filter(w => w.length > 0 && !['and','the','for','with','through','in','of','to','by'].includes(w))
    .map(w => dictionary[w] || w);

  // Generates standard and compound acronym candidates
  const getAcronyms = words => {
    if (words.length === 0) return [];
    
    // 1. Standard acronym (first letters: ['discrete', 'mathematics'] -> 'dm')
    const std = words.map(w => w[0]).join('');
    
    // 2. Compound acronym (checks if a word is 'iot', 'cs' etc and preserves it)
    const compound = words.map(w => {
      if (['iot', 'cs', 'it', 'ai', 'ml'].includes(w)) return w;
      return w[0];
    }).join('');

    return Array.from(new Set([std, compound]));
  };

  // Helper function to check if an acronym matches another acronym dynamically (allows for skipped vowel letters like 'o' in IoT)
  const isAcronymMatch = (ac1, ac2) => {
    if (ac1 === ac2) return true;
    
    // Safety check: Acronyms must start and end with the same letter to be considered potential variations
    // This perfectly prevents false matches when short-forms happen to have similar subsequences
    if (ac1[0] !== ac2[0] || ac1[ac1.length - 1] !== ac2[ac2.length - 1]) return false;
    
    // Clean vowels (except first letter) to see if they are structural consonant matches (e.g. 'daiot' -> 'dait')
    const dropVowels = s => s[0] + s.substring(1).replace(/[aeiou]/g, '');
    if (dropVowels(ac1) === dropVowels(ac2)) return true;

    // Check if one is a subsequence of the other with high similarity (e.g. 'dait' matches 'daiot')
    const cleanStr = s => s.replace(/[^a-z0-9]/g, '');
    const s1 = cleanStr(ac1), s2 = cleanStr(ac2);
    if (s1.length < 2 || s2.length < 2) return false;

    // Is one completely contained within the other in order?
    let i = 0, j = 0;
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length < s2.length ? s2 : s1;

    while (i < shorter.length && j < longer.length) {
      if (shorter[i] === longer[j]) i++;
      j++;
    }

    // If all characters of the shorter acronym are in the longer one in order (and difference is minimal)
    if (i === shorter.length && (longer.length - shorter.length) <= 2) {
      return true;
    }

    return false;
  };

  const pdfW = getWords(pdfName);
  const pdfAcronyms = getAcronyms(pdfW);

  let best = null, bestScore = 0;

  for (const sub of subjects) {
    const subW = getWords(sub.name);
    const subAcronyms = getAcronyms(subW);

    // 1. Check acronym intersection dynamically using the sub-sequence builder (DAIoT matching dait / Des and App Int Thin)
    const hasAcronymMatch = pdfAcronyms.some(pa => 
      subAcronyms.some(sa => isAcronymMatch(pa, sa)) || subW.some(sw => isAcronymMatch(pa, sw))
    ) || subAcronyms.some(sa => 
      pdfAcronyms.some(pa => isAcronymMatch(sa, pa)) || pdfW.some(pw => isAcronymMatch(sa, pw))
    );
    
    if (hasAcronymMatch) {
      best = sub;
      bestScore = 1.0; // Mark as perfect acronym match
      break;
    }

    // 2. Overlap/fuzzy match word-by-word
    const overlap = pdfW.filter(pw => subW.some(sw => sw.startsWith(pw) || pw.startsWith(sw))).length;
    const score = overlap / Math.max(pdfW.length, subW.length);
    if (score > bestScore) {
      bestScore = score;
      best = sub;
    }
  }

  return { subject: best, confidence: bestScore };
}

// ── PDF parser ────────────────────────────────────────────────────
// The SAP attendance PDF has each row split across multiple lines:
//   Line 1: <sr no>  (e.g. "1")
//   Line 2: <CourseName><T|U|P><n> BTech CS <Div|Batch> <section>
//           (e.g. "Theoretical Comp SciU2 BTech CS Batch A2")
//   Line 3: <date>   (e.g. "Jan 2, 2026")
//   Line 4: <times>  (e.g. "9:00:01 AM10:00:00 AM")
//   Line 5: <P|A>
export async function parsePDFAttendance(pdfBuffer) {
  const pdfParse = requireCJS('pdf-parse');
  const { text } = await pdfParse(pdfBuffer);
  console.log('📃 PDF text (first 2000 chars):\n' + text.substring(0, 2000));

  const map = {};

  // Tokenize: strip blank lines, trim each line
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    // A row starts with a bare sequence number
    if (!/^\d+$/.test(lines[i])) continue;

    // Next line: "CourseName<section> BTech/CE/AIML/IT/CSDS..."
    const courseLine = lines[i + 1] || '';
    // Extract course name — match anything before the section code ([TUP]\d) followed by BTech, B.Tech, B Tech, MBA, etc.
    const courseMatch = courseLine.match(/^([\w\s&,.()\-\/]+?)\s*[TUP]\d\s+(?:B\.?\s*Tech|MBA|M\.?\s*Tech|B\.?\s*E|B\.?\s*Sc|B\.?\s*CA)/i);
    if (!courseMatch) continue;

    const courseName = courseMatch[1].trim();
    if (courseName.length < 3) continue;

    // Scan the next few lines for a bare "P" or "A" (the attendance marker)
    let attendance = null;
    let dateStr = null;

    for (let j = i + 2; j <= i + 6 && j < lines.length; j++) {
      // Find date in row (e.g. "Jan 2, 2026" or "May 31, 2026")
      if (/^[a-z]{3}\s+\d{1,2},\s+\d{4}$/i.test(lines[j])) {
        dateStr = lines[j];
      }
      if (/^[PA]$/.test(lines[j])) {
        attendance = lines[j];
        break;
      }
      // Stop scanning if we hit the next row number
      if (/^\d+$/.test(lines[j]) && j > i + 2) break;
    }

    if (!attendance) continue;

    if (!map[courseName]) map[courseName] = { conducted: 0, absent: 0, dates: [] };
    map[courseName].conducted++;
    if (attendance === 'A') map[courseName].absent++;
    if (dateStr) map[courseName].dates.push(dateStr);
  }

  // Determine the latest attendance date across all parsed rows
  let maxDate = null;
  for (const info of Object.values(map)) {
    if (!info.dates || info.dates.length === 0) continue;
    for (const d of info.dates) {
      const parsed = Date.parse(d);
      if (!isNaN(parsed)) {
        if (!maxDate || parsed > maxDate) {
          maxDate = parsed;
        }
      }
    }
  }

  const latestAttendanceDate = maxDate ? new Date(maxDate) : null;
  console.log(`📊 Parsed ${Object.keys(map).length} course(s). Latest attendance date: ${latestAttendanceDate ? latestAttendanceDate.toLocaleDateString() : 'N/A'}`);
  
  return { courseMap: map, latestAttendanceDate };
}

// ── SAP WD listbox click (readonly input → click option div) ─────
async function wdClickOption(frame, inputId, optionId) {
  try {
    await frame.locator(`#${inputId}`).click({ force: true, timeout: 5000 });
    await frame.waitForTimeout(600);
    await frame.locator(`#${optionId}`).click({ force: true, timeout: 5000 });
    await frame.waitForTimeout(800);
    return true;
  } catch (e) {
    console.warn(`  ⚠ wdClickOption(${inputId}→${optionId}): ${e.message.split('\n')[0]}`);
    return false;
  }
}

// ── Set SAP readonly date input via JS + change event ────────────
// SAP DatePicker inputs are readonly — we bypass via direct JS value injection
// and fire the change event so SAP's WD framework registers the new value.
async function wdSetDate(frame, inputId, dateValue) {
  try {
    await frame.evaluate(({ id, val }) => {
      const el = document.getElementById(id);
      if (!el) return false;
      // Temporarily remove readonly to allow value set
      const wasReadonly = el.hasAttribute('readonly');
      el.removeAttribute('readonly');
      el.value = val;
      if (wasReadonly) el.setAttribute('readonly', '');
      // Fire events that SAP WD listens to
      ['input', 'change', 'blur'].forEach(evt =>
        el.dispatchEvent(new Event(evt, { bubbles: true }))
      );
      return true;
    }, { id: inputId, val: dateValue });
    await frame.waitForTimeout(400);
    console.log(`    ✓ Set #${inputId} = "${dateValue}" (via JS)`);
    return true;
  } catch (e) {
    console.warn(`    ⚠ wdSetDate(${inputId}): ${e.message.split('\n')[0]}`);
    return false;
  }
}

// ── Find the WebDynpro attendance frame ──────────────────────────
async function getWDFrame(page) {
  for (const frame of page.frames()) {
    const url = frame.url();
    if (url.includes('ZSVKM_STUDENT_ATTENDANCE2') && !url.includes('USR_ABORT')) {
      return frame;
    }
  }
  return null;
}

// ── Fetch PDF from embedded viewer URL (authenticated) ───────────
// After submit, SAP renders the PDF inside an embedded viewer in the WD frame.
// The viewer's src URL IS the PDF — we fetch it with the same session cookies.
async function fetchEmbeddedPDF(page, context, waitMs = 60000) {
  let pdfUrl = null;
  const start = Date.now();

  while (!pdfUrl && Date.now() - start < waitMs) {
    await page.waitForTimeout(2000);

    // Strategy 1: look for a frame whose URL looks like a PDF or blob
    for (const frame of page.frames()) {
      const url = frame.url();
      if (
        url.includes('%PDF') ||
        url.startsWith('blob:') ||
        url.includes('application/pdf') ||
        (url.includes('.pdf') && url !== SAP_URL)
      ) {
        pdfUrl = url;
        console.log(`  📄 PDF frame URL found: ${url.substring(0, 100)}`);
        break;
      }
    }

    // Strategy 2: look for embed/object/iframe with PDF src inside WD frame
    if (!pdfUrl) {
      for (const frame of page.frames()) {
        try {
          const src = await frame.evaluate(() => {
            // Check for <embed>, <object>, <iframe> containing a PDF
            const embed  = document.querySelector('embed[src], object[data]');
            const iframe = document.querySelector('iframe[src]');
            const pluginViewer = document.querySelector('#plugin, [type="application/pdf"]');

            const candidates = [
              embed?.getAttribute('src'),
              embed?.getAttribute('data'),
              (embed)?.data,
              iframe?.getAttribute('src'),
              pluginViewer?.getAttribute('src'),
            ].filter(Boolean);

            // Also scan all links/scripts for PDF URLs
            const allAnchors = [...document.querySelectorAll('a[href]')]
              .map(a => a.href)
              .filter(h => h.includes('.pdf') || h.includes('application%2Fpdf'));

            return candidates[0] || allAnchors[0] || null;
          });

          if (src && src.length > 5) {
            pdfUrl = src;
            console.log(`  📄 PDF embed src found: ${src.substring(0, 100)}`);
            break;
          }
        } catch {}
      }
    }

    // Strategy 3: check if page URL itself changed to something PDF-related
    if (!pdfUrl) {
      const mainUrl = page.url();
      if (mainUrl.includes('.pdf') || mainUrl.includes('application%2Fpdf')) {
        pdfUrl = mainUrl;
      }
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    if (!pdfUrl && elapsed % 10 === 0) {
      console.log(`    … waiting for PDF viewer (${elapsed}s)…`);

      // Log frame URLs every 10s for debugging
      for (const f of page.frames()) {
        const u = f.url();
        if (u && u !== 'about:blank' && !u.includes('emptyhover') && !u.includes('EmptyDocument')) {
          console.log(`    frame: ${u.substring(0, 100)}`);
        }
      }
    }
  }

  if (!pdfUrl) return null;

  // Strategy A: if it's a blob URL, read it from within the frame's JS context
  if (pdfUrl.startsWith('blob:')) {
    console.log('  📦 Fetching blob URL via in-page JS…');
    for (const frame of page.frames()) {
      try {
        const base64 = await frame.evaluate(async (url) => {
          const resp = await fetch(url);
          const buf  = await resp.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (const b of bytes) binary += String.fromCharCode(b);
          return btoa(binary);
        }, pdfUrl);
        if (base64) return Buffer.from(base64, 'base64');
      } catch {}
    }
  }

  // Strategy B: fetch with Playwright's authenticated request context
  console.log(`  📥 Fetching PDF URL: ${pdfUrl.substring(0, 100)}`);
  try {
    const resp = await context.request.get(pdfUrl, {
      timeout: 30000,
      headers: { Accept: 'application/pdf,*/*' },
    });
    const body = await resp.body();
    if (body && body.slice(0, 4).toString() === '%PDF') {
      console.log(`  ✅ PDF fetched (${Math.round(body.length / 1024)} KB)`);
      return body;
    }
    console.warn(`  ⚠ Fetched ${body?.length} bytes but not a PDF header`);
  } catch (e) {
    console.warn(`  ⚠ PDF fetch error: ${e.message}`);
  }

  return null;
}

// ── MAIN scraper ──────────────────────────────────────────────────
export async function scrapeSAPAttendance(username, password, subjects) {
  console.log(`🚀 SAP scrape starting…`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--ignore-certificate-errors',
      // Force PDF to download instead of displaying in-browser viewer
      // This makes it catchable via Playwright's download event
      '--disable-pdf-viewer',
      '--disable-plugins-discovery',
      '--disable-extensions',
    ],
  });

  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 900 },
      acceptDownloads: true,
      // Disable PDF viewer so PDFs trigger downloads we can intercept
      extraHTTPHeaders: {},
    });

    // Intercept all requests after submit to find the PDF URL
    let pdfResponseURL = null;
    context.on('request', (req) => {
      const url = req.url();
      const rtype = req.resourceType();
      if (rtype === 'document' && url.includes('sdcwdapp')) {
        console.log(`  📡 Request: [${rtype}] ${url.substring(0, 100)}`);
      }
    });

    // CAPTCHA intercept via canvas strokeText hook
    await context.addInitScript(() => {
      const origGetCtx = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        const ctx = origGetCtx.call(this, type, ...args);
        if (type === '2d' && ctx && !ctx.__captchaPatched) {
          ctx.__captchaPatched = true;
          const origStroke = ctx.strokeText.bind(ctx);
          ctx.strokeText = function (text, ...rest) {
            if (text && text.length >= 4) window.__captchaText = text;
            return origStroke(text, ...rest);
          };
        }
        return ctx;
      };
    });

    // Intercept ALL network responses — log candidates, capture PDFs
    let interceptedPDF = null;
    context.on('response', async (resp) => {
      if (interceptedPDF) return;
      const ct     = resp.headers()['content-type']  || '';
      const cd     = resp.headers()['content-disposition'] || '';
      const url    = resp.url();
      const status = resp.status();

      // Log all non-trivial responses on the WD app domain
      if (url.includes('sdcwdapp') && status >= 200 && status < 400) {
        console.log(`  📡 Response [${status}] ct="${ct.substring(0,40)}" cd="${cd.substring(0,40)}" url=${url.substring(0,80)}`);
      }

      if (ct.includes('pdf') || cd.toLowerCase().includes('attachment') || ct.includes('octet-stream')) {
        try {
          const body = await resp.body();
          if (body && body.length > 500 && body.slice(0, 4).toString() === '%PDF') {
            interceptedPDF = body;
            console.log(`📄 PDF intercepted via network (${Math.round(body.length / 1024)} KB) from: ${url.substring(0,80)}`);
          }
        } catch (e) {
          // Body already consumed — store URL to re-fetch later
          pdfResponseURL = url;
          console.log(`  ⚠ PDF body already consumed, stored URL: ${url.substring(0,80)}`);
        }
      }
    });

    // Watch for downloads (SAP may trigger a file download)
    let downloadedPDF = null;
    context.on('download', async (download) => {
      try {
        const path = await download.path();
        if (path) {
          const { readFileSync } = await import('fs');
          const buf = readFileSync(path);
          if (buf.slice(0, 4).toString() === '%PDF') {
            downloadedPDF = buf;
            console.log(`📥 PDF downloaded (${Math.round(buf.length / 1024)} KB): ${download.suggestedFilename()}`);
          }
        }
      } catch {}
    });

    const page = await context.newPage();

    // ── 1. Login ─────────────────────────────────────────────────
    console.log('🔗 Opening SAP portal…');
    await page.goto(SAP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    let loginOk = false;
    for (let attempt = 1; attempt <= 3 && !loginOk; attempt++) {
      console.log(`🔐 Login attempt ${attempt}/3`);
      const captcha = (await page.evaluate(() => window.__captchaText || '')).trim();
      console.log(`  🔡 CAPTCHA: "${captcha}"`);

      await page.fill('#logonuidfield',  username);
      await page.fill('#logonpassfield', password);
      if (captcha) await page.fill('#txtInput', captcha);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
        page.click('#Button1'),
      ]);
      await page.waitForTimeout(3000);

      const html = await page.content();
      loginOk = (
        html.toLowerCase().includes('welcome') ||
        html.toLowerCase().includes('log off') ||
        !html.toLowerCase().includes('captcha')
      );
      if (loginOk) {
        console.log('✅ Login successful!');
      } else {
        console.log('  ❌ Wrong captcha — refreshing…');
        await page.evaluate(() => { window.__captchaText = ''; });
        await page.click('#refresh').catch(() => {});
        await page.waitForTimeout(1500);
      }
    }
    if (!loginOk) throw new Error('SAP login failed after 3 attempts.');

    // ── 2. Navigate to Attendance form ───────────────────────────
    console.log('📍 Navigating to Attendance…');
    await page.waitForTimeout(2000);

    for (const frame of [page, ...page.frames()]) {
      try {
        await frame.click('text=Attendance Display for Students', { timeout: 4000 });
        console.log('  ✓ Attendance Display tab');
        break;
      } catch {}
    }
    await page.waitForTimeout(2500);

    for (const frame of [page, ...page.frames()]) {
      try {
        await frame.click('text=Student Attendance', { timeout: 3000 });
        console.log('  ✓ Student Attendance sub-tab');
        break;
      } catch {}
    }

    console.log('⏳ Waiting for WD frame…');
    await page.waitForTimeout(5000);

    let wdFrame = await getWDFrame(page);
    if (!wdFrame) { await page.waitForTimeout(3000); wdFrame = await getWDFrame(page); }
    if (!wdFrame) throw new Error('Could not locate WD attendance form iframe.');
    console.log(`📝 WD frame ready`);

    // ── 3. Fill form using exact WD IDs (discovered via debug) ───
    // AY: WD2B (input) → WD2E (2025-2026 option)
    console.log('  Selecting Academic Year 2025-2026…');
    await wdClickOption(wdFrame, 'WD2B', 'WD2E');

    // Semester: WD33 (input) → options in WD34 listbox
    console.log('  Selecting Semester IV…');
    await wdFrame.waitForTimeout(1500);
    let semSelected = false;
    for (let retry = 0; retry < 3 && !semSelected; retry++) {
      const semOptions = wdFrame.locator('#WD34 [role="option"]');
      const semCount   = await semOptions.count();
      for (let i = 0; i < semCount; i++) {
        const text = (await semOptions.nth(i).textContent() || '').trim();
        if (/\bIV\b|Semester\s*4/i.test(text)) {
          await wdFrame.locator('#WD33').click({ force: true });
          await wdFrame.waitForTimeout(400);
          await semOptions.nth(i).click({ force: true });
          await wdFrame.waitForTimeout(800);
          console.log(`    ✓ Semester: "${text}"`);
          semSelected = true;
          break;
        }
      }
      if (!semSelected && semCount > 0) {
        // No IV found — pick first
        const text = (await semOptions.first().textContent() || '').trim();
        await wdFrame.locator('#WD33').click({ force: true });
        await wdFrame.waitForTimeout(400);
        await semOptions.first().click({ force: true });
        await wdFrame.waitForTimeout(800);
        console.log(`    ⚠ No Sem IV — picked first: "${text}"`);
        semSelected = true;
      }
      if (!semSelected) await wdFrame.waitForTimeout(1500);
    }

    // Report type: WD39 (input) → WD3C (Detail Report option)
    console.log('  Selecting Detail Report…');
    await wdClickOption(wdFrame, 'WD39', 'WD3C');

    // Dates: WD46 = Start Date, WD4B = End Date
    // These are readonly SAP DatePicker inputs — use JS value injection
    const now   = new Date();
    const yyyy  = now.getFullYear();
    const startDate = `01.01.${yyyy}`;
    const endDate   = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${yyyy}`;
    console.log(`  Date range: ${startDate} → ${endDate}`);

    await wdSetDate(wdFrame, 'WD46', startDate);
    await wdSetDate(wdFrame, 'WD4B', endDate);

    // Trigger a Tab on an adjacent element to make SAP register the date values
    await wdFrame.locator('#WD51').focus().catch(() => {});
    await wdFrame.waitForTimeout(300);

    // ── 4. Submit ─────────────────────────────────────────────────
    console.log('⏳ Submitting form (#WD51)…');
    interceptedPDF = null;
    downloadedPDF  = null;

    try {
      await wdFrame.locator('#WD51').click({ force: true, timeout: 5000 });
      console.log('  ✓ SUBMIT clicked');
    } catch (e) {
      console.warn(`  ⚠ #WD51 error: ${e.message.split('\n')[0]}`);
      // Fallback: click by text content
      for (const sel of [
        'div.lsButton:has-text("SUBMIT")',
        '[role="button"]:has-text("SUBMIT")',
        'span.lsButton__text:has-text("SUBMIT")',
      ]) {
        try {
          await wdFrame.locator(sel).first().click({ force: true, timeout: 3000 });
          console.log(`  ✓ SUBMIT via: "${sel}"`);
          break;
        } catch {}
      }
    }

    // ── 5. Retrieve the PDF ───────────────────────────────────────
    // SAP renders the PDF in an embedded viewer. In headless mode with
    // --disable-pdf-viewer it should trigger a download instead.
    // We use multiple strategies in priority order:
    //   1. Download event (most reliable with --disable-pdf-viewer)
    //   2. Network response interceptor
    //   3. Re-fetch a stored PDF URL with session cookies
    //   4. Scan embedded frames for PDF src, then fetch
    console.log('⏳ Waiting for PDF…');

    let pdfBuffer = null;
    const deadline = Date.now() + 60000;

    while (!pdfBuffer && Date.now() < deadline) {
      // Priority 1: direct network interception
      if (interceptedPDF) { pdfBuffer = interceptedPDF; break; }
      // Priority 2: download event
      if (downloadedPDF) { pdfBuffer = downloadedPDF; break; }
      // Priority 3: re-fetch stored URL
      if (pdfResponseURL) {
        try {
          const resp = await context.request.get(pdfResponseURL, { timeout: 20000 });
          const body = await resp.body();
          if (body && body.slice(0, 4).toString() === '%PDF') {
            pdfBuffer = body;
            console.log(`  ✅ PDF re-fetched from stored URL (${Math.round(pdfBuffer.length/1024)} KB)`);
            break;
          }
        } catch {}
        pdfResponseURL = null;
      }

      await page.waitForTimeout(2000);

      // Check all frames for an embedded PDF viewer
      for (const frame of page.frames()) {
        if (pdfBuffer) break;
        try {
          const src = await frame.evaluate(() => {
            // Chrome/Edge embed a PDF via a special frame URL or plugin
            // Check if the current document IS a PDF
            if (document.contentType === 'application/pdf') return location.href;

            // Look for embed/object elements
            for (const el of document.querySelectorAll('embed, object, iframe')) {
              const s = el.src || el.data || el.getAttribute('src') || el.getAttribute('data') || '';
              if (s && (s.includes('.pdf') || s.includes('application%2Fpdf') || s.includes('pdf'))) return s;
            }
            return null;
          });
          if (src) {
            console.log(`  📄 Embedded PDF src: ${src.substring(0, 100)}`);
            // Fetch it with the authenticated session
            const resp = await context.request.get(src, {
              timeout: 30000,
              headers: { 'Accept': 'application/pdf,*/*' },
            }).catch(e => { console.warn(`  fetch err: ${e.message}`); return null; });
            if (resp) {
              const body = await resp.body();
              if (body && body.slice(0, 4).toString() === '%PDF') {
                pdfBuffer = body;
                console.log(`  ✅ PDF retrieved (${Math.round(pdfBuffer.length / 1024)} KB)`);
              }
            }
          }
        } catch {}
      }

      // Check if any frame URL itself IS the PDF (Chrome's PDF viewer uses a frame)
      for (const frame of page.frames()) {
        if (pdfBuffer) break;
        const url = frame.url();
        if (
          url.includes('ZSVKM_STUDENT_ATTENDANCE') &&
          url !== wdFrame.url() &&
          !url.includes('USR_ABORT')
        ) {
          // The WD frame navigated to a PDF — try to fetch it
          try {
            const resp = await context.request.get(url, { timeout: 30000 });
            const body = await resp.body();
            if (body && body.slice(0, 4).toString() === '%PDF') {
              pdfBuffer = body;
              console.log(`  ✅ PDF from WD frame URL (${Math.round(pdfBuffer.length / 1024)} KB)`);
            }
          } catch {}
        }
      }

      const elapsed = Math.round((Date.now() - (deadline - 60000)) / 1000);
      if (elapsed % 10 === 0) {
        console.log(`    … ${elapsed}s — frames:`);
        for (const f of page.frames()) {
          const u = f.url();
          if (u && !u.includes('emptyhover') && !u.includes('EmptyDocument') && u !== 'about:blank') {
            console.log(`      ${u.substring(0, 100)}`);
          }
        }
      }
    }

    if (!pdfBuffer || pdfBuffer.length < 500) {
      throw new Error(
        'PDF not received after 60s. The form submitted but the PDF viewer did not load. ' +
        'Check that Semester IV and Detail Report options are correct for your current academic year.'
      );
    }

    console.log(`✅ PDF ready (${Math.round(pdfBuffer.length / 1024)} KB) — parsing…`);

    // ── 6. Parse PDF + match subjects ────────────────────────────
    const { courseMap, latestAttendanceDate } = await parsePDFAttendance(pdfBuffer);
    console.log('📊 Courses found:', Object.keys(courseMap).join(', ') || '(none)');

    const results = [];
    for (const [pdfName, data] of Object.entries(courseMap)) {
      const { subject, confidence } = matchSubject(pdfName, subjects);
      results.push({
        pdfName,
        subjectId:   subject?._id  || null,
        subjectName: subject?.name || null,
        confidence:  Math.round(confidence * 100),
        conducted:   data.conducted,
        absent:      data.absent,
        present:     data.conducted - data.absent,
        autoMatched: confidence >= 0.6,
      });
    }

    return { success: true, results, syncedAt: new Date(), latestAttendanceDate };

  } finally {
    await browser.close();
  }
}
