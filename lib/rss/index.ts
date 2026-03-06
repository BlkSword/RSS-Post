/**
 * RSS 模块导出
 */

export {
  FeedManager,
  feedManager,
  type FeedUpdateResult,
  type CleanupResult,
  DEFAULT_FETCH_TIME_RANGES,
  DEFAULT_ENTRY_RETENTION_DAYS,
  FETCH_TIME_RANGE_OPTIONS,
} from './feed-manager';

export { parseFeed, type ParsedFeed } from './parser';
export { controlledRequest } from './request-controller';
