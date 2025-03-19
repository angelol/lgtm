/**
 * Custom error classes for better error handling across the application
 */

/**
 * Base custom error class with support for error codes and additional context
 */
export class CustomError extends Error {
  code: string;
  statusCode?: number;
  context?: Record<string, unknown>;

  constructor(
    message: string,
    code = 'UNKNOWN_ERROR',
    statusCode?: number,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;

    // Ensures proper stack trace in modern Node.js
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * API-related errors (GitHub API, etc.)
 */
export class ApiError extends CustomError {
  constructor(message: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message, 'API_ERROR', statusCode, context);
  }
}

/**
 * Authentication-related errors
 */
export class AuthError extends CustomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, context);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ApiError {
  resetTime: Date;

  constructor(message: string, resetTimestamp: number, context?: Record<string, unknown>) {
    super(message, 429, context);
    this.code = 'RATE_LIMIT_ERROR';
    this.resetTime = new Date(resetTimestamp * 1000);
  }

  /**
   * Get human-readable time until reset
   */
  getTimeUntilReset(): string {
    const now = new Date();
    const seconds = Math.ceil((this.resetTime.getTime() - now.getTime()) / 1000);

    if (seconds < 60) {
      return `${seconds} second${seconds === 1 ? '' : 's'}`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends CustomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', undefined, context);
  }
}

/**
 * Repository-related errors
 */
export class RepositoryError extends CustomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'REPOSITORY_ERROR', undefined, context);
  }
}

/**
 * Permission-related errors
 */
export class PermissionError extends CustomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PERMISSION_ERROR', 403, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends CustomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends CustomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND_ERROR', 404, context);
  }
}

/**
 * Utility function to wrap errors from external libraries
 * into our custom error types
 */
export function wrapError(
  error: unknown,
  defaultMessage = 'An unexpected error occurred',
): CustomError {
  if (error instanceof CustomError) {
    return error;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return new CustomError(error.message);
  }

  // Handle API errors (like from Octokit)
  const anyError = error as any;
  if (anyError?.status === 401 || anyError?.status === 403) {
    const message = anyError.message || 'Authentication failed';
    return new AuthError(message, { originalError: anyError });
  }

  if (anyError?.status === 404) {
    const message = anyError.message || 'Resource not found';
    return new NotFoundError(message, { originalError: anyError });
  }

  if (anyError?.status === 429 || (anyError?.message && /rate limit/i.test(anyError.message))) {
    const resetTime = anyError.headers?.['x-ratelimit-reset']
      ? parseInt(anyError.headers['x-ratelimit-reset'], 10)
      : Math.floor(Date.now() / 1000) + 60 * 60; // Default 1 hour

    return new RateLimitError(anyError.message || 'API rate limit exceeded', resetTime, {
      originalError: anyError,
    });
  }

  // Generic fallback
  if (anyError?.message && typeof anyError.message === 'string') {
    return new CustomError(anyError.message, 'UNKNOWN_ERROR', anyError.status);
  }

  return new CustomError(defaultMessage);
}
