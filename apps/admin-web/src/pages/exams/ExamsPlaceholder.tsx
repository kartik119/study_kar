import React from 'react';
import { EmptyState } from '@study-karnataka/ui';

interface Props {
  moduleName: string;
  nextPrompt: string;
}

export const ExamsPlaceholder: React.FC<Props> = ({ moduleName, nextPrompt }) => {
  const description =
    moduleName === 'Syllabus Mapping'
      ? 'Syllabus Mapping will be implemented after the related academic content modules are available.'
      : `The ${moduleName} configuration and mapping engine will be implemented in ${nextPrompt}. Core Exam Domain & Bilingual Records are active.`;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
      <EmptyState
        title={`${moduleName} Module — Planned Placeholder`}
        description={description}
        actionLabel="Go to All Exams"
        onAction={() => (window.location.href = '/exams')}
      />
    </div>
  );
};
