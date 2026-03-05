import { NextResponse } from "next/server";
import { ensureAIWorkerStarted } from "@/lib/ai/worker-bootstrap";
import { db } from "@/lib/db";
import { CacheService } from "@/lib/cache/redis-cache";

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let overallStatus = "ok";

  // 启动AI分析队列（异步，不阻塞响应）
  ensureAIWorkerStarted().catch(err => {
    console.error('启动AI队列失败:', err);
  });

  // 检查数据库连接
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = {
      status: "ok",
      latency: Date.now() - start
    };
  } catch (err) {
    checks.database = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error"
    };
    overallStatus = "degraded";
  }

  // 检查 Redis 连接
  try {
    const start = Date.now();
    const redisOk = await CacheService.ping();
    if (redisOk) {
      checks.redis = {
        status: "ok",
        latency: Date.now() - start
      };
    } else {
      checks.redis = {
        status: "disabled",
        error: "Redis not configured or connection failed"
      };
    }
  } catch (err) {
    checks.redis = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error"
    };
    overallStatus = "degraded";
  }

  // 环境信息
  checks.environment = {
    status: process.env.NODE_ENV === "production" ? "production" : "development"
  };

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks,
  }, {
    status: overallStatus === "ok" ? 200 : 503
  });
}
