const fs = require('fs');

function fixCoupons() {
  let file = 'apps/admin-web/src/pages/subscriptions/CouponsPage.tsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/onChange=\{setSearchQuery\}/g, 'onChange={(e: any) => setSearchQuery(e.target ? e.target.value : e)}');
  c = c.replace(/onChange=\{setStatusFilter\}/g, 'onChange={(e: any) => setStatusFilter(e.target ? e.target.value : e)}');
  c = c.replace(/onChange=\{setTypeFilter\}/g, 'onChange={(e: any) => setTypeFilter(e.target ? e.target.value : e)}');
  c = c.replace(/type:\s*'danger'/g, 'danger: true');
  c = c.replace(/placeholder="Filter by status"/g, '');
  c = c.replace(/placeholder="Filter by type"/g, '');
  fs.writeFileSync(file, c);
}
fixCoupons();

function fixInvoices() {
  let file = 'apps/admin-web/src/pages/subscriptions/InvoicesPage.tsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/totalItems=\{totalInvoices\}/g, '');
  fs.writeFileSync(file, c);
}
fixInvoices();

function fixTransactions() {
  let file = 'apps/admin-web/src/pages/subscriptions/TransactionsPage.tsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/type:\s*'danger'/g, 'danger: true');
  c = c.replace(/onChange=\{setSearchQuery\}/g, 'onChange={(e: any) => setSearchQuery(e.target ? e.target.value : e)}');
  c = c.replace(/onChange=\{setStatusFilter\}/g, 'onChange={(e: any) => setStatusFilter(e.target ? e.target.value : e)}');
  c = c.replace(/onChange=\{setMethodFilter\}/g, 'onChange={(e: any) => setMethodFilter(e.target ? e.target.value : e)}');
  c = c.replace(/placeholder="Filter by status"/g, '');
  c = c.replace(/placeholder="Filter by method"/g, '');
  fs.writeFileSync(file, c);
}
fixTransactions();
