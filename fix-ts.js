const fs = require('fs');

// InvoicesPage
let inv = fs.readFileSync('apps/admin-web/src/pages/subscriptions/InvoicesPage.tsx', 'utf8');
inv = inv.replace(/action=\{\s*<Button variant="outline" size="sm" onClick=\{handleResetFilters\}>\s*Clear Filters\s*<\/Button>\s*\}/, 'actionLabel="Clear Filters" onAction={handleResetFilters}');
fs.writeFileSync('apps/admin-web/src/pages/subscriptions/InvoicesPage.tsx', inv);

// StudentSubscriptionsPage
let ssp = fs.readFileSync('apps/admin-web/src/pages/subscriptions/StudentSubscriptionsPage.tsx', 'utf8');
ssp = ssp.replace(/import \{.*DollarSign.*?\} from 'lucide-react';/, match => match.replace(/DollarSign, |Package, |Layers, |FileText, |HelpCircle, |BookOpen, |Award, |Zap, |X, |ChevronRight, |AssignmentSource, /g, ''));
ssp = ssp.replace(/pb:/g, 'paddingBottom:');
ssp = ssp.replace(/const \[pageSize, setPageSize\] = useState\(10\);/, 'const [pageSize] = useState(10);');
ssp = ssp.replace(/const \[selectedIds, setSelectedIds\] = useState.*?new Set\(\)\);/, ''); // they are unused
fs.writeFileSync('apps/admin-web/src/pages/subscriptions/StudentSubscriptionsPage.tsx', ssp);

// AcademicCategoriesPage
let acp = fs.readFileSync('apps/admin-web/src/pages/taxonomy/AcademicCategoriesPage.tsx', 'utf8');
acp = acp.replace(/const handleToggleActive =[\s\S]*?;\n\s*\}/, ''); 
acp = acp.replace(/cat\.subcategoryCount/g, '(cat.subcategoryCount || 0)');
acp = acp.replace(/cat\.mcqCount/g, '((cat as any).mcqCount || 0)');
fs.writeFileSync('apps/admin-web/src/pages/taxonomy/AcademicCategoriesPage.tsx', acp);

// TestSeriesDetailPage
let tsd = fs.readFileSync('apps/admin-web/src/pages/test-series/TestSeriesDetailPage.tsx', 'utf8');
tsd = tsd.replace(/series\.examCycle/g, '(series as any).examCycle');
fs.writeFileSync('apps/admin-web/src/pages/test-series/TestSeriesDetailPage.tsx', tsd);

// TestSeriesListPage
let tsl = fs.readFileSync('apps/admin-web/src/pages/test-series/TestSeriesListPage.tsx', 'utf8');
tsl = tsl.replace(/import \{.*?\} from 'lucide-react';/, match => match.replace(/Send, |CheckCircle, |Edit3, /g, ''));
fs.writeFileSync('apps/admin-web/src/pages/test-series/TestSeriesListPage.tsx', tsl);
