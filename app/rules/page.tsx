/**
 * 订阅规则管理页面 - 全屏布局
 * 优化版：添加动画效果、增强视觉设计、拖拽排序
 */

'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  ToggleLeft,
  Play,
  Zap,
  Filter,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ArrowRight,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Button, Card, Modal, Form, Input, Select, Switch, Space, Tag, Badge, Tooltip, Divider, Collapse } from 'antd';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { handleApiSuccess, handleApiError } from '@/lib/feedback';
import { Fade, StaggerContainer, ListItemFade, HoverLift } from '@/components/animation/fade';
import { AnimatedCounter, LoadingDots } from '@/components/animation';
import { Spinner } from '@/components/animation/loading';
import { usePageLoadAnimation, useShakeAnimation, useDragSort } from '@/hooks/use-animation';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

type RuleCondition = {
  field: 'title' | 'content' | 'author' | 'category' | 'tag' | 'feedTitle';
  operator: 'contains' | 'notContains' | 'equals' | 'notEquals' | 'matches' | 'in' | 'gt' | 'lt';
  value: string | string[] | number;
};

type RuleAction = {
  type: 'markRead' | 'markUnread' | 'star' | 'unstar' | 'archive' | 'unarchive' | 'assignCategory' | 'addTag' | 'removeTag';
  params?: Record<string, any>;
};

type Rule = {
  id: string;
  name: string;
  isEnabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  matchedCount: number;
  lastMatchedAt: Date | null;
  order?: number;
};

// 字段配置
const fieldConfig: Record<string, { label: string; icon: string; color: string }> = {
  title: { label: '标题', icon: 'T', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  content: { label: '内容', icon: 'C', color: 'text-green-600 bg-green-50 border-green-200' },
  author: { label: '作者', icon: 'A', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  category: { label: '分类', icon: 'G', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  tag: { label: '标签', icon: '#', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  feedTitle: { label: '订阅源', icon: 'F', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
};

// 操作符配置
const operatorConfig: Record<string, { label: string; symbol: string }> = {
  contains: { label: '包含', symbol: '⊃' },
  notContains: { label: '不包含', symbol: '⊅' },
  equals: { label: '等于', symbol: '=' },
  notEquals: { label: '不等于', symbol: '≠' },
  matches: { label: '匹配', symbol: '~' },
  in: { label: '在列表中', symbol: '∈' },
  gt: { label: '大于', symbol: '>' },
  lt: { label: '小于', symbol: '<' },
};

// 操作配置
const actionConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  markRead: { label: '标记已读', icon: '✓', color: 'text-green-600', bgColor: 'bg-green-50' },
  markUnread: { label: '标记未读', icon: '○', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  star: { label: '添加星标', icon: '★', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  unstar: { label: '移除星标', icon: '☆', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  archive: { label: '归档', icon: '▣', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  unarchive: { label: '取消归档', icon: '□', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  assignCategory: { label: '分配分类', icon: '📁', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  addTag: { label: '添加标签', icon: '+', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  removeTag: { label: '移除标签', icon: '-', color: 'text-red-600', bgColor: 'bg-red-50' },
};

const fieldOptions = [
  { label: '标题', value: 'title' },
  { label: '内容', value: 'content' },
  { label: '作者', value: 'author' },
  { label: '分类', value: 'category' },
  { label: '标签', value: 'tag' },
  { label: '订阅源', value: 'feedTitle' },
];

const operatorOptions = [
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'notContains' },
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'notEquals' },
  { label: '匹配正则', value: 'matches' },
  { label: '在列表中', value: 'in' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
];

const actionOptions = [
  { label: '标记为已读', value: 'markRead' },
  { label: '标记为未读', value: 'markUnread' },
  { label: '添加星标', value: 'star' },
  { label: '移除星标', value: 'unstar' },
  { label: '归档', value: 'archive' },
  { label: '取消归档', value: 'unarchive' },
  { label: '分配分类', value: 'assignCategory' },
  { label: '添加标签', value: 'addTag' },
  { label: '移除标签', value: 'removeTag' },
];

export default function RulesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestResult, setShowTestResult] = useState(false);
  const [localRules, setLocalRules] = useState<Rule[]>([]);

  const isPageLoaded = usePageLoadAnimation(150);
  const { isShaking, shake, shakeClass } = useShakeAnimation();

  const { data: rules, isLoading, refetch } = trpc.rules.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const addMutation = trpc.rules.add.useMutation();
  const updateMutation = trpc.rules.update.useMutation();
  const deleteMutation = trpc.rules.delete.useMutation();
  const toggleMutation = trpc.rules.toggle.useMutation();
  const testMutation = trpc.rules.test.useMutation();
  const executeMutation = trpc.rules.execute.useMutation();

  const [form] = Form.useForm();

  // 使用本地状态管理拖拽排序
  const displayRules = localRules.length > 0 ? localRules : (rules || []);
  
  const {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  } = useDragSort(displayRules as any[], (newItems) => {
    setLocalRules(newItems);
    // 这里可以调用 API 保存排序
  });

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    setTestResult(null);
    setShowTestResult(false);
    setShowForm(true);
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    form.setFieldsValue({
      name: rule.name,
      conditions: rule.conditions,
      actions: rule.actions,
    });
    setTestResult(null);
    setShowTestResult(false);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条规则吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({ id });
          handleApiSuccess('删除成功');
          refetch();
        } catch (error) {
          handleApiError(error, '删除失败');
        }
      },
    });
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, enabled });
      refetch();
    } catch (error) {
      handleApiError(error, '操作失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRule) {
        await updateMutation.mutateAsync({
          id: editingRule.id,
          ...values,
        });
        handleApiSuccess('更新成功');
      } else {
        await addMutation.mutateAsync(values);
        handleApiSuccess('创建成功');
      }
      setShowForm(false);
      form.resetFields();
      setTestResult(null);
      setShowTestResult(false);
      refetch();
    } catch (error) {
      handleApiError(error, editingRule ? '更新失败' : '创建失败');
      shake();
    }
  };

  const handleTest = async () => {
    const values = form.getFieldsValue();
    if (!values.conditions?.length) {
      shake();
      handleApiError(new Error('请至少添加一个条件'), '测试失败');
      return;
    }
    try {
      setShowTestResult(true);
      setTestResult(null);
      const result = await testMutation.mutateAsync({
        rule: {
          name: values.name || '测试规则',
          conditions: values.conditions || [],
          actions: values.actions || [],
        },
        sampleCount: 5,
      });
      setTestResult(result);
    } catch (error) {
      handleApiError(error, '测试失败');
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await executeMutation.mutateAsync({ ruleId: id });
      handleApiSuccess('规则执行成功');
      refetch();
    } catch (error) {
      handleApiError(error, '执行失败');
    }
  };

  // 渲染条件标签
  const renderConditionTag = (condition: RuleCondition, index: number) => {
    const field = fieldConfig[condition.field] || fieldConfig.title;
    const operator = operatorConfig[condition.operator] || operatorConfig.contains;
    
    return (
      <div
        key={index}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          'bg-muted/50 border border-border/60 hover:border-primary/30',
          'transition-all duration-200'
        )}
      >
        <span className={cn('w-5 h-5 rounded flex items-center justify-center text-xs font-bold', field.color)}>
          {field.icon}
        </span>
        <span className="font-medium">{field.label}</span>
        <Tooltip title={operator.label}>
          <span className="text-muted-foreground font-mono text-xs px-1">{operator.symbol}</span>
        </Tooltip>
        <span className="text-primary font-medium max-w-[120px] truncate">
          "{String(condition.value)}"
        </span>
      </div>
    );
  };

  // 渲染操作标签
  const renderActionTag = (action: RuleAction, index: number) => {
    const config = actionConfig[action.type] || actionConfig.markRead;
    
    return (
      <div
        key={index}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          config.bgColor,
          'border border-transparent hover:border-current/20',
          'transition-all duration-200'
        )}
      >
        <span className={cn('font-bold', config.color)}>{config.icon}</span>
        <span className={cn('font-medium', config.color)}>{config.label}</span>
        {action.params && Object.keys(action.params).length > 0 && (
          <span className="text-xs opacity-70">
            ({Object.values(action.params)[0]})
          </span>
        )}
      </div>
    );
  };

  // 渲染规则卡片
  const renderRuleCard = (rule: any, index: number) => {
    const isDragged = draggedIndex === index;
    const isDragOver = dragOverIndex === index;
    
    return (
      <ListItemFade key={rule.id} index={index} baseDelay={60}>
        <HoverLift lift={3} shadow={false}>
          <Card
            className={cn(
              'border-border/60 transition-all duration-300 overflow-hidden',
              !rule.isEnabled && 'opacity-60 bg-muted/30',
              isDragged && 'opacity-50 rotate-2 scale-[1.02] shadow-lg',
              isDragOver && 'border-primary/50 border-dashed'
            )}
            size="small"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e as any, index)}
            onDrop={(e) => handleDrop(e as any, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-start gap-3">
              {/* 拖拽手柄 */}
              <div 
                className="flex-shrink-0 pt-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                title="拖拽排序"
              >
                <GripVertical className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                {/* 头部：名称和状态 */}
                <div className="flex items-center gap-3 mb-3">
                  <h3 className={cn('font-semibold text-base', !rule.isEnabled && 'text-muted-foreground')}>
                    {rule.name}
                  </h3>
                  
                  {/* 启用/禁用切换动画 */}
                  <Fade in={true} duration={200}>
                    <Switch
                      size="small"
                      checked={rule.isEnabled}
                      onChange={(e) => handleToggle(rule.id, e)}
                      className={cn(
                        'transition-all duration-300',
                        rule.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                      )}
                    />
                  </Fade>
                  
                  {/* 匹配计数 */}
                  <Tooltip title="已匹配文章数">
                    <Badge 
                      count={rule.matchedCount} 
                      showZero 
                      className={cn(
                        'transition-all duration-300',
                        rule.matchedCount > 0 ? 'opacity-100' : 'opacity-50'
                      )}
                    />
                  </Tooltip>
                  
                  {/* 状态徽章 */}
                  {rule.isEnabled ? (
                    <StatusBadge status="success" pulse={rule.matchedCount > 0}>
                      运行中
                    </StatusBadge>
                  ) : (
                    <StatusBadge status="default">
                      已禁用
                    </StatusBadge>
                  )}
                </div>

                {/* 条件和操作流程图 */}
                <div className="space-y-3">
                  {/* 条件区域 */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-16 pt-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        如果
                      </span>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {(rule.conditions as RuleCondition[])?.map((condition, idx) => 
                        renderConditionTag(condition, idx)
                      )}
                      {!rule.conditions?.length && (
                        <span className="text-xs text-muted-foreground italic">无条件（匹配所有文章）</span>
                      )}
                    </div>
                  </div>

                  {/* 箭头连接 */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 flex justify-center">
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  </div>

                  {/* 操作区域 */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-16 pt-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        那么
                      </span>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {(rule.actions as RuleAction[])?.map((action, idx) => 
                        renderActionTag(action, idx)
                      )}
                      {!rule.actions?.length && (
                        <span className="text-xs text-muted-foreground italic">无操作</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 最后匹配时间 */}
                <Fade in={!!rule.lastMatchedAt} duration={300}>
                  {rule.lastMatchedAt && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      最后匹配: {new Date(rule.lastMatchedAt).toLocaleString('zh-CN')}
                    </div>
                  )}
                </Fade>
              </div>

              {/* 操作按钮 */}
              <Space className="flex-shrink-0">
                <Tooltip title="执行规则">
                  <Button
                    type="text"
                    size="small"
                    icon={<Play className="h-4 w-4" />}
                    onClick={() => handleExecute(rule.id)}
                    disabled={!rule.isEnabled}
                    className="hover:text-primary hover:bg-primary/10"
                  />
                </Tooltip>
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<Edit className="h-4 w-4" />}
                    onClick={() => handleEdit(rule)}
                    className="hover:text-blue-600 hover:bg-blue-50"
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => handleDelete(rule.id)}
                    className="hover:bg-red-50"
                  />
                </Tooltip>
              </Space>
            </div>
          </Card>
        </HoverLift>
      </ListItemFade>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <aside className="w-60 flex-shrink-0 border-r border-border/60 bg-muted/5 hidden lg:block">
          <AppSidebar />
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto bg-background/30">
          <Fade in={isPageLoaded} duration={400} direction="up" distance={20}>
            <div className="max-w-5xl mx-auto px-6 py-8">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Settings2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">订阅规则</h1>
                      <p className="text-muted-foreground text-sm">自动处理符合条件的文章</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* 统计信息 */}
                  {rules && rules.length > 0 && (
                    <div className="hidden sm:flex items-center gap-6 px-4 py-2 bg-muted/30 rounded-xl">
                      <AnimatedCounter
                        value={rules.length}
                        label="规则总数"
                        duration={800}
                        className="text-sm"
                      />
                      <div className="w-px h-8 bg-border/60" />
                      <AnimatedCounter
                        value={rules.filter((r: { isEnabled: boolean }) => r.isEnabled).length}
                        label="启用中"
                        variant="success"
                        duration={800}
                        className="text-sm"
                      />
                    </div>
                  )}
                  
                  <Button 
                    type="primary" 
                    icon={<Plus className="h-4 w-4" />} 
                    onClick={handleAdd}
                    size="large"
                    className="shadow-lg shadow-primary/20"
                  >
                    新建规则
                  </Button>
                </div>
              </div>

              {/* 规则列表 */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Spinner size="lg" variant="primary" className="mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground animate-pulse">加载规则中...</p>
                  </div>
                </div>
              ) : !rules || rules.length === 0 ? (
                <EmptyState
                  icon={<Settings2 className="w-10 h-10" />}
                  title="还没有创建任何规则"
                  description="创建规则来自动处理符合条件的文章，例如自动标记已读、添加星标或归档"
                  action={{
                    label: '创建第一个规则',
                    onClick: handleAdd,
                  }}
                  variant="card"
                />
              ) : (
                <div className="space-y-3">
                  {/* 拖拽提示 */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <GripVertical className="w-3 h-3" />
                    <span>拖拽卡片可调整规则执行顺序</span>
                  </div>
                  
                  {displayRules.map((rule, index) => renderRuleCard(rule as any, index))}
                </div>
              )}
            </div>
          </Fade>
        </main>
      </div>

      {/* 规则编辑弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span>{editingRule ? '编辑规则' : '新建规则'}</span>
          </div>
        }
        open={showForm}
        onCancel={() => {
          setShowForm(false);
          setEditingRule(null);
          form.resetFields();
          setTestResult(null);
          setShowTestResult(false);
        }}
        width={720}
        footer={null}
        className={shakeClass}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          {/* 规则名称 */}
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input 
              placeholder="例如：科技新闻自动归档" 
              size="large"
              prefix={<Sparkles className="w-4 h-4 text-muted-foreground" />}
            />
          </Form.Item>

          {/* 条件区域 */}
          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                <Filter className="w-3 h-3 text-blue-600" />
              </div>
              <span className="font-medium">匹配条件</span>
              <span className="text-xs text-muted-foreground">（满足以下所有条件时执行操作）</span>
            </div>

            <Form.List name="conditions">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map(({ key, name, ...restField }) => (
                    <div 
                      key={key} 
                      className="flex items-start gap-2 bg-background rounded-lg p-3 border border-border/60"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'field']}
                        rules={[{ required: true, message: '选择字段' }]}
                        className="mb-0"
                        style={{ width: 120 }}
                      >
                        <Select placeholder="字段" options={fieldOptions} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'operator']}
                        rules={[{ required: true, message: '选择操作符' }]}
                        className="mb-0"
                        style={{ width: 120 }}
                      >
                        <Select placeholder="操作" options={operatorOptions} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '输入值' }]}
                        className="mb-0 flex-1"
                      >
                        <Input placeholder="值" />
                      </Form.Item>
                      <Button 
                        type="text" 
                        icon={<X className="h-4 w-4" />} 
                        onClick={() => remove(name)}
                        className="text-muted-foreground hover:text-red-500"
                      />
                    </div>
                  ))}
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    icon={<Plus className="h-4 w-4" />} 
                    block
                    className="border-dashed"
                  >
                    添加条件
                  </Button>
                </div>
              )}
            </Form.List>
          </div>

          {/* 操作区域 */}
          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                <Zap className="w-3 h-3 text-green-600" />
              </div>
              <span className="font-medium">执行操作</span>
              <span className="text-xs text-muted-foreground">（匹配成功后执行的操作）</span>
            </div>

            <Form.List name="actions">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map(({ key, name, ...restField }) => (
                    <div 
                      key={key} 
                      className="flex items-start gap-2 bg-background rounded-lg p-3 border border-border/60"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'type']}
                        rules={[{ required: true, message: '选择操作类型' }]}
                        className="mb-0 flex-1"
                      >
                        <Select 
                          placeholder="操作类型" 
                          options={actionOptions}
                          className="w-full"
                        />
                      </Form.Item>
                      <Button 
                        type="text" 
                        icon={<X className="h-4 w-4" />} 
                        onClick={() => remove(name)}
                        className="text-muted-foreground hover:text-red-500"
                      />
                    </div>
                  ))}
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    icon={<Plus className="h-4 w-4" />} 
                    block
                    className="border-dashed"
                  >
                    添加操作
                  </Button>
                </div>
              )}
            </Form.List>
          </div>

          {/* 测试结果区域 */}
          <Fade in={showTestResult} duration={300} direction="up" distance={10}>
            {showTestResult && (
              <div className="bg-muted/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Play className="w-3 h-3 text-purple-600" />
                  </div>
                  <span className="font-medium">测试结果</span>
                  {testResult && (
                    <StatusBadge status={testResult.matchedCount > 0 ? 'success' : 'warning'}>
                      匹配 {testResult.matchedCount || 0} 篇文章
                    </StatusBadge>
                  )}
                </div>
                
                <div className="bg-background rounded-lg p-4 border border-border/60">
                  {!testResult ? (
                    <div className="flex items-center justify-center py-4">
                      <LoadingDots size="sm" className="text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">测试中...</span>
                    </div>
                  ) : testResult.matches?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {testResult.matches.map((match: any, idx: number) => (
                        <ListItemFade key={idx} index={idx} baseDelay={30}>
                          <div className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="truncate flex-1">{match.entryTitle}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              匹配 {match.matchedConditions?.length || 0} 个条件
                            </span>
                          </div>
                        </ListItemFade>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <X className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">没有匹配的文章</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Fade>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button 
              onClick={() => {
                setShowForm(false);
                setTestResult(null);
                setShowTestResult(false);
              }}
              size="large"
            >
              取消
            </Button>
            <Button 
              onClick={handleTest} 
              icon={<Zap className="h-4 w-4" />}
              size="large"
              loading={testMutation.isPending}
            >
              测试规则
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              loading={addMutation.isPending || updateMutation.isPending}
              className="shadow-lg shadow-primary/20"
            >
              {editingRule ? '保存修改' : '创建规则'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
