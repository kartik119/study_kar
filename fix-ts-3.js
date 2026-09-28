const fs = require('fs');

function replaceStr(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
function replaceRegex(file, regex, replace) {
  let content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    content = content.replace(regex, replace);
    fs.writeFileSync(file, content);
    console.log('Fixed regex in', file);
  }
}

// 1. CreatePlanPage
replaceRegex('apps/admin-web/src/pages/study-plans/CreatePlanPage.tsx', /Badge,\s*/, '');
replaceRegex('apps/admin-web/src/pages/study-plans/CreatePlanPage.tsx', /Alert\s*/, '');
replaceRegex('apps/admin-web/src/pages/study-plans/CreatePlanPage.tsx', /User,\s*/, '');
replaceRegex('apps/admin-web/src/pages/study-plans/CreatePlanPage.tsx', /BookOpen,\s*/, '');
replaceRegex('apps/admin-web/src/pages/study-plans/CreatePlanPage.tsx', /Layers,\s*/, '');

// 2. PlannerRulesPage
replaceRegex('apps/admin-web/src/pages/study-plans/PlannerRulesPage.tsx', /Play,\s*/, '');
replaceStr('apps/admin-web/src/pages/study-plans/PlannerRulesPage.tsx', 'const navigate = useNavigate();', '');

// 3. StudyPlansOverviewPage
replaceRegex('apps/admin-web/src/pages/study-plans/StudyPlansOverviewPage.tsx', /Badge,\s*/, '');

// 4. CouponsPage
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /const \[pageSize, setPageSize\] = useState\(10\);/, 'const [pageSize] = useState(10);');
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /onChange=\{setSearchQuery\}/g, 'onChange={(e: any) => setSearchQuery(e.target ? e.target.value : e)}');
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /onChange=\{setStatusFilter\}/g, 'onChange={(e: any) => setStatusFilter(e.target ? e.target.value : e)}');
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /onChange=\{setTypeFilter\}/g, 'onChange={(e: any) => setTypeFilter(e.target ? e.target.value : e)}');
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /<Select\s+value=\{typeFilter\}\s+onChange=\{\(e: any\) => setTypeFilter\(e\.target \? e\.target\.value : e\)\}\s+options=\{\[\s+\{ value: 'all', label: 'All Types' \},[\s\S]*?\]\}\s+placeholder="Filter by type"\s+\/>/g, '<Select value={typeFilter} onChange={(e: any) => setTypeFilter(e.target ? e.target.value : e)} options={[{ value: "all", label: "All Types" }, { value: "PERCENTAGE", label: "Percentage" }, { value: "FIXED_AMOUNT", label: "Fixed Amount" }]} />');
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /placeholder="Filter by status"\s+\/>/g, '/>');
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /placeholder="Filter by type"\s+\/>/g, '/>');
replaceRegex('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /type: 'danger'/g, 'danger: true');

// 5. InvoicesPage
replaceRegex('apps/admin-web/src/pages/subscriptions/InvoicesPage.tsx', /BookOpen,\s*/, '');
replaceRegex('apps/admin-web/src/pages/subscriptions/InvoicesPage.tsx', /totalItems=\{totalInvoices\}/g, '');

// 6. StudentSubscriptionsPage
replaceRegex('apps/admin-web/src/pages/subscriptions/StudentSubscriptionsPage.tsx', /addsetAddAssignmentSource/g, 'setAddAssignmentSource');
replaceRegex('apps/admin-web/src/pages/subscriptions/StudentSubscriptionsPage.tsx', /addAssignmentSource/g, 'addAssignmentSource');

// 7. TransactionsPage
replaceRegex('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /ExternalLink,\s*/, '');
replaceRegex('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /onChange=\{setSearchQuery\}/g, 'onChange={(e: any) => setSearchQuery(e.target ? e.target.value : e)}');
replaceRegex('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /onChange=\{setStatusFilter\}/g, 'onChange={(e: any) => setStatusFilter(e.target ? e.target.value : e)}');
replaceRegex('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /onChange=\{setMethodFilter\}/g, 'onChange={(e: any) => setMethodFilter(e.target ? e.target.value : e)}');
replaceRegex('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /placeholder="Filter by status"\s+\/>/g, '/>');
replaceRegex('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /placeholder="Filter by method"\s+\/>/g, '/>');
replaceRegex('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /type: 'danger'/g, 'danger: true');

// 8. AcademicCategoriesPage
replaceRegex('apps/admin-web/src/pages/taxonomy/AcademicCategoriesPage.tsx', /const handleToggleActive =[\s\S]*?;\n\s*\}/, '');

console.log('Done');
