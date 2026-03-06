/**
 * 深度报告生成器
 * 生成结构完整、分析深入的资讯报告
 */

import { db } from '../db';
import { AIService } from '../ai/client';
import { getUserAIConfig } from '../ai/health-check';
import { info, warn, error } from '../logger';
import type { Entry, Feed, Category } from '@prisma/client';

interface ReportEntry extends Entry {
  feed: Feed & { category: Category | null };
}

interface CategoryGroup {
  name: string;
  entries: ReportEntry[];
  totalScore: number;
}

interface ReportStats {
  totalEntries: number;
  totalFeeds: number;
  totalCategories: number;
  categories: CategoryGroup[];
  topKeywords: Array<{ keyword: string; count: number }>;
  topFeeds: Array<{ feedTitle: string; count: number }>;
  avgImportance: number;
}

export interface DeepReportOptions {
  reportType: 'daily' | 'weekly';
  reportDate: Date;
  maxEntriesPerCategory?: number;
  maxCategories?: number;
}

/**
 * 深度报告生成器
 */
export class DeepReportGenerator {
  private aiService: AIService | null = null;
  private aiModel: string = 'gpt-4o';

  async initialize(userId: string): Promise<void> {
    const aiConfig = await getUserAIConfig(userId, db);
    this.aiService = new AIService({
      provider: (aiConfig?.provider as any) || 'openai',
      model: aiConfig?.model || 'gpt-4o',
      apiKey: aiConfig?.apiKey,
      baseURL: aiConfig?.baseURL,
      maxTokens: 8000,
      temperature: 0.7,
    });
    this.aiModel = aiConfig?.model || 'gpt-4o';
  }

  /**
   * 生成深度报告
   */
  async generateReport(
    userId: string,
    options: DeepReportOptions
  ): Promise<{ content: string; summary: string; stats: ReportStats }> {
    await this.initialize(userId);

    const { reportType, reportDate, maxEntriesPerCategory = 8, maxCategories = 10 } = options;

    // 计算日期范围
    const { startDate, endDate } = this.getDateRange(reportType, reportDate);

    // 获取所有文章数据
    const allEntries = await this.fetchEntries(userId, startDate, endDate);

    if (allEntries.length === 0) {
      return this.generateEmptyReport(reportType, reportDate);
    }

    // 分析统计数据
    const stats = await this.analyzeStats(allEntries);

    // 按分类分组
    const categoryGroups = this.groupByCategory(allEntries, maxCategories);

    // 生成报告各部分
    const title = this.generateTitle(reportType, reportDate);
    const overviewSection = await this.generateOverviewSection(stats, categoryGroups, reportType);
    const categorySections = await this.generateCategorySections(categoryGroups, maxEntriesPerCategory);
    const summarySection = await this.generateSummarySection(stats, categoryGroups);

    // 组合完整报告
    const content = this.assembleReport({
      title,
      overviewSection,
      categorySections,
      summarySection,
      stats,
    });

    const summary = this.generateBriefSummary(stats, categoryGroups);

    return { content, summary, stats };
  }

  /**
   * 获取日期范围
   */
  private getDateRange(reportType: 'daily' | 'weekly', reportDate: Date) {
    if (reportType === 'daily') {
      const startDate = new Date(reportDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(reportDate);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    } else {
      const startDate = new Date(reportDate);
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // 周一
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // 周日
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  }

  /**
   * 获取文章数据
   */
  private async fetchEntries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReportEntry[]> {
    return db.entry.findMany({
      where: {
        feed: { userId },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        feed: {
          include: { category: true },
        },
      },
      orderBy: [
        { aiImportanceScore: 'desc' },
        { publishedAt: 'desc' },
      ],
    }) as Promise<ReportEntry[]>;
  }

  /**
   * 分析统计数据
   */
  private async analyzeStats(entries: ReportEntry[]): Promise<ReportStats> {
    const feedMap = new Map<string, { title: string; count: number }>();
    const keywordMap = new Map<string, number>();
    let totalImportance = 0;

    entries.forEach((entry) => {
      // 统计订阅源
      const feedTitle = entry.feed.title;
      feedMap.set(feedTitle, {
        title: feedTitle,
        count: (feedMap.get(feedTitle)?.count || 0) + 1,
      });

      // 统计关键词
      entry.aiKeywords?.forEach((keyword) => {
        keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
      });

      totalImportance += entry.aiImportanceScore || 0;
    });

    const topKeywords = Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const topFeeds = Array.from(feedMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 获取分类
    const categoryMap = new Map<string, ReportEntry[]>();
    entries.forEach((entry) => {
      const categoryName = entry.feed.category?.name || entry.aiCategory || '其他';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(entry);
    });

    const categories = Array.from(categoryMap.entries())
      .map(([name, entries]) => ({
        name,
        entries,
        totalScore: entries.reduce((sum, e) => sum + (e.aiImportanceScore || 0), 0),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // 获取唯一订阅源数量
    const uniqueFeeds = new Set(entries.map((e) => e.feedId)).size;

    return {
      totalEntries: entries.length,
      totalFeeds: uniqueFeeds,
      totalCategories: categories.length,
      categories,
      topKeywords,
      topFeeds: topFeeds.map((f) => ({ feedTitle: f.title, count: f.count })),
      avgImportance: entries.length > 0 ? totalImportance / entries.length : 0,
    };
  }

  /**
   * 按分类分组
   */
  private groupByCategory(entries: ReportEntry[], maxCategories: number): CategoryGroup[] {
    const categoryMap = new Map<string, ReportEntry[]>();

    entries.forEach((entry) => {
      // 优先使用用户定义的分类，其次使用AI分类
      const categoryName = entry.feed.category?.name || entry.aiCategory || '其他';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(entry);
    });

    return Array.from(categoryMap.entries())
      .map(([name, entries]) => ({
        name,
        entries: entries.sort((a, b) => (b.aiImportanceScore || 0) - (a.aiImportanceScore || 0)),
        totalScore: entries.reduce((sum, e) => sum + (e.aiImportanceScore || 0), 0),
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, maxCategories);
  }

  /**
   * 生成标题
   */
  private generateTitle(reportType: 'daily' | 'weekly', reportDate: Date): string {
    const dateStr = reportDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (reportType === 'daily') {
      return `📰 资讯深度日报 · ${dateStr}`;
    } else {
      const endDate = new Date(reportDate);
      endDate.setDate(endDate.getDate() + 6);
      const endDateStr = endDate.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
      });
      return `📰 资讯深度周报 · ${dateStr} - ${endDateStr}`;
    }
  }

  /**
   * 生成总体概览部分
   */
  private async generateOverviewSection(
    stats: ReportStats,
    categoryGroups: CategoryGroup[],
    reportType: 'daily' | 'weekly'
  ): Promise<string> {
    const dateDesc = reportType === 'daily' ? '今日' : '本周';

    let section = `## 一、整体概览\n\n`;
    section += `### 📊 数据统计\n\n`;
    section += `| 指标 | 数值 |\n`;
    section += `|------|------|\n`;
    section += `| 文章总数 | ${stats.totalEntries} 篇 |\n`;
    section += `| 订阅源数 | ${stats.totalFeeds} 个 |\n`;
    section += `| 涵盖领域 | ${stats.totalCategories} 个 |\n`;
    section += `| 平均重要性 | ${(stats.avgImportance * 100).toFixed(0)}% |\n\n`;

    // 热门话题
    if (stats.topKeywords.length > 0) {
      section += `### 🔥 热门话题\n\n`;
      section += stats.topKeywords.slice(0, 10).map((k, i) =>
        `${i + 1}. **${k.keyword}** (${k.count}篇)`
      ).join('\n');
      section += '\n\n';
    }

    // 活跃订阅源
    if (stats.topFeeds.length > 0) {
      section += `### 📡 活跃订阅源 TOP5\n\n`;
      section += stats.topFeeds.slice(0, 5).map((f, i) =>
        `${i + 1}. ${f.feedTitle} (${f.count}篇)`
      ).join('\n');
      section += '\n\n';
    }

    // AI 生成趋势分析
    if (this.aiService) {
      try {
        const trendAnalysis = await this.generateTrendAnalysis(stats, categoryGroups);
        section += `### 📈 趋势分析\n\n`;
        section += trendAnalysis;
        section += '\n\n';
      } catch (e) {
        console.error('Failed to generate trend analysis:', e);
      }
    }

    return section;
  }

  /**
   * AI 生成趋势分析
   */
  private async generateTrendAnalysis(
    stats: ReportStats,
    categoryGroups: CategoryGroup[]
  ): Promise<string> {
    if (!this.aiService) return '';

    const prompt = `作为专业资讯分析师，请基于以下数据生成一段100-150字的趋势分析：

热门话题：${stats.topKeywords.slice(0, 5).map(k => k.keyword).join('、')}
主要领域：${categoryGroups.slice(0, 5).map(c => c.name).join('、')}
文章总数：${stats.totalEntries}

请分析：
1. 当前热点聚焦在哪些方向
2. 各领域之间的关联性
3. 值得关注的趋势

直接输出分析内容，不要加标题。`;

    const result = await this.aiService.analyzeArticle(prompt, {
      summary: true,
      keywords: false,
      category: false,
      sentiment: false,
      importance: false,
    });

    return result.summary || '';
  }

  /**
   * 生成各分类章节
   */
  private async generateCategorySections(
    categoryGroups: CategoryGroup[],
    maxEntriesPerCategory: number
  ): Promise<string> {
    const chineseNums = ['二', '三', '四', '五', '六', '七', '八', '九', '十', '十一'];
    let sections = '';

    for (let i = 0; i < categoryGroups.length; i++) {
      const group = categoryGroups[i];
      const sectionNum = chineseNums[i] || String(i + 2);

      sections += `## ${sectionNum}、${group.name}\n\n`;
      sections += `> 共 ${group.entries.length} 篇文章，总重要性评分：${(group.totalScore * 100).toFixed(0)}\n\n`;

      // 生成分类概述
      if (this.aiService && group.entries.length > 2) {
        try {
          const categoryOverview = await this.generateCategoryOverview(group);
          sections += `### 📋 领域概述\n\n`;
          sections += categoryOverview;
          sections += '\n\n';
        } catch (e) {
          console.error('Failed to generate category overview:', e);
        }
      }

      // 文章列表
      sections += `### 📰 重点文章\n\n`;

      const displayEntries = group.entries.slice(0, maxEntriesPerCategory);
      for (let j = 0; j < displayEntries.length; j++) {
        const entry = displayEntries[j];
        sections += this.formatEntryCard(entry, j + 1);
      }

      sections += '---\n\n';
    }

    return sections;
  }

  /**
   * AI 生成分领域概述
   */
  private async generateCategoryOverview(group: CategoryGroup): Promise<string> {
    if (!this.aiService) return '';

    const titles = group.entries.slice(0, 5).map(e => e.title).join('\n- ');
    const summaries = group.entries
      .filter(e => e.aiSummary)
      .slice(0, 3)
      .map(e => e.aiSummary)
      .join('\n');

    const prompt = `作为专业资讯分析师，请基于以下${group.name}领域的文章信息，生成一段80-120字的领域概述：

文章标题：
- ${titles}

文章摘要：
${summaries}

请概括该领域的核心动态和关键信息，直接输出概述内容。`;

    const result = await this.aiService.analyzeArticle(prompt, {
      summary: true,
      keywords: false,
      category: false,
      sentiment: false,
      importance: false,
    });

    return result.summary || '';
  }

  /**
   * 格式化文章卡片
   */
  private formatEntryCard(entry: ReportEntry, index: number): string {
    let card = `#### ${index}. ${entry.title}\n\n`;

    // 元信息
    const meta: string[] = [];
    if (entry.publishedAt) {
      meta.push(`📅 ${entry.publishedAt.toLocaleDateString('zh-CN')}`);
    }
    meta.push(`📡 ${entry.feed.title}`);
    if (entry.aiImportanceScore && entry.aiImportanceScore > 0) {
      meta.push(`⭐ 重要性：${(entry.aiImportanceScore * 100).toFixed(0)}%`);
    }
    card += `${meta.join(' · ')}\n\n`;

    // 摘要
    card += `**摘要**：\n`;
    if (entry.aiSummary) {
      // 格式化摘要为要点
      const points = entry.aiSummary
        .split(/[。！？\n]/)
        .filter((p) => p.trim().length > 10)
        .slice(0, 3);
      if (points.length > 0) {
        points.forEach((point) => {
          card += `> ${point.trim()}\n`;
        });
      } else {
        card += `> ${entry.aiSummary}\n`;
      }
    } else if (entry.content) {
      const snippet = entry.content
        .replace(/<[^>]*>/g, '')
        .substring(0, 200)
        .trim();
      card += `> ${snippet}...\n`;
    } else {
      card += `> 暂无摘要\n`;
    }
    card += '\n';

    // 关键词
    if (entry.aiKeywords && entry.aiKeywords.length > 0) {
      card += `**关键词**：${entry.aiKeywords.slice(0, 5).map(k => `\`${k}\``).join(' ')}\n\n`;
    }

    // AI 深度分析（如果有）
    const mainPoints = entry.aiMainPoints as any;
    if (mainPoints && Array.isArray(mainPoints) && mainPoints.length > 0) {
      card += `**核心观点**：\n`;
      mainPoints.slice(0, 3).forEach((point: any) => {
        card += `- ${point.point || point}\n`;
      });
      card += '\n';
    }

    // 链接
    card += `**原文链接**：[阅读全文](${entry.url})\n\n`;
    card += '---\n\n';

    return card;
  }

  /**
   * 生成总结部分
   */
  private async generateSummarySection(
    stats: ReportStats,
    categoryGroups: CategoryGroup[]
  ): Promise<string> {
    const chineseNums = ['二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const sectionNum = chineseNums[categoryGroups.length] || String(categoryGroups.length + 2);

    let section = `## ${sectionNum}、深度总结\n\n`;

    // AI 生成总结
    if (this.aiService) {
      try {
        const aiSummary = await this.generateAISummary(stats, categoryGroups);
        section += aiSummary;
      } catch (e) {
        console.error('Failed to generate AI summary:', e);
        // 降级为模板总结
        section += this.generateTemplateSummary(stats, categoryGroups);
      }
    } else {
      section += this.generateTemplateSummary(stats, categoryGroups);
    }

    return section;
  }

  /**
   * AI 生成深度总结
   */
  private async generateAISummary(
    stats: ReportStats,
    categoryGroups: CategoryGroup[]
  ): Promise<string> {
    if (!this.aiService) return '';

    const categorySummary = categoryGroups.slice(0, 5).map(g =>
      `- ${g.name}：${g.entries.length}篇文章`
    ).join('\n');

    const topKeywords = stats.topKeywords.slice(0, 5).map(k => k.keyword).join('、');

    const prompt = `作为专业资讯分析师，请基于以下数据生成一份结构化的深度总结：

## 输入数据
- 文章总数：${stats.totalEntries} 篇
- 订阅源数：${stats.totalFeeds} 个
- 热门话题：${topKeywords}

### 各领域分布
${categorySummary}

## 输出要求

请按以下格式生成总结：

### 🎯 核心发现
用3-5个要点概括本期最重要的发现和趋势。

### 📊 领域洞察
分析各主要领域的动态和相互关联。

### 💡 建议关注
列出3-5个值得持续关注的方向或话题。

### 🔮 趋势预测
基于当前信息，预测未来可能的发展方向。

请用专业但易懂的语言，直接输出内容。`;

    const result = await this.aiService.analyzeArticle(prompt, {
      summary: true,
      keywords: false,
      category: false,
      sentiment: false,
      importance: false,
    });

    return result.summary || '';
  }

  /**
   * 模板生成总结
   */
  private generateTemplateSummary(
    stats: ReportStats,
    categoryGroups: CategoryGroup[]
  ): string {
    let section = '';

    section += `### 🎯 核心发现\n\n`;
    section += `1. 本期共收录 **${stats.totalEntries}** 篇文章，来自 **${stats.totalFeeds}** 个订阅源\n`;
    section += `2. 热门话题集中在：${stats.topKeywords.slice(0, 5).map(k => k.keyword).join('、')}\n`;
    section += `3. 最活跃的领域是：${categoryGroups[0]?.name || '无'}（${categoryGroups[0]?.entries.length || 0}篇）\n\n`;

    section += `### 📊 领域分布\n\n`;
    categoryGroups.slice(0, 5).forEach((group, i) => {
      section += `${i + 1}. **${group.name}**：${group.entries.length} 篇文章\n`;
    });
    section += '\n';

    section += `### 💡 建议关注\n\n`;
    if (stats.topKeywords.length > 0) {
      stats.topKeywords.slice(0, 5).forEach((k, i) => {
        section += `${i + 1}. 持续关注 **${k.keyword}** 相关动态（${k.count}篇文章提及）\n`;
      });
    }
    section += '\n';

    return section;
  }

  /**
   * 组装完整报告
   */
  private assembleReport(parts: {
    title: string;
    overviewSection: string;
    categorySections: string;
    summarySection: string;
    stats: ReportStats;
  }): string {
    let content = '';

    content += `# ${parts.title}\n\n`;
    content += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    content += `> 使用模型：${this.aiModel}\n\n`;
    content += `---\n\n`;

    content += parts.overviewSection;
    content += parts.categorySections;
    content += parts.summarySection;

    content += `\n---\n\n`;
    content += `*本报告由 AI 自动生成，仅供参考。*\n`;

    return content;
  }

  /**
   * 生成简短摘要
   */
  private generateBriefSummary(
    stats: ReportStats,
    categoryGroups: CategoryGroup[]
  ): string {
    const topCategories = categoryGroups.slice(0, 3).map(c => c.name).join('、');
    const topKeywords = stats.topKeywords.slice(0, 3).map(k => k.keyword).join('、');

    return `共收录 ${stats.totalEntries} 篇文章，涵盖 ${stats.totalCategories} 个领域。主要领域：${topCategories}。热门话题：${topKeywords}。`;
  }

  /**
   * 生成空报告
   */
  private generateEmptyReport(
    reportType: 'daily' | 'weekly',
    reportDate: Date
  ): { content: string; summary: string; stats: ReportStats } {
    const title = this.generateTitle(reportType, reportDate);
    const dateDesc = reportType === 'daily' ? '今日' : '本周';

    const content = `# ${title}\n\n` +
      `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n` +
      `---\n\n` +
      `## 暂无数据\n\n` +
      `${dateDesc}没有收录到任何文章，请检查订阅源是否正常更新。\n\n` +
      `---\n\n` +
      `*本报告由 AI 自动生成。*\n`;

    const summary = `${dateDesc}暂无文章数据。`;

    const stats: ReportStats = {
      totalEntries: 0,
      totalFeeds: 0,
      totalCategories: 0,
      categories: [],
      topKeywords: [],
      topFeeds: [],
      avgImportance: 0,
    };

    return { content, summary, stats };
  }
}

// 导出单例
let deepReportGeneratorInstance: DeepReportGenerator | null = null;

export function getDeepReportGenerator(): DeepReportGenerator {
  if (!deepReportGeneratorInstance) {
    deepReportGeneratorInstance = new DeepReportGenerator();
  }
  return deepReportGeneratorInstance;
}
