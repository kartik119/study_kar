import { z } from 'zod';

export const TestCategoryDistributionInputSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  targetCount: z.number().int().min(0, 'Target count must be non-negative'),
});

export const TestSubcategoryDistributionInputSchema = z.object({
  subcategoryId: z.string().min(1, 'Subcategory ID is required'),
  targetCount: z.number().int().min(0, 'Target count must be non-negative'),
});

export const TestDifficultyDistributionInputSchema = z.object({
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  targetCount: z.number().int().min(0, 'Target count must be non-negative'),
});

export const CreateTestSchema = z.object({
  titleEn: z.string().min(3, 'English title must be at least 3 characters'),
  titleKn: z.string().min(3, 'Kannada title must be at least 3 characters'),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  instructionsEn: z.string().optional().nullable(),
  instructionsKn: z.string().optional().nullable(),
  examCycleId: z.string().optional().nullable(),
  examStageId: z.string().optional().nullable(),
  examPaperId: z.string().optional().nullable(),
  totalQuestions: z.number().int().min(1, 'Total questions must be at least 1').max(1000, 'Maximum 1,000 questions per test').optional().default(100),
  durationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').max(600, 'Maximum 600 minutes').optional().default(60),
  passingPercentage: z.number().min(0).max(100).optional().default(40),
  accessClassification: z.enum(['FREE', 'PAID', 'FREEMIUM']).optional().default('FREE'),
  scoringPolicy: z.enum(['TEST_DEFAULT', 'MCQ_DEFAULT']).optional().default('TEST_DEFAULT'),
  positiveMarks: z.number().positive('Positive marks must be greater than 0').optional().default(1.0),
  negativeMarks: z.number().min(0, 'Negative marks cannot be negative').optional().default(0.25),
  selectionMode: z.enum(['MANUAL', 'AUTOMATIC']).optional().default('MANUAL'),
  pyqPreference: z.enum(['ANY', 'EXCLUDE_PYQ', 'PYQ_ONLY']).optional().default('ANY'),
  categoryDistributions: z.array(TestCategoryDistributionInputSchema).optional().default([]),
  subcategoryDistributions: z.array(TestSubcategoryDistributionInputSchema).optional().default([]),
  difficultyDistributions: z.array(TestDifficultyDistributionInputSchema).optional().default([]),
  questionIds: z.array(z.string()).optional().default([]),
});

export const UpdateTestSchema = CreateTestSchema.partial();

export const AvailabilityCheckSchema = z.object({
  totalQuestions: z.number().int().min(1),
  examCycleId: z.string().optional().nullable(),
  pyqPreference: z.enum(['ANY', 'EXCLUDE_PYQ', 'PYQ_ONLY']).optional().default('ANY'),
  categoryDistributions: z.array(TestCategoryDistributionInputSchema),
  subcategoryDistributions: z.array(TestSubcategoryDistributionInputSchema).optional().default([]),
  difficultyDistributions: z.array(TestDifficultyDistributionInputSchema),
});

export const ManualQuestionSelectionSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1, 'At least one question must be selected'),
});

export const ReplaceQuestionSchema = z.object({
  oldQuestionId: z.string().min(1),
  newQuestionId: z.string().min(1),
});

export const ReorderQuestionsSchema = z.object({
  questionOrder: z.array(z.object({
    questionId: z.string().min(1),
    displayOrder: z.number().int().min(1),
  })).min(1),
});
