import { z } from 'zod';

export const CreateRankedTestSchema = z
  .object({
    mockTestId: z.string().uuid('Valid Mock Test ID is required'),
    testSeriesTestId: z.string().uuid('Valid Test Series Test ID is required').optional().nullable(),
    mode: z.enum(['ANYTIME_RANKED', 'SCHEDULED_LIVE'], {
      required_error: 'Ranked mode (ANYTIME_RANKED or SCHEDULED_LIVE) is required',
    }),
    availableFrom: z.string().datetime({ message: 'Valid availableFrom ISO date string is required' }),
    startDeadlineAt: z.string().datetime({ message: 'Valid startDeadlineAt ISO date string is required' }).optional().nullable(),
    scheduledStartAt: z.string().datetime({ message: 'Valid scheduledStartAt ISO date string is required' }).optional().nullable(),
    scheduledEndAt: z.string().datetime({ message: 'Valid scheduledEndAt ISO date string is required' }).optional().nullable(),
    latestJoinAt: z.string().datetime({ message: 'Valid latestJoinAt ISO date string is required' }).optional().nullable(),
    solutionReleasePolicy: z
      .enum(['AFTER_RESULTS_PUBLISHED', 'NEVER'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'ANYTIME_RANKED') {
      if (!data.startDeadlineAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'startDeadlineAt is required for ANYTIME_RANKED mode',
          path: ['startDeadlineAt'],
        });
      } else {
        const from = new Date(data.availableFrom).getTime();
        const deadline = new Date(data.startDeadlineAt).getTime();
        if (deadline <= from) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'startDeadlineAt must be strictly after availableFrom',
            path: ['startDeadlineAt'],
          });
        }
      }
    }

    if (data.mode === 'SCHEDULED_LIVE') {
      if (!data.scheduledStartAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'scheduledStartAt is required for SCHEDULED_LIVE mode',
          path: ['scheduledStartAt'],
        });
      }
      if (!data.scheduledEndAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'scheduledEndAt is required for SCHEDULED_LIVE mode',
          path: ['scheduledEndAt'],
        });
      }
      if (data.scheduledStartAt && data.scheduledEndAt) {
        const start = new Date(data.scheduledStartAt).getTime();
        const end = new Date(data.scheduledEndAt).getTime();
        if (end <= start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'scheduledEndAt must be strictly after scheduledStartAt',
            path: ['scheduledEndAt'],
          });
        }
        if (data.latestJoinAt) {
          const join = new Date(data.latestJoinAt).getTime();
          if (join < start || join > end) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'latestJoinAt must be between scheduledStartAt and scheduledEndAt',
              path: ['latestJoinAt'],
            });
          }
        }
      }
    }
  });

export const UpdateRankedTestSchema = z.object({
  availableFrom: z.string().datetime().optional(),
  startDeadlineAt: z.string().datetime().optional().nullable(),
  scheduledStartAt: z.string().datetime().optional().nullable(),
  scheduledEndAt: z.string().datetime().optional().nullable(),
  latestJoinAt: z.string().datetime().optional().nullable(),
  solutionReleasePolicy: z.enum(['AFTER_RESULTS_PUBLISHED', 'NEVER']).optional(),
});

export const SaveRankedAnswerSchema = z.object({
  mockTestQuestionId: z.string().uuid('Valid Mock Test Question ID is required'),
  selectedOption: z
    .enum(['A', 'B', 'C', 'D'])
    .optional()
    .nullable(),
  isMarkedForReview: z.boolean().optional(),
});

export const InvalidateAttemptSchema = z.object({
  invalidationReason: z
    .string()
    .min(5, 'Invalidation reason must be at least 5 characters')
    .max(500, 'Maximum 500 characters'),
});

export type CreateRankedTestInput = z.infer<typeof CreateRankedTestSchema>;
export type UpdateRankedTestInput = z.infer<typeof UpdateRankedTestSchema>;
export type SaveRankedAnswerInput = z.infer<typeof SaveRankedAnswerSchema>;
export type InvalidateAttemptInput = z.infer<typeof InvalidateAttemptSchema>;
