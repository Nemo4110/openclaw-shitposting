/**
 * Reddit Mock 客户端
 * 用于 MOCK_MODE 下模拟 Reddit API，无需真实凭证
 */

import type { RedditConfig, RedditPost } from '../types/index.js';
import { getMockPostsBySubreddit } from './data.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('reddit-mock');

export class MockRedditClient {
  constructor(_config: RedditConfig) {
    logger.info('🎭 Mock Reddit Client initialized (MOCK_MODE enabled)');
  }

  /**
   * 模拟获取指定 subreddit 的帖子
   */
  async getSubredditPosts(
    subreddit: string,
    sort: string = 'hot',
    _timeFilter: string = 'day',
    limit: number = 10
  ): Promise<RedditPost[]> {
    logger.info(`[MOCK] Fetching posts from r/${subreddit} (sort: ${sort}, limit: ${limit})`);
    
    // 模拟网络延迟
    await delay(100 + Math.random() * 200);
    
    const posts = getMockPostsBySubreddit([subreddit], limit);
    
    logger.info(`[MOCK] Fetched ${posts.length} posts from r/${subreddit}`);
    return posts;
  }

  /**
   * 模拟获取当前用户信息
   */
  async getMe(): Promise<unknown> {
    logger.info('[MOCK] Getting user info');
    
    await delay(50);
    
    return {
      id: 'mock_user_123',
      name: 'MockUser',
      created_utc: Date.now() / 1000 - 86400 * 365,
      link_karma: 12345,
      comment_karma: 67890,
    };
  }
}

/**
 * Mock Reddit Fetcher
 * 模拟 Reddit 内容抓取器
 */
export class MockRedditFetcher {
  private client: MockRedditClient;

  constructor(config: RedditConfig) {
    this.client = new MockRedditClient(config);
  }

  /**
   * 模拟获取单个 subreddit 的帖子
   */
  async fetchSubreddit(
    subredditName: string,
    sort: string = 'hot',
    timeFilter: string = 'day',
    limit: number = 10
  ): Promise<RedditPost[]> {
    try {
      const posts = await this.client.getSubredditPosts(
        subredditName,
        sort,
        timeFilter,
        limit
      );
      
      logger.info(`[MOCK] Fetched ${posts.length} posts from r/${subredditName}`);
      return posts;
    } catch (error) {
      logger.error(`[MOCK] Failed to fetch r/${subredditName}: ${error}`);
      throw error;
    }
  }

  /**
   * 模拟从多个 subreddit 获取帖子
   */
  async fetchMultiple(
    subredditList: string[],
    sort: string = 'hot',
    timeFilter: string = 'day',
    limitPerSub: number = 10
  ): Promise<RedditPost[]> {
    logger.info(`[MOCK] Fetching from ${subredditList.length} subreddits`);
    
    const allPosts: RedditPost[] = [];

    for (const subName of subredditList) {
      try {
        const posts = await this.fetchSubreddit(subName, sort, timeFilter, limitPerSub);
        allPosts.push(...posts);
      } catch (error) {
        logger.error(`[MOCK] Failed to fetch r/${subName}: ${error}`);
        continue;
      }
    }

    // 按点赞数排序
    allPosts.sort((a, b) => b.upvotes - a.upvotes);
    
    logger.info(`[MOCK] Total posts fetched: ${allPosts.length}`);
    return allPosts;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
