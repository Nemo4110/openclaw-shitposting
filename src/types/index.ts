/**
 * 核心类型定义
 */

/**
 * Reddit 帖子数据结构
 */
export interface RedditPost {
  id: string;
  title: string;
  content: string;
  url: string;
  permalink: string;
  author: string;
  subreddit: string;
  upvotes: number;
  upvoteRatio: number;
  commentCount: number;
  isVideo: boolean;
  mediaUrl: string | null;
  createdUtc: number;
}

/**
 * 评分结果
 */
export interface JudgeResult {
  postId: string;
  titleScore: number;
  engagementScore: number;
  logicScore: number;
  totalScore: number;
  isShitpost: boolean;
  reasons: string[];
}

/**
 * 推送结果
 */
export interface PushResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Reddit API 配置
 */
export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  userAgent: string;
  subreddits: string[];
  sort: 'hot' | 'top' | 'new' | 'rising' | 'controversial';
  timeFilter: 'day' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Telegram 配置
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification: boolean;
}

/**
 * 评分算法配置
 */
export interface JudgeConfig {
  minShitpostScore: number;
  maxPostsPerRun: number;
  useLlm: boolean;
}

/**
 * 存储配置
 */
export interface StorageConfig {
  historyFile: string;
  maxHistory: number;
}

/**
 * 应用配置
 */
export interface AppConfig {
  reddit: RedditConfig;
  telegram: TelegramConfig;
  judge: JudgeConfig;
  storage: StorageConfig;
}

/**
 * 过滤规则配置
 */
export interface FilterConfig {
  shitpostKeywords: {
    en: string[];
    zh: string[];
  };
  blacklistKeywords: string[];
}

/**
 * 运行参数
 */
export interface RunOptions {
  limit: number;
  minScore: number;
  dryRun: boolean;
}

/**
 * Reddit API Token 响应
 */
export interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Reddit 帖子原始数据结构（API 返回）
 */
export interface RedditSubmission {
  id: string;
  title: string;
  url: string;
  permalink: string;
  author: string | null;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  is_video: boolean;
  is_self: boolean;
  is_gallery?: boolean;
  selftext?: string;
  stickied: boolean;
  created_utc: number;
  media?: {
    reddit_video?: {
      fallback_url: string;
    };
  };
  media_metadata?: Record<string, {
    s?: {
      u?: string;
    };
  }>;
}

/**
 * Reddit API 列表响应
 */
export interface RedditListingResponse {
  data: {
    children: Array<{
      data: RedditSubmission;
    }>;
  };
}
