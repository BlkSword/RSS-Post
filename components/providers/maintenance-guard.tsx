/**
 * 维护模式守卫组件
 * 检查系统是否处于维护模式，如果是，普通用户将看到维护页面
 * 管理员（admin+）可以正常访问
 */

'use client';

import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Wrench, Shield, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// 不需要检查维护模式的路径
const EXCLUDED_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api',
  '/init',
];

// 检查路径是否应该被排除
function shouldExclude(path: string): boolean {
  return EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 获取系统设置
  const { data: settings, isLoading: settingsLoading } = trpc.admin.getSystemSettings.useQuery();

  // 获取当前用户信息
  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();

  // 加载中，显示简单的加载状态
  if (settingsLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  // 如果不在维护模式，正常显示
  if (!settings?.maintenanceMode) {
    return <>{children}</>;
  }

  // 排除的路径（登录、注册等页面）正常显示
  if (shouldExclude(pathname)) {
    return <>{children}</>;
  }

  // 检查用户是否是管理员（admin 及以上角色）
  const userRole = user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // 管理员可以正常访问
  if (isAdmin) {
    return (
      <>
        {/* 管理员看到维护模式提示条 */}
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white text-center py-2 text-sm font-medium shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>系统当前处于维护模式，普通用户无法访问</span>
          </div>
        </div>
        {/* 添加顶部间距，避免内容被提示条遮挡 */}
        <div className="pt-10">
          {children}
        </div>
      </>
    );
  }

  // 普通用户看到维护页面
  return <MaintenancePage message={settings.maintenanceMessage} />;
}

/**
 * 维护模式页面
 */
function MaintenancePage({ message }: { message?: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          {/* 图标 */}
          <div className="relative mx-auto w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wrench className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-3xl font-bold mb-4 text-foreground">
            系统维护中
          </h1>

          {/* 描述 */}
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {message || '系统正在进行维护升级，请稍后再试。'}
          </p>

          {/* 装饰性卡片 */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">预计维护时间</p>
                  <p className="text-muted-foreground text-xs">请稍后刷新页面重试</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">数据安全</p>
                  <p className="text-muted-foreground text-xs">您的数据已安全保存</p>
                </div>
              </div>
            </div>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={() => window.location.reload()}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-xl',
              'bg-primary text-primary-foreground font-medium',
              'hover:opacity-90 transition-opacity',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            刷新页面
          </button>
        </div>
      </div>
    </div>
  );
}
