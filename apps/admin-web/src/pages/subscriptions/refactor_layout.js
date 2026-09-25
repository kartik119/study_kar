const fs = require('fs');
const file = 'apps/admin-web/src/pages/subscriptions/PaymentReportsPage.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const filtersStart = lines.findIndex(l => l.includes('{/* 1. Filters Card */}'));
const insightsStart = lines.findIndex(l => l.includes('{/* 2. Key Insights Card */}'));
const recentTxnStart = lines.findIndex(l => l.includes('{/* Row 3: Recent Transactions (Last 10) Table */}'));

if (filtersStart === -1 || insightsStart === -1 || recentTxnStart === -1) {
  console.log('Could not find components.');
  process.exit(1);
}

// 1. Extract Key Insights Card block
let insightsEnd = insightsStart;
while (!lines[insightsEnd].includes('Not enough payment data') && insightsEnd < lines.length) {
  insightsEnd++;
}
// insightsEnd is now on 'Not enough payment data'.
// Go down to the closing div of the card.
insightsEnd += 3; 
const keyInsightsLines = lines.splice(insightsStart, insightsEnd - insightsStart + 1);

// 2. Extract Filters Card block
const filtersLines = lines.splice(filtersStart, insightsStart - filtersStart);

// 3. Remove the RIGHT SIDEBAR wrapper entirely.
let rightSidebarHeaderIdx = lines.findIndex(l => l.includes('RIGHT SIDEBAR'));
lines.splice(rightSidebarHeaderIdx - 1, 5);

// 4. Remove the Main Grid wrapper and Left Col wrapper
const mainGridOpenIdx = lines.findIndex(l => l.includes("gridTemplateColumns: 'minmax(0, 1fr) 260px'"));
if (mainGridOpenIdx > -1) {
  lines[mainGridOpenIdx - 1] = "        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}";
  lines[mainGridOpenIdx] = "";
  lines[mainGridOpenIdx + 1] = "";
  lines[mainGridOpenIdx + 2] = "";
}

const leftColStart = lines.findIndex(l => l.includes('LEFT / MAIN DASHBOARD AREA'));
if (leftColStart > -1) {
  lines[leftColStart + 3] = ''; // Remove Left Col open div
}

const newRecentTxnStart = lines.findIndex(l => l.includes('{/* Row 3: Recent Transactions'));
for (let i = newRecentTxnStart - 1; i >= newRecentTxnStart - 4; i--) {
  if (lines[i] && lines[i].includes('</div>')) {
    lines[i] = ''; 
  }
}

// 5. Insert Filters Card at the top
const kpiStart = lines.findIndex(l => l.includes('{/* 1. Four KPI Cards */}'));

const horizontalFilters = filtersLines.join('\n')
  .replace("flexDirection: 'column',", "flexWrap: 'wrap',")
  .replace("gap: '16px',", "gap: '16px', alignItems: 'center',")
  .replace("<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>", "<div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', flex: 1, alignItems: 'flex-end' }}>")
  .replace(/width: '100%'/g, "width: 'auto', minWidth: '140px'");

lines.splice(kpiStart, 0, horizontalFilters);

// 6. Insert Key Insights into Row 2
const row2Start = lines.findIndex(l => l.includes('Row 2: Revenue by Module'));
const row2GridIdx = row2Start + 3;
if (lines[row2GridIdx].includes('repeat(3')) {
  lines[row2GridIdx] = lines[row2GridIdx].replace('repeat(3', 'repeat(4');
}

const updatedRecentTxnStart = lines.findIndex(l => l.includes('{/* Row 3: Recent Transactions'));
lines.splice(updatedRecentTxnStart, 0, ...keyInsightsLines);

fs.writeFileSync(file, lines.join('\\n'));
console.log('Layout successfully refactored!');
