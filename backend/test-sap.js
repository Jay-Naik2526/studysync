// Quick local test — run with: node test-sap.js
// This does NOT need the full Express server
import 'dotenv/config';
import { scrapeSAPAttendance, parsePDFAttendance } from './services/sapScraper.js';
import { readFileSync } from 'fs';

// ── Test 1: PDF parsing (no browser needed) ───────────────────────
async function testPDFParsing() {
  console.log('\n=== TEST 1: PDF Parsing ===');
  try {
    const buf = readFileSync('/Users/JayNaik/Downloads/ZSVKM_STUDENT_ATTENDANCE_COPY.pdf');
    const { courseMap, latestAttendanceDate } = await parsePDFAttendance(buf);
    console.log('✅ PDF parsed successfully:');
    for (const [name, d] of Object.entries(courseMap)) {
      const pct = ((d.conducted - d.absent) / d.conducted * 100).toFixed(1);
      console.log(`  ${name}: ${d.conducted - d.absent}/${d.conducted} (${pct}%)`);
    }
    console.log(`📅 Latest parsed date: ${latestAttendanceDate ? latestAttendanceDate.toLocaleDateString() : 'N/A'}`);
    return true;
  } catch (e) {
    console.error('❌ PDF test failed:', e.message);
    return false;
  }
}

// ── Test 2: Full scrape (browser + CAPTCHA + SAP) ──────────────────
async function testFullScrape() {
  console.log('\n=== TEST 2: Full SAP Scrape ===');

  // Fake subjects to test matching
  const mockSubjects = [
    { _id: '1', name: 'Theoretical Computer Science' },
    { _id: '2', name: 'Discrete Mathematics' },
    { _id: '3', name: 'Design and Analysis of Algorithms' },
    { _id: '4', name: 'Design and Applied Integrative Thinking' },
    { _id: '5', name: 'Web Programming' },
    { _id: '6', name: 'Data Management Systems' },
    { _id: '7', name: 'Complex Variables and Transforms' },
    { _id: '8', name: 'Object Oriented Programming through Java' },
  ];

  try {
    // NOTE: Credentials passed directly for local testing only
    // In production these come from encrypted DB storage
    const username = process.env.SAP_TEST_USER || '70552400047';
    const password = process.env.SAP_TEST_PASS;

    if (!password) {
      console.log('⚠  Set SAP_TEST_PASS env var to test full scrape');
      console.log('   e.g: SAP_TEST_PASS=yourpassword node test-sap.js');
      return false;
    }

    const result = await scrapeSAPAttendance(username, password, mockSubjects);

    console.log('\n✅ Scrape successful!');
    console.log('Results:');
    for (const r of result.results) {
      const status = r.autoMatched ? '✅' : '⚠ ';
      console.log(`  ${status} "${r.pdfName}" → "${r.subjectName}" (${r.confidence}% conf) | ${r.present}/${r.conducted}`);
    }
    return true;
  } catch (e) {
    console.error('❌ Scrape failed:', e.message);
    return false;
  }
}

// Run tests
const pdfOk = await testPDFParsing();
if (pdfOk) await testFullScrape();
