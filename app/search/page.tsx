/**
 * 搜索页面 - 全屏布局（优化版）
 * 增强的UI/UX：搜索框动画、过滤器动画、搜索历史、搜索建议、骨架屏
 */

'use client';

import { useState, Suspense, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  X,
  Clock,
  TrendingUp,
  History,
  Sparkles,
  FileSearch,
  Bookmark,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Input, Spin, Select, Badge } from 'antd';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { trpc } from '@/lib/trpc/client';
import {
  CompactEntryList,
  CompactEntryItem,
  CompactEntryEmpty,
} from '@/components/entries/compact-entry-list';
import { cn } from '@/lib/utils';
import { Fade, StaggerContainer, ListItemFade } from '@/components/animation/fade';
import { usePageLoadAnimation } from '@/hooks/use-animation';
import { EmptyState } from '@/components/ui/empty-state';
import { EntryListSkeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';

// 搜索历史最大数量
const MAX_SEARCH_HISTORY = 10;

// 热门搜索建议
const POPULAR_SEARCHES = ['AI', 'React', 'TypeScript', '开源', '前端'];

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isPageLoaded = usePageLoadAnimation(100);

  // 搜索历史
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>(
    'rss:search-history',
    []
  );

  const [filters, setFilters] = useState({
    feedId: '',
    categoryId: '',
    isRead: undefined as boolean | undefined,
    isStarred: false,
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 当搜索条件改变时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [query, filters.feedId, filters.categoryId, filters.isRead, filters.isStarred]);

  // 页面切换时滚动到顶部
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // 获取搜索结果
  const { data: searchResults, isLoading } = trpc.entries.list.useQuery(
    {
      page: currentPage,
      limit: pageSize,
      search: hasSearched ? query : undefined,
      feedId: filters.feedId || undefined,
      unreadOnly: filters.isRead === true ? true : undefined,
      starredOnly: filters.isStarred ? true : undefined,
    },
    {
      enabled: hasSearched && query.length > 0,
    }
  );

  // 获取数据
  const { data: feeds } = trpc.feeds.list.useQuery({ limit: 100 });
  const { data: categories } = trpc.categories.list.useQuery();

  const entries = searchResults?.items || [];
  const totalCount = searchResults?.pagination?.total || 0;
  const totalPages = searchResults?.pagination?.totalPages || 0;
  const hasNext = searchResults?.pagination?.hasNext || false;
  const hasPrev = searchResults?.pagination?.hasPrev || false;
  const selectedEntryId = null;

  // 添加到搜索历史
  const addToHistory = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return;
      setSearchHistory((prev) => {
        const filtered = prev.filter((item) => item !== searchQuery);
        return [searchQuery, ...filtered].slice(0, MAX_SEARCH_HISTORY);
      });
    },
    [setSearchHistory]
  );

  // 从搜索历史移除
  const removeFromHistory = useCallback(
    (searchQuery: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchHistory((prev) => prev.filter((item) => item !== searchQuery));
    },
    [setSearchHistory]
  );

  // 清空搜索历史
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, [setSearchHistory]);

  // 执行搜索
  const handleSearch = useCallback(
    (e?: React.FormEvent, searchQuery?: string) => {
      if (e) e.preventDefault();
      const finalQuery = searchQuery ?? query;
      if (!finalQuery.trim()) return;

      setQuery(finalQuery);
      setHasSearched(true);
      setShowSuggestions(false);
      addToHistory(finalQuery);
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    },
    [query, addToHistory, router]
  );

  // 清除搜索
  const handleClearSearch = useCallback(() => {
    setQuery('');
    setHasSearched(false);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(e.target.value.length === 0);
  }, []);

  // 处理输入框聚焦
  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    setShowSuggestions(query.length === 0 && searchHistory.length > 0);
  }, [query.length, searchHistory.length]);

  // 处理输入框失焦
  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    // 延迟关闭建议框，以便点击建议项
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  // 清除过滤器
  const handleClearFilters = useCallback(() => {
    setFilters({
      feedId: '',
      categoryId: '',
      isRead: undefined,
      isStarred: false,
    });
  }, []);

  // 清除单个过滤器
  const clearFilter = useCallback((key: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'isRead' ? undefined : '',
    }));
  }, []);

  // 计算激活的过滤器数量
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== '' && v !== undefined && v !== false
  ).length;

  // 获取过滤器标签文本
  const getFilterLabel = useCallback(
    (key: string) => {
      switch (key) {
        case 'feedId':
          return feeds?.items.find((f: { id: string; title: string }) => f.id === filters.feedId)?.title;
        case 'categoryId':
          return categories?.find((c: { id: string; name: string }) => c.id === filters.categoryId)?.name;
        case 'isRead':
          return filters.isRead ? '已读' : '未读';
        case 'isStarred':
          return '星标';
        default:
          return '';
      }
    },
    [feeds, categories, filters]
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <aside className="w-60 flex-shrink-0 border-r border-border/60 bg-muted/5 hidden lg:block">
          <AppSidebar />
        </aside>

        {/* 主内容区 */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-background/30">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* 搜索框区域 */}
            <Fade in={isPageLoaded} direction="up" distance={20} duration={400}>
              <div className="mb-6 relative">
                <form onSubmit={(e) => handleSearch(e)}>
                  <div
                    className={cn(
                      'relative transition-all duration-300 ease-out',
                      isInputFocused && 'transform scale-[1.02]'
                    )}
                  >
                    <Input
                      ref={inputRef as any}
                      size="large"
                      value={query}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder="搜索文章标题、内容、关键词..."
                      prefix={
                        <Search
                          className={cn(
                            'h-5 w-5 transition-colors duration-300',
                            isInputFocused ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      }
                      suffix={
                        <div className="flex items-center gap-1">
                          {isLoading && (
                            <Spin size="small" className="mr-2" />
                          )}
                          {query && (
                            <Button
                              type="text"
                              size="small"
                              icon={<X className="h-4 w-4" />}
                              onClick={handleClearSearch}
                              className="hover:bg-muted/50"
                            />
                          )}
                        </div>
                      }
                      onPressEnter={() => handleSearch()}
                      className={cn(
                        'shadow-sm transition-all duration-300',
                        isInputFocused && 'shadow-lg ring-2 ring-primary/20'
                      )}
                    />
                  </div>
                </form>

                {/* 搜索建议/历史下拉框 */}
                {showSuggestions && (
                  <Fade in direction="down" distance={10} duration={200}>
                    <div
                      className="absolute z-50 w-full mt-2 frosted-glass rounded-xl overflow-hidden"
                    >
                      {/* 搜索历史 */}
                      {searchHistory.length > 0 && (
                        <div className="p-3 mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <History className="h-3.5 w-3.5" />
                              <span>搜索历史</span>
                            </div>
                            <button
                              onClick={clearHistory}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              清空
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {searchHistory.map((item, index) => (
                              <Fade
                                key={item}
                                in
                                delay={index * 30}
                                direction="none"
                                duration={200}
                              >
                                <span
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-muted/60 hover:bg-primary/10 border border-border/40 hover:border-primary/30 cursor-pointer transition-colors group"
                                  onClick={() => handleSearch(undefined, item)}
                                >
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span>{item}</span>
                                  <span
                                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                                    onClick={(e) => removeFromHistory(item, e)}
                                  >
                                    <X className="h-3 w-3" />
                                  </span>
                                </span>
                              </Fade>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 热门搜索 */}
                      <div className="p-3 pt-0">
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>热门搜索</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {POPULAR_SEARCHES.map((term, index) => (
                            <Fade
                              key={term}
                              in
                              delay={index * 50}
                              direction="none"
                              duration={200}
                            >
                              <span
                                className="inline-flex items-center px-3 py-1.5 text-sm rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/30 cursor-pointer transition-colors"
                                onClick={() => handleSearch(undefined, term)}
                              >
                                {term}
                              </span>
                            </Fade>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Fade>
                )}
              </div>
            </Fade>

            {/* 过滤器标签 */}
            <Fade
              in={activeFilterCount > 0}
              direction="up"
              distance={10}
              duration={300}
            >
              {activeFilterCount > 0 && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {filters.feedId && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                      onClick={() => clearFilter('feedId')}
                    >
                      订阅源: {getFilterLabel('feedId')}
                      <X className="h-3 w-3 hover:scale-110 transition-transform" />
                    </span>
                  )}
                  {filters.categoryId && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                      onClick={() => clearFilter('categoryId')}
                    >
                      分类: {getFilterLabel('categoryId')}
                      <X className="h-3 w-3 hover:scale-110 transition-transform" />
                    </span>
                  )}
                  {filters.isRead !== undefined && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                      onClick={() => clearFilter('isRead')}
                    >
                      {getFilterLabel('isRead')}
                      <X className="h-3 w-3 hover:scale-110 transition-transform" />
                    </span>
                  )}
                  {filters.isStarred && (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer"
                      onClick={() => clearFilter('isStarred')}
                    >
                      <Bookmark className="h-3 w-3" />
                      {getFilterLabel('isStarred')}
                      <X className="h-3 w-3 hover:scale-110 transition-transform" />
                    </span>
                  )}
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-muted-foreground hover:text-foreground px-2 py-1.5 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    清除全部
                  </button>
                </div>
              )}
            </Fade>

            {/* 过滤器面板 */}
            <Fade
              in={showFilters}
              direction="up"
              distance={15}
              duration={300}
            >
              {showFilters && (
                <div
                  className="mb-6 frosted-glass rounded-xl p-4"
                >
                  <div className="flex flex-col gap-4 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Bookmark className="h-3.5 w-3.5" />
                          订阅源
                        </div>
                        <Select
                          placeholder="全部订阅源"
                          allowClear
                          value={filters.feedId || undefined}
                          onChange={(value) =>
                            setFilters({ ...filters, feedId: value || '' })
                          }
                          className="w-full"
                          options={feeds?.items.map((feed: { id: string; title: string }) => ({
                            label: feed.title,
                            value: feed.id,
                          }))}
                        />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Filter className="h-3.5 w-3.5" />
                          分类
                        </div>
                        <Select
                          placeholder="全部分类"
                          allowClear
                          value={filters.categoryId || undefined}
                          onChange={(value) =>
                            setFilters({ ...filters, categoryId: value || '' })
                          }
                          className="w-full"
                          options={categories?.map((cat: { id: string; name: string }) => ({
                            label: cat.name,
                            value: cat.id,
                          }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <Button
                        type={filters.isRead === undefined ? 'default' : 'primary'}
                        size="small"
                        onClick={() =>
                          setFilters({
                            ...filters,
                            isRead:
                              filters.isRead === undefined ? true : undefined,
                          })
                        }
                        className={cn(
                          'transition-all duration-200',
                          filters.isRead !== undefined && 'shadow-sm'
                        )}
                      >
                        {filters.isRead === undefined
                          ? '已读/未读'
                          : filters.isRead
                          ? '已读'
                          : '未读'}
                      </Button>
                      <Button
                        type={filters.isStarred ? 'primary' : 'default'}
                        size="small"
                        onClick={() =>
                          setFilters({ ...filters, isStarred: !filters.isStarred })
                        }
                        className={cn(
                          'transition-all duration-200',
                          filters.isStarred && 'shadow-sm'
                        )}
                        icon={<Bookmark className="h-3.5 w-3.5" />}
                      >
                        星标文章
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Fade>

            {/* 工具栏 */}
            <Fade in={isPageLoaded} delay={100} direction="up" distance={10}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  {hasSearched && (
                    <span className="flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <Spin size="small" />
                          搜索中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          找到 <strong className="text-foreground mx-1">{totalCount}</strong> 篇文章
                          {totalCount > pageSize && (
                            <span className="text-muted-foreground/60">
                              (第 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} 篇)
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  )}
                </div>
                <Button
                  icon={<Filter className="h-4 w-4" />}
                  onClick={() => setShowFilters(!showFilters)}
                  type={showFilters ? 'primary' : 'default'}
                  className={cn(
                    'transition-all duration-200',
                    activeFilterCount > 0 && 'relative'
                  )}
                >
                  筛选
                  {activeFilterCount > 0 && (
                    <Badge
                      count={activeFilterCount}
                      className="absolute -top-1 -right-1"
                      style={{ backgroundColor: '#ff4d4f' }}
                    />
                  )}
                </Button>
              </div>
            </Fade>

            {/* 搜索结果 */}
            {isLoading ? (
              <Fade in direction="none" duration={200}>
                <EntryListSkeleton count={8} />
              </Fade>
            ) : !hasSearched ? (
              <Fade in delay={150} direction="up" distance={20}>
                <EmptyState
                  icon={<Search className="h-10 w-10" />}
                  title="开始搜索"
                  description="输入关键词搜索文章标题、内容或标签，发现你感兴趣的内容"
                  variant="card"
                />
              </Fade>
            ) : entries.length === 0 ? (
              <Fade in delay={150} direction="up" distance={20}>
                <EmptyState
                  icon={<FileSearch className="h-10 w-10" />}
                  title="未找到相关文章"
                  description={`没有找到与 "${query}" 匹配的文章，试试其他关键词或调整过滤器`}
                  variant="card"
                  action={{
                    label: '清除搜索',
                    onClick: handleClearSearch,
                  }}
                  secondaryAction={
                    activeFilterCount > 0
                      ? {
                          label: '清除过滤器',
                          onClick: handleClearFilters,
                        }
                      : undefined
                  }
                />
              </Fade>
            ) : (
              <>
                <CompactEntryList>
                  <StaggerContainer staggerDelay={40} initialDelay={100}>
                    {entries.map((entry: any, index: number) => (
                      <div
                        key={entry.id}
                        className="transition-all duration-200 hover:translate-x-1"
                      >
                        <CompactEntryItem
                          id={entry.id}
                          title={entry.title}
                          url={entry.url}
                          feedTitle={entry.feed.title}
                          feedIconUrl={entry.feed.iconUrl}
                          publishedAt={entry.publishedAt}
                          isRead={entry.isRead}
                          isStarred={entry.isStarred}
                          isActive={selectedEntryId === entry.id}
                          onClick={() => router.push(`/entries/${entry.id}`)}
                        />
                      </div>
                    ))}
                  </StaggerContainer>
                </CompactEntryList>

                {/* 分页控件 */}
                {totalCount > pageSize && (
                  <Fade in delay={200} direction="up" distance={10}>
                    <div className="flex items-center justify-center gap-2 mt-6 py-4">
                      <Button
                        type="text"
                        disabled={!hasPrev}
                        onClick={() => setCurrentPage(p => p - 1)}
                        icon={<ChevronLeft className="h-4 w-4" />}
                        className="disabled:opacity-40"
                      >
                        上一页
                      </Button>

                      <div className="flex items-center gap-1">
                        {/* 页码显示 */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              type={currentPage === pageNum ? 'primary' : 'text'}
                              size="small"
                              onClick={() => setCurrentPage(pageNum)}
                              className="min-w-[32px]"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <span className="text-sm text-muted-foreground px-2">
                        共 {totalPages} 页
                      </span>

                      <Button
                        type="text"
                        disabled={!hasNext}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="disabled:opacity-40"
                      >
                        下一页
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </Fade>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Spin size="large" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
