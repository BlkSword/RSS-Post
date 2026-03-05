/**
 * Tabs 组件 - 基于 Ant Design Tabs
 */

'use client';

import * as React from 'react';
import { Tabs as AntTabs, TabsProps as AntTabsProps } from 'antd';
import { cn } from '@/lib/utils';

// 本地定义 Tab 类型
interface Tab {
  key: string;
  label: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
  type?: 'line' | 'card' | 'editable-card';
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  items: Tab[];
  setItems: React.Dispatch<React.SetStateAction<Tab[]>>;
}>({
  value: '',
  onValueChange: () => {},
  items: [],
  setItems: () => {},
});

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
  centered = false,
  type = 'line',
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');
  const [items, setItems] = React.useState<Tab[]>([]);

  const value = controlledValue ?? uncontrolledValue;
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange, items, setItems }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: TabsListProps) {
  const { value, onValueChange, items } = React.useContext(TabsContext);

  // 处理子元素，提取 tab 信息
  React.useEffect(() => {
    const tabs: Tab[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === TabsTrigger) {
        const props = child.props as TabsTriggerProps;
        const { value: tabValue, children: label, disabled, icon } = props;
        tabs.push({
          key: tabValue,
          label: (
            <span className="flex items-center gap-1.5">
              {icon}
              {label}
            </span>
          ),
          disabled,
        });
      }
    });
  }, [children]);

  return (
    <div className={cn('border-b border-border/60', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value: tabValue, children, className, disabled, icon }: TabsTriggerProps) {
  const { value, onValueChange } = React.useContext(TabsContext);
  const isActive = value === tabValue;

  return (
    <button
      type="button"
      onClick={() => !disabled && onValueChange(tabValue)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px',
        isActive
          ? 'text-primary border-primary'
          : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function TabsContent({ value: tabValue, children, className }: TabsContentProps) {
  const { value } = React.useContext(TabsContext);

  if (value !== tabValue) {
    return null;
  }

  return (
    <div className={cn('mt-4', className)}>
      {children}
    </div>
  );
}

// 简化的 Ant Design Tabs 包装器
interface SimpleTabsProps extends AntTabsProps {
  items: Array<{
    key: string;
    label: React.ReactNode;
    children: React.ReactNode;
    disabled?: boolean;
  }>;
}

export function SimpleTabs({ items, className, ...props }: SimpleTabsProps) {
  return (
    <AntTabs
      items={items}
      className={cn('', className)}
      {...props}
    />
  );
}

export default Tabs;
