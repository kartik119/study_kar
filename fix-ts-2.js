const fs = require('fs');

function replaceFile(path, replacer) {
  if (!fs.existsSync(path)) return;
  const content = fs.readFileSync(path, 'utf8');
  const newContent = replacer(content);
  if (content !== newContent) {
    fs.writeFileSync(path, newContent);
    console.log(`Updated ${path}`);
  }
}

// study-plans
replaceFile('apps/admin-web/src/pages/study-plans/CreatePlanPage.tsx', c => c.replace(/User, |BookOpen, |Layers, /g, ''));
replaceFile('apps/admin-web/src/pages/study-plans/PlannerRulesPage.tsx', c => c.replace(/Play, /g, '').replace(/const navigate = useNavigate\(\);\n/, ''));
replaceFile('apps/admin-web/src/pages/study-plans/StudyPlansOverviewPage.tsx', c => c.replace(/Badge, /g, ''));

// subscriptions - CouponsPage
replaceFile('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', c => {
  let text = c;
  text = text.replace(/const \[pageSize, setPageSize\] = useState\(10\);/, 'const [pageSize] = useState(10);');
  text = text.replace(/onChange=\{setSearchQuery\}/g, 'onChange={(e) => setSearchQuery(e.target.value)}');
  text = text.replace(/onChange=\{setStatusFilter\}/g, 'onChange={(e) => setStatusFilter(e.target.value)}');
  text = text.replace(/onChange=\{setTypeFilter\}/g, 'onChange={(e) => setTypeFilter(e.target.value)}');
  text = text.replace(/placeholder=.*?$/gm, (match) => match.includes('<Select') ? match.replace('placeholder', '// placeholder') : match);
  text = text.replace(/type:\s*'danger'/g, 'danger: true');
  return text;
});

// subscriptions - InvoicesPage
replaceFile('apps/admin-web/src/pages/subscriptions/InvoicesPage.tsx', c => {
  let text = c;
  text = text.replace(/BookOpen, /g, '');
  text = text.replace(/loading=\{/g, 'isLoading={');
  text = text.replace(/totalItems=\{totalInvoices\}/g, '');
  return text;
});

// subscriptions - StudentSubscriptionsPage
replaceFile('apps/admin-web/src/pages/subscriptions/StudentSubscriptionsPage.tsx', c => {
  let text = c;
  text = text.replace(/DollarSign, |Package, |Layers, |FileText, |HelpCircle, |BookOpen, |Award, |Zap, |X, |ChevronRight, |AssignmentSource, /g, '');
  text = text.replace(/pb:/g, 'paddingBottom:');
  text = text.replace(/const \[pageSize, setPageSize\] = useState\(10\);/, 'const [pageSize] = useState(10);');
  text = text.replace(/const \[selectedIds, setSelectedIds\] = useState.*?new Set\(\)\);/, '');
  return text;
});

// subscriptions - TransactionsPage
replaceFile('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', c => {
  let text = c;
  text = text.replace(/ExternalLink, /g, '');
  text = text.replace(/onChange=\{setSearchQuery\}/g, 'onChange={(e) => setSearchQuery(e.target.value)}');
  text = text.replace(/onChange=\{setStatusFilter\}/g, 'onChange={(e) => setStatusFilter(e.target.value)}');
  text = text.replace(/onChange=\{setMethodFilter\}/g, 'onChange={(e) => setMethodFilter(e.target.value)}');
  text = text.replace(/placeholder=.*?$/gm, (match) => match.includes('<Select') ? match.replace('placeholder', '// placeholder') : match);
  text = text.replace(/type:\s*'danger'/g, 'danger: true');
  return text;
});

// taxonomy - AcademicCategoriesPage
replaceFile('apps/admin-web/src/pages/taxonomy/AcademicCategoriesPage.tsx', c => {
  let text = c;
  text = text.replace(/const handleToggleActive =[\s\S]*?;\n\s*\}/, ''); 
  return text;
});

// TestSeriesListPage
replaceFile('apps/admin-web/src/pages/test-series/TestSeriesListPage.tsx', c => {
  return c.replace(/Send, |CheckCircle, |Edit3, /g, '');
});

// Remove placeholder from SelectProps usage in multiple places
const selectFixer = c => c.replace(/<Select([^>]*?)placeholder=(['"].*?['"])([^>]*?)>/g, '<Select$1$3>');
replaceFile('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', selectFixer);
replaceFile('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', selectFixer);
