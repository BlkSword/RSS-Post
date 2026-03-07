/**
 * Feed Discovery Worker 启动脚本
 *
 * 处理 OPML 导入后的订阅源发现和首次抓取
 * 流程: 可达性检查 → 信息补充 → 自动抓取
 */

import { createFeedDiscoveryWorker, getFeedDiscoveryQueueStatus } from '../lib/queue/feed-discovery-processor';

// =====================================================
// Worker 配置
// =====================================================

const WORKER_CONFIG = {
  concurrency: parseInt(process.env.FEED_DISCOVERY_CONCURRENCY || '3', 10),
};

// =====================================================
// 启动 Worker
// =====================================================

async function startWorker() {
  console.log('==========================================');
  console.log('  Feed Discovery Worker 启动中...');
  console.log('==========================================\n');

  console.log('📋 配置信息:');
  console.log(`  并发数: ${WORKER_CONFIG.concurrency}`);
  console.log(`  Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
  console.log(`  功能: OPML导入后自动发现订阅源并触发首次抓取\n`);

  // 创建 Worker
  const worker = createFeedDiscoveryWorker();

  console.log('✅ Worker 已启动\n');

  // Worker 事件处理
  worker.on('ready', () => {
    console.log('🎯 Worker 已就绪，等待任务...\n');
  });

  worker.on('active', (job) => {
    console.log(`🔄 开始处理: ${job.id}`);
    console.log(`   订阅源: ${job.data.feedUrl}`);
  });

  worker.on('completed', (job, result) => {
    console.log(`✅ 任务完成: ${job.id}`);
    console.log(`   订阅源: ${result.title || result.feedId}`);
    console.log(`   可达性: ${result.success ? '✓ 可达' : '✗ 不可达'}`);
    if (result.fetched) {
      console.log(`   抓取结果: ${result.entriesCount} 篇文章`);
    }
    console.log();
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ 任务失败: ${job?.id}`);
    console.error(`   订阅源: ${job?.data?.feedUrl}`);
    console.error(`   错误: ${error.message}\n`);
  });

  worker.on('progress', (job, progress) => {
    console.log(`⏳ 任务进度: ${job.id} - ${progress}%`);
  });

  worker.on('error', (error) => {
    console.error('❌ Worker 错误:', error);
  });

  // 显示队列状态
  try {
    const status = await getFeedDiscoveryQueueStatus();
    console.log('📊 当前队列状态:');
    console.log(`   等待中: ${status.waiting}`);
    console.log(`   处理中: ${status.active}`);
    console.log(`   已完成: ${status.completed}`);
    console.log(`   失败: ${status.failed}\n`);
  } catch (error) {
    console.warn('⚠️  无法获取队列状态:', error);
  }

  // 优雅关闭
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 收到 ${signal} 信号，正在关闭 Worker...`);
    await worker.close();
    console.log('✅ Worker 已关闭');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 保持运行
  console.log('按 Ctrl+C 停止\n');
}

// 启动
startWorker().catch((error) => {
  console.error('启动 Worker 失败:', error);
  process.exit(1);
});
