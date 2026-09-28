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

let f1 = 'apps/admin-web/src/api/academic-stage.api.ts';
replaceRegex(f1, /ApiResponse,\s*/, '');

let f2 = 'apps/admin-web/src/App.tsx';
replaceRegex(f2, /import ExamStagesPage from '.*?';\n/, '');
replaceRegex(f2, /import StudyPlansPage from '.*?';\n/, '');
replaceRegex(f2, /import CurrentAffairsPage from '.*?';\n/, '');
replaceRegex(f2, /import QuickRevisionPage from '.*?';\n/, '');
replaceRegex(f2, /import ProductsPage from '.*?';\n/, '');
replaceRegex(f2, /const QuickRevisionPlaceholder[\s\S]*?;\n/, '');

let f3 = 'apps/admin-web/src/components/AdminLayout.tsx';
replaceRegex(f3, /Award,\s*/, '');
replaceRegex(f3, /SearchInput,\s*/, '');

let f4 = 'apps/admin-web/src/components/RichTextEditor.tsx';
replaceRegex(f4, /, placeholder/g, '');

let f5 = 'apps/admin-web/src/hooks/useStudents.ts';
replaceStr(f5, '(student: any)', '(_student: any)');
replaceStr(f5, '(id: string, updates: any)', '(_id: string, _updates: any)');
replaceStr(f5, '(id: string)', '(_id: string)');

let f6 = 'apps/admin-web/src/hooks/useTeam.ts';
replaceRegex(f6, /useEffect,\s*/, '');

let f7 = 'apps/admin-web/src/pages/auth/AdminActivatePage.tsx';
replaceStr(f7, "import { apiClient } from '../../utils/apiClient';", "import { apiClient } from '../../api/client';");
