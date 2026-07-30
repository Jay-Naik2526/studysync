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

  // 0. Direct match against portalName alias
  for (const sub of subjects) {
    if (sub.portalName && (clean(pdfName).trim() === clean(sub.portalName).trim() || clean(pdfName).includes(clean(sub.portalName).trim()))) {
      console.log(`🎯 [Deterministic Match] Matched "${pdfName}" to "${sub.name}" via portalName alias "${sub.portalName}"`);
      return { subject: sub, confidence: 1.0 };
    }
  }

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

    // SAP glues a section code (letter + digits — "T2", "P2", "U1") onto the end of the
    // course name. Everything AFTER that code varies completely between programs: a
    // program name, "Div B", "Batch A1", "ALL" for open electives, or nothing at all
    // ("Management Through MoviesT2"). So we anchor only on the code and never assume
    // anything about the trailing text.
    //
    // pdf-parse sometimes concatenates the date/time columns onto this same line, which
    // would hide the code at the end of the string — strip that noise off first.
    const cleanCourseLine = courseLine
      .replace(/[a-z]{3}\s+\d{1,2},\s+\d{4}.*$/i, '')
      .replace(/\d{1,2}:\d{2}:\d{2}\s*[AP]M.*$/i, '')
      .trim();

    // Primary: the known SAP codes (Theory / Practical / Tutorial / Lab), which may be
    // glued to the name or separated by a space, and may have multiple digits.
    // Fallback: any uppercase letter + digits glued directly onto a word, so unfamiliar
    // course codes from other programs still parse. The fallback requires the code to be
    // glued (no space) so trailing section text like "Div B1" can never be mistaken for it.
    const courseMatch =
      cleanCourseLine.match(/^(.*?\S)\s*[TUPL]\d+(?=\s|$)/) ||
      cleanCourseLine.match(/^(.*?[A-Za-z])[A-Z]\d+(?=\s|$)/);
    if (!courseMatch) continue;

    const courseName = courseMatch[1].trim();
    if (courseName.length < 3) continue;

    // Scan the next few lines for a bare "P", "A" or "NU" (the attendance marker)
    let attendance = null;
    let dateStr = null;

    // First check if the date was concatenated onto the end of the courseName line itself
    const concatenatedDateMatch = courseLine.match(/([a-z]{3}\s+\d{1,2},\s+\d{4})/i);
    if (concatenatedDateMatch) {
      dateStr = concatenatedDateMatch[1];
    }

    for (let j = i + 2; j <= i + 6 && j < lines.length; j++) {
      // Find date in adjacent row rows if not already found (e.g. "Jan 2, 2026" or "May 31, 2026")
      // Also handles dates concatenated with times like "Jan 2, 202612:00:01 PM"
      const dateMatch = lines[j].match(/([a-z]{3}\s+\d{1,2},\s+\d{4})/i);
      if (dateMatch && !dateStr) {
        dateStr = dateMatch[1];
      }
      if (/^[PA]$/.test(lines[j]) || lines[j] === 'NU') {
        attendance = lines[j];
        break;
      }
      // Stop scanning if we hit the next row number
      if (/^\d+$/.test(lines[j]) && j > i + 2) break;
    }

    // If attendance is 'NU' (Not Updated), we still parse it as a valid row (with zero action on absent counting)
    if (!attendance) continue;

    if (!map[courseName]) map[courseName] = { conducted: 0, absent: 0, dates: [] };
    
    // NU (Not Updated) classes are planned but not conducted yet — we do not count them as conducted
    if (attendance !== 'NU') {
      map[courseName].conducted++;
      if (attendance === 'A') map[courseName].absent++;
    }
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

// ── Academic year / semester helpers ──────────────────────────────
// SVKM's academic year flips on ~July 1. Before July → prior AY is active,
// on/after July → the new AY has started.
export function defaultAcademicYear(now = new Date()) {
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// Accepts "IV", "4", "Semester IV", "Sem 4", "Trimester 4" → returns 1-8, or null
export function normalizeSemesterNumber(input) {
  if (input === null || input === undefined || input === '') return null;
  const s = String(input).trim();

  const num = parseInt(s, 10);
  if (!isNaN(num) && String(num) === s && num >= 1 && num <= 8) return num;

  const romanIdx = ROMAN.indexOf(s.toUpperCase());
  if (romanIdx !== -1) return romanIdx + 1;

  const m = s.match(/([IVX]+|\d+)\s*$/i);
  if (m && m[1] !== s) return normalizeSemesterNumber(m[1]);

  return null;
}

// Builds a regex that matches this semester's roman numeral or "Semester N" / "Trimester N" text
function semesterMatchRegex(semNum) {
  const roman = ROMAN[semNum - 1];
  return new RegExp(`\\b${roman}\\b|(?:Semester|Trimester|Sem)\\.?\\s*0?${semNum}\\b`, 'i');
}

// Odd semesters (I, III, V, VII) run Jul–Dec; even semesters (II, IV, VI, VIII) run Jan–Jun.
// Start date is fixed to the semester's official start; end date is always "today".
export function computeSmartDateRange(academicYear, semNum, now = new Date()) {
  const m = String(academicYear).match(/(\d{4}).*?(\d{4})/);
  const startYear = m ? parseInt(m[1], 10) : now.getFullYear();
  const endYear   = m ? parseInt(m[2], 10) : startYear + 1;

  const isOdd = semNum % 2 === 1;
  const startDate = isOdd ? `13.07.${startYear}` : `02.01.${endYear}`;
  const endDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  return { startDate, endDate };
}

// ── SAP WD listbox click (readonly input → click option div) ─────
async function wdClickOption(frame, inputId, optionId) {
  try {
    await frame.locator(`#${inputId}`).click({ force: true, timeout: 5000 });
    await frame.waitForTimeout(800);
    await frame.locator(`#${optionId}`).click({ force: true, timeout: 5000 });
    await frame.waitForTimeout(800);
    return true;
  } catch (e) {
    console.warn(`  ⚠ wdClickOption(${inputId}→${optionId}): ${e.message.split('\n')[0]}`);
    return false;
  }
}

// ── Position-based form introspection ─────────────────────────────
// SAP WebDynpro re-assigns hex ids on every server roundtrip (confirmed by
// DOM dumps: the Semester input was WD33 at first render, WD34 after AY
// selection). Hardcoded ids silently start hitting the WRONG elements after
// a few roundtrips. What IS stable is the form's visual layout: the visible
// combobox/date inputs appear in a fixed top-to-bottom order matching the
// labels (Academic Year, Trimester/Semester, Monthly/Detailed, then either
// Month of Report or Start/End Date). So we work off the live list of
// visible text inputs sorted by screen position instead.
async function visibleTextInputs(frame) {
  const els = await frame.locator('input[type="text"], input:not([type])').all();
  const out = [];
  for (const el of els) {
    if (!(await el.isVisible().catch(() => false))) continue;
    const box = await el.boundingBox().catch(() => null);
    if (!box) continue;
    out.push({
      el,
      id:    (await el.getAttribute('id').catch(() => '')) || '?',
      value: (await el.inputValue().catch(() => '')) || '',
      x: box.x, y: box.y,
    });
  }
  out.sort((a, b) => a.y - b.y || a.x - b.x);
  return out;
}

// Collect only VISIBLE popup options — closed dropdowns leave hidden
// [role="option"] nodes in the DOM which must be ignored.
async function collectVisibleOptions(frame) {
  const els = await frame.locator('[role="option"]').all();
  const out = [];
  for (const el of els) {
    if (!(await el.isVisible().catch(() => false))) continue;
    out.push({ el, text: ((await el.textContent().catch(() => '')) || '').trim() });
  }
  return out;
}

// Set a date value on a real date <input>: try genuine typing first, fall
// back to JS injection + WD events, and verify by reading the value back.
async function setDateInput(frame, entry, dateValue, label) {
  try {
    await entry.el.click({ force: true, timeout: 5000 });
    await frame.waitForTimeout(200);
    await entry.el.press('Control+a').catch(() => {});
    await entry.el.type(dateValue, { delay: 40 }).catch(() => {});
    await entry.el.press('Tab').catch(() => {});
    await frame.waitForTimeout(400);

    let val = (await entry.el.inputValue().catch(() => '')) || '';
    if (val.trim()) {
      console.log(`    ✓ ${label} (#${entry.id}) typed = "${val}"`);
      return true;
    }

    // Typing didn't stick (readonly input) — inject on the real <input> and
    // fire the events SAP's UR framework listens to.
    await entry.el.evaluate((node, v) => {
      node.removeAttribute('readonly');
      node.value = v;
      ['focus', 'input', 'change', 'blur'].forEach(t =>
        node.dispatchEvent(new Event(t, { bubbles: true }))
      );
    }, dateValue);
    await frame.waitForTimeout(400);

    val = (await entry.el.inputValue().catch(() => '')) || '';
    console.log(`    ${val.trim() ? '✓' : '⚠'} ${label} (#${entry.id}) via JS injection = "${val}"`);
    return !!val.trim();
  } catch (e) {
    console.warn(`    ⚠ setDateInput(${label}): ${e.message.split('\n')[0]}`);
    return false;
  }
}

// ── Find the WebDynpro attendance frame ──────────────────────────
async function getWDFrame(page) {
  for (const frame of page.frames()) {
    const url = frame.url();
    // Match ZSVKM_STUDENT_ATTENDANCE2 or any attendance-related WD app
    if (
      (url.includes('ZSVKM_STUDENT_ATTENDANCE') || url.includes('ATTENDANCE')) &&
      !url.includes('USR_ABORT') &&
      url.includes('sap/bc/webdynpro')
    ) {
      return frame;
    }
  }
  return null;
}

async function waitForWDFrame(page, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const frame = await getWDFrame(page);
    if (frame) return frame;
    await page.waitForTimeout(1000);
  }
  // Log all current frames for debugging
  const frameList = page.frames().map(f => f.url()).join('\n  ');
  console.error(`❌ WD frame not found after ${timeoutMs / 1000}s. Current frames:\n  ${frameList}`);
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
export async function scrapeSAPAttendance(username, password, subjects, options = {}) {
  const academicYear = options.academicYear || defaultAcademicYear();
  const semNum = normalizeSemesterNumber(options.semester);
  if (!semNum) {
    throw new Error('A valid Semester/Trimester (I–VIII) must be selected before syncing.');
  }

  // Live progress reporting: each step pushes a short human-readable message
  // through options.onProgress so the frontend (polling /api/sap/status) can
  // show the user what's happening. Errors here must never break the scrape.
  const progress = async (msg) => {
    try { if (options.onProgress) await options.onProgress(msg); } catch {}
  };

  console.log(`🚀 SAP scrape starting… (AY: ${academicYear}, Semester: ${ROMAN[semNum - 1]})`);
  await progress('Launching secure browser…');

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
    await progress('Opening the SAP portal…');
    await page.goto(SAP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    let loginOk = false;
    for (let attempt = 1; attempt <= 3 && !loginOk; attempt++) {
      console.log(`🔐 Login attempt ${attempt}/3`);
      await progress(attempt === 1 ? 'Logging in with your SAP credentials…' : `Logging in (attempt ${attempt}/3)…`);
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
        // Tell a genuinely wrong password apart from a wrong CAPTCHA. SAP states the
        // reason in its logon error area. A wrong password will never succeed on retry,
        // so fail immediately with a clear message instead of burning three more login
        // attempts — which is also what risks tripping the portal's lockout.
        const lower = html.toLowerCase();
        if (/name or password is incorrect|password is incorrect|password was incorrect|invalid user|authentication failed|logon failed/.test(lower)) {
          const badCreds = new Error(
            'Your SAP username or password is incorrect. Please reconnect your SAP account with the correct password.'
          );
          badCreds.code = 'BAD_CREDENTIALS';
          throw badCreds;
        }
        if (/user is locked|account is locked|has been locked/.test(lower)) {
          const locked = new Error(
            'Your SAP account is locked. Please contact the college admin, then reconnect your account.'
          );
          locked.code = 'ACCOUNT_LOCKED';
          throw locked;
        }
        console.log('  ❌ Wrong captcha — refreshing…');
        await page.evaluate(() => { window.__captchaText = ''; });
        await page.click('#refresh').catch(() => {});
        await page.waitForTimeout(1500);
      }
    }
    if (!loginOk) throw new Error('SAP login failed after 3 attempts.');

    // ── 2. Navigate to Attendance form ───────────────────────────
    console.log('📍 Navigating to Attendance…');
    await progress('Logged in ✓ — opening the Attendance section…');
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

    console.log('⏳ Waiting for WD frame (polling up to 30s)…');

    // The WD frame reloads itself once shortly after it first appears, which
    // detaches the Frame object mid-wait. Re-acquire and retry instead of
    // letting a "Frame was detached" error kill the whole sync — whether we
    // hit the reload here or at the next step is pure timing luck.
    console.log('⏳ Waiting for WD form elements to render…');
    let wdFrame = null;
    let discoveredInputId = null;
    for (let retry = 0; retry < 4 && discoveredInputId === null; retry++) {
      wdFrame = await waitForWDFrame(page, 30000);
      if (!wdFrame) throw new Error('Could not locate WD attendance form iframe.');
      try {
        await wdFrame.locator('input').first().waitFor({ state: 'attached', timeout: 15000 });
        // Dynamic ID Shift Offset Discovery (WebDynpro IDs are Hexadecimal sequential arrays)
        discoveredInputId = await wdFrame.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[role="combobox"], input.lsInputField, input'));
          return inputs.length > 0 ? inputs[0].id : null;
        });
      } catch (e) {
        console.warn(`  ⚠ WD form wait retry ${retry + 1}: ${e.message.split('\n')[0]}`);
        await page.waitForTimeout(2000);
      }
    }
    if (!wdFrame) throw new Error('Could not locate WD attendance form iframe.');
    console.log(`📝 WD frame ready`);
    await progress('Attendance form loaded — filling in your details…');

    let offset = 0;
    if (discoveredInputId) {
      const parseHexId = s => {
        const m = s.match(/^WD([0-9A-F]+)$/i);
        return m ? parseInt(m[1], 16) : null;
      };
      const baseNum = parseHexId('WD2B');
      const discNum = parseHexId(discoveredInputId);
      if (baseNum !== null && discNum !== null) {
        offset = discNum - baseNum;
        console.log(`🎯 [Dynamic ID Discovery] Academic Year input is "${discoveredInputId}" (Base: "WD2B"). Offset: ${offset >= 0 ? '+' : ''}${offset}`);
      }
    }

    const formatHexId = (baseId, shift) => {
      const m = baseId.match(/^WD([0-9A-F]+)$/i);
      if (!m) return baseId;
      const baseNum = parseInt(m[1], 16);
      return `WD${(baseNum + shift).toString(16).toUpperCase()}`;
    };

    const ID_AY_INPUT      = formatHexId('WD2B', offset);
    const ID_AY_OPTION     = formatHexId('WD2E', offset);
    const ID_SEM_INPUT     = formatHexId('WD33', offset);
    const ID_SEM_OPTIONS   = formatHexId('WD34', offset);
    const ID_REPORT_INPUT  = formatHexId('WD39', offset);
    const ID_REPORT_OPTION = formatHexId('WD3C', offset);
    const ID_START_DATE    = formatHexId('WD46', offset);
    const ID_END_DATE      = formatHexId('WD4B', offset);
    const ID_SUBMIT        = formatHexId('WD51', offset);

    console.log(`📋 Active WebDynpro Element Map:
      * Academic Year Input: ${ID_AY_INPUT}
      * Academic Year Option: ${ID_AY_OPTION}
      * Semester Input: ${ID_SEM_INPUT}
      * Semester Options List: ${ID_SEM_OPTIONS}
      * Detail Report Input: ${ID_REPORT_INPUT}
      * Detail Report Option: ${ID_REPORT_OPTION}
      * Start Date Input: ${ID_START_DATE}
      * End Date Input: ${ID_END_DATE}
      * Submit Button: ${ID_SUBMIT}`);

    // ── 3. Fill form using exact WD IDs (discovered via debug) ───
    // SAP WebDynpro reloads the iframe after EVERY dropdown selection,
    // so we must re-acquire a fresh (non-detached) frame before each step.
    const getFrame = () => waitForWDFrame(page, 15000);

    // Helper: perform a wdClickOption using a fresh frame each time
    const clickOption = async (inputId, optionId, label) => {
      for (let retry = 0; retry < 4; retry++) {
        const f = await getFrame();
        if (!f) throw new Error(`Cannot find WD frame before selecting ${label}`);
        const ok = await wdClickOption(f, inputId, optionId);
        if (ok) { console.log(`    ✓ ${label} selected`); return f; }
        console.warn(`    ⚠ Retry ${retry + 1}/3 for ${label}…`);
        await page.waitForTimeout(1500);
      }
      throw new Error(`Failed to select ${label} after retries`);
    };

    // AY: WD2B (input) → listbox option, e.g. "Acad .Year 2025-2026".
    // The portal's option text has a fixed prefix, so we match by extracting
    // the YYYY-YYYY range rather than comparing full strings. We never guess
    // "current year" from today's date — a new academic year can already
    // appear in the dropdown before that year's semesters have actually
    // started, so the year the student needs is whatever they picked in the UI.
    //
    // IMPORTANT: we discover the matching option's real element id via a
    // READ-ONLY probe (no click on the AY input at all — SAP pre-renders the
    // listbox content in the DOM, just hidden, so text/id are readable without
    // opening it). The actual selection is then done with the exact same
    // single open→click commit sequence used by the proven-stable
    // clickOption/wdClickOption helper (used for Detail Report below).
    // Earlier attempts that opened the dropdown, queried it, and clicked in a
    // multi-step sequence let SAP's popup auto-close between our query and our
    // click — the click then silently no-oped (force:true never throws) and
    // the Semester listbox never actually got populated.
    const extractYearRange = txt => {
      const m = txt.match(/(\d{4})\s*-\s*(\d{4})/);
      return m ? `${m[1]}-${m[2]}` : null;
    };

    console.log(`  Looking up Academic Year "${academicYear}" in the portal's option list…`);
    let ayOptionId = null;
    try {
      const probeFrame = await getFrame();
      if (probeFrame) {
        const ayOptions = probeFrame.locator('[role="option"]');
        const ayCount = await ayOptions.count();
        for (let i = 0; i < ayCount; i++) {
          const el = ayOptions.nth(i);
          const text = (await el.textContent() || '').trim();
          if (extractYearRange(text) === academicYear) {
            ayOptionId = await el.getAttribute('id');
            break;
          }
        }
      }
    } catch (e) {
      console.warn(`    ⚠ AY lookup probe failed (will use default option): ${e.message.split('\n')[0]}`);
    }

    const finalAyOptionId = ayOptionId || ID_AY_OPTION;
    console.log(`  Selecting Academic Year "${academicYear}" (${ayOptionId ? `option #${ayOptionId}` : 'default portal option — no exact match found'})…`);
    await progress(`Selecting Academic Year ${academicYear}…`);
    await clickOption(ID_AY_INPUT, finalAyOptionId, `Academic Year ${academicYear}`);

    // Wait for frame to reload after AY selection, then re-acquire.
    // AY selection can involve more than one reload cycle (retries observed),
    // so give it more headroom than a single-reload step would need.
    await page.waitForTimeout(3000);

    // Semester: WD33 (input) → popup options. NOTE: we do NOT scope the
    // option scan to the "#WD34" container — diagnostics showed that div
    // exists but stays empty; SAP renders this popup's items elsewhere in
    // the DOM (a shared popup layer, like the AY dropdown does). We scan the
    // whole frame for [role="option"] and filter to whichever are actually
    // VISIBLE right now, since other closed dropdowns also leave role="option"
    // nodes sitting hidden in the DOM.
    console.log(`  Selecting Semester ${ROMAN[semNum - 1]}…`);
    await progress(`Selecting Semester ${ROMAN[semNum - 1]}…`);
    const semRegex = semesterMatchRegex(semNum);
    let semSelected = false;
    for (let retry = 0; retry < 4 && !semSelected; retry++) {
      const f = await getFrame();
      if (!f) throw new Error('Cannot find WD frame before semester selection');
      try {
        // Open the semester dropdown first
        await f.locator(`#${ID_SEM_INPUT}`).click({ force: true, timeout: 5000 });
        await f.waitForTimeout(800);

        const collectVisible = async () => {
          const all = f.locator('[role="option"]');
          const count = await all.count();
          const visible = [];
          for (let i = 0; i < count; i++) {
            const el = all.nth(i);
            if (await el.isVisible().catch(() => false)) visible.push(el);
          }
          return visible;
        };

        let visibleOptions = await collectVisible();
        // The popup can render asynchronously right after opening —
        // give it one more beat before concluding it's genuinely empty.
        if (visibleOptions.length === 0) {
          await f.waitForTimeout(1200);
          visibleOptions = await collectVisible();
        }

        if (visibleOptions.length === 0) {
          const inputExists = await f.locator(`#${ID_SEM_INPUT}`).count();
          const totalOptionNodes = await f.locator('[role="option"]').count();
          console.warn(`    ⚠ Semester retry ${retry + 1}: 0 visible options (${totalOptionNodes} hidden option node(s) exist elsewhere in DOM). Input #${ID_SEM_INPUT} exists: ${inputExists > 0}.`);
          await page.waitForTimeout(1500);
          continue;
        }

        let picked = false;
        let lastText = null;
        for (const opt of visibleOptions) {
          const text = (await opt.textContent() || '').trim();
          lastText = text;
          if (semRegex.test(text)) {
            await opt.click({ force: true });
            await f.waitForTimeout(800);
            console.log(`    ✓ Semester: "${text}"`);
            semSelected = true; picked = true; break;
          }
        }
        if (!picked) {
          await visibleOptions[0].click({ force: true });
          await f.waitForTimeout(800);
          console.log(`    ⚠ No match for Semester ${ROMAN[semNum - 1]} among [${visibleOptions.length} option(s), last: "${lastText}"] — picked first available`);
          semSelected = true;
        }
      } catch (e) {
        console.warn(`    ⚠ Semester retry ${retry + 1}: ${e.message.split('\n')[0]}`);
        await page.waitForTimeout(2000);
      }
    }
    if (!semSelected) throw new Error('Failed to select Semester after retries');

    // Wait for frame reload after semester selection
    await page.waitForTimeout(2000);

    // Report type: the 3rd visible combobox on the form ("Monthly/Detailed").
    // NEVER use the hardcoded WD3C option id here — a DOM dump proved that
    // after the earlier roundtrips it points at the "Monthly Report" option,
    // which silently selects the wrong report type; in Monthly mode SAP never
    // renders the Start/End Date inputs at all, so the sync can't proceed.
    // We instead click the option whose visible text matches /detail/i and
    // VERIFY by reading the combobox value back after the roundtrip.
    console.log('  Selecting Detail Report…');
    await progress('Selecting Detail Report…');
    let reportSelected = false;
    for (let retry = 0; retry < 4 && !reportSelected; retry++) {
      const f = await getFrame();
      if (!f) throw new Error('Cannot find WD frame before report type selection');
      try {
        const inputs = await visibleTextInputs(f);
        if (inputs.length < 3) throw new Error(`only ${inputs.length} visible input(s) on form`);
        await inputs[2].el.click({ force: true, timeout: 5000 });
        await f.waitForTimeout(800);

        const options = await collectVisibleOptions(f);
        const detail = options.find(o => /detail/i.test(o.text));
        if (!detail) {
          console.warn(`    ⚠ No "Detail" option among [${options.map(o => o.text).join(' | ') || '(none visible)'}] — retrying…`);
          await page.waitForTimeout(1500);
          continue;
        }
        await detail.el.click({ force: true, timeout: 5000 });
        await f.waitForTimeout(1500);

        // Verify on a fresh frame that the combobox now really says "Detail"
        const f2 = await getFrame();
        const after = f2 ? await visibleTextInputs(f2) : [];
        const reportVal = after[2]?.value || '';
        if (/detail/i.test(reportVal)) {
          console.log(`    ✓ Report type verified: "${reportVal}"`);
          reportSelected = true;
        } else {
          console.warn(`    ⚠ Report combobox reads "${reportVal}" after click — retrying…`);
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        console.warn(`    ⚠ Report type retry ${retry + 1}: ${e.message.split('\n')[0]}`);
        await page.waitForTimeout(2000);
      }
    }
    if (!reportSelected) throw new Error('Failed to select Detail Report after retries');

    // Wait for frame reload — selecting Detail Report makes SAP swap the
    // "Month of Report" field for the Start/End Date inputs.
    await page.waitForTimeout(2000);

    // Re-acquire fresh frame for date + submit steps
    let freshFrame = await getFrame();
    if (!freshFrame) throw new Error('Cannot find WD frame before date/submit step');

    // Dates: with Detail Report active, the Start/End Date inputs are the two
    // bottom-most visible text inputs on the form (below AY/Sem/Report rows).
    // Odd semesters (I/III/V/VII) run Jul 13 – Dec; even semesters (II/IV/VI/VIII)
    // run Jan 2 – Jun. End date is always "today" so this works for any student, any year.
    const { startDate, endDate } = computeSmartDateRange(academicYear, semNum);
    console.log(`  Date range: ${startDate} → ${endDate}`);
    await progress(`Setting date range ${startDate} → ${endDate}…`);

    let formInputs = await visibleTextInputs(freshFrame);
    console.log(`  🔍 Visible inputs now: ${formInputs.map(i => `#${i.id}@y${Math.round(i.y)}="${i.value}"`).join(', ')}`);
    if (formInputs.length < 5) {
      throw new Error(`Expected Start/End Date inputs after Detail Report but only ${formInputs.length} visible input(s) found — SAP did not render the date fields.`);
    }

    // Start date = second-from-bottom, End date = bottom-most.
    await setDateInput(freshFrame, formInputs[formInputs.length - 2], startDate, 'Start Date');

    // A date entry can trigger a WD roundtrip — re-acquire before End Date.
    await page.waitForTimeout(1000);
    freshFrame = await getFrame();
    if (!freshFrame) throw new Error('Cannot find WD frame before End Date entry');
    formInputs = await visibleTextInputs(freshFrame);
    await setDateInput(freshFrame, formInputs[formInputs.length - 1], endDate, 'End Date');

    await page.waitForTimeout(500);

    // ── 4. Submit ─────────────────────────────────────────────────
    console.log('⏳ Submitting form…');
    await progress('Submitting the attendance request…');
    interceptedPDF = null;
    downloadedPDF  = null;
    // Clear the stored PDF URL too. It was previously left set, so a URL captured
    // earlier in the session could be re-fetched by "Priority 3" below and mistaken
    // for this submission's report — one source of syncs that completed but returned
    // the wrong (or an empty) document.
    pdfResponseURL = null;

    // Read back the date inputs right before submitting, to confirm the
    // values really stuck (both should show dd.mm.yyyy).
    freshFrame = await getFrame();
    if (!freshFrame) throw new Error('Cannot find WD frame before submit');
    formInputs = await visibleTextInputs(freshFrame);
    const n = formInputs.length;
    console.log(`  📋 Date inputs just before submit: start="${n >= 2 ? formInputs[n - 2].value : '?'}" end="${n >= 1 ? formInputs[n - 1].value : '?'}"`);

    // Click SUBMIT by its visible text (unique on this form); the WD hex id
    // is only a fallback since ids drift between roundtrips.
    let submitted = false;
    for (const sel of [
      'div.lsButton:has-text("SUBMIT")',
      '[role="button"]:has-text("SUBMIT")',
      'span.lsButton__text:has-text("SUBMIT")',
      `#${ID_SUBMIT}`,
    ]) {
      try {
        await freshFrame.locator(sel).first().click({ force: true, timeout: 4000 });
        console.log(`  ✓ SUBMIT clicked via: "${sel}"`);
        submitted = true;
        break;
      } catch {}
    }
    if (!submitted) throw new Error('Could not click the SUBMIT button');

    // ── 5. Retrieve the PDF ───────────────────────────────────────
    // SAP renders the PDF in an embedded viewer. In headless mode with
    // --disable-pdf-viewer it should trigger a download instead.
    // We use multiple strategies in priority order:
    //   1. Download event (most reliable with --disable-pdf-viewer)
    //   2. Network response interceptor
    //   3. Re-fetch a stored PDF URL with session cookies
    //   4. Scan embedded frames for PDF src, then fetch
    console.log('⏳ Waiting for PDF…');
    await progress('Waiting for SAP to generate your attendance report…');

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
      // At the halfway point, dump the WD form's visible text — if SAP
      // rejected the submission (e.g. an invalid-date validation error) it'll
      // show up here as on-screen text, even though no new frame/PDF appears.
      if (elapsed === 20) {
        const wf = await getWDFrame(page);
        if (wf) {
          const bodyText = await wf.evaluate(() => document.body.innerText).catch(() => null);
          if (bodyText) console.log(`    📄 WD form text @ 20s:\n${bodyText.trim().substring(0, 1000)}`);
        }
      }
    }

    if (!pdfBuffer || pdfBuffer.length < 500) {
      try {
        const screenshotPath = 'public/sap-timeout-error.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Saved timeout screenshot to ${screenshotPath}`);
      } catch (err) {
        console.error(`Failed to capture screenshot: ${err.message}`);
      }
      // Dump the final on-screen text of the WD form too — this is the most
      // useful signal we have since we can't retrieve the screenshot file
      // from a remote deploy.
      try {
        const wf = await getWDFrame(page);
        if (wf) {
          const bodyText = await wf.evaluate(() => document.body.innerText).catch(() => null);
          if (bodyText) console.log(`📄 WD form text at timeout:\n${bodyText.trim().substring(0, 1500)}`);
        }
      } catch {}
      throw new Error(
        'PDF not received after 60s. The form submitted but the PDF viewer did not load. ' +
        'Check that Semester IV and Detail Report options are correct for your current academic year.'
      );
    }

    console.log(`✅ PDF ready (${Math.round(pdfBuffer.length / 1024)} KB) — parsing…`);
    await progress('Report received ✓ — reading your attendance…');

    // ── 6. Parse PDF + match subjects ────────────────────────────
    const { courseMap, latestAttendanceDate } = await parsePDFAttendance(pdfBuffer);
    console.log('📊 Courses found:', Object.keys(courseMap).join(', ') || '(none)');

    // SAP sometimes hands back a valid PDF that contains no attendance rows at all
    // (a placeholder or a report generated before its data was ready), even though
    // every step above succeeded. Reporting that as a successful sync is what produced
    // the "completed, but 0 courses matched" result. Flag it as retryable instead so
    // the caller re-runs the whole scrape rather than the user doing it by hand.
    if (Object.keys(courseMap).length === 0) {
      const emptyErr = new Error('SAP returned an attendance report with no rows in it.');
      emptyErr.retryable = true;
      throw emptyErr;
    }

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
