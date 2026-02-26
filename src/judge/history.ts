/**
 * 已推送内容管理器
 * 基于 JSON 文件的简单去重
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { RedditPost } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('history');

interface HistoryData {
  postedIds: string[];
  updatedAt: string;
}

export class HistoryManager {
  private historyFile: string;
  private maxHistory: number;
  private postedIds: Set<string>;

  constructor(historyFile: string, maxHistory: number = 1000) {
    this.historyFile = historyFile;
    this.maxHistory = maxHistory;
    this.postedIds = this.loadHistory();
  }

  /**
   * 加载历史记录
   */
  private loadHistory(): Set<string> {
    if (!existsSync(this.historyFile)) {
      return new Set();
    }

    try {
      const data = JSON.parse(readFileSync(this.historyFile, 'utf-8')) as HistoryData;
      return new Set(data.postedIds);
    } catch (error) {
      logger.error(`Failed to load history: ${error}`);
      return new Set();
    }
  }

  /**
   * 保存历史记录
   */
  saveHistory(): void {
    try {
      // 确保目录存在
      const dir = dirname(this.historyFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // 只保留最近的记录
      const ids = Array.from(this.postedIds);
      const recentIds = ids.slice(-this.maxHistory);

      const data: HistoryData = {
        postedIds: recentIds,
        updatedAt: new Date().toISOString(),
      };

      writeFileSync(this.historyFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error(`Failed to save history: ${error}`);
    }
  }

  /**
   * 检查是否已推送
   */
  isPosted(postId: string): boolean {
    return this.postedIds.has(postId);
  }

  /**
   * 标记为已推送
   */
  markPosted(postId: string): void {
    this.postedIds.add(postId);
  }

  /**
   * 过滤出未推送过的帖子
   */
  filterNewPosts(posts: RedditPost[]): RedditPost[] {
    const newPosts = posts.filter(p => !this.isPosted(getShortId(p)));
    logger.info(`Filtered new posts: ${newPosts.length}/${posts.length}`);
    return newPosts;
  }
}

/**
 * 获取帖子的短 ID
 */
function getShortId(post: RedditPost): string {
  return `reddit_${post.id}`;
}
