const fs = require('fs');
let content = fs.readFileSync('apps/admin-web/src/components/AdminLayout.tsx', 'utf8');

if (!content.includes('Briefcase')) {
  content = content.replace('UserCheck,', 'UserCheck, Shield, Briefcase, History,');
}

const teamSubmenuStr = `export const TEAM_SUBMENU: Array<{
  name: string;
  path: string;
  icon: React.ElementType;
  permission: PermissionKey;
}> = [
  { name: 'Team Members', path: '/team/members', icon: Users, permission: 'team.view' as PermissionKey },
  { name: 'Roles & Permissions', path: '/team/roles-permissions', icon: Shield, permission: 'team.manage' as PermissionKey },
  { name: 'Work Assignments', path: '/team/work-assignments', icon: Briefcase, permission: 'team.manage' as PermissionKey },
  { name: 'Activity Logs', path: '/team/activity-logs', icon: History, permission: 'team.view' as PermissionKey },
];

`;

if (!content.includes('TEAM_SUBMENU')) {
  content = content.replace('export const ALL_ADMIN_MENU_ITEMS', teamSubmenuStr + 'export const ALL_ADMIN_MENU_ITEMS');
}

content = content.replace(/{ name: 'Team', path: '\/team', icon: UserCheck, permission: 'team.view' },/g, `{ 
    name: 'Team', 
    path: '/team', 
    icon: UserCheck, 
    permission: 'team.view',
    subItems: TEAM_SUBMENU,
  },`);

fs.writeFileSync('apps/admin-web/src/components/AdminLayout.tsx', content);
console.log('Updated AdminLayout');
