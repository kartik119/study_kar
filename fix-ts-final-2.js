const fs = require('fs');

function replaceStr(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
  }
}
function replaceRegex(file, regex, replace) {
  let content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    content = content.replace(regex, replace);
    fs.writeFileSync(file, content);
  }
}

let f2 = 'apps/admin-web/src/App.tsx';
replaceRegex(f2, /import ExamStagesPage from '.*?';\n/, '');
replaceRegex(f2, /import StudyPlansPage from '.*?';\n/, '');
replaceRegex(f2, /import CurrentAffairsPage from '.*?';\n/, '');
replaceRegex(f2, /import QuickRevisionPage from '.*?';\n/, '');
replaceRegex(f2, /import ProductsPage from '.*?';\n/, '');
replaceRegex(f2, /const QuickRevisionPlaceholder[\s\S]*?;\n/, '');

let f5 = 'apps/admin-web/src/hooks/useStudents.ts';
replaceRegex(f5, /\(student: any\)/g, '(_student: any)');
replaceRegex(f5, /\(id: string, updates: any\)/g, '(_id: string, _updates: any)');
replaceRegex(f5, /\(id: string\)/g, '(_id: string)');

let f6 = 'apps/admin-web/src/hooks/useTeam.ts';
replaceRegex(f6, /useEffect,\s*/, '');

let f7 = 'apps/admin-web/src/pages/auth/AdminActivatePage.tsx';
let c7 = fs.readFileSync(f7, 'utf8');
c7 = c7.replace(/import \{ adminApiClient \} from '\.\.\/\.\.\/utils\/apiClient';\n/, '');
c7 = c7.replace(/await adminApiClient\.get\(\`\/auth\/admin\/validate-token\?token=\$\{token\}\`\);/, "await fetch(`/api/v1/admin/team/validate-activation?token=${token}`).then(res => { if (!res.ok) throw new Error('Invalid'); return res.json(); });");
c7 = c7.replace(/await adminApiClient\.post\('\/auth\/admin\/activate', \{ token, password \}\);/, "await fetch(`/api/v1/admin/team/activate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) }).then(res => { if (!res.ok) throw new Error('Invalid'); return res.json(); });");
fs.writeFileSync(f7, c7);

console.log('Fixed imports and fetch');
