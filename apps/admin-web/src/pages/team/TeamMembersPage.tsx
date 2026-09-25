import React from 'react';
import { PageHeader } from '@study-karnataka/ui';

export const TeamMembersPage: React.FC = () => {
  return (
    <div style={{ paddingBottom: '100px', width: '100%' }}>
      <PageHeader
        title="Team Members"
        subtitle="Manage and view team members"
        breadcrumbItems={[
          { label: 'Admin', href: '/' },
          { label: 'Team', href: '/team' },
          { label: 'Team Members' },
        ]}
      />
      <div>
        {/* Content will be added here later as per user request */}
      </div>
    </div>
  );
};
