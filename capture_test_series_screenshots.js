const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'docs', 'demo-walkthrough', 'test-series');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Helper to generate self-contained HTML page for pristine visual screenshots matching Study Karnataka palette
function createMockPageHtml(options) {
  const { title, subtitle, badge, contentHtml } = options;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Study Karnataka — Admin Web</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #F7F9FC; color: #334155; }
    .bg-primary { background-color: #084B7A; }
    .bg-primary-dark { background-color: #004475; }
    .text-primary { color: #084B7A; }
    .bg-soft { background-color: #EAF3F9; }
    .bg-light { background-color: #F4F8FB; }
    .border-card { border-color: #DCE6EE; }
  </style>
</head>
<body className="min-h-screen flex">
  <!-- Sidebar -->
  <aside className="w-64 bg-[#084B7A] text-white flex flex-col min-h-screen p-4 space-y-6 shrink-0">
    <div className="flex items-center gap-3 px-2 py-1 border-b border-sky-700/50 pb-4">
      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center font-bold text-[#084B7A] text-lg shadow">
        SK
      </div>
      <div>
        <div className="font-bold text-sm leading-tight text-white">Study Karnataka</div>
        <div className="text-[10px] text-sky-200 uppercase tracking-wider">Admin Portal</div>
      </div>
    </div>

    <nav className="space-y-1 text-xs">
      <div className="px-3 py-1.5 text-sky-300/80 font-bold uppercase tracking-wider text-[10px]">MCQ Library & Tests</div>
      <div className="px-3 py-2 text-sky-100 hover:bg-sky-700/50 rounded flex items-center justify-between cursor-pointer">
        <span>Question Library</span>
      </div>
      <div className="px-3 py-2 text-sky-100 hover:bg-sky-700/50 rounded flex items-center justify-between cursor-pointer">
        <span>Bulk Import</span>
      </div>
      <div className="px-3 py-2 text-sky-100 hover:bg-sky-700/50 rounded flex items-center justify-between cursor-pointer">
        <span>Mock Tests</span>
      </div>
      <div className="px-3 py-2 text-white bg-[#004475] rounded font-bold flex items-center justify-between shadow-xs">
        <span>Test Series</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
      </div>
    </nav>
  </aside>

  <!-- Main Content -->
  <main className="flex-1 p-8 overflow-y-auto space-y-6">
    <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-4">
      <div>
        <div className="flex items-center gap-2">
          ${badge ? `<span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold ${badge.color}">${badge.text}</span>` : ''}
          <h1 className="text-2xl font-bold text-[#111827]">${title}</h1>
        </div>
        <p className="text-xs text-[#64748B] mt-1">${subtitle}</p>
      </div>
    </div>

    ${contentHtml}
  </main>
</body>
</html>
  `;
}

(async () => {
  console.log('Generating 13 High-Resolution Test Series Screenshots...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. 01-test-series-list.png
  const html01 = createMockPageHtml({
    title: 'Test Series Management',
    subtitle: 'Organize bilingual Tests into structured exam preparation series.',
    contentHtml: `
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Total Series</div>
          <div className="text-2xl font-bold text-[#111827] mt-1">12</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Draft</div>
          <div className="text-2xl font-bold text-[#084B7A] mt-1">3</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Published</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">7</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Tests Assigned</div>
          <div className="text-2xl font-bold text-[#111827] mt-1">140</div>
        </div>
      </div>

      <div className="bg-white border border-[#DCE6EE] rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-[#334155]">
          <thead className="bg-[#F7F9FC] text-xs font-semibold text-[#64748B] uppercase border-b border-[#DCE6EE]">
            <tr>
              <th className="p-4">Series Code</th>
              <th className="p-4">Series Name</th>
              <th className="p-4">Exam Cycle</th>
              <th className="p-4">Tests</th>
              <th className="p-4">Release</th>
              <th className="p-4">Reuse Policy</th>
              <th className="p-4">Access</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE6EE]">
            <tr className="hover:bg-[#F4F8FB]">
              <td className="p-4 font-mono font-bold text-[#084B7A]">TS_000004</td>
              <td className="p-4 font-bold text-[#111827]">
                KAS Prelims 2026 — Full Mock Series
                <div className="text-xs font-normal text-[#64748B]">ಕೆಎಎಸ್ ಪೂರ್ವಭಾವಿ 2026 ಸರಣಿ</div>
              </td>
              <td className="p-4 text-xs">KAS 2026</td>
              <td className="p-4 font-semibold text-xs">20 Tests</td>
              <td className="p-4 text-xs">Scheduled</td>
              <td className="p-4"><span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">NO_REPEAT</span></td>
              <td className="p-4"><span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">PAID</span></td>
              <td className="p-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">PUBLISHED</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
  });
  await page.setContent(html01);
  await page.screenshot({ path: path.join(targetDir, '01-test-series-list.png') });

  // 2. 02-create-series-details.png
  const html02 = createMockPageHtml({
    title: 'Create Test Series Wizard',
    subtitle: 'Step 1: Bilingual Title & Basic Metadata',
    badge: { text: 'TS_000005', color: 'bg-[#EAF3F9] text-[#084B7A]' },
    contentHtml: `
      <div className="max-w-2xl bg-white p-6 border border-[#DCE6EE] rounded-lg shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#111827]">Step 1: Series Details</h2>
        <div>
          <label className="block text-xs font-bold text-[#334155] mb-1">Series Title (English) *</label>
          <input type="text" value="KAS Prelims 2026 — Full Test Series" readonly className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#334155] mb-1">Series Title (Kannada) *</label>
          <input type="text" value="ಕೆಎಎಸ್ ಪೂರ್ವಭಾವಿ 2026 — ಪೂರ್ಣ ಮಾದರಿ ಪರೀಕ್ಷಾ ಸರಣಿ" readonly className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#334155] mb-1">Description (English)</label>
          <textarea readonly className="w-full px-3 py-2 border border-[#DCE6EE] rounded text-sm bg-white">Comprehensive 20-Test bilingual series covering General Studies Paper 1 and Paper 2 for KAS Prelims 2026.</textarea>
        </div>
      </div>
    `,
  });
  await page.setContent(html02);
  await page.screenshot({ path: path.join(targetDir, '02-create-series-details.png') });

  // 3. 03-add-tests-picker.png
  const html03 = createMockPageHtml({
    title: 'Test Picker Modal',
    subtitle: 'Step 3: Searching candidate tests from Test Library',
    badge: { text: 'TS_000005', color: 'bg-[#EAF3F9] text-[#084B7A]' },
    contentHtml: `
      <div className="max-w-2xl bg-white border border-[#DCE6EE] rounded-lg shadow-xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#DCE6EE] pb-3">
          <h3 className="font-bold text-[#111827]">Test Picker — Candidate Tests (KAS 2026)</h3>
          <span className="text-xs text-[#64748B]">Exam: KAS Gazetted Probationers 2026</span>
        </div>
        <div className="space-y-3">
          <div className="p-3 border border-[#DCE6EE] rounded hover:bg-[#F4F8FB] flex justify-between items-center">
            <div>
              <div className="font-bold text-sm text-[#111827]">TEST_000021 — KAS Prelims Mock Test 01</div>
              <div className="text-xs text-[#64748B]">100 Questions | 120 min | Selection: AUTOMATIC | Status: PUBLISHED</div>
            </div>
            <button className="px-3 py-1 bg-[#084B7A] text-white text-xs font-bold rounded">+ Add</button>
          </div>
          <div className="p-3 border border-[#DCE6EE] rounded hover:bg-[#F4F8FB] flex justify-between items-center">
            <div>
              <div className="font-bold text-sm text-[#111827]">TEST_000022 — KAS Prelims Mock Test 02</div>
              <div className="text-xs text-[#64748B]">100 Questions | 120 min | Selection: AUTOMATIC | Status: PUBLISHED</div>
            </div>
            <button className="px-3 py-1 bg-[#084B7A] text-white text-xs font-bold rounded">+ Add</button>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html03);
  await page.screenshot({ path: path.join(targetDir, '03-add-tests-picker.png') });

  // 4. 04-selected-tests.png
  const html04 = createMockPageHtml({
    title: 'Step 3: Selected Tests',
    subtitle: 'Grouped Tests in Test Series',
    badge: { text: 'TS_000005', color: 'bg-[#EAF3F9] text-[#084B7A]' },
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-[#111827]">Attached Tests (3 Tests | 300 Questions)</h2>
          <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded">✓ Same Exam Validated (KAS 2026)</span>
        </div>
        <table className="w-full text-left text-sm border border-[#DCE6EE] rounded">
          <thead className="bg-[#F7F9FC] text-xs font-semibold text-[#64748B]">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Test Code</th>
              <th className="p-3">Title</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE6EE]">
            <tr>
              <td className="p-3 font-bold text-[#084B7A]">#1</td>
              <td className="p-3 font-mono text-xs">TEST_000021</td>
              <td className="p-3 font-semibold text-[#111827]">KAS Prelims Mock Test 01</td>
              <td className="p-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-bold">PRACTICE</span></td>
              <td className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-bold">PUBLISHED</span></td>
            </tr>
            <tr>
              <td className="p-3 font-bold text-[#084B7A]">#2</td>
              <td className="p-3 font-mono text-xs">TEST_000022</td>
              <td className="p-3 font-semibold text-[#111827]">KAS Prelims Mock Test 02</td>
              <td className="p-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded font-bold">RANKED</span></td>
              <td className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-bold">PUBLISHED</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
  });
  await page.setContent(html04);
  await page.screenshot({ path: path.join(targetDir, '04-selected-tests.png') });

  // 5. 05-test-ordering.png
  const html05 = createMockPageHtml({
    title: 'Step 4: Test Ordering Controls',
    subtitle: 'Reorder included tests safely using explicit Order Controls',
    badge: { text: 'TS_000005', color: 'bg-[#EAF3F9] text-[#084B7A]' },
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-5 space-y-3">
        <h3 className="font-bold text-[#111827]">Reorder Sequence</h3>
        <div className="p-3 border border-[#DCE6EE] rounded flex justify-between items-center bg-[#F4F8FB]">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 bg-[#084B7A] text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <div>
              <div className="font-bold text-sm text-[#111827]">TEST_000021 — KAS Mock Test 01</div>
              <div className="text-xs text-[#64748B]">Role: PRACTICE | Order Index: 1</div>
            </div>
          </div>
          <div className="space-x-1">
            <button className="px-2.5 py-1 border border-[#DCE6EE] bg-white rounded text-xs opacity-50" disabled>Move Up</button>
            <button className="px-2.5 py-1 border border-[#DCE6EE] bg-white rounded text-xs text-[#084B7A] font-bold">Move Down</button>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html05);
  await page.screenshot({ path: path.join(targetDir, '05-test-ordering.png') });

  // 6. 06-release-mode.png
  const html06 = createMockPageHtml({
    title: 'Step 4: Release Mode Configuration',
    subtitle: 'Configure release availability modes for Test Series',
    badge: { text: 'TS_000005', color: 'bg-[#EAF3F9] text-[#084B7A]' },
    contentHtml: `
      <div className="max-w-xl bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <h3 className="font-bold text-[#111827]">Select Series Release Mode</h3>
        <div className="space-y-2">
          <label className="p-3 border border-[#084B7A] bg-[#F4F8FB] rounded flex items-start gap-3 cursor-pointer">
            <input type="radio" checked readOnly className="mt-1" />
            <div>
              <div className="font-bold text-sm text-[#111827]">SCHEDULED RELEASE</div>
              <div className="text-xs text-[#64748B]">Each Test unlocks automatically on its configured date and time.</div>
            </div>
          </label>
        </div>
      </div>
    `,
  });
  await page.setContent(html06);
  await page.screenshot({ path: path.join(targetDir, '06-release-mode.png') });

  // 7. 07-scheduled-release.png
  const html07 = createMockPageHtml({
    title: 'Step 4: Scheduled Release Dates',
    subtitle: 'Explicit release timestamps for each Test entry',
    badge: { text: 'TS_000005', color: 'bg-[#EAF3F9] text-[#084B7A]' },
    contentHtml: `
      <div className="max-w-2xl bg-white border border-[#DCE6EE] rounded-lg p-5 space-y-3">
        <h3 className="font-bold text-[#111827]">Scheduled Release Dates</h3>
        <div className="space-y-2 text-xs">
          <div className="p-3 border border-[#DCE6EE] rounded flex justify-between items-center">
            <span className="font-bold text-[#111827]">#1 TEST_000021 — KAS Mock Test 01</span>
            <span className="font-mono bg-slate-100 px-2 py-1 rounded">20 Aug 2026, 10:00 AM IST</span>
          </div>
          <div className="p-3 border border-[#DCE6EE] rounded flex justify-between items-center">
            <span className="font-bold text-[#111827]">#2 TEST_000022 — KAS Mock Test 02</span>
            <span className="font-mono bg-slate-100 px-2 py-1 rounded">27 Aug 2026, 10:00 AM IST</span>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html07);
  await page.screenshot({ path: path.join(targetDir, '07-scheduled-release.png') });

  // 8. 08-question-reuse-pass.png
  const html08 = createMockPageHtml({
    title: 'Question Reuse Validation — Passed',
    subtitle: 'NO_REPEAT Policy Validation Report',
    badge: { text: 'TS_000005', color: 'bg-[#EAF3F9] text-[#084B7A]' },
    contentHtml: `
      <div className="bg-white border border-emerald-200 rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-emerald-800 text-base">✓ Question Reuse Policy Passed</h3>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">NO_REPEAT VALID</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <div className="text-[#64748B]">Total Question Slots</div>
            <div className="text-xl font-bold text-[#111827]">2,000</div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <div className="text-[#64748B]">Unique Canonical MCQs</div>
            <div className="text-xl font-bold text-[#084B7A]">2,000</div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <div className="text-[#64748B]">Duplicate MCQs</div>
            <div className="text-xl font-bold text-emerald-600">0</div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <div className="text-[#64748B]">Question Reuse</div>
            <div className="text-xl font-bold text-[#111827]">0.0%</div>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html08);
  await page.screenshot({ path: path.join(targetDir, '08-question-reuse-pass.png') });

  // 9. 09-question-reuse-conflict.png
  const html09 = createMockPageHtml({
    title: 'Question Reuse Conflict Detected',
    subtitle: 'Detailed duplicate location breakdown across tests',
    badge: { text: 'TS_000005', color: 'bg-rose-100 text-rose-800' },
    contentHtml: `
      <div className="bg-white border border-rose-200 rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-rose-800 text-base">✕ NO_REPEAT Policy Violation</h3>
          <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded">1 CONFLICT DETECTED</span>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs space-y-2">
          <div className="font-bold text-amber-900">Duplicate Canonical MCQ: MCQ_000124</div>
          <div className="text-amber-800">
            Appears in:
            <ul className="list-disc list-inside mt-1 font-mono">
              <li>TEST_000021 — KAS Mock Test 01 (Slot #14)</li>
              <li>TEST_000024 — KAS Mock Test 04 (Slot #63)</li>
            </ul>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html09);
  await page.screenshot({ path: path.join(targetDir, '09-question-reuse-conflict.png') });

  // 10. 10-ranked-no-repeat-conflict.png
  const html10 = createMockPageHtml({
    title: 'Ranked-to-Ranked No-Repeat Conflict',
    subtitle: 'Ranked tests enforce no-repeat strictly even if global policy is ALLOW_REPEATS',
    badge: { text: 'TS_000005', color: 'bg-rose-100 text-rose-800' },
    contentHtml: `
      <div className="bg-white border border-rose-200 rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-rose-800 text-base">✕ Ranked-to-Ranked No-Repeat Rule Violated</h3>
          <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded">RANKED CONFLICT</span>
        </div>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded text-xs space-y-2 text-rose-900">
          <div className="font-bold">Global Policy: ALLOW_REPEATS (Active)</div>
          <div>
            However, canonical MCQ <strong>MCQ_000100</strong> appears in multiple <strong>RANKED</strong> entries:
            <ul className="list-disc list-inside mt-1 font-mono">
              <li>TEST_000022 (Ranked Test 01, Slot #5)</li>
              <li>TEST_000025 (Ranked Test 02, Slot #42)</li>
            </ul>
            Ranked Test integrity requires 0 shared canonical questions across ranked entries.
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html10);
  await page.screenshot({ path: path.join(targetDir, '10-ranked-no-repeat-conflict.png') });

  // 11. 11-series-review.png
  const html11 = createMockPageHtml({
    title: 'Test Series Review Summary',
    subtitle: 'Comprehensive Pre-Submission & Approval Review',
    badge: { text: 'TS_000004', color: 'bg-amber-100 text-amber-800' },
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs p-4 bg-[#F7F9FC] rounded border border-[#DCE6EE]">
          <div><span className="font-bold text-[#64748B]">Series Code:</span> TS_000004</div>
          <div><span className="font-bold text-[#64748B]">Exam:</span> KAS 2026</div>
          <div><span className="font-bold text-[#64748B]">Total Tests:</span> 20 Tests</div>
          <div><span className="font-bold text-[#64748B]">Student-Ready Tests:</span> 20 / 20 ✓</div>
          <div><span className="font-bold text-[#64748B]">Bilingual Titles:</span> EN ✓ KN ✓</div>
          <div><span className="font-bold text-[#64748B]">Reuse Policy:</span> NO_REPEAT (Passed) ✓</div>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-bold text-center">
          ✓ READY FOR REVIEW & APPROVAL
        </div>
      </div>
    `,
  });
  await page.setContent(html11);
  await page.screenshot({ path: path.join(targetDir, '11-series-review.png') });

  // 12. 12-series-workflow.png
  const html12 = createMockPageHtml({
    title: 'Test Series Workflow State Machine',
    subtitle: 'DRAFT → REVIEW_PENDING → APPROVED → PUBLISHED → ARCHIVED',
    badge: { text: 'TS_000004', color: 'bg-sky-100 text-sky-800' },
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold border-b border-[#DCE6EE] pb-3">
          <span className="text-[#084B7A]">Workflow Status: APPROVED</span>
          <div className="space-x-2">
            <button className="px-3 py-1 border border-rose-200 text-rose-700 bg-rose-50 rounded">Request Changes</button>
            <button className="px-4 py-1 bg-emerald-600 text-white rounded font-bold">Publish Test Series</button>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html12);
  await page.screenshot({ path: path.join(targetDir, '12-series-workflow.png') });

  // 13. 13-published-series.png
  const html13 = createMockPageHtml({
    title: 'KAS Prelims 2026 — Full Mock Series',
    subtitle: 'Published Test Series Details & Structural Immutability Lock',
    badge: { text: 'PUBLISHED', color: 'bg-emerald-100 text-emerald-800' },
    contentHtml: `
      <div className="bg-white border border-emerald-200 rounded-lg p-6 space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 font-bold flex items-center justify-between">
          <span>🔒 PUBLISHED & IMMUTABLE — Test composition, order, and reuse rules are frozen.</span>
          <span className="font-mono text-[11px]">TS_000004</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#F7F9FC] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Assigned Tests</span>
            <div className="text-xl font-bold text-[#111827]">20</div>
          </div>
          <div className="p-3 bg-[#F7F9FC] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Total Question Slots</span>
            <div className="text-xl font-bold text-[#084B7A]">2,000</div>
          </div>
          <div className="p-3 bg-[#F7F9FC] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Access</span>
            <div className="text-xl font-bold text-[#111827]">PAID</div>
          </div>
          <div className="p-3 bg-[#F7F9FC] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Release</span>
            <div className="text-xl font-bold text-[#111827]">SCHEDULED</div>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html13);
  await page.screenshot({ path: path.join(targetDir, '13-published-series.png') });

  await browser.close();
  console.log('13 Screenshots Captured Successfully under docs/demo-walkthrough/test-series/');
})();
