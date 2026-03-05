#!/bin/bash
# =====================================================
# RSS-Post Docker 构建脚本 (Linux/macOS)
# 根据系统内存自动选择最佳配置
# =====================================================

set -e

echo ""
echo "===================================="
echo "RSS-Post Docker 构建脚本"
echo "===================================="
echo ""

# 检测系统内存
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TOTAL_MEM_GB=$(($(sysctl -n hw.memsize) / 1073741824))
else
    # Linux
    TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_MEM_GB=$((TOTAL_MEM_KB / 1048576))
fi

echo "检测到系统内存: ${TOTAL_MEM_GB} GB"
echo ""

# 根据内存选择配置
if [ "$TOTAL_MEM_GB" -lt 3 ]; then
    echo "[警告] 检测到低内存环境 (${TOTAL_MEM_GB} GB < 3 GB)"
    echo "使用低内存优化配置..."
    echo ""
    echo "构建建议:"
    echo "  - 预计构建时间: 10-20 分钟"
    echo "  - 建议关闭其他应用程序"
    echo "  - 如构建失败，可尝试增加 swap 分区"
    echo ""
    COMPOSE_FILE="docker-compose.lowmem.yml"
    DOCKERFILE="Dockerfile.lowmem"
else
    echo "使用标准配置..."
    COMPOSE_FILE="docker-compose.yml"
    DOCKERFILE="Dockerfile"
fi

echo "配置文件: ${COMPOSE_FILE}"
echo "Dockerfile: ${DOCKERFILE}"
echo ""

# 询问是否继续
read -p "是否开始构建? (y/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "已取消构建"
    exit 0
fi

echo ""
echo "开始构建..."
echo ""

# 启用 BuildKit（Docker 20.10+）
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 构建镜像
docker-compose -f "${COMPOSE_FILE}" build

if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "构建成功!"
    echo "===================================="
    echo ""
    echo "启动服务:"
    echo "  docker-compose -f ${COMPOSE_FILE} up -d"
    echo ""
    echo "查看日志:"
    echo "  docker-compose -f ${COMPOSE_FILE} logs -f"
    echo ""
else
    echo ""
    echo "===================================="
    echo "构建失败!"
    echo "===================================="
    echo ""
    echo "可能的解决方案:"
    echo "  1. 如果内存不足:"
    echo "     - 关闭其他应用程序"
    echo "     - 增加 swap 分区: sudo fallocate -l 2G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
    echo "     - 尝试手动构建: docker-compose -f docker-compose.lowmem.yml build --no-cache"
    echo ""
    echo "  2. 如果网络问题:"
    echo "     - 检查网络连接"
    echo "     - 配置 Docker 镜像加速器"
    echo ""
    echo "  3. 如果磁盘空间不足:"
    echo "     - 清理 Docker 缓存: docker system prune -a"
    echo ""
    exit 1
fi
