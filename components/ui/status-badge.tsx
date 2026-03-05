/**
 * 状态徽章组件 - 基于 Ant Design Tag
 */

'use client';

import { Tag } from 'antd';
import type { TagProps } from 'antd';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends Omit<TagProps, 'color' | 'icon'> {
  status: 'success' | 'warning' | 'error' | 'info' | 'default' | 'processing';
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
  pulse?: boolean;
}

const statusColorMap = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'blue',
  default: 'default',
  processing: 'processing',
};

const statusDotColor = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  default: 'bg-muted-foreground',
  processing: 'bg-primary',
};

export function StatusBadge({
  status,
  children,
  className,
  animated = true,
  pulse = false,
  ...props
}: StatusBadgeProps) {
  const color = statusColorMap[status];

  return (
    <Tag
      color={color}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        animated && 'transition-all duration-200',
        className
      )}
      icon={
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full inline-block',
            statusDotColor[status],
            (status === 'processing' || pulse) && 'animate-pulse'
          )}
        />
      }
      {...props}
    >
      {children}
    </Tag>
  );
}

export default StatusBadge;
