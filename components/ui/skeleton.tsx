/**
 * 骨架屏组件 - 基于 Ant Design Skeleton
 */

import * as React from 'react';
import { Skeleton as AntSkeleton, Space } from 'antd';
import type { SkeletonProps as AntSkeletonProps } from 'antd';
import { cn } from '@/lib/utils';

interface SkeletonProps extends Omit<AntSkeletonProps, 'classNames' | 'styles'> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'image';
  className?: string;
}

export function Skeleton({
  className,
  variant = 'default',
  ...props
}: SkeletonProps) {
  if (variant === 'avatar') {
    return (
      <AntSkeleton.Avatar
        className={cn('', className)}
        {...props}
      />
    );
  }

  if (variant === 'image') {
    return (
      <AntSkeleton.Image
        className={cn('', className)}
        {...props}
      />
    );
  }

  if (variant === 'text') {
    return (
      <AntSkeleton.Input
        className={cn('', className)}
        active
        {...props}
      />
    );
  }

  return (
    <AntSkeleton
      className={cn('', className)}
      active
      {...props}
    />
  );
}

/**
 * 文章列表骨架屏
 */
export function EntryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Space direction="vertical" className="w-full" size="middle">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 rounded-xl border border-border/40 bg-card/50"
        >
          <AntSkeleton.Avatar size="large" shape="square" active />
          <div className="flex-1 space-y-2 min-w-0">
            <AntSkeleton.Input style={{ width: '75%' }} active size="small" />
            <AntSkeleton.Input style={{ width: '50%' }} active size="small" />
          </div>
        </div>
      ))}
    </Space>
  );
}

/**
 * 卡片网格骨架屏
 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-xl border border-border/40 bg-card/50"
        >
          <Space direction="vertical" className="w-full" size="middle">
            <div className="flex items-center gap-3">
              <AntSkeleton.Avatar size="small" active />
              <AntSkeleton.Input style={{ width: 80 }} active size="small" />
            </div>
            <AntSkeleton.Input style={{ width: '100%' }} active size="small" />
            <AntSkeleton.Input style={{ width: '75%' }} active size="small" />
            <AntSkeleton.Image className="w-full h-20" active />
          </Space>
        </div>
      ))}
    </div>
  );
}

/**
 * 文章详情骨架屏
 */
export function ArticleSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <AntSkeleton.Input style={{ width: '75%' }} active size="large" />
      <div className="flex items-center gap-3">
        <AntSkeleton.Avatar size="small" active />
        <AntSkeleton.Input style={{ width: 120 }} active size="small" />
      </div>
      <Space direction="vertical" className="w-full" size="small">
        <AntSkeleton.Input style={{ width: '100%' }} active size="small" />
        <AntSkeleton.Input style={{ width: '100%' }} active size="small" />
        <AntSkeleton.Input style={{ width: '66%' }} active size="small" />
      </Space>
      <AntSkeleton.Image className="w-full h-40 rounded-xl" active />
      <Space direction="vertical" className="w-full" size="small">
        <AntSkeleton.Input style={{ width: '100%' }} active size="small" />
        <AntSkeleton.Input style={{ width: '100%' }} active size="small" />
        <AntSkeleton.Input style={{ width: '80%' }} active size="small" />
      </Space>
    </div>
  );
}

/**
 * 侧边栏骨架屏
 */
export function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <AntSkeleton.Input style={{ width: '100%' }} active size="small" />
      <Space direction="vertical" className="w-full" size="small">
        {Array.from({ length: 5 }).map((_, i) => (
          <AntSkeleton.Input key={i} style={{ width: '100%' }} active size="small" />
        ))}
      </Space>
      <div className="pt-4">
        <Space direction="vertical" className="w-full" size="small">
          {Array.from({ length: 8 }).map((_, i) => (
            <AntSkeleton.Input key={i} style={{ width: '100%' }} active size="small" />
          ))}
        </Space>
      </div>
    </div>
  );
}

export default Skeleton;
