/**
 * 空状态组件 - 基于 Ant Design Empty
 */

'use client';

import { ReactNode } from 'react';
import { Empty, Button } from 'antd';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

export function EmptyState({
  icon,
  title = '暂无数据',
  description = '这里还没有任何内容',
  action,
  secondaryAction,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const variants = {
    default: 'py-20 px-8',
    compact: 'py-12 px-6',
    card: 'py-16 px-8 bg-card border border-border/60 rounded-2xl',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variants[variant],
        className
      )}
    >
      <Empty
        image={icon ? <div className="text-muted-foreground/60 mb-4">{icon}</div> : Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              {description}
            </p>
          </div>
        }
      />

      <div className="flex items-center gap-3 mt-4">
        {action && (
          <Button
            type="primary"
            onClick={action.onClick}
            icon={action.icon}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
