#!/bin/sh
# =====================================================
# RSS-Post Docker Entrypoint
# 自动生成密钥，零配置启动
# =====================================================

# 生成随机字符串
generate_secret() {
  # 使用 /dev/urandom 生成 32 字节随机数据，然后 base64 编码
  head -c 32 /dev/urandom | base64 | tr -d '\n='
}

# 自动生成 NEXTAUTH_SECRET（如果未设置）
if [ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" = "dev-secret-change-in-production" ]; then
  export NEXTAUTH_SECRET=$(generate_secret)
  echo "[INFO] 自动生成 NEXTAUTH_SECRET"
fi

# 自动生成 CRON_SECRET（如果未设置）
if [ -z "$CRON_SECRET" ]; then
  export CRON_SECRET=$(generate_secret)
  echo "[INFO] 自动生成 CRON_SECRET"
fi

# 设置默认值
: ${NEXTAUTH_URL:="http://localhost:8915"}
: ${APP_URL:="http://localhost:8915"}
: ${NODE_ENV:="production"}
: ${AI_PROVIDER:="openai"}
: ${AI_MODEL:="gpt-4o"}

# 是否启用内置 Worker（通过环境变量控制）
: ${ENABLE_FEED_DISCOVERY_WORKER:="false"}

echo "[INFO] RSS-Post 启动中..."
echo "[INFO] NODE_ENV=$NODE_ENV"
echo "[INFO] AI_PROVIDER=$AI_PROVIDER"
echo "[INFO] ENABLE_FEED_DISCOVERY_WORKER=$ENABLE_FEED_DISCOVERY_WORKER"

# 如果启用了 Worker，在后台启动
if [ "$ENABLE_FEED_DISCOVERY_WORKER" = "true" ]; then
  echo "[INFO] 启动 Feed Discovery Worker..."
  pnpm exec tsx scripts/start-feed-discovery-worker.ts &
  WORKER_PID=$!
  echo "[INFO] Worker PID: $WORKER_PID"
  
  # 设置退出时清理 Worker
  cleanup() {
    echo "[INFO] 停止 Worker..."
    kill $WORKER_PID 2>/dev/null || true
    wait $WORKER_PID 2>/dev/null || true
  }
  trap cleanup EXIT
fi

# 执行传入的命令（启动主应用）
exec "$@"
