import { z } from 'zod';

export const TestSeriesTestEntrySchema = z.object({
  mockTestId: z.string().min(1, 'Mock Test ID is required'),
  orderIndex: z.number().int().min(1, 'Order index must be at least 1'),
  entryType: z.enum(['PRACTICE', 'RANKED']).optional().default('PRACTICE'),
  availableFrom: z.string().optional().nullable(),
  availableUntil: z.string().optional().nullable(),
  labelEn: z.string().optional().nullable(),
  labelKn: z.string().optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
});

export const CreateTestSeriesSchema = z.object({
  titleEn: z.string().min(3, 'English title must be at least 3 characters'),
  titleKn: z.string().min(3, 'Kannada title must be at least 3 characters'),
  descriptionEn: z.string().optional().nullable(),
  descriptionKn: z.string().optional().nullable(),
  instructionsEn: z.string().optional().nullable(),
  instructionsKn: z.string().optional().nullable(),
  examProgrammeId: z.string().min(1, 'Exam Programme ID is required'),
  examStageId: z.string().optional().nullable(),
  examPaperId: z.string().optional().nullable(),
  accessClassification: z.enum(['FREE', 'PAID', 'FREEMIUM']).optional().default('FREE'),
  releaseMode: z.enum(['ALL_AVAILABLE', 'SCHEDULED', 'SEQUENTIAL']).optional().default('ALL_AVAILABLE'),
  questionReusePolicy: z.enum(['ALLOW_REPEATS', 'NO_REPEAT']).optional().default('NO_REPEAT'),
  seriesStartAt: z.string().optional().nullable(),
  seriesEndAt: z.string().optional().nullable(),
  tests: z.array(TestSeriesTestEntrySchema).optional().default([]),
});

export const UpdateTestSeriesSchema = CreateTestSeriesSchema.partial();

export const UpdateTestSeriesTestMetadataSchema = z.object({
  mockTestId: z.string().min(1),
  orderIndex: z.number().int().min(1).optional(),
  entryType: z.enum(['PRACTICE', 'RANKED']).optional(),
  availableFrom: z.string().optional().nullable(),
  availableUntil: z.string().optional().nullable(),
  labelEn: z.string().optional().nullable(),
  labelKn: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
});

export const ReorderTestSeriesTestsSchema = z.object({
  items: z.array(
    z.object({
      mockTestId: z.string().min(1),
      orderIndex: z.number().int().min(1),
    })
  ).min(1, 'At least one item required for reordering'),
});

export const RequestSeriesChangesSchema = z.object({
  rejectionReason: z.string().min(3, 'Rejection reason is required when requesting changes'),
});
