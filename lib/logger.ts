/**
 * 系统日志记录器
 * 用于记录应用运行时的各种日志信息
 * 自动清理旧日志以限制存储占用
 */

import { db } from './db';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogCategory = 'system' | 'rss' | 'ai' | 'auth' | 'email' | 'api' | 'queue' | 'security';

interface LogOptions {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;
  userId?: string;
  feedId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  error?: Error;
  errorCode?: string;
  duration?: number;
  memory?: number;
  source?: string;
  tags?: string[];
}

// 日志存储限制配置
const MAX_LOG_COUNT = 10000; // 最大日志数量
const CLEANUP_THRESHOLD = 12000; // 触发清理的阈值
const CLEANUP_BATCH_SIZE = 2000; // 每次清理的数量
let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 清理间隔：1小时

/**
 * 清理旧日志
 */
async function cleanupOldLogs() {
  try {
    const count = await db.systemLog.count();
    if (count > CLEANUP_THRESHOLD) {
      // 获取需要保留的最旧日志的日期
      const logsToKeep = await db.systemLog.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: MAX_LOG_COUNT - CLEANUP_BATCH_SIZE,
        take: 1,
      });

      if (logsToKeep.length > 0) {
        const cutoffDate = logsToKeep[0].createdAt;
        const result = await db.systemLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
          },
        });
        console.log(`[Logger] Cleaned up ${result.count} old logs, current count: ${count - result.count}`);
      }
    }
  } catch (e) {
    console.error('[Logger] Failed to cleanup old logs:', e);
  }
}

/**
 * 写入日志到数据库
 */
export async function log(options: LogOptions) {
  try {
    const {
      level,
      category,
      message,
      details,
      userId,
      feedId,
      requestId,
      ipAddress,
      userAgent,
      error,
      errorCode,
      duration,
      memory,
      source,
      tags,
    } = options;

    await db.systemLog.create({
      data: {
        level,
        category,
        message,
        details: details || {},
        userId,
        feedId,
        requestId,
        ipAddress,
        userAgent,
        stackTrace: error?.stack,
        errorCode,
        duration,
        memory,
        source,
        tags: tags || [],
      },
    });

    // 定期检查并清理旧日志
    const now = Date.now();
    if (now - lastCleanupTime > CLEANUP_INTERVAL) {
      lastCleanupTime = now;
      // 异步执行清理，不阻塞日志写入
      cleanupOldLogs().catch(console.error);
    }
  } catch (e) {
    // 如果日志写入失败， 输出到控制台
    console.error('Failed to write log:', e);
    console.error('Original log:', options);
  }
}

/**
 * 快捷方法：调试日志
 */
export function debug(
  category: LogCategory,
  message: string,
  details?: Record<string, any>,
  userId?: string,
  feedId?: string
) {
  return log({ level: 'debug', category, message, details, userId, feedId });
}

/**
 * 快捷方法：信息日志
 */
export function info(
  category: LogCategory,
  message: string,
  details?: Record<string, any>,
  userId?: string,
  feedId?: string
) {
  return log({ level: 'info', category, message, details, userId, feedId });
}

/**
 * 快捷方法：警告日志
 */
export function warn(
  category: LogCategory,
  message: string,
  details?: Record<string, any>,
  userId?: string,
  feedId?: string
) {
  return log({ level: 'warn', category, message, details, userId, feedId });
}

/**
 * 快捷方法：错误日志
 */
export function error(
  category: LogCategory,
  message: string,
  errorObj?: Error,
  details?: Record<string, any>,
  userId?: string,
  feedId?: string
) {
  return log({
    level: 'error',
    category,
    message,
    error: errorObj,
    details,
    userId,
    feedId,
  });
}

/**
 * 快捷方法：致命错误日志
 */
export function fatal(
  category: LogCategory,
  message: string,
  errorObj?: Error,
  details?: Record<string, any>,
  userId?: string,
  feedId?: string
) {
  return log({
    level: 'fatal',
    category,
    message,
    error: errorObj,
    details,
    userId,
    feedId,
  });
}

/**
 * 创建带上下文的日志记录器
 */
export function createLogger(context: {
  userId?: string;
  feedId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
}) {
  return {
    debug: (category: LogCategory, message: string, details?: Record<string, any>) =>
      log({ level: 'debug', category, message, details, ...context }),
    info: (category: LogCategory, message: string, details?: Record<string, any>) =>
      log({ level: 'info', category, message, details, ...context }),
    warn: (category: LogCategory, message: string, details?: Record<string, any>) =>
      log({ level: 'warn', category, message, details, ...context }),
    error: (category: LogCategory, message: string, errorObj?: Error, details?: Record<string, any>) =>
      log({ level: 'error', category, message, error: errorObj, details, ...context }),
    fatal: (category: LogCategory, message: string, errorObj?: Error, details?: Record<string, any>) =>
      log({ level: 'fatal', category, message, error: errorObj, details, ...context }),
  };
}

export default { log, debug, info, warn, error, fatal, createLogger };
