import React from 'react';
import { PageHeader } from '@study-karnataka/ui';

export const RolesPermissionsPage: React.FC = () => {
  return (
    <div style={{ paddingBottom: '100px', width: '100%' }}>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage your roles here."
        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Team', href: '/team' },
          { label: 'Roles & Permissions' },
        ]}
      />
      <div style={{ marginTop: '24px', padding: '24px', backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <p>Awaiting new prompt for Roles & Permissions implementation.</p>
      </div>
    </div>
  );
};

export const WorkAssignmentsPage: React.FC = () => {
  return (
    <div style={{ paddingBottom: '100px', width: '100%' }}>
      <PageHeader
        title="Work Assignments"
        subtitle="Manage team assignments."
        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Team', href: '/team' },
          { label: 'Work Assignments' },
        ]}
      />
    </div>
  );
};

export const ActivityLogsPage: React.FC = () => {
  return (
    <div style={{ paddingBottom: '100px', width: '100%' }}>
      <PageHeader
        title="Activity Logs"
        subtitle="View team activity."
        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Team', href: '/team' },
          { label: 'Activity Logs' },
        ]}
      />
    </div>
  );
};
