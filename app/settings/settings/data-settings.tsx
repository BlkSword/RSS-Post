/**
 * 数据管理设置组件
 */

'use client';

import { useState } from 'react';
import {
  Database,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  BarChart3,
  Calendar,
  Archive,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';
import { notifySuccess, notifyError } from '@/lib/feedback';
import { Button, Card, Progress, Statistic, Row, Col } from 'antd';

interface DataSettingsProps {
  onOpenDeleteModal: () => void;
}

export function DataSettings({ onOpenDeleteModal }: DataSettingsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const { mutateAsync: exportOPML } = trpc.settings.exportOPML.useMutation();
  const { mutate: clearAllEntries } = trpc.settings.clearAllEntries.useMutation();
  const { mutate: cleanupOldEntries } = trpc.settings.cleanupOldEntries.useMutation();
  
  // 获取文章统计
  const { data: entryStats, refetch: refetchStats } = trpc.settings.getEntryStats.useQuery();
  
  // 获取用户偏好设置
  const { data: settings } = trpc.settings.get.useQuery();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportOPML();
      const blob = new Blob([result.opml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifySuccess('OPML 文件已导出');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : '导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearEntries = async () => {
    if (!confirm('确定要清空所有文章吗？此操作无法撤销。')) return;

    setIsClearing(true);
    try {
      await clearAllEntries();
      notifySuccess('所有文章已清空');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : '清空失败');
    } finally {
      setIsClearing(false);
    }
  };

  const handleCleanup = async () => {
    const retentionDays = (settings?.preferences as any)?.entryRetentionDays ?? 90;
    const retentionLabel = retentionDays === 0 ? '不自动清理' : `${retentionDays}天`;
    
    if (!confirm(`确定要清理文章吗？\n\n当前保留设置：${retentionLabel}\n将删除所有已读且非星标的过期文章。此操作无法撤销。`)) {
      return;
    }

    setIsCleaning(true);
    try {
      const result = await cleanupOldEntries({}) as unknown as { success: boolean; deletedCount: number; preservedCount: number; message: string };
      notifySuccess(result.message);
      // 刷新统计数据
      refetchStats();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : '清理失败');
    } finally {
      setIsCleaning(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '无';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div>
      {/* 文章存储统计 */}
      <div className="mb-6">
        <Card
          className="overflow-hidden"
          variant="borderless"
          title={
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              文章存储统计
            </div>
          }
        >
          <div className="space-y-6">
            {/* 统计数字 */}
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="文章总数"
                  value={entryStats?.totalEntries || 0}
                  formatter={(value) => formatNumber(value as number)}
                  prefix={<Archive className="h-4 w-4 inline mr-1" />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="未读文章"
                  value={entryStats?.unreadEntries || 0}
                  formatter={(value) => formatNumber(value as number)}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="星标文章"
                  value={entryStats?.starredEntries || 0}
                  formatter={(value) => formatNumber(value as number)}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>

            {/* 时间分布 */}
            {entryStats && entryStats.totalEntries > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  文章时间分布
                </div>
                
                <div className="space-y-2">
                  {[
                    { label: '最近7天', count: entryStats.entriesByAge.last7Days, color: '#52c41a' },
                    { label: '最近30天', count: entryStats.entriesByAge.last30Days, color: '#1677ff' },
                    { label: '最近90天', count: entryStats.entriesByAge.last90Days, color: '#722ed1' },
                    { label: '最近半年', count: entryStats.entriesByAge.last180Days, color: '#eb2f96' },
                    { label: '最近一年', count: entryStats.entriesByAge.last365Days, color: '#fa8c16' },
                    { label: '一年以上', count: entryStats.entriesByAge.older, color: '#8c8c8c' },
                  ].map((item) => {
                    const percentage = entryStats.totalEntries > 0 
                      ? Math.round((item.count / entryStats.totalEntries) * 100) 
                      : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-muted-foreground flex-shrink-0">{item.label}</span>
                        <div className="flex-1">
                          <Progress
                            percent={percentage}
                            strokeColor={item.color}
                            showInfo={false}
                            size="small"
                          />
                        </div>
                        <span className="w-16 text-sm text-right">{formatNumber(item.count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 时间范围信息 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">最早文章：</span>
                <span>{formatDate(entryStats?.oldestEntryAt || null)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">最新文章：</span>
                <span>{formatDate(entryStats?.newestEntryAt || null)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 导出 */}
      <div className="mb-6">
        <Card
          className="overflow-hidden"
          variant="borderless"
          title={
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              导出数据
            </div>
          }
        >
          <div className="space-y-4">
          {/* 导出OPML */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">导出 OPML</div>
                <div className="text-sm text-muted-foreground">
                  导出所有订阅源为 OPML 文件，方便备份或迁移到其他RSS阅读器
                </div>
              </div>
            </div>
            <Button
              onClick={handleExport}
              loading={isExporting}
              disabled={isExporting}
              icon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            >
              导出 OPML
            </Button>
          </div>
          </div>
        </Card>
      </div>

      {/* 数据清理 */}
      <div className="mb-6">
        <Card
          className="overflow-hidden"
          variant="borderless"
          title={
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              数据清理
            </div>
          }
        >
          <div className="space-y-4">
          {/* 清理过期文章 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-medium">清理过期文章</div>
                <div className="text-sm text-muted-foreground">
                  根据保留设置清理已读且非星标的过期文章
                  {entryStats && entryStats.retentionDays > 0 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      (当前设置: 保留{entryStats.retentionDays}天)
                    </span>
                  )}
                  {entryStats && entryStats.retentionDays === 0 && (
                    <span className="ml-2 text-muted-foreground">
                      (当前设置: 不自动清理)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              size="small"
              onClick={handleCleanup}
              loading={isCleaning}
              disabled={isCleaning || !entryStats || entryStats.retentionDays === 0}
              icon={isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            >
              立即清理
            </Button>
          </div>

          {/* 清空文章 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="font-medium">清空所有文章</div>
                <div className="text-sm text-muted-foreground">
                  删除所有文章记录，订阅源和分类保留
                </div>
              </div>
            </div>
            <Button
              danger
              size="small"
              onClick={handleClearEntries}
              loading={isClearing}
              disabled={isClearing}
              icon={<Trash2 className="h-4 w-4" />}
            >
              清空文章
            </Button>
          </div>

          {/* 删除账户 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="font-medium">删除账户</div>
                <div className="text-sm text-muted-foreground">
                  永久删除您的账户和所有数据
                </div>
              </div>
            </div>
            <Button
              danger
              size="small"
              onClick={onOpenDeleteModal}
              icon={<Trash2 className="h-4 w-4" />}
            >
              删除账户
            </Button>
          </div>
        </div>
      </Card>
      </div>

      {/* 警告提示 */}
      <div className="mb-6">
        <Card className="border-amber-500/30 bg-amber-500/5" variant="borderless">
        <div className="px-6 py-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-medium text-sm text-amber-800 dark:text-amber-300">重要提醒</h4>
              <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 space-y-1">
                <li>• 清空文章后，所有文章内容将被永久删除</li>
                <li>• 删除账户后，所有数据包括订阅源、文章、设置等都将无法恢复</li>
                <li>• 建议在执行这些操作前先导出 OPML 备份您的订阅源</li>
              </ul>
            </div>
          </div>
        </div>
        </Card>
      </div>
    </div>
  );
}
