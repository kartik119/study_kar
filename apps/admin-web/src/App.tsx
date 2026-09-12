import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminLogin } from './pages/AdminLogin';
import { ExamsList } from './pages/exams/ExamsList';
import { ExamForm } from './pages/exams/ExamForm';
import { ExamDetail } from './pages/exams/ExamDetail';
import { ExamStagesPage } from './pages/exams/ExamStagesPage';
import { ExamStagesBuilderPage } from './pages/exams/ExamStagesBuilderPage';
import { ExamSyllabusPage } from './pages/exams/ExamSyllabusPage';
import { ExamAnalyticsPage } from './pages/exams/ExamAnalyticsPage';
import { ExamReadinessDetailPage } from './pages/exams/ExamReadinessDetailPage';
import { AcademicCategoriesPage } from './pages/taxonomy/AcademicCategoriesPage';
import { AcademicSubcategoriesPage } from './pages/taxonomy/AcademicSubcategoriesPage';
import { AllContentPage } from './pages/study-materials/AllContentPage';
import { StudyMaterialFormPage } from './pages/study-materials/StudyMaterialFormPage';
import { StudyMaterialStagesPage } from './pages/study-materials/StudyMaterialStagesPage';
import { StudyMaterialDetailPage } from './pages/study-materials/StudyMaterialDetailPage';
import { ReviewQueuePage } from './pages/study-materials/ReviewQueuePage';
import { ReviewScreenPage } from './pages/study-materials/ReviewScreenPage';
import { InternalPreviewPage } from './pages/study-materials/InternalPreviewPage';
import { StudyMaterialsPlaceholder } from './pages/study-materials/StudyMaterialsPlaceholder';
import { McqLibraryPage } from './pages/mcq/McqLibraryPage';
import { McqFormPage } from './pages/mcq/McqFormPage';
import { McqBulkImportPage } from './pages/mcq/McqBulkImportPage';
import { TestListPage } from './pages/mcq/TestListPage';
import { TestFormPage } from './pages/mcq/TestFormPage';
import { TestSeriesListPage } from './pages/test-series/TestSeriesListPage';
import { CreateTestSeriesPage } from './pages/test-series/CreateTestSeriesPage';
import { TestSeriesDetailPage } from './pages/test-series/TestSeriesDetailPage';
import { RankedTestListPage } from './pages/ranked-tests/RankedTestListPage';
import { CreateRankedTestPage } from './pages/ranked-tests/CreateRankedTestPage';
import { RankedTestDetailPage } from './pages/ranked-tests/RankedTestDetailPage';
import { AdminTopicPracticeConfigPage } from './pages/mcq/AdminTopicPracticeConfigPage';
import { AdminPerformanceAnalyticsPage } from './pages/students/AdminPerformanceAnalyticsPage';
import {
  DashboardPage,
  StudyPlansPage,
  CurrentAffairsPage,
  QuickRevisionPage,
  SubscriptionsPage,
  TeamPage,
  SupportPage,
  SettingsPage,
  NotFoundPage,
} from './pages/PlaceholderPages';
import { StudentsListPage } from './pages/students/StudentsListPage';
import { CurrentAffairsListPage } from './pages/current-affairs/CurrentAffairsListPage';
import { AddCurrentAffairPage } from './pages/current-affairs/AddCurrentAffairPage';
import { CurrentAffairsDashboardPage } from './pages/current-affairs/CurrentAffairsDashboardPage';
import { CurrentAffairsCalendarPage } from './pages/current-affairs/CurrentAffairsCalendarPage';
import { CurrentAffairsPdfPage } from './pages/current-affairs/CurrentAffairsPdfPage';
import { CurrentAffairsQuizPage } from './pages/current-affairs/CurrentAffairsQuizPage';
import { TrendingTopicsPage } from './pages/current-affairs/TrendingTopicsPage';
import { StudentProfilePage } from './pages/students/StudentProfilePage';
import { StudentFormPage } from './pages/students/StudentFormPage';
import { EmptyState } from '@study-karnataka/ui';

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const UnauthorizedPage: React.FC = () => (
  <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
    <EmptyState
      title="403 — Unauthorized Access"
      description="Your administrative role does not have permission to access this module."
      actionLabel="Back to Dashboard"
      onAction={() => (window.location.href = '/')}
    />
  </div>
);

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        path="/"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Exams Domain Routes */}
        <Route path="exams" element={<ExamsList />} />
        <Route path="exams/new" element={<ExamForm />} />
        <Route path="exams/analytics" element={<ExamAnalyticsPage />} />
        <Route path="exams/:id/analytics" element={<ExamReadinessDetailPage />} />
        <Route path="exams/:id/edit" element={<ExamForm />} />
        <Route path="exams/:id/pattern" element={<ExamStagesBuilderPage />} />
        <Route path="exams/:examId/syllabus" element={<ExamSyllabusPage />} />
        <Route path="exams/:id" element={<ExamDetail />} />
        <Route path="exams/pattern" element={<ExamStagesBuilderPage />} />
        <Route path="exams/:examId/pattern" element={<ExamStagesBuilderPage />} />
        <Route path="exams/syllabus" element={<ExamSyllabusPage />} />
        <Route path="exams/syllabus-mapping" element={<StudyMaterialsPlaceholder />} />

        {/* Academic Taxonomy Routes */}
        <Route path="taxonomy/categories" element={<AcademicCategoriesPage moduleType="GENERAL" />} />
        <Route path="taxonomy/subcategories" element={<AcademicSubcategoriesPage />} />

        {/* Study Materials Foundation Routes */}
        <Route path="study-materials" element={<AllContentPage />} />
        <Route path="study-materials/new" element={<StudyMaterialFormPage />} />
        <Route path="study-materials/add" element={<StudyMaterialFormPage />} />
        <Route path="study-materials/categories" element={<AcademicCategoriesPage moduleType="STUDY_MATERIAL" />} />
        <Route path="study-materials/stages" element={<StudyMaterialStagesPage />} />
        <Route path="study-materials/settings" element={<StudyMaterialsPlaceholder />} />
        <Route path="study-materials/review-queue" element={<ReviewQueuePage />} />
        <Route path="study-materials/:studyMaterialId/locales/:language/revisions/:revisionId/review" element={<ReviewScreenPage />} />
        <Route path="study-materials/:studyMaterialId/locales/:language/revisions/:revisionId/preview" element={<InternalPreviewPage />} />
        <Route path="study-materials/:studyMaterialId/edit" element={<StudyMaterialFormPage />} />
        <Route path="study-materials/:studyMaterialId" element={<StudyMaterialDetailPage />} />
        <Route path="study-materials/bulk-import" element={<StudyMaterialsPlaceholder />} />
        <Route path="study-materials/content-dashboard" element={<StudyMaterialsPlaceholder />} />
        <Route path="study-materials/content-reports" element={<StudyMaterialsPlaceholder />} />

        {/* MCQ Library Domain Routes */}
        <Route path="mcq-library" element={<McqLibraryPage />} />
        <Route path="mcq-library/categories" element={<AcademicCategoriesPage moduleType="MCQ" />} />
        <Route path="mcq-library/subcategories" element={<AcademicSubcategoriesPage />} />
        <Route path="mcq-library/new" element={<McqFormPage />} />
        <Route path="mcq-library/bulk-import" element={<McqBulkImportPage />} />
        <Route path="mcq-library/tests" element={<TestListPage />} />
        <Route path="mcq-library/tests/new" element={<TestFormPage />} />
        <Route path="mcq-library/tests/:id/edit" element={<TestFormPage />} />
        <Route path="mcq-library/test-series" element={<TestSeriesListPage />} />
        <Route path="mcq-library/test-series/new" element={<CreateTestSeriesPage />} />
        <Route path="mcq-library/test-series/:id" element={<TestSeriesDetailPage />} />
        <Route path="mcq-library/ranked-tests" element={<RankedTestListPage />} />
        <Route path="mcq-library/ranked-tests/new" element={<CreateRankedTestPage />} />
        <Route path="mcq-library/ranked-tests/:id" element={<RankedTestDetailPage />} />
        <Route path="mcq-library/topic-practice" element={<AdminTopicPracticeConfigPage />} />
        <Route path="mcq-library/:id/edit" element={<McqFormPage />} />
        <Route path="study-plans" element={<StudyPlansPage />} />
        <Route path="students" element={<StudentsListPage />} />
        <Route path="students/new" element={<StudentFormPage />} />
        <Route path="students/:studentId/edit" element={<StudentFormPage />} />
        <Route path="students/:studentId" element={<StudentProfilePage />} />
        <Route path="students/performance" element={<AdminPerformanceAnalyticsPage />} />
        <Route path="current-affairs" element={<CurrentAffairsDashboardPage />} />
        <Route path="current-affairs/dashboard" element={<CurrentAffairsDashboardPage />} />
        <Route path="current-affairs/list" element={<CurrentAffairsListPage />} />
        <Route path="current-affairs/new" element={<AddCurrentAffairPage />} />
        <Route path="current-affairs/:id/edit" element={<AddCurrentAffairPage />} />
        <Route path="current-affairs/monthly-archive" element={<CurrentAffairsCalendarPage />} />
        <Route path="current-affairs/categories" element={<StudyMaterialsPlaceholder />} />
        <Route path="current-affairs/sources" element={<StudyMaterialsPlaceholder />} />
        <Route path="current-affairs/trending-topics" element={<TrendingTopicsPage />} />
        <Route path="current-affairs/daily-quiz" element={<CurrentAffairsQuizPage />} />
        <Route path="current-affairs/pdfs" element={<CurrentAffairsPdfPage />} />
        <Route path="current-affairs/analytics" element={<StudyMaterialsPlaceholder />} />
        <Route path="quick-revision" element={<QuickRevisionPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
