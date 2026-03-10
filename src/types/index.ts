/**
 * 找屎 Skill - 类型定义
 */

/** Reddit 帖子数据 */
export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  author?: string;
  score: number;
  num_comments: number;
  created_utc: number;
  created_iso?: string;
  permalink: string;
  url?: string;
  is_self?: boolean;
  selftext_snippet?: string | null;
  flair?: string | null;
  over_18?: boolean;
}

/** 评分结果 */
export interface JudgeResult {
  totalScore: number;
  isShitpost: boolean;
  reasons: string[];
}

/** 带评分的帖子 */
export interface ScoredPost {
  post: RedditPost | XiaohongshuPost;
  score: JudgeResult;
  formattedMessage?: string;
}

/** Skill 结果 */
export interface ShitFinderResult {
  inputCount: number;
  passedCount: number;
  selectedCount: number;
  results: ScoredPost[];
  summaryText?: string;
}

/** Skill 参数 */
export interface SkillArgs {
  posts: RedditPost[];
  minScore?: number;
  limit?: number;
}

/** Skill 上下文 */
export interface SkillContext {
  workspacePath: string;
}

/** Skill 接口 */
export interface Skill {
  name: string;
  description: string;
  version: string;
  execute(context: SkillContext, args: SkillArgs): Promise<ShitFinderResult>;
}

/** 来源配置 */
export interface SourceConfig {
  subreddit: string;
  name: string;
  weight?: number;
  enabled?: boolean;
}

/** 获取配置 */
export interface FetchConfig {
  timeRange: string;
  postsPerSource: number;
  maxAgeDays: number;
}

/** 评判配置 */
export interface JudgeConfig {
  minScore: number;
  maxResults: number;
  autoShare: boolean;
}

/** 小红书配置 */
export interface XiaohongshuConfig {
  enabled: boolean;
  keywords: string[];
  postsPerKeyword: number;
  name: string;
  weight: number;
}

/** Pipeline 完整配置 */
export interface PipelineConfig {
  sources: SourceConfig[];
  fetch: FetchConfig;
  judge: JudgeConfig;
  xiaohongshu?: XiaohongshuConfig;
}

/** 小红书帖子数据 */
export interface XiaohongshuPost {
  id: string;
  title: string;
  author: string;
  score: number;
  num_comments: number;
  likedCount: string;
  collectedCount: string;
  commentCount: string;
  sharedCount?: string;
  cover?: string;
  noteType: 'normal' | 'video';
  xsecToken: string;
  userId?: string;
  subreddit: string;
  permalink: string;
  url?: string;
  source: 'xiaohongshu';
}

/** Pipeline 执行结果 */
export interface PipelineResult {
  success: boolean;
  fetched: number;
  scored: number;
  selected: number;
  posts: ScoredPost[];
  message: string;
  dryRun: boolean;
  sent?: number;
  sendError?: string;
}
