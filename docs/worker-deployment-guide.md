# Feed Discovery Worker 部署指南

## 背景

OPML 导入订阅源后，需要 **Feed Discovery Worker** 来完成：
1. 检查订阅源可达性
2. 补充订阅源信息（标题、描述、图标）
3. 触发首次抓取

本指南介绍两种部署方式，你可以根据实际需求选择。

---

## 方案对比

| 维度 | 方案A：独立容器 (推荐) | 方案B：合并到 App 容器 |
|------|---------------------|---------------------|
| **资源占用** | 多一个容器（~50MB内存） | 共享容器内存 |
| **扩展性** | ⭐⭐⭐ 可独立扩容 Worker | ⭐ 只能整体扩容 |
| **故障隔离** | ⭐⭐⭐ Worker 崩溃不影响主应用 | ⭐ 进程崩溃会导致容器重启 |
| **监控/日志** | ⭐⭐⭐ 独立日志，便于排查 | ⭐ 日志混在一起 |
| **部署复杂度** | ⭐⭐ 多一个服务 | ⭐⭐⭐ 单服务 |
| **适用场景** | 生产环境、高并发导入 | 开发环境、资源受限 |

---

## 方案A：独立 Worker 容器（默认/推荐）

这是默认配置，Worker 作为独立服务运行。

### 配置

`docker-compose.yml` 中保持以下服务：

```yaml
services:
  app:
    # ... 其他配置
    environment:
      # 保持 false，使用独立 Worker
      ENABLE_FEED_DISCOVERY_WORKER: "false"
  
  # 独立 Worker 服务
  feed-discovery-worker:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://rss_post:rss_post_password@postgres:5432/rss_post
      REDIS_URL: redis://redis:6379
      FEED_DISCOVERY_CONCURRENCY: "3"
    command: pnpm exec tsx scripts/start-feed-discovery-worker.ts
    restart: unless-stopped
```

### 启动

```bash
docker-compose up -d
```

### 优点
- Worker 可以独立扩展（如果任务堆积，只扩容 Worker）
- 故障隔离，Worker 崩溃不影响主应用
- 独立日志便于排查问题

---

## 方案B：合并到 App 容器

如果资源有限（如低配 VPS），可以在主应用容器内启动 Worker。

### 配置步骤

#### 1. 修改 docker-compose.yml

注释掉 `feed-discovery-worker` 服务，并在 app 中启用内置 Worker：

```yaml
services:
  app:
    # ... 其他配置
    environment:
      # 启用内置 Worker
      ENABLE_FEED_DISCOVERY_WORKER: "true"
      FEED_DISCOVERY_CONCURRENCY: "2"  # 建议降低并发数
    
  # 注释掉独立 Worker 服务
  # feed-discovery-worker:
  #   ...
```

#### 2. 重启服务

```bash
docker-compose down
docker-compose up -d
```

### 验证 Worker 是否启动

查看日志：

```bash
# 查看 app 容器日志，应该包含 Worker 启动信息
docker-compose logs -f app | grep -E "(Feed Discovery|Worker)"
```

你应该看到：
```
[INFO] 启动 Feed Discovery Worker...
==========================================
  Feed Discovery Worker 启动中...
==========================================
```

---

## 本地开发

本地开发时建议使用独立终端启动 Worker：

```bash
# 终端 1：启动 Next.js 开发服务器
npm run dev

# 终端 2：启动 Worker
npm run worker:feed-discovery
```

这样日志分离，便于调试。

---

## 性能调优

### Worker 并发数配置

通过环境变量 `FEED_DISCOVERY_CONCURRENCY` 控制：

```yaml
# 低配服务器（2核4G）
FEED_DISCOVERY_CONCURRENCY: "2"

# 中高配服务器（4核8G+）
FEED_DISCOVERY_CONCURRENCY: "5"
```

### 监控队列状态

可以在应用中调用以下函数获取队列状态：

```typescript
import { getFeedDiscoveryQueueStatus } from '@/lib/queue/feed-discovery-processor';

const status = await getFeedDiscoveryQueueStatus();
console.log(status);
// {
//   waiting: 10,    // 等待处理的任务
//   active: 2,      // 正在处理的任务
//   completed: 50,  // 已完成的任务
//   failed: 1       // 失败的任务
// }
```

---

## 常见问题

### Q: OPML 导入后订阅源没有内容？

**检查 Worker 是否运行：**

```bash
# 方案A（独立容器）：检查 Worker 容器状态
docker-compose ps

# 方案B（内置）：检查 app 容器日志
docker-compose logs app | grep "Feed Discovery"
```

**检查 Redis 连接：**

Worker 依赖 Redis，确保 Redis 服务正常：

```bash
docker-compose exec redis redis-cli ping
# 应返回 PONG
```

### Q: Worker 占用太多资源？

降低并发数：

```yaml
environment:
  FEED_DISCOVERY_CONCURRENCY: "1"  # 改为单线程处理
```

### Q: 如何重启 Worker？

**方案A（独立容器）：**
```bash
docker-compose restart feed-discovery-worker
```

**方案B（内置）：**
```bash
docker-compose restart app
```

---

## 生产环境建议

1. **推荐使用方案A（独立容器）**，原因：
   - 可以独立监控 Worker 健康状态
   - 可以针对 Worker 设置资源限制
   - 可以独立扩展 Worker（Kubernetes 下很方便）

2. **监控指标**：
   - 队列堆积数（waiting）
   - Worker 处理速率
   - 失败任务数

3. **告警设置**：
   - waiting > 100 时告警（任务堆积）
   - failed > 0 时告警（有任务失败）
