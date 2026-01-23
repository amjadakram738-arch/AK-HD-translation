/**
 * Production-ready logging system with multiple log levels and error tracking
 */

import { ErrorInfo, ErrorType } from '../types';

/**
 * Log levels for filtering output
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  includeTimestamp: boolean;
  includeStackTrace: boolean;
}

/**
 * Main Logger class with structured logging capabilities
 */
export class Logger {
  private config: LoggerConfig;
  private static instance: Logger | null = null;
  private static globalLevel: LogLevel = LogLevel.INFO;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? Logger.globalLevel,
      prefix: config.prefix ?? '[VideoDetector]',
      includeTimestamp: config.includeTimestamp ?? true,
      includeStackTrace: config.includeStackTrace ?? false
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger({ prefix: '[VideoDetector]' });
    }
    return Logger.instance;
  }

  /**
   * Set global log level
   */
  static setGlobalLevel(level: LogLevel): void {
    Logger.globalLevel = level;
    if (Logger.instance) {
      Logger.instance.config.level = level;
    }
  }

  /**
   * Format log message with timestamp and prefix
   */
  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = this.config.includeTimestamp ? new Date().toISOString() : '';
    const prefix = `[${level}] ${this.config.prefix}`;
    const formattedData = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    
    return `${timestamp} ${prefix}: ${message}${formattedData}`;
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: unknown): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      console.debug(formattedMessage, data);
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: unknown): void {
    if (this.config.level <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, data);
      console.info(formattedMessage, data);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown): void {
    if (this.config.level <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, data);
      console.warn(formattedMessage, data);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: unknown): void {
    if (this.config.level <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, error);
      console.error(formattedMessage, error);
      
      // Also report to error tracking if available
      this.reportError(message, error);
    }
  }

  /**
   * Log error with structured ErrorInfo
   */
  logErrorInfo(errorInfo: ErrorInfo, context?: string): void {
    if (this.config.level <= LogLevel.ERROR) {
      const contextStr = context ? ` [${context}]` : '';
      const message = `${errorInfo.type}${contextStr}: ${errorInfo.message}`;
      
      if (errorInfo.stack) {
        console.error(message + '\n' + errorInfo.stack);
      } else {
        console.error(message);
      }
    }
  }

  /**
   * Create new logger instance with different prefix
   */
  createChild(prefix: string): Logger {
    return new Logger({
      level: this.config.level,
      prefix: `${this.config.prefix}:${prefix}`,
      includeTimestamp: this.config.includeTimestamp,
      includeStackTrace: this.config.includeStackTrace
    });
  }

  /**
   * Log group start
   */
  group(label: string): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const timestamp = this.config.includeTimestamp ? new Date().toISOString() : '';
      console.group(`${timestamp} ${this.config.prefix} [GROUP] ${label}`);
    }
  }

  /**
   * Log group end
   */
  groupEnd(): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }

  /**
   * Time an operation
   */
  time(label: string): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const prefixedLabel = `${this.config.prefix}:${label}`;
      console.time(prefixedLabel);
    }
  }

  /**
   * End timing an operation
   */
  timeEnd(label: string): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const prefixedLabel = `${this.config.prefix}:${label}`;
      console.timeEnd(prefixedLabel);
    }
  }

  /**
   * Convert unknown error to ErrorInfo
   */
  static toErrorInfo(error: unknown, type: ErrorType = ErrorType.UNKNOWN): ErrorInfo {
    if (error instanceof Error) {
      return {
        message: error.message,
        type,
        stack: error.stack,
        recoverable: type !== ErrorType.DRM && type !== ErrorType.UNKNOWN
      };
    }
    
    return {
      message: String(error),
      type,
      recoverable: type !== ErrorType.DRM && type !== ErrorType.UNKNOWN
    };
  }

  /**
   * Report error to external service (can be extended)
   */
  private reportError(message: string, error?: unknown): void {
    // Placeholder for error reporting service integration
    // Examples: Sentry, Rollbar, custom endpoint
    
    if (typeof window !== 'undefined' && 'VideoDetectorConfig' in window) {
      // Check if error reporting is configured
      // @ts-ignore - dynamic property check
      const config = window.VideoDetectorConfig;
      if (config?.errorReporting?.enabled) {
        // Send to error reporting service
        // Implementation depends on chosen service
        this.debug('Error would be reported to external service', { message, error });
      }
    }
  }
}

/**
 * Convenience functions for quick logging
 */
export const logger = Logger.getInstance();

export const createLogger = (prefix: string) => logger.createChild(prefix);

/**
 * Assert condition and log error if false
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    logger.error(`Assertion failed: ${message}`);
    throw new Error(message);
  }
}

/**
 * Try-catch wrapper with automatic error logging
 */
export function tryCatch<T>(
  fn: () => T,
  errorContext: string,
  onError?: (error: unknown) => void
): T | null {
  try {
    return fn();
  } catch (error) {
    logger.error(`Error in ${errorContext}:`, error);
    onError?.(error);
    return null;
  }
}

/**
 * Async try-catch wrapper with automatic error logging
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  errorContext: string,
  onError?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Async error in ${errorContext}:`, error);
    onError?.(error);
    return null;
  }
}
