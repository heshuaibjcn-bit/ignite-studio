import type { BizStatus, BizType, ProductionMode, AssetType, AssetSourceType, AssetStatus } from '@/constants/biz';
import type { StepDefinition } from '@/constants/step';

/** Re-export status types from constants. */
export type { BizStatus, BizType, ProductionMode, AssetType, AssetSourceType, AssetStatus };
export type { StepDefinition };

/** Standard API response envelope. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: ApiError | null;
  requestId: string;
  pagination?: PaginationInfo;
}

/** Structured API error. */
export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/** Pagination metadata. */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
