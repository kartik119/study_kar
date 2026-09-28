const fs = require('fs');

function safeReplace(file, regex, replacer) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    fs.writeFileSync(file, content.replace(regex, replacer));
  }
}

let f = 'apps/admin-web/src/pages/subscriptions/StudentSubscriptionsPage.tsx';
safeReplace(f, /import \{.*DollarSign.*?\} from 'lucide-react';/, (m) => m.replace(/DollarSign, |Package, |Layers, |FileText, |HelpCircle, |BookOpen, |Award, |Zap, |X, |ChevronRight, |AssignmentSource, /g, ''));
safeReplace(f, /const \[pageSize, setPageSize\] = useState\(10\);/, 'const [pageSize] = useState(10);');
safeReplace(f, /const \[selectedIds, setSelectedIds\] = useState<Set<string>>\(new Set\(\)\);/, '');
safeReplace(f, /pb:/g, 'paddingBottom:');

let f2 = 'apps/admin-web/src/pages/study-plans/CreatePlanPage.tsx';
safeReplace(f2, /Badge,\s*/, '');
safeReplace(f2, /Alert\s*/, '');
safeReplace(f2, /User,\s*/, '');
safeReplace(f2, /BookOpen,\s*/, '');
safeReplace(f2, /Layers,\s*/, '');

let f3 = 'apps/admin-web/src/pages/study-plans/PlannerRulesPage.tsx';
safeReplace(f3, /Play,\s*/, '');
safeReplace(f3, /const navigate = useNavigate\(\);\n/, '');

let f4 = 'apps/admin-web/src/pages/study-plans/StudyPlansOverviewPage.tsx';
safeReplace(f4, /Badge,\s*/, '');
