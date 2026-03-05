/**
 * 统一按钮组件 - 基于 Ant Design
 * 为了保持兼容性，保留原有接口，内部使用 Ant Design Button
 */

import * as React from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<AntButtonProps, 'size' | 'loading' | 'variant'> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // 映射 variant 到 antd 的 type 和 danger
    const getAntdProps = () => {
      switch (variant) {
        case 'primary':
          return { type: 'primary' as const, danger: false };
        case 'danger':
          return { type: 'primary' as const, danger: true };
        case 'secondary':
        case 'ghost':
        case 'outline':
          return { type: 'default' as const, danger: false };
        default:
          return { type: 'default' as const, danger: false };
      }
    };

    // 映射 size
    const antdSize = size === 'icon' ? 'middle' : size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'middle';

    const { type, danger } = getAntdProps();

    // 处理 variant 样式
    const variantClass = {
      default: '',
      primary: '',
      secondary: 'bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/80',
      ghost: 'border-transparent bg-transparent hover:bg-muted',
      danger: '',
      outline: 'bg-transparent border-border hover:bg-muted hover:border-primary/30',
    }[variant];

    return (
      <AntButton
        ref={ref}
        type={type}
        danger={danger}
        size={antdSize}
        loading={isLoading}
        disabled={disabled}
        className={cn(
          variantClass,
          size === 'icon' && 'w-9 h-9 p-0 flex items-center justify-center',
          className
        )}
        icon={!isLoading && leftIcon ? leftIcon : undefined}
        {...props}
      >
        {children}
        {!isLoading && rightIcon && (
          <span className="ml-2 inline-flex items-center">{rightIcon}</span>
        )}
      </AntButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
