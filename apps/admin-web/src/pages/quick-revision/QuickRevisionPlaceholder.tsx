import React from 'react';
import { Card, EmptyState } from '@study-karnataka/ui';

interface QuickRevisionPlaceholderProps {
  title: string;
  description: string;
}

export const QuickRevisionPlaceholder: React.FC<QuickRevisionPlaceholderProps> = ({ title, description }) => {
  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Quick Revision Module</p>
        </div>
      </div>

      <Card style={{ padding: '48px', textAlign: 'center' }}>
        <EmptyState
          title={title}
          description={description}
        />
      </Card>
    </div>
  );
};
