import React from 'react';
import { Card, EmptyState } from '@study-karnataka/ui';

export const CompletionTrackingPage: React.FC = () => {
  return (
    <div style={{ padding: '8px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Completion Tracking</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Monitor student progress on their active plans.</p>
        </div>
      </div>

      <Card style={{ padding: '48px', textAlign: 'center' }}>
        <EmptyState
          title="Tracking Module Upcoming (Phase 2)"
          description="The granular day-by-day task tracking and analytics module will be introduced in the next phase of the Study Plan system."
        />
      </Card>
    </div>
  );
};
