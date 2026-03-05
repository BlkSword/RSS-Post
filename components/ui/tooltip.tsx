/**
 * 提示组件 - 基于 Ant Design Tooltip
 */

import * as React from 'react';
import { Tooltip as AntTooltip } from 'antd';
import type { TooltipProps as AntTooltipProps } from 'antd';
import { cn } from '@/lib/utils';

export interface TooltipProps extends Omit<AntTooltipProps, 'title' | 'placement'> {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionMap = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
} as const;

export function Tooltip({
  content,
  children,
  position = 'top',
  className,
  ...props
}: TooltipProps) {
  return (
    <AntTooltip
      title={content}
      placement={positionMap[position]}
      className={cn('', className)}
      {...props}
    >
      {children}
    </AntTooltip>
  );
}

export default Tooltip;
