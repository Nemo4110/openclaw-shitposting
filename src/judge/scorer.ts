/**
 * 弱智度评分算法
 * 基于多维度评估 Reddit 内容的"弱智/搞笑/脑残"程度
 */

import type { RedditPost, JudgeResult, FilterConfig, JudgeConfig } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('judge');

export class ContentJudge {
  private filters: FilterConfig;
  private config: JudgeConfig;
  private minScore: number;
  private enKeywords: string[];
  private zhKeywords: string[];
  private blacklist: string[];

  constructor(filters: FilterConfig, config: JudgeConfig) {
    this.filters = filters;
    this.config = config;
    this.minScore = config.minShitpostScore;
    this.enKeywords = filters.shitpostKeywords.en.map(kw => kw.toLowerCase());
    this.zhKeywords = filters.shitpostKeywords.zh;
    this.blacklist = filters.blacklistKeywords.map(kw => kw.toLowerCase());
  }

  /**
   * 对单个帖子进行弱智度评分
   */
  judge(post: RedditPost): JudgeResult {
    const reasons: string[] = [];

    // 1. 黑名单检查
    const combinedText = `${post.title} ${post.content}`.toLowerCase();
    for (const blackKw of this.blacklist) {
      if (combinedText.includes(blackKw)) {
        return {
          postId: getShortId(post),
          titleScore: 0,
          engagementScore: 0,
          logicScore: 0,
          totalScore: 0,
          isShitpost: false,
          reasons: [`Blacklisted keyword: ${blackKw}`],
        };
      }
    }

    // 2. 标题关键词评分 (0-3分)
    const titleScore = this.calculateTitleScore(post.title);
    if (titleScore > 0) {
      reasons.push(`Title keyword score: ${titleScore.toFixed(1)}`);
    }

    // 3. 互动特征评分 (0-3分)
    const engagementScore = this.calculateEngagementScore(post);
    if (engagementScore > 0) {
      reasons.push(`Engagement score: ${engagementScore.toFixed(1)}`);
    }

    // 4. 逻辑悖论评分 (0-4分)
    const logicScore = this.calculateLogicScore(post);
    if (logicScore > 0) {
      reasons.push(`Logic paradox score: ${logicScore.toFixed(1)}`);
    }

    // 计算总分
    const totalScore = titleScore + engagementScore + logicScore;
    const isShitpost = totalScore >= this.minScore;

    // 添加通过/失败理由
    if (isShitpost) {
      reasons.push(`PASS: shitpost score ${totalScore.toFixed(1)} >= ${this.minScore}`);
    } else {
      reasons.push(`FAIL: shitpost score ${totalScore.toFixed(1)} < ${this.minScore}`);
    }

    return {
      postId: getShortId(post),
      titleScore,
      engagementScore,
      logicScore,
      totalScore,
      isShitpost,
      reasons,
    };
  }

  /**
   * 批量评分
   */
  judgeBatch(posts: RedditPost[]): JudgeResult[] {
    return posts.map(post => this.judge(post));
  }

  /**
   * 根据评分结果过滤出弱智内容
   */
  filterShitposts(posts: RedditPost[], results: JudgeResult[]): Array<[RedditPost, JudgeResult]> {
    const shitposts: Array<[RedditPost, JudgeResult]> = [];
    
    for (let i = 0; i < posts.length; i++) {
      if (results[i].isShitpost) {
        shitposts.push([posts[i], results[i]]);
      }
    }

    // 按分数排序
    shitposts.sort((a, b) => b[1].totalScore - a[1].totalScore);

    // 限制数量
    const maxPosts = this.config.maxPostsPerRun;
    return shitposts.slice(0, maxPosts);
  }

  /**
   * 基于标题关键词计算分数 (0-3分)
   */
  private calculateTitleScore(title: string): number {
    let score = 0;
    const titleLower = title.toLowerCase();

    // 英文关键词匹配
    for (const kw of this.enKeywords) {
      if (titleLower.includes(kw)) {
        score += 0.5;
      }
    }

    // 中文关键词匹配
    for (const kw of this.zhKeywords) {
      if (title.includes(kw)) {
        score += 0.5;
      }
    }

    // 标点符号特征（多个问号/感叹号通常表示弱智/夸张）
    const qCount = (title.match(/[?？]/g) || []).length;
    const exCount = (title.match(/[!！]/g) || []).length;
    if (qCount >= 2 || exCount >= 2 || (qCount + exCount) >= 3) {
      score += 1.0;
    }

    // 全大写（通常表示情绪化/夸张）
    const alphaChars = [...title].filter(c => /[a-zA-Z]/.test(c));
    if (alphaChars.length > 0) {
      const upperCount = alphaChars.filter(c => c === c.toUpperCase()).length;
      if (upperCount / alphaChars.length > 0.7) {
        score += 0.5;
      }
    }

    return Math.min(score, 3.0);
  }

  /**
   * 基于互动特征计算分数 (0-3分)
   */
  private calculateEngagementScore(post: RedditPost): number {
    let score = 0;

    // 高评论数 + 中等点赞 = 争议性/讨论度高的内容
    if (post.commentCount > 100 && post.upvotes < 5000) {
      score += 1.0;
    } else if (post.commentCount > 50) {
      score += 0.5;
    }

    // 低赞踩比 + 高互动 = 有争议的内容
    if (post.upvoteRatio < 0.7 && post.commentCount > 30) {
      score += 1.5;
    } else if (post.upvoteRatio < 0.8 && post.commentCount > 20) {
      score += 0.5;
    }

    // 评论/点赞比高 = 引发讨论的内容
    if (post.upvotes > 0) {
      const ratio = post.commentCount / post.upvotes;
      if (ratio > 0.1) {
        score += 1.0;
      } else if (ratio > 0.05) {
        score += 0.5;
      }
    }

    return Math.min(score, 3.0);
  }

  /**
   * 基于内容逻辑悖论计算分数 (0-4分)
   */
  private calculateLogicScore(post: RedditPost): number {
    let score = 0;
    const content = `${post.title} ${post.content}`.toLowerCase();

    // 自相矛盾的表达
    const contradictions: Array<[string, string]> = [
      ['not', 'but'],
      ['no', 'yes'],
      ["can't", 'did'],
      ['不会', '会'],
      ['不是', '是'],
      ['没有', '有'],
    ];
    
    for (const [a, b] of contradictions) {
      if (content.includes(a) && content.includes(b)) {
        score += 0.5;
      }
    }

    // 荒谬的夸张表达
    const absurdPatterns = [
      /\d{3,}%/,  // 超过100%的百分比
      /never\s+\w+\s+again/i,
      /always\s+\w+/i,
      /每个人|everyone|everybody/i,
      /没有人|nobody|no one/i,
      /永远|forever|always/i,
    ];
    
    for (const pattern of absurdPatterns) {
      if (pattern.test(content)) {
        score += 0.5;
      }
    }

    // 特定 subreddit 加分（这些版块本身就是弱智内容聚集地）
    const shitpostSubs = ['shitposting', 'okbuddyretard', 'terriblefacebookmemes', 'comedyheaven'];
    if (shitpostSubs.some(sub => post.subreddit.toLowerCase().includes(sub))) {
      score += 1.0;
    }

    // "Nobody: / Me:" 格式（经典的弱智meme格式）
    if (/no(body| one):/i.test(content) || content.includes('没有人：')) {
      score += 1.0;
    }

    return Math.min(score, 4.0);
  }
}

/**
 * 获取帖子的短 ID
 */
function getShortId(post: RedditPost): string {
  return `reddit_${post.id}`;
}
