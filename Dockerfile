# =====================================================
# RSS-Post Dockerfile (性能优化版本)
# 优化点：
# 1. 更好的缓存层利用
# 2. 更小的镜像大小
# 3. 更低的内存占用
# 4. 更快的启动时间
# 5. BuildKit 缓存加速依赖安装
# =====================================================
# 构建命令: DOCKER_BUILDKIT=1 docker build -t rss-post .
# 或: docker compose build (Docker 20.10+ 默认启用 BuildKit)

# ========== 基础镜像 ==========
FROM node:20-alpine AS base

# 设置 pnpm 环境变量
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# 安装必要工具 + 固定 pnpm 版本（避免每次下载最新版）
# 使用 npmmirror 加速 corepack 下载 pnpm
RUN apk add --no-cache dumb-init curl && \
    mkdir -p $PNPM_HOME && \
    corepack enable && \
    npm config set registry https://registry.npmmirror.com && \
    corepack prepare pnpm@10.12.1 --activate && \
    pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set store-dir /root/.pnpm-store

# ========== 依赖安装层（最大化缓存） ==========
FROM base AS deps
WORKDIR /app

# 🆕 先复制 package 文件，利用 Docker 缓存层
# 单独复制这些文件可以在依赖不变时跳过安装
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma/

# 🆕 安装生产依赖 + Prisma（减少镜像大小）
# --prod 只安装生产依赖，减少约 40% 的 node_modules 大小
# pnpm v10 需要显式允许构建脚本运行
# 使用 BuildKit 缓存加速 pnpm store
RUN --mount=type=cache,target=/root/.pnpm-store \
    echo "ignore-scripts=false" >> ~/.npmrc && \
    pnpm install --prod --frozen-lockfile=false && \
    pnpm add prisma@6.19.2 && \
    pnpm exec prisma generate

# ========== 构建层 ==========
FROM base AS builder
WORKDIR /app

# 🆕 构建时内存限制和优化
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NEXT_TELEMETRY_DISABLED=1

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 安装开发依赖（仅用于构建）
# 使用 BuildKit 缓存加速 pnpm store
RUN --mount=type=cache,target=/root/.pnpm-store \
    echo "ignore-scripts=false" >> ~/.npmrc && \
    pnpm install --frozen-lockfile=false

# 生成 Prisma Client
RUN pnpm exec prisma generate

# 构建应用
RUN pnpm run build

# 🆕 清理不必要的文件
RUN rm -rf node_modules/.cache && \
    rm -rf .next/cache && \
    rm -rf node_modules/@types 2>/dev/null || true

# ========== 生产镜像（最小化） ==========
FROM base AS runner
WORKDIR /app

# 🆕 降低内存限制（standalone 模式更省内存）
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup -g 1001 nodejs && \
    adduser -D -u 1001 -G nodejs nextjs

# 🆕 只复制必要文件（standalone 模式）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 复制启动脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 创建日志目录并设置权限
RUN mkdir -p /app/logs && \
    chown -R nextjs:nodejs /app

# 使用非 root 用户
USER nextjs

# 🆕 优化健康检查（减少启动等待时间）
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
ENV PORT=3000

# 使用启动脚本（自动生成密钥）
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["dumb-init", "--", "node", "server.js"]
