import React from 'react';
import { PageHeader } from '@study-karnataka/ui';

export const RolesPermissionsPage: React.FC = () => {
  return (
    <div style={{ paddingBottom: '100px', width: '100%' }}>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage staff roles, define module permissions and control how team members can access Study Karnataka."
        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Team', href: '/team' },
          { label: 'Roles & Permissions' },
        ]}
      />
      <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', marginTop: '24px' }}>
        <h3>Awaiting new prompt for Roles & Permissions implementation.</h3>
      </div>
    </div>
  );
};
