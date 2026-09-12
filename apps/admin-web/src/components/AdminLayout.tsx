import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  HelpCircle,
  CalendarCheck,
  Users,
  Newspaper,
  Zap,
  CreditCard,
  UserCheck,
  LifeBuoy,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Bell,
  HelpCircle as HelpIcon,
  PlusCircle,
  ListTree,
  FolderTree,
  UploadCloud,
  Layers,
  Award,
  FileText,
} from 'lucide-react';
import { SearchInput, DropdownMenu } from '@study-karnataka/ui';
import { PermissionKey } from '@study-karnataka/shared-types';
import './AdminLayout.css';

export interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionKey;
  subItems?: Array<{
    name: string;
    path: string;
    icon?: React.ComponentType<{ className?: string }>;
    permission?: PermissionKey;
  }>;
}

export const EXAM_SUBMENU = [
  { name: 'All Exams', path: '/exams', icon: GraduationCap, permission: 'exams.view' as PermissionKey },
  { name: 'Add Exam', path: '/exams/new', icon: PlusCircle, permission: 'exams.create' as PermissionKey },
  { name: 'Exam Stages', path: '/exams/pattern', icon: Layers, permission: 'exams.view' as PermissionKey },
  { name: 'Exam Syllabus', path: '/exams/syllabus', icon: ListTree, permission: 'exams.view' as PermissionKey },
];

export const STUDY_MATERIALS_SUBMENU = [
  { name: 'All Content', path: '/study-materials', icon: BookOpen, permission: 'study_materials.view' as PermissionKey },
  { name: 'Add Content', path: '/study-materials/new', icon: PlusCircle, permission: 'study_materials.create' as PermissionKey },
  { name: 'Categories', path: '/study-materials/categories', icon: FolderTree, permission: 'academic_taxonomy.manage' as PermissionKey },
];

export const MCQ_SUBMENU = [
  { name: 'Question Library', path: '/mcq-library', icon: HelpCircle, permission: 'mcq_tests.view' as PermissionKey },
  { name: 'Categories', path: '/mcq-library/categories', icon: FolderTree, permission: 'academic_taxonomy.manage' as PermissionKey },
  { name: 'Add MCQ', path: '/mcq-library/new', icon: PlusCircle, permission: 'mcq.create' as PermissionKey },
  { name: 'Bulk Import', path: '/mcq-library/bulk-import', icon: UploadCloud, permission: 'mcq.create' as PermissionKey },
  { name: 'Mock Tests', path: '/mcq-library/tests', icon: BookOpen, permission: 'tests.view' as PermissionKey },
  { name: 'Create Test', path: '/mcq-library/tests/new', icon: PlusCircle, permission: 'tests.create' as PermissionKey },
  { name: 'Test Series', path: '/mcq-library/test-series', icon: Layers, permission: 'test_series.view' as PermissionKey },
  { name: 'Topic Practice Config', path: '/mcq-library/topic-practice', icon: Settings, permission: 'mcq_tests.manage' as PermissionKey },
];

export const CURRENT_AFFAIRS_SUBMENU = [
  { name: 'Dashboard', path: '/current-affairs/dashboard', icon: Newspaper, permission: 'current_affairs.view' as PermissionKey },
  { name: 'All Articles', path: '/current-affairs/list', icon: BookOpen, permission: 'current_affairs.view' as PermissionKey },
  { name: 'Add Article', path: '/current-affairs/new', icon: PlusCircle, permission: 'current_affairs.create' as PermissionKey },
  { name: 'Monthly Archive', path: '/current-affairs/monthly-archive', icon: CalendarCheck, permission: 'current_affairs.view' as PermissionKey },
];

export const ALL_ADMIN_MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard.view' },
  {
    name: 'Exams',
    path: '/exams',
    icon: GraduationCap,
    permission: 'exams.view',
    subItems: EXAM_SUBMENU,
  },
  {
    name: 'Study Materials',
    path: '/study-materials',
    icon: BookOpen,
    permission: 'study_materials.view',
    subItems: STUDY_MATERIALS_SUBMENU,
  },
  {
    name: 'MCQ Library & Tests',
    path: '/mcq-library',
    icon: HelpCircle,
    permission: 'mcq_tests.view',
    subItems: MCQ_SUBMENU,
  },
  { name: 'Study Plans', path: '/study-plans', icon: CalendarCheck, permission: 'study_plans.view' },
  { name: 'Students', path: '/students', icon: Users, permission: 'students.view' },
  { 
    name: 'Current Affairs', 
    path: '/current-affairs', 
    icon: Newspaper, 
    permission: 'current_affairs.view',
    subItems: CURRENT_AFFAIRS_SUBMENU,
  },
  { name: 'Quick Revision', path: '/quick-revision', icon: Zap, permission: 'quick_revision.view' },
  { name: 'Subscriptions & Payments', path: '/subscriptions', icon: CreditCard, permission: 'subscriptions_payments.view' },
  { name: 'Team', path: '/team', icon: UserCheck, permission: 'team.view' },
  { name: 'Support', path: '/support', icon: LifeBuoy, permission: 'support.view' },
  { name: 'Settings', path: '/settings', icon: Settings, permission: 'settings.view' },
];

export const ADMIN_MENU_ITEMS = ALL_ADMIN_MENU_ITEMS;

export const AdminLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [manualExamsOpen, setManualExamsOpen] = useState<boolean | null>(null);
  const [manualStudyMaterialsOpen, setManualStudyMaterialsOpen] = useState<boolean | null>(null);
  const [manualMcqOpen, setManualMcqOpen] = useState<boolean | null>(null);
  const [manualCurrentAffairsOpen, setManualCurrentAffairsOpen] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isExamsActive = location.pathname.startsWith('/exams');
  const isStudyMaterialsActive = location.pathname.startsWith('/study-materials');
  const isMcqActive = location.pathname.startsWith('/mcq-library');
  const isCurrentAffairsActive = location.pathname.startsWith('/current-affairs');

  const isExamsOpen = manualExamsOpen !== null ? manualExamsOpen : isExamsActive;
  const isStudyMaterialsOpen = manualStudyMaterialsOpen !== null ? manualStudyMaterialsOpen : isStudyMaterialsActive;
  const isMcqOpen = manualMcqOpen !== null ? manualMcqOpen : isMcqActive;
  const isCurrentAffairsOpen = manualCurrentAffairsOpen !== null ? manualCurrentAffairsOpen : isCurrentAffairsActive;

  // Load user from localStorage
  const storedUserRaw = localStorage.getItem('admin_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const userPermissions: PermissionKey[] = user?.permissions || [];
  const userRoles: string[] = user?.roles || ['Super Admin'];

  const isSuperAdmin = userRoles.includes('Super Admin');

  const hasPermission = (perm?: PermissionKey) => {
    if (isSuperAdmin || !perm) return true;
    return userPermissions.includes(perm);
  };

  // Filter sidebar items by user permissions
  const visibleMenuItems = ALL_ADMIN_MENU_ITEMS.filter((item) => hasPermission(item.permission));

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
        aria-label="Admin Navigation Shell"
      >
        <div className="sidebar-header">
          <div className="brand-title">
            <img
              src="/branding/study-karnataka-logo.png"
              alt="Study Karnataka"
              className="brand-logo-expanded"
            />
            <img
              src="/branding/study-karnataka-mark.png"
              alt="Study Karnataka"
              className="brand-logo-collapsed"
            />
          </div>
          <button
            className="toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="nav-icon" /> : <ChevronLeft className="nav-icon" />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
            const isItemActive = location.pathname.startsWith(item.path);

            if (hasSubItems && !isCollapsed) {
              const visibleSubItems = item.subItems?.filter((sub) => hasPermission(sub.permission)) || [];
              const isOpen =
                item.name === 'Exams'
                  ? isExamsOpen
                  : item.name === 'Study Materials'
                  ? isStudyMaterialsOpen
                  : item.name === 'MCQ Library & Tests'
                  ? isMcqOpen
                  : item.name === 'Current Affairs'
                  ? isCurrentAffairsOpen
                  : true;

              const toggleOpen = () => {
                if (item.name === 'Exams') {
                  const nextState = !isExamsOpen;
                  setManualExamsOpen(nextState);
                  if (nextState) {
                    setManualStudyMaterialsOpen(false);
                    setManualMcqOpen(false);
                    setManualCurrentAffairsOpen(false);
                  }
                } else if (item.name === 'Study Materials') {
                  const nextState = !isStudyMaterialsOpen;
                  setManualStudyMaterialsOpen(nextState);
                  if (nextState) {
                    setManualExamsOpen(false);
                    setManualMcqOpen(false);
                    setManualCurrentAffairsOpen(false);
                  }
                } else if (item.name === 'MCQ Library & Tests') {
                  const nextState = !isMcqOpen;
                  setManualMcqOpen(nextState);
                  if (nextState) {
                    setManualExamsOpen(false);
                    setManualStudyMaterialsOpen(false);
                    setManualCurrentAffairsOpen(false);
                  }
                } else if (item.name === 'Current Affairs') {
                  const nextState = !isCurrentAffairsOpen;
                  setManualCurrentAffairsOpen(nextState);
                  if (nextState) {
                    setManualExamsOpen(false);
                    setManualStudyMaterialsOpen(false);
                    setManualMcqOpen(false);
                  }
                }
              };

              return (
                <div key={item.path} className="nav-group">
                  <div
                    className={`nav-item ${isItemActive ? 'active' : ''}`}
                    onClick={toggleOpen}
                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon className="nav-icon" />
                      <span className="nav-text">{item.name}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>

                  {isOpen && (
                    <div className="nav-submenu" style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {visibleSubItems.map((sub) => {
                        const SubIcon = sub.icon || BookOpen;
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            end={sub.path === '/exams' || sub.path === '/study-materials'}
                            className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
                            style={{ fontSize: '13px', padding: '6px 12px' }}
                            onClick={() => setIsMobileOpen(false)}
                          >
                            <SubIcon size={14} className="nav-icon" />
                            <span className="nav-text">{sub.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-tooltip={item.name}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="nav-icon" />
                <span className="nav-text">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <div className={`admin-main ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar Header */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileOpen ? <X /> : <Menu />}
            </button>
          </div>

          <div className="topbar-right">
            <button className="header-action-btn" title="Help & Support">
              <HelpIcon size={18} />
            </button>

            <button className="header-action-btn" title="Notifications">
              <Bell size={18} />
              <span className="notification-badge" />
            </button>

            <DropdownMenu
              trigger={
                <div className="user-profile">
                  <div className="user-avatar">
                    {user?.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'SA'}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user?.fullName || 'Super Admin'}</span>
                    <span className="user-role">{userRoles[0] || 'Administrator'}</span>
                  </div>
                </div>
              }
              items={[
                { label: `Logged in as: ${user?.email || 'admin@studykarnataka.com'}`, onClick: () => {} },
                { label: 'Role & Permissions', onClick: () => {} },
                { label: 'Sign Out', onClick: handleLogout, danger: true },
              ]}
            />
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
