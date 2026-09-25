// @ts-nocheck
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import healthRoutes from './routes/health.routes';
import authStudentRoutes from './routes/auth.student.routes';
import authAdminRoutes from './routes/auth.admin.routes';
import authSessionRoutes from './routes/auth.session.routes';
import studentRoutes from './routes/student.routes';
import examAdminRoutes from './routes/exam.admin.routes';
import examPublicRoutes from './routes/exam.public.routes';
import { examPatternAdminRoutes } from './routes/exam-pattern.admin.routes';
import { examPatternPublicRoutes } from './routes/exam-pattern.public.routes';
import { examSyllabusAdminRoutes } from './routes/exam-syllabus.admin.routes';
import { examSyllabusPublicRoutes } from './routes/exam-syllabus.public.routes';
import { examAnalyticsAdminRoutes } from './routes/exam-analytics.admin.routes';
import academicTaxonomyAdminRoutes from './routes/academic-taxonomy.admin.routes';
import revisionTaxonomyAdminRoutes from './routes/revision-taxonomy.admin.routes';
import { quickRevisionAdminRoutes } from './routes/quick-revision.admin.routes';
import academicStageAdminRoutes from './routes/academic-stage.admin.routes';
import studyMaterialAdminRoutes from './routes/study-material.admin.routes';
import mcqLibraryAdminRoutes from './routes/mcq-library.admin.routes';
import testCreationAdminRoutes from './routes/test-creation.admin.routes';
import testSeriesAdminRoutes from './routes/test-series.admin.routes';
import rankedTestAdminRoutes from './routes/ranked-test.admin.routes';
import rankedTestStudentRoutes from './routes/ranked-test.student.routes';
import topicPracticeStudentRoutes from './routes/topic-practice.student.routes';
import topicPracticeAdminRoutes from './routes/topic-practice.admin.routes';
import studentPerformanceStudentRoutes from './routes/student-performance.student.routes';
import studentPerformanceAdminRoutes from './routes/student-performance.admin.routes';
import contentPublicRoutes from './routes/content.public.routes';
import { currentAffairsAdminRoutes } from './routes/current-affairs.admin.routes';
import studyPlansAdminRoutes from './routes/study-plans.admin.routes';
import studyPlansStudentRoutes from './routes/study-plans.student.routes';
import subscriptionModuleAdminRoutes from './routes/subscription-module.admin.routes';
import planAdminRoutes from './routes/plan.admin.routes';
import studentSubscriptionAdminRoutes from './routes/student-subscription.admin.routes';
import transactionAdminRoutes from './routes/transaction.admin.routes';
import couponAdminRoutes from './routes/coupon.admin.routes';
import invoiceAdminRoutes from './routes/invoice.admin.routes';
import refundAdminRoutes from './routes/refund.admin.routes';
import { razorpayAdminRouter, razorpayWebhookRouter } from './routes/razorpay.admin.routes';
import { paymentReportAdminRouter } from './routes/payment-report.admin.routes';
import uploadAdminRoutes from './routes/upload.admin.routes';
import teamAdminRoutes from './routes/team.admin.routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { sendError } from './utils/response';

// Load root .env file if available
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger);

// Serve Static Files
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Health Routes
app.use(healthRoutes);

// API v1 Routes
app.use('/api/v1', authStudentRoutes);
app.use('/api/v1', authAdminRoutes);
app.use('/api/v1', authSessionRoutes);
app.use('/api/v1', studentRoutes);
app.use('/api/v1', examAdminRoutes);
app.use('/api/v1', examPublicRoutes);
app.use('/api/v1', examPatternAdminRoutes);
app.use('/api/v1', examPatternPublicRoutes);
app.use('/api/v1', examSyllabusAdminRoutes);
app.use('/api/v1', examSyllabusPublicRoutes);
app.use('/api/v1', examAnalyticsAdminRoutes);
app.use('/api/v1/admin/current-affairs', currentAffairsAdminRoutes);
app.use('/api/v1/admin/academic-taxonomy', academicTaxonomyAdminRoutes);
app.use('/api/v1/admin/revision-taxonomy', revisionTaxonomyAdminRoutes);
app.use('/api/v1/admin/quick-revision', quickRevisionAdminRoutes);
app.use('/api/v1/admin/academic-stages', academicStageAdminRoutes);
app.use('/api/v1/admin/study-materials', studyMaterialAdminRoutes);
app.use('/api/v1/admin/mcq-library/ranked-tests', rankedTestAdminRoutes);
app.use('/api/v1/admin/mcq-library/test-series', testSeriesAdminRoutes);
app.use('/api/v1/admin/mcq-library/tests', testCreationAdminRoutes);
app.use('/api/v1/admin/mcq-library', mcqLibraryAdminRoutes);
app.use('/api/v1/admin/topic-practice', topicPracticeAdminRoutes);
app.use('/api/v1/admin/performance', studentPerformanceAdminRoutes);
app.use('/api/v1/admin/study-plans', studyPlansAdminRoutes);
app.use('/api/v1/admin/subscriptions/modules', subscriptionModuleAdminRoutes);
app.use('/api/v1/admin/subscriptions/plans', planAdminRoutes);
app.use('/api/v1/admin/subscriptions/student-subscriptions', studentSubscriptionAdminRoutes);
app.use('/api/v1/admin/transactions', transactionAdminRoutes);
app.use('/api/v1/admin/subscriptions/coupons', couponAdminRoutes);
app.use('/api/v1/admin/subscriptions/invoices', invoiceAdminRoutes);
app.use('/api/v1/admin/invoices', invoiceAdminRoutes);
app.use('/api/v1/admin/subscriptions/refunds', refundAdminRoutes);
app.use('/api/v1/admin/refunds', refundAdminRoutes);
app.use('/api/v1/admin/subscriptions/razorpay', razorpayAdminRouter);
app.use('/api/v1/admin/razorpay', razorpayAdminRouter);
app.use('/api/v1/webhooks/razorpay', razorpayWebhookRouter);
app.use('/api/v1/admin/subscriptions/reports', paymentReportAdminRouter);
app.use('/api/v1/admin/reports/payments', paymentReportAdminRouter);
app.use('/api/v1/admin/student-subscriptions', studentSubscriptionAdminRoutes);
app.use('/api/v1/admin/upload', uploadAdminRoutes);
app.use('/api/v1/admin/team', teamAdminRoutes);
app.use('/api/v1/student/study-plans', studyPlansStudentRoutes);
app.use('/api/v1/student/ranked-tests', rankedTestStudentRoutes);
app.use('/api/v1/student/topic-practice', topicPracticeStudentRoutes);
app.use('/api/v1/student', studentPerformanceStudentRoutes);
app.use('/api/v1/content', contentPublicRoutes);

// Also mount without prefix for fallback convenience
app.use(authStudentRoutes);
app.use(authAdminRoutes);
app.use(authSessionRoutes);
app.use(studentRoutes);
app.use(examAdminRoutes);
app.use(examPublicRoutes);
app.use(examPatternAdminRoutes);
app.use(examPatternPublicRoutes);
app.use(examSyllabusAdminRoutes);
app.use(examSyllabusPublicRoutes);
app.use(examAnalyticsAdminRoutes);

// 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json(sendError('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
});

// Centralized Error Handler
app.use(errorHandler);
