/**
 * 统一卡片组件 - 基于 Ant Design Card
 * 为了保持兼容性，保留原有接口，内部使用 Ant Design Card
 */

import * as React from 'react';
import { Card as AntCard, CardProps as AntCardProps } from 'antd';
import { cn } from '@/lib/utils';

export interface CardProps extends Omit<AntCardProps, 'size' | 'variant'> {
  isHoverable?: boolean;
  isClickable?: boolean;
  isActive?: boolean;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      isHoverable = false,
      isClickable = false,
      isActive = false,
      variant = 'default',
      noPadding = false,
      children,
      bodyStyle,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: '',
      elevated: 'shadow-lg',
      outlined: 'border-2',
      ghost: 'border-none bg-transparent shadow-none',
    };

    return (
      <AntCard
        ref={ref}
        className={cn(
          'transition-all duration-300',
          variantStyles[variant],
          isHoverable && 'hover:shadow-lg hover:-translate-y-1',
          isClickable && 'cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.99]',
          isActive && 'ring-2 ring-primary/30 border-primary/50',
          className
        )}
        styles={{
          body: {
            padding: noPadding ? 0 : undefined,
            ...bodyStyle,
          },
        }}
        {...props}
      >
        {children}
      </AntCard>
    );
  }
);

Card.displayName = 'Card';

// 为了向后兼容，导出 Card 的子组件（实际使用 antd Card 的常规用法）
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 mb-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold leading-tight tracking-tight text-base', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-3 mt-4 pt-4 border-t border-border/60', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export default Card;
