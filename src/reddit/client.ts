/**
 * Reddit API 客户端
 * 使用原生 fetch 调用 Reddit REST API
 */

import type { RedditConfig, RedditTokenResponse, RedditListingResponse, RedditSubmission } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('reddit');

export class RedditClient {
  private config: RedditConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: RedditConfig) {
    this.config = config;
  }

  /**
   * 获取 OAuth2 Access Token
   */
  private async getAccessToken(): Promise<string> {
    // 如果 token 还有效，直接返回
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.config.userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${error}`);
    }

    const data = await response.json() as RedditTokenResponse;
    this.accessToken = data.access_token;
    // 提前 60 秒过期，避免边界情况
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    
    logger.info('Reddit API authenticated successfully');
    return this.accessToken;
  }

  /**
   * 发送 API 请求
   */
  private async request<T>(url: string): Promise<T> {
    const token = await this.getAccessToken();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': this.config.userAgent,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Reddit API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 获取指定 subreddit 的帖子
   */
  async getSubredditPosts(
    subreddit: string,
    sort: string = 'hot',
    timeFilter: string = 'day',
    limit: number = 10
  ): Promise<RedditSubmission[]> {
    let url: string;
    
    // 构建 URL
    if (sort === 'top' || sort === 'controversial') {
      url = `https://oauth.reddit.com/r/${subreddit}/${sort}?t=${timeFilter}&limit=${limit}`;
    } else {
      url = `https://oauth.reddit.com/r/${subreddit}/${sort}?limit=${limit}`;
    }

    const response = await this.request<RedditListingResponse>(url);
    
    // 过滤掉置顶帖
    const posts = response.data.children
      .map(child => child.data)
      .filter(post => !post.stickied);
    
    logger.info(`Fetched ${posts.length} posts from r/${subreddit}`);
    return posts;
  }

  /**
   * 获取当前用户信息（用于验证连接）
   */
  async getMe(): Promise<unknown> {
    return this.request('https://oauth.reddit.com/api/v1/me');
  }
}
