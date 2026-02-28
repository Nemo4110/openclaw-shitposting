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
  post: RedditPost;
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
