const fs = require('fs');

function safeReplace(file, regex, replacer) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    fs.writeFileSync(file, content.replace(regex, replacer));
  }
}

// CouponsPage
safeReplace('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /onChange=\{setSearchQuery\}/g, 'onChange={(e: any) => setSearchQuery(e?.target?.value ?? e)}');
safeReplace('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /onChange=\{setStatusFilter\}/g, 'onChange={(e: any) => setStatusFilter(e?.target?.value ?? e)}');
safeReplace('apps/admin-web/src/pages/subscriptions/CouponsPage.tsx', /onChange=\{setTypeFilter\}/g, 'onChange={(e: any) => setTypeFilter(e?.target?.value ?? e)}');

// TransactionsPage
safeReplace('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /onChange=\{setSearchQuery\}/g, 'onChange={(e: any) => setSearchQuery(e?.target?.value ?? e)}');
safeReplace('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /onChange=\{setStatusFilter\}/g, 'onChange={(e: any) => setStatusFilter(e?.target?.value ?? e)}');
safeReplace('apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx', /onChange=\{setMethodFilter\}/g, 'onChange={(e: any) => setMethodFilter(e?.target?.value ?? e)}');

// StudentSubscriptionsPage
// Fix addsetAddAssignmentSource typo and missing 'String' call signatures (this is where `const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());` was removed so selectedIds became string? No.
// Let's just fix the StudentSubscriptionsPage by restoring it from git and then purely applying the unused icon removals, and the paddingBottom instead of pb.
