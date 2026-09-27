const fs = require('fs');
let content = fs.readFileSync('apps/admin-web/src/App.tsx', 'utf8');

const newImports = `
import { TeamMembersPage } from './pages/team/TeamMembersPage';
import { RolesPermissionsPage, WorkAssignmentsPage, ActivityLogsPage } from './pages/team/TeamPlaceholders';
`;

content = content.replace("import {\r\n  DashboardPage,", newImports + "\r\nimport {\r\n  DashboardPage,");
content = content.replace("  TeamPage,\r\n", "");

const newRoutes = `
        <Route path="team">
          <Route index element={<Navigate to="members" replace />} />
          <Route path="members" element={<TeamMembersPage />} />
          <Route path="roles-permissions" element={<RolesPermissionsPage />} />
          <Route path="work-assignments" element={<WorkAssignmentsPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
        </Route>
`;

content = content.replace('<Route path="team" element={<TeamPage />} />', newRoutes);

fs.writeFileSync('apps/admin-web/src/App.tsx', content);
console.log('App.tsx updated');
