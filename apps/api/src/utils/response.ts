import { ApiResponse } from '@study-karnataka/shared-types';

export function sendSuccess<T>(
  data: T,
  message: string = 'Request completed successfully',
  meta?: Record<string, unknown>
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };
}

export function sendError(
  code: string,
  message: string,
  details?: unknown,
  meta?: Record<string, unknown>
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta,
    timestamp: new Date().toISOString(),
  };
}
