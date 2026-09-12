import React from 'react';
import { useLocation } from 'react-router-dom';
import { Layers, FileText, Globe, CheckSquare, History, Network } from 'lucide-react';

export const StudyMaterialsPlaceholder: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Study Materials Feature';
  let message = 'This feature is scheduled for a future development prompt.';
  let Icon = Layers;

  if (path.includes('subject-modules')) {
    title = 'Subject Modules';
    message = 'Subject Modules — Content Grouping Coming in Prompt 8';
    Icon = Layers;
  } else if (path.includes('revision-notes')) {
    title = 'Revision Notes';
    message = 'Revision Notes — Quick Study Summaries Coming in Prompt 8';
    Icon = FileText;
  } else if (path.includes('kannada-learning')) {
    title = 'Kannada Learning';
    message = 'Kannada Learning Resources Coming in Prompt 8';
    Icon = Globe;
  } else if (path.includes('review-queue')) {
    title = 'Content Review Queue';
    message = 'Content Review & Editorial Approval Queue Coming in Prompt 8';
    Icon = CheckSquare;
  } else if (path.includes('publication-history')) {
    title = 'Publication History';
    message = 'Content Publication & Revision History Coming in Prompt 8';
    Icon = History;
  } else if (path.includes('syllabus-mapping')) {
    title = 'Syllabus Mapping';
    message = 'Syllabus Mapping — Mapping Study Materials & MCQs to Exam Syllabus Nodes Coming in Prompt 10';
    Icon = Network;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-indigo-50 p-4 dark:bg-indigo-900/30">
        <Icon className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <div className="mt-6 rounded-lg bg-gray-100 px-4 py-2 text-xs font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        Path: {path}
      </div>
    </div>
  );
};
