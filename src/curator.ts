/**
 * Shitpost Curator 核心逻辑
 * 整合 Reddit 抓取、评分、去重、推送的完整流程
 */

import { resolve, isAbsolute } from 'path';
import type { Config, FilterConfig, RunOptions } from './types/index.js';
import { RedditFetcher } from './reddit/index.js';
import { ContentJudge, HistoryManager } from './judge/index.js';
import { TelegramPusher } from './telegram/index.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('curator');

export interface CuratorResult {
  fetched: number;
  newPosts: number;
  selected: number;
  pushed: number;
  failed: number;
}

export class ShitpostCurator {
  private projectRoot: string;
  private config: Config;
  private filters: FilterConfig;

  constructor(projectRoot: string, config: Config, filters: FilterConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.filters = filters;
  }

  /**
   * 执行完整的内容筛选与推送流程
   */
  async run(options: RunOptions): Promise<CuratorResult> {
    const separator = '='.repeat(50);
    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    logger.info(separator);
    logger.info(`Shitpost Curator Bot Started - ${timestamp}`);
    logger.info(separator);

    const result: CuratorResult = {
      fetched: 0,
      newPosts: 0,
      selected: 0,
      pushed: 0,
      failed: 0,
    };

    // 1. 初始化历史管理器
    let historyFile = this.config.storage.historyFile;
    if (!isAbsolute(historyFile)) {
      historyFile = resolve(this.projectRoot, historyFile);
    }
    const history = new HistoryManager(historyFile, this.config.storage.maxHistory);

    // 2. 抓取 Reddit 内容
    logger.info('Fetching content from Reddit...');
    try {
      const fetcher = new RedditFetcher(this.config.reddit);
      const posts = await fetcher.fetchMultiple(
        this.config.reddit.subreddits,
        this.config.reddit.sort,
        this.config.reddit.timeFilter,
        options.limit
      );
      
      result.fetched = posts.length;
      logger.info(`Fetched ${posts.length} posts total`);

      if (posts.length === 0) {
        logger.info('No posts fetched');
        return result;
      }

      // 3. 去重
      const newPosts = history.filterNewPosts(posts);
      result.newPosts = newPosts.length;

      if (newPosts.length === 0) {
        logger.info('No new content to process');
        return result;
      }

      // 4. 弱智度评分
      logger.info('Judging shitpost scores...');
      const judgeConfig = {
        ...this.config.judge,
        minShitpostScore: options.minScore,
      };
      const judge = new ContentJudge(this.filters, judgeConfig);
      const results = judge.judgeBatch(newPosts);

      // 打印评分结果
      for (let i = 0; i < newPosts.length; i++) {
        const post = newPosts[i];
        const judgeResult = results[i];
        const status = judgeResult.isShitpost ? 'PASS' : 'FAIL';
        logger.info(
          `[${post.subreddit}] ${post.title.slice(0, 40)}... | ` +
          `Score: ${judgeResult.totalScore.toFixed(1)} | ${status}`
        );
      }

      // 5. 筛选高弱智度内容
      const shitposts = judge.filterShitposts(newPosts, results);
      result.selected = shitposts.length;

      if (shitposts.length === 0) {
        logger.info(`No content with shitpost score >= ${options.minScore} found`);
        return result;
      }

      logger.info(`Selected ${shitposts.length} high-scored shitposts`);

      // 6. 推送到 Telegram
      if (options.dryRun) {
        logger.info('DRY RUN MODE - Results will not be pushed:');
        for (const [post, judgeResult] of shitposts) {
          logger.info(`  Title: ${post.title.slice(0, 50)}...`);
          logger.info(`  URL: https://reddit.com${post.permalink}`);
          logger.info(`  Score: ${judgeResult.totalScore.toFixed(1)}`);
          logger.info(`  Reasons: ${judgeResult.reasons.slice(0, 3).join('; ')}`);
        }
        return result;
      }

      logger.info('Pushing to Telegram...');
      
      const header = `<b>Daily Shitpost Selection</b> (${now.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })})\n\nToday's curated shitpost content:`;

      const pusher = new TelegramPusher({
        botToken: this.config.telegram.botToken,
        chatId: this.config.telegram.chatId,
        parseMode: this.config.telegram.parseMode,
        disableNotification: this.config.telegram.disableNotification,
      });

      const pushResults = await pusher.pushPosts(shitposts, header);

      // 统计结果
      result.pushed = pushResults.filter(r => r.success).length;
      result.failed = pushResults.filter(r => !r.success).length;

      logger.info(`Push completed: ${result.pushed} succeeded, ${result.failed} failed`);

      // 7. 记录已推送
      for (const [post] of shitposts) {
        history.markPosted(`reddit_${post.id}`);
      }
      history.saveHistory();

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to fetch from Reddit: ${errorMsg}`);
      throw error;
    }
  }
}
