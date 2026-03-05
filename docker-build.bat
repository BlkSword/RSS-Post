@echo off
REM =====================================================
REM RSS-Post Docker 构建脚本 (Windows)
REM 根据系统内存自动选择最佳配置
REM =====================================================

setlocal enabledelayedexpansion

echo.
echo ====================================
echo RSS-Post Docker 构建脚本
echo ====================================
echo.

REM 检测系统内存（Windows）
for /f "tokens=2 delims==" %%A in ('wmic OS get TotalVisibleMemorySize /value ^| find "="') do set TOTAL_MEM=%%A
set /a TOTAL_MEM_GB=!TOTAL_MEM! / 1048576

echo 检测到系统内存: !TOTAL_MEM_GB! GB
echo.

REM 根据内存选择配置
if !TOTAL_MEM_GB! LSS 3 (
    echo [警告] 检测到低内存环境 (!TOTAL_MEM_GB! GB ^< 3 GB^)
    echo 使用低内存优化配置...
    echo.
    echo 构建建议:
    echo   - 预计构建时间: 10-20 分钟
    echo   - 建议关闭其他应用程序
    echo   - 如构建失败，可尝试增加虚拟内存/页面文件
    echo.
    set COMPOSE_FILE=docker-compose.lowmem.yml
    set DOCKERFILE=Dockerfile.lowmem
) else (
    echo 使用标准配置...
    set COMPOSE_FILE=docker-compose.yml
    set DOCKERFILE=Dockerfile
)

echo 配置文件: !COMPOSE_FILE!
echo Dockerfile: !DOCKERFILE!
echo.

REM 询问是否继续
set /p CONFIRM="是否开始构建? (y/n): "
if /i not "!CONFIRM!"=="y" (
    echo 已取消构建
    exit /b 0
)

echo.
echo 开始构建...
echo.

REM 启用 BuildKit（Docker 20.10+）
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

REM 构建镜像
docker-compose -f !COMPOSE_FILE! build

if !ERRORLEVEL! EQU 0 (
    echo.
    echo ====================================
    echo 构建成功!
    echo ====================================
    echo.
    echo 启动服务:
    echo   docker-compose -f !COMPOSE_FILE! up -d
    echo.
    echo 查看日志:
    echo   docker-compose -f !COMPOSE_FILE! logs -f
    echo.
) else (
    echo.
    echo ====================================
    echo 构建失败!
    echo ====================================
    echo.
    echo 可能的解决方案:
    echo   1. 如果内存不足:
    echo      - 关闭其他应用程序
    echo      - 增加虚拟内存/页面文件
    echo      - 尝试手动构建: docker-compose -f docker-compose.lowmem.yml build --no-cache
    echo.
    echo   2. 如果网络问题:
    echo      - 检查网络连接
    echo      - 配置 Docker 镜像加速器
    echo.
    echo   3. 如果磁盘空间不足:
    echo      - 清理 Docker 缓存: docker system prune -a
    echo.
)

endlocal
