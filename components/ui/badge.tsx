/**
 * 徽章组件 - 基于 Ant Design Tag
 * 用于展示状态、计数、标签等
 */

import * as React from 'react';
import { Tag } from 'antd';
import type { TagProps } from 'antd';
import { cn } from '@/lib/utils';

export interface BadgeProps extends Omit<TagProps, 'color' | 'variant'> {
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantColorMap = {
  default: 'default',
  primary: 'blue',
  secondary: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'processing',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant = 'default', size = 'sm', dot = false, children, ...props },
    ref
  ) => {
    const color = variantColorMap[variant];

    return (
      <Tag
        ref={ref}
        color={color}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium',
          size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-0.5',
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              variant === 'default' && 'bg-muted-foreground',
              variant === 'primary' && 'bg-blue-500',
              variant === 'success' && 'bg-green-500',
              variant === 'warning' && 'bg-yellow-500',
              variant === 'danger' && 'bg-red-500',
              variant === 'info' && 'bg-blue-500'
            )}
          />
        )}
        {children}
      </Tag>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
