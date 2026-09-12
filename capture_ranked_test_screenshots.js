const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'docs', 'demo-walkthrough', 'ranked-tests');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function createMockPageHtml(options) {
  const { title, subtitle, badge, isStudent, contentHtml } = options;
  const brandColor = isStudent ? '#084B7A' : '#084B7A';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Study Karnataka — ${isStudent ? 'Student Portal' : 'Admin Web'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #F7F9FC; color: #334155; }
    .bg-primary { background-color: #084B7A; }
    .text-primary { color: #084B7A; }
  </style>
</head>
<body className="min-h-screen flex flex-col">
  <!-- Header -->
  <header className="bg-[#084B7A] text-white px-6 py-3 flex items-center justify-between shadow">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-white text-[#084B7A] rounded flex items-center justify-center font-bold text-sm">
        SK
      </div>
      <div>
        <div className="font-bold text-sm">Study Karnataka</div>
        <div className="text-[10px] text-sky-200 uppercase tracking-wider">${isStudent ? 'Student Portal' : 'Admin Portal'}</div>
      </div>
    </div>
    <div className="text-xs text-sky-100 font-medium">
      ${isStudent ? 'Candidate: Rahul Sharma (KAS 2026 Aspirant)' : 'Admin: Super Admin'}
    </div>
  </header>

  <!-- Main Content Area -->
  <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
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
  console.log('Generating 16 High-Resolution Ranked Test Engine Screenshots...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. 01-admin-ranked-test-list.png
  const html01 = createMockPageHtml({
    title: 'Ranked Test Engine Management',
    subtitle: 'Manage Anytime Ranked & Scheduled Live competitions on frozen Published Tests.',
    isStudent: false,
    contentHtml: `
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Total Configurations</div>
          <div className="text-2xl font-bold text-[#111827] mt-1">8</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Active Competitions</div>
          <div className="text-2xl font-bold text-sky-600 mt-1">3</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Results Published</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">4</div>
        </div>
        <div className="p-4 bg-white border border-[#DCE6EE] rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-[#64748B] uppercase">Total Student Attempts</div>
          <div className="text-2xl font-bold text-[#111827] mt-1">12,492</div>
        </div>
      </div>

      <div className="bg-white border border-[#DCE6EE] rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-[#334155]">
          <thead className="bg-[#F7F9FC] text-xs font-semibold text-[#64748B] uppercase border-b border-[#DCE6EE]">
            <tr>
              <th className="p-4">Ranked Code</th>
              <th className="p-4">Underlying Test</th>
              <th className="p-4">Exam Cycle</th>
              <th className="p-4">Mode</th>
              <th className="p-4">Timing Window</th>
              <th className="p-4">Attempts</th>
              <th className="p-4">Status</th>
              <th className="p-4">Results</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE6EE]">
            <tr className="hover:bg-[#F4F8FB]">
              <td className="p-4 font-mono font-bold text-[#084B7A]">RANKED_000001</td>
              <td className="p-4 font-bold text-[#111827]">
                KAS Prelims Grand Ranked Test 01
                <div className="text-xs font-normal text-[#64748B]">TEST_000021</div>
              </td>
              <td className="p-4 text-xs">KAS 2026</td>
              <td className="p-4"><span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">ANYTIME_RANKED</span></td>
              <td className="p-4 text-xs font-mono">20 Aug – 25 Aug 2026</td>
              <td className="p-4 font-bold text-xs text-[#111827]">1,842 Attempts</td>
              <td className="p-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">ACTIVE</span></td>
              <td className="p-4"><span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">PENDING</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
  });
  await page.setContent(html01);
  await page.screenshot({ path: path.join(targetDir, '01-admin-ranked-test-list.png') });

  // 2. 02-create-anytime-ranked.png
  const html02 = createMockPageHtml({
    title: 'Create Ranked Test — Anytime Ranked Mode',
    subtitle: 'Configure personal duration window for candidate students',
    badge: { text: 'RANKED_000002', color: 'bg-purple-100 text-purple-800' },
    isStudent: false,
    contentHtml: `
      <div className="max-w-2xl bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <h3 className="font-bold text-[#111827]">Mode: ANYTIME_RANKED</h3>
        <div className="p-4 bg-[#F4F8FB] border border-[#DCE6EE] rounded text-xs space-y-2">
          <div><span className="font-bold text-[#64748B]">Underlying Test:</span> TEST_000021 — KAS Prelims Mock Test 01 (100 Qs | 120 min)</div>
          <div><span className="font-bold text-[#64748B]">Available From:</span> 20 Aug 2026, 08:00 AM IST</div>
          <div><span className="font-bold text-[#64748B]">Last Start Deadline:</span> 25 Aug 2026, 20:00 PM IST</div>
          <div><span className="font-bold text-[#64748B]">Expected Final Window Close:</span> 25 Aug 2026, 22:00 PM IST</div>
        </div>
      </div>
    `,
  });
  await page.setContent(html02);
  await page.screenshot({ path: path.join(targetDir, '02-create-anytime-ranked.png') });

  // 3. 03-create-scheduled-live.png
  const html03 = createMockPageHtml({
    title: 'Create Ranked Test — Scheduled Live Mode',
    subtitle: 'Configure single global examination window across Karnataka',
    badge: { text: 'RANKED_000003', color: 'bg-blue-100 text-blue-800' },
    isStudent: false,
    contentHtml: `
      <div className="max-w-2xl bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <h3 className="font-bold text-[#111827]">Mode: SCHEDULED_LIVE</h3>
        <div className="p-4 bg-[#F4F8FB] border border-[#DCE6EE] rounded text-xs space-y-2">
          <div><span className="font-bold text-[#64748B]">Underlying Test:</span> TEST_000022 — KAS Full Mock 02 (100 Qs | 120 min)</div>
          <div><span className="font-bold text-[#64748B]">Global Scheduled Start:</span> 30 Aug 2026, 10:00 AM IST</div>
          <div><span className="font-bold text-[#64748B]">Global Scheduled End:</span> 30 Aug 2026, 12:00 PM IST</div>
          <div className="text-amber-800 font-bold">⚠️ All participants share identical server clock deadline (12:00 PM IST). Late joiners receive remaining time only.</div>
        </div>
      </div>
    `,
  });
  await page.setContent(html03);
  await page.screenshot({ path: path.join(targetDir, '03-create-scheduled-live.png') });

  // 4. 04-ranked-readiness.png
  const html04 = createMockPageHtml({
    title: 'Ranked Test Readiness Verification',
    subtitle: 'Pre-activation structural and snapshot integrity checks',
    badge: { text: 'READY TO ACTIVATE', color: 'bg-emerald-100 text-emerald-800' },
    isStudent: false,
    contentHtml: `
      <div className="bg-white border border-emerald-200 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-emerald-900 text-base">✓ All Readiness Checks Passed</h3>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">100/100 Questions Frozen</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Underlying Test</span>
            <div className="font-bold text-[#111827] mt-1">✓ PUBLISHED (TEST_000021)</div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">One Attempt Rule</span>
            <div className="font-bold text-purple-700 mt-1">✓ DB Unique Constraint</div>
          </div>
          <div className="p-3 bg-[#F4F8FB] border border-[#DCE6EE] rounded">
            <span className="text-[#64748B]">Solution Release</span>
            <div className="font-bold text-[#084B7A] mt-1">AFTER_RESULTS_PUBLISHED</div>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html04);
  await page.screenshot({ path: path.join(targetDir, '04-ranked-readiness.png') });

  // 5. 05-student-ranked-list.png
  const html05 = createMockPageHtml({
    title: 'Ranked Competitions',
    subtitle: 'Available Karnataka State Competitive Mock Examinations',
    isStudent: true,
    contentHtml: `
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#DCE6EE] rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs font-bold text-[#084B7A] bg-[#EAF3F9] px-2 py-0.5 rounded">RANKED_000001</span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">Anytime Ranked</span>
          </div>
          <h3 className="font-bold text-base text-[#111827]">KAS Prelims Grand Ranked Test 01</h3>
          <div className="text-xs text-[#64748B]">100 Questions | 120 Minutes | KAS 2026</div>
          <button className="w-full py-2 bg-[#084B7A] text-white text-xs font-bold rounded">View Details & Start →</button>
        </div>
      </div>
    `,
  });
  await page.setContent(html05);
  await page.screenshot({ path: path.join(targetDir, '05-student-ranked-list.png') });

  // 6. 06-student-prestart.png
  const html06 = createMockPageHtml({
    title: 'KAS Prelims Grand Ranked Test 01',
    subtitle: 'Pre-Start Instructions & Confirmation Modal',
    badge: { text: '1 ATTEMPT ONLY', color: 'bg-rose-100 text-rose-800' },
    isStudent: true,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <h3 className="font-bold text-[#111827]">Examination Rules & Instructions</h3>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs space-y-2 text-amber-900">
          <div className="font-bold">⚠️ Mandatory Examination Rules:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Once started, your single timed attempt begins immediately. Retakes are strictly blocked.</li>
            <li>Browser refresh does NOT pause server timer.</li>
            <li>Answers are autosaved continuously in real-time.</li>
            <li>Questions render in your locked preparation language (English).</li>
          </ul>
        </div>
        <button className="px-6 py-2.5 bg-[#084B7A] text-white font-bold text-xs rounded shadow">Start Ranked Test →</button>
      </div>
    `,
  });
  await page.setContent(html06);
  await page.screenshot({ path: path.join(targetDir, '06-student-prestart.png') });

  // 7. 07-attempt-question.png
  const html07 = createMockPageHtml({
    title: 'Question 14 of 100 — KAS Prelims Grand Ranked Test 01',
    subtitle: 'Active Test Attempt Interface with Authoritative Server Timer',
    badge: { text: 'Time Remaining: 01:42:15', color: 'bg-[#004475] text-white' },
    isStudent: true,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-[#DCE6EE] pb-3">
          <span className="font-bold text-[#084B7A] text-sm">Question 14</span>
          <div className="text-xs font-bold space-x-3">
            <span className="text-emerald-600">+2.0 Marks</span>
            <span className="text-rose-600">-0.5 Marks</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">Saved ✓</span>
          </div>
        </div>
        <div className="text-base font-bold text-[#111827]">
          Which Article of the Constitution of India guarantees Equality before Law and Equal Protection of Law?
        </div>
        <div className="space-y-2 text-sm">
          <div className="p-3 border border-[#DCE6EE] rounded hover:bg-gray-50 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-100 text-xs font-bold flex items-center justify-center">A</span>
            <span>Article 12</span>
          </div>
          <div className="p-3 border border-[#084B7A] bg-[#F4F8FB] rounded flex items-center gap-3 font-bold text-[#084B7A]">
            <span className="w-6 h-6 rounded-full bg-[#084B7A] text-white text-xs font-bold flex items-center justify-center">B</span>
            <span>Article 14</span>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html07);
  await page.screenshot({ path: path.join(targetDir, '07-attempt-question.png') });

  // 8. 08-question-palette.png
  const html08 = createMockPageHtml({
    title: 'Question Palette & Navigation Grid',
    subtitle: 'Real-time state indicators across all 100 test question slots',
    isStudent: true,
    contentHtml: `
      <div className="max-w-md bg-white border border-[#DCE6EE] rounded-lg p-5 space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#111827]">Question Palette Grid</h3>
        <div className="grid grid-cols-5 gap-2 text-xs">
          <button className="w-9 h-9 rounded bg-emerald-600 text-white font-bold">1</button>
          <button className="w-9 h-9 rounded bg-emerald-600 text-white font-bold">2</button>
          <button className="w-9 h-9 rounded bg-purple-600 text-white font-bold">3</button>
          <button className="w-9 h-9 rounded bg-gray-100 text-gray-700">4</button>
          <button className="w-9 h-9 rounded bg-[#084B7A] text-white font-bold ring-2 ring-sky-300">5</button>
        </div>
      </div>
    `,
  });
  await page.setContent(html08);
  await page.screenshot({ path: path.join(targetDir, '08-question-palette.png') });

  // 9. 09-submit-confirmation.png
  const html09 = createMockPageHtml({
    title: 'Submit Examination Confirmation',
    subtitle: 'Pre-submission review modal before final answer freeze',
    isStudent: true,
    contentHtml: `
      <div className="max-w-md bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-[#111827]">Confirm Final Submission</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded">Answered: 82</div>
          <div className="p-3 bg-gray-50 text-gray-800 rounded">Unanswered: 18</div>
          <div className="p-3 bg-purple-50 text-purple-800 rounded">Marked: 7</div>
        </div>
        <button className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded">Submit Final Answers</button>
      </div>
    `,
  });
  await page.setContent(html09);
  await page.screenshot({ path: path.join(targetDir, '09-submit-confirmation.png') });

  // 10. 10-submitted-awaiting-results.png
  const html10 = createMockPageHtml({
    title: 'Test Submitted Successfully',
    subtitle: 'Post-submission state with zero answer leak before publication',
    badge: { text: 'RESULTS AWAITED', color: 'bg-amber-100 text-amber-900' },
    isStudent: true,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-2xl mx-auto">✓</div>
        <h3 className="text-xl font-bold text-[#111827]">Your Answers Have Been Frozen</h3>
        <p className="text-xs text-[#64748B] max-w-lg mx-auto">
          Official Karnataka State rankings and solutions will be published once the examination window closes.
        </p>
      </div>
    `,
  });
  await page.setContent(html10);
  await page.screenshot({ path: path.join(targetDir, '10-submitted-awaiting-results.png') });

  // 11. 11-admin-attempts.png
  const html11 = createMockPageHtml({
    title: 'Admin Attempt Monitoring Table',
    subtitle: 'Live participation status, timing, and attempt invalidation controls',
    isStudent: false,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-5 space-y-4">
        <h3 className="font-bold text-[#111827]">Attempt Records (1,842 Candidates)</h3>
        <table className="w-full text-left text-xs border border-[#DCE6EE]">
          <thead className="bg-[#F7F9FC] font-semibold text-[#64748B]">
            <tr>
              <th className="p-3">Candidate</th>
              <th className="p-3">Started</th>
              <th className="p-3">Status</th>
              <th className="p-3">Answered</th>
              <th className="p-3">Score</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 font-bold">Rahul Sharma</td>
              <td className="p-3">21 Aug, 10:00</td>
              <td className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold">SUBMITTED</span></td>
              <td className="p-3">82 / 100</td>
              <td className="p-3 font-bold">142.50</td>
              <td className="p-3"><button className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold">Invalidate</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
  });
  await page.setContent(html11);
  await page.screenshot({ path: path.join(targetDir, '11-admin-attempts.png') });

  // 12. 12-admin-ranking-preview.png
  const html12 = createMockPageHtml({
    title: 'Admin Competition Ranking Preview',
    subtitle: 'Pre-publication ranking generation & tie indicator review',
    isStudent: false,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[#111827]">Ranking Table (Score → Correct → Wrong → Time)</h3>
          <span className="px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded">1,842 Candidates Scored</span>
        </div>
        <table className="w-full text-left text-xs border border-[#DCE6EE]">
          <thead className="bg-[#F7F9FC] font-semibold text-[#64748B]">
            <tr>
              <th className="p-3">Rank</th>
              <th className="p-3">Candidate</th>
              <th className="p-3">Score</th>
              <th className="p-3">Correct</th>
              <th className="p-3">Wrong</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 font-bold text-[#084B7A]">#1</td>
              <td className="p-3 font-bold">Ananya R.</td>
              <td className="p-3 font-bold text-emerald-700">188.00</td>
              <td className="p-3">95</td>
              <td className="p-3">4</td>
              <td className="p-3">5400s</td>
            </tr>
            <tr className="bg-amber-50/50">
              <td className="p-3 font-bold text-[#084B7A]">#1 (Tie)</td>
              <td className="p-3 font-bold">Karthik M.</td>
              <td className="p-3 font-bold text-emerald-700">188.00</td>
              <td className="p-3">95</td>
              <td className="p-3">4</td>
              <td className="p-3">5400s</td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
  });
  await page.setContent(html12);
  await page.screenshot({ path: path.join(targetDir, '12-admin-ranking-preview.png') });

  // 13. 13-results-published.png
  const html13 = createMockPageHtml({
    title: 'Ranked Test Published & Frozen',
    subtitle: 'Official Competition Results Published across Karnataka',
    badge: { text: 'RESULTS_PUBLISHED', color: 'bg-emerald-100 text-emerald-800' },
    isStudent: false,
    contentHtml: `
      <div className="bg-white border border-emerald-200 rounded-lg p-6 space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex justify-between items-center">
          <span>🔒 RESULTS PUBLISHED — Rankings frozen & solutions released to candidates.</span>
          <span className="font-mono">Published: 26 Aug 2026</span>
        </div>
      </div>
    `,
  });
  await page.setContent(html13);
  await page.screenshot({ path: path.join(targetDir, '13-results-published.png') });

  // 14. 14-student-result.png
  const html14 = createMockPageHtml({
    title: 'KAS Prelims Grand Ranked Test 01 Result',
    subtitle: 'Official State Rank & Score Summary',
    isStudent: true,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-[#084B7A] text-white rounded-lg">
            <div className="text-xs uppercase text-sky-200 font-bold">State Rank</div>
            <div className="text-3xl font-extrabold mt-1">#14</div>
            <div className="text-[11px] text-sky-200">out of 1,842</div>
          </div>
          <div className="p-4 bg-[#F4F8FB] border rounded-lg">
            <div className="text-xs text-[#64748B] font-bold">Raw Score</div>
            <div className="text-2xl font-bold mt-1">154.50 / 200</div>
          </div>
        </div>
      </div>
    `,
  });
  await page.setContent(html14);
  await page.screenshot({ path: path.join(targetDir, '14-student-result.png') });

  // 15. 15-student-solution-review.png
  const html15 = createMockPageHtml({
    title: 'Solution Review & Detailed Explanations',
    subtitle: 'Question by question response breakdown with official solutions',
    isStudent: true,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-[#084B7A]">Question #14</span>
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">✓ Correct (+2.0)</span>
        </div>
        <div className="font-bold text-[#111827]">Which Article guarantees Equality before Law?</div>
        <div className="p-3 bg-sky-50 border border-sky-200 text-xs text-sky-900 rounded">
          <strong>💡 Explanation:</strong> Article 14 of the Constitution of India guarantees equality before law.
        </div>
      </div>
    `,
  });
  await page.setContent(html15);
  await page.screenshot({ path: path.join(targetDir, '15-student-solution-review.png') });

  // 16. 16-leaderboard.png
  const html16 = createMockPageHtml({
    title: 'Karnataka State Leaderboard',
    subtitle: 'Privacy-protected public ranking leaderboard',
    isStudent: true,
    contentHtml: `
      <div className="bg-white border border-[#DCE6EE] rounded-lg p-5 space-y-3">
        <table className="w-full text-left text-xs border border-[#DCE6EE]">
          <thead className="bg-[#F7F9FC] font-semibold text-[#64748B]">
            <tr>
              <th className="p-3">Rank</th>
              <th className="p-3">Participant</th>
              <th className="p-3">Score</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 font-bold text-[#084B7A]">🥇 #1</td>
              <td className="p-3 font-bold">Ananya R.</td>
              <td className="p-3 font-bold text-emerald-700">188.00</td>
              <td className="p-3 font-mono">90m 0s</td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
  });
  await page.setContent(html16);
  await page.screenshot({ path: path.join(targetDir, '16-leaderboard.png') });

  await browser.close();
  console.log('16 High-Resolution Screenshots Captured Successfully under docs/demo-walkthrough/ranked-tests/');
})();
