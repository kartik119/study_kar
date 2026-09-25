const fs = require('fs');
const file = 'apps/admin-web/src/pages/subscriptions/PaymentReportsPage.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const filtersStart = lines.findIndex(l => l.includes('{/* 1. Filters Card */}'));
if (filtersStart > -1) {
    const filtersLines = lines.splice(filtersStart, lines.length - filtersStart);
    
    let kpiStart = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('LEFT / MAIN DASHBOARD AREA')) {
            kpiStart = i + 3;
            break;
        }
    }
    
    if (kpiStart > -1) {
        lines.splice(kpiStart, 0, ...filtersLines);
    }
}

fs.writeFileSync(file, lines.join('\n'));
