/**
 * Reddit 内容抓取器
 */

import type { RedditConfig, RedditPost, RedditSubmission } from '../types/index.js';
import { RedditClient } from './client.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('fetcher');

export class RedditFetcher {
  private client: RedditClient;

  constructor(config: RedditConfig) {
    this.client = new RedditClient(config);
  }

  /**
   * 获取单个 subreddit 的帖子
   */
  async fetchSubreddit(
    subredditName: string,
    sort: string = 'hot',
    timeFilter: string = 'day',
    limit: number = 10
  ): Promise<RedditPost[]> {
    try {
      const submissions = await this.client.getSubredditPosts(
        subredditName,
        sort,
        timeFilter,
        limit
      );
      
      const posts = submissions.map(sub => this.convertSubmission(sub));
      logger.info(`Fetched ${posts.length} posts from r/${subredditName}`);
      return posts;
    } catch (error) {
      logger.error(`Failed to fetch r/${subredditName}: ${error}`);
      throw error;
    }
  }

  /**
   * 从多个 subreddit 获取帖子
   */
  async fetchMultiple(
    subredditList: string[],
    sort: string = 'hot',
    timeFilter: string = 'day',
    limitPerSub: number = 10
  ): Promise<RedditPost[]> {
    const allPosts: RedditPost[] = [];

    for (const subName of subredditList) {
      try {
        const posts = await this.fetchSubreddit(subName, sort, timeFilter, limitPerSub);
        allPosts.push(...posts);
      } catch (error) {
        logger.error(`Failed to fetch r/${subName}: ${error}`);
        // 继续处理其他 subreddit
        continue;
      }
    }

    // 按点赞数排序
    allPosts.sort((a, b) => b.upvotes - a.upvotes);
    logger.info(`Total posts fetched: ${allPosts.length}`);
    
    return allPosts;
  }

  /**
   * 将 Reddit API 返回的 submission 转换为 RedditPost
   */
  private convertSubmission(submission: RedditSubmission): RedditPost {
    let mediaUrl: string | null = null;
    let content = '';

    // 处理视频
    if (submission.is_video && submission.media?.reddit_video) {
      mediaUrl = submission.media.reddit_video.fallback_url;
      content = '[视频]';
    }
    // 处理图库
    else if (submission.is_gallery && submission.media_metadata) {
      const mediaItems: string[] = [];
      for (const [, item] of Object.entries(submission.media_metadata)) {
        if (item?.s?.u) {
          mediaItems.push(item.s.u);
        }
      }
      mediaUrl = mediaItems[0] ?? null;
      content = '[图片集]';
    }
    // 处理外链图片
    else if (submission.url && !submission.is_self) {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const isImage = imageExtensions.some(ext => 
        submission.url.toLowerCase().includes(ext)
      );
      if (isImage) {
        mediaUrl = submission.url;
        content = '[图片]';
      } else {
        content = submission.url;
      }
    }

    // 自文本内容
    if (submission.is_self && submission.selftext) {
      content = submission.selftext.slice(0, 500);
      if (submission.selftext.length > 500) {
        content += '...';
      }
    }

    return {
      id: submission.id,
      title: submission.title,
      content,
      url: submission.url,
      permalink: submission.permalink,
      author: submission.author ?? '[deleted]',
      subreddit: submission.subreddit,
      upvotes: submission.score,
      upvoteRatio: submission.upvote_ratio,
      commentCount: submission.num_comments,
      isVideo: submission.is_video,
      mediaUrl,
      createdUtc: submission.created_utc,
    };
  }
}

/**
 * 获取帖子的完整 URL
 */
export function getFullUrl(post: RedditPost): string {
  return `https://reddit.com${post.permalink}`;
}

/**
 * 获取帖子的短 ID（用于去重）
 */
export function getShortId(post: RedditPost): string {
  return `reddit_${post.id}`;
}
